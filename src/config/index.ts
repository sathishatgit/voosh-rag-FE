// Environment configuration utility
export const config = {
  // API Configuration
  API_BASE_URL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000/api',
  API_TIMEOUT: parseInt(process.env.REACT_APP_API_TIMEOUT || '30000', 10),
  
  // Socket Configuration
  SOCKET_URL: process.env.REACT_APP_SOCKET_URL || 'http://localhost:3000',
  SOCKET_PATH: process.env.REACT_APP_SOCKET_PATH || '/ws',
  
  // Development flags
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
} as const;

// Validation function to ensure required environment variables are set
export const validateConfig = (): void => {
  const requiredEnvVars = [
    'REACT_APP_API_BASE_URL',
    'REACT_APP_SOCKET_URL'
  ];

  const missingVars = requiredEnvVars.filter(
    (varName) => !process.env[varName] && !getDefaultValue(varName)
  );

  if (missingVars.length > 0) {
    console.warn(
      `Warning: Missing environment variables: ${missingVars.join(', ')}. Using default values.`
    );
  }

  // Log configuration in development
  if (config.isDevelopment) {
    console.log('🔧 Application Configuration:', {
      apiBaseUrl: config.API_BASE_URL,
      socketUrl: config.SOCKET_URL,
      socketPath: config.SOCKET_PATH,
      timeout: config.API_TIMEOUT,
      environment: process.env.NODE_ENV
    });
  }
};

const getDefaultValue = (varName: string): string | undefined => {
  const defaults: Record<string, string> = {
    'REACT_APP_API_BASE_URL': 'http://localhost:3000/api',
    'REACT_APP_SOCKET_URL': 'http://localhost:3000',
    'REACT_APP_SOCKET_PATH': '/ws',
    'REACT_APP_API_TIMEOUT': '30000'
  };
  return defaults[varName];
};

export default config;