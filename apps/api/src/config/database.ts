// Database configuration constants
export const DATABASE_CONFIG = {
  // SQLite pragma settings for better performance
  pragmas: {
    journal_mode: 'WAL',
    foreign_keys: 'ON',
    synchronous: 'NORMAL',
  },
} as const;

