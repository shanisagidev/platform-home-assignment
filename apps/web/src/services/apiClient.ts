const API_BASE = '/api';

// Configuration
const CONFIG = {
  timeout: 15000, // 15 second timeout
  maxRetries: 3,
  retryDelay: 1000, // 1 second between retries
  retryStatusCodes: [408, 429, 500, 502, 503, 504], // Retry on these status codes
};

interface ApiError extends Error {
  status: number;
  isTimeout?: boolean;
  isNetworkError?: boolean;
}

// Helper to create a timeout promise
function createTimeout(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      const error = new Error('Request timeout') as ApiError;
      error.status = 408;
      error.isTimeout = true;
      reject(error);
    }, ms);
  });
}

// Helper to delay between retries
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Check if error is retryable
function isRetryable(error: ApiError): boolean {
  // Network errors are retryable
  if (error.isNetworkError) return true;
  // Timeout errors are retryable
  if (error.isTimeout) return true;
  // Certain status codes are retryable
  return CONFIG.retryStatusCodes.includes(error.status);
}

async function requestWithRetry<T>(
  endpoint: string,
  options: RequestInit = {},
  retryCount = 0
): Promise<T> {
  const token = localStorage.getItem('token');
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    // Race between fetch and timeout
    const response = await Promise.race([
      fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
      }),
      createTimeout(CONFIG.timeout),
    ]);
    
    if (!response.ok) {
      const error = new Error() as ApiError;
      try {
        const data = await response.json();
        error.message = data.error || `Request failed with status ${response.status}`;
      } catch {
        error.message = `Request failed with status ${response.status}`;
      }
      error.status = response.status;
      
      // Retry if applicable
      if (isRetryable(error) && retryCount < CONFIG.maxRetries) {
        console.warn(`[API] Retrying ${endpoint} (attempt ${retryCount + 1}/${CONFIG.maxRetries})`);
        await delay(CONFIG.retryDelay * (retryCount + 1)); // Exponential backoff
        return requestWithRetry<T>(endpoint, options, retryCount + 1);
      }
      
      throw error;
    }
    
    // Handle 204 No Content
    if (response.status === 204) {
      return undefined as T;
    }
    
    return response.json();
  } catch (error) {
    // Handle network errors (fetch throws TypeError for network failures)
    if (error instanceof TypeError) {
      const networkError = new Error('Network error - please check your connection') as ApiError;
      networkError.status = 0;
      networkError.isNetworkError = true;
      
      // Retry network errors
      if (retryCount < CONFIG.maxRetries) {
        console.warn(`[API] Network error, retrying ${endpoint} (attempt ${retryCount + 1}/${CONFIG.maxRetries})`);
        await delay(CONFIG.retryDelay * (retryCount + 1));
        return requestWithRetry<T>(endpoint, options, retryCount + 1);
      }
      
      throw networkError;
    }
    
    // Re-throw other errors (including ApiError from timeout/status)
    throw error;
  }
}

export const apiClient = {
  get: <T>(endpoint: string) => requestWithRetry<T>(endpoint, { method: 'GET' }),
  
  post: <T>(endpoint: string, data?: unknown) =>
    requestWithRetry<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),
  
  patch: <T>(endpoint: string, data: unknown) =>
    requestWithRetry<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  
  delete: (endpoint: string) =>
    requestWithRetry<void>(endpoint, { method: 'DELETE' }),
};

