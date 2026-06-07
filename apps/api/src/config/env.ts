export interface Config {
  port: number;
  databasePath: string;
  nodeEnv: string;
}

export function getConfig(): Config {
  return {
    port: parseInt(process.env.PORT || '8080', 10),
    databasePath: process.env.DATABASE_PATH || './data/dspm.db',
    nodeEnv: process.env.NODE_ENV || 'development',
  };
}

