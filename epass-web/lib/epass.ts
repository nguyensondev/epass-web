// ePass API configuration and token management
export const EPASS_CONFIG = {
  baseURL: 'https://backend.epass-vdtc.com.vn/doisoat2/api/v1',
  crmBaseURL: 'https://backend.epass-vdtc.com.vn/crm2/api/v1',
  tokenURL: 'https://login.epass-vdtc.com.vn/auth/realms/etc-internal/protocol/openid-connect/token',
  clientId: 'mobile-app-chupt',
  customerId: process.env.EPASS_CUSTOMER_ID || '1560176',
  contractId: process.env.EPASS_CONTRACT_ID || '1945130',
};

// Custom error class for token-related errors
export class EPassTokenError extends Error {
  constructor(message: string, public readonly isAuthError: boolean = true) {
    super(message);
    this.name = 'EPassTokenError';
  }
}

// In-memory token cache (server-side only)
let tokenCache: {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
} | null = null;

// Initialize token from Supabase -> Local file -> Environment (in priority order)
async function initializeToken() {
  if (tokenCache) return tokenCache;

  let accessToken: string | undefined;
  let refreshToken: string | undefined;

  // Try Supabase first (highest priority)
  try {
    const { getEpassTokens: getSupabaseTokens } = await import('./db-supabase');
    const tokens = await getSupabaseTokens();
    if (tokens) {
      accessToken = tokens.accessToken;
      refreshToken = tokens.refreshToken;
      console.log('Loaded ePass tokens from Supabase');
    }
  } catch (error) {
    console.log('Supabase not available or tokens not found, trying local file...');
  }

  // Fallback to local file if Supabase didn't have tokens
  if (!accessToken || !refreshToken) {
    try {
      const { getEpassTokens: getLocalTokens } = await import('./db-fs');
      const tokens = await getLocalTokens();
      if (tokens) {
        accessToken = tokens.accessToken;
        refreshToken = tokens.refreshToken;
        console.log('Loaded ePass tokens from local file');
      }
    } catch (error) {
      console.log('Local file not available or tokens not found, trying environment...');
    }
  }

  // Fallback to environment variables
  if (!accessToken || !refreshToken) {
    accessToken = process.env.EPASS_TOKEN;
    refreshToken = process.env.EPASS_REFRESH_TOKEN;
    if (accessToken && refreshToken) {
      console.log('Loaded ePass tokens from environment variables');
    }
  }

  if (!accessToken || !refreshToken) {
    throw new Error('EPASS_TOKEN and EPASS_REFRESH_TOKEN must be set in environment variables or stored in Supabase/local file');
  }

  // Decode JWT to get expiration
  const decoded = JSON.parse(Buffer.from(accessToken.split('.')[1], 'base64').toString());
  const expiresAt = decoded.exp * 1000; // Convert to milliseconds

  tokenCache = {
    accessToken,
    refreshToken,
    expiresAt,
  };

  return tokenCache;
}

// Check if token needs refresh (5 minute buffer)
async function needsRefresh(): Promise<boolean> {
  const cache = await initializeToken();
  return Date.now() >= cache.expiresAt - 5 * 60 * 1000;
}

// Refresh access token using refresh token
async function refreshAccessToken(): Promise<string> {
  const cache = await initializeToken();

  const response = await fetch(EPASS_CONFIG.tokenURL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: cache.refreshToken,
      client_id: EPASS_CONFIG.clientId,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    // Check if it's an invalid grant error (refresh token expired)
    if (response.status === 400 || response.status === 401) {
      console.error('Refresh token expired or invalid. Attempting re-authentication...');
      // Try re-authentication instead of throwing error
      return await reAuthenticate();
    }
    throw new Error(`Failed to refresh token: ${response.status} ${error}`);
  }

  const data = await response.json();

  // Update cache with new tokens
  tokenCache = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || cache.refreshToken,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  // Save new tokens to Supabase if available, otherwise to local file
  try {
    const { setEpassTokens: setSupabaseTokens } = await import('./db-supabase');
    await setSupabaseTokens(tokenCache.accessToken, tokenCache.refreshToken);
    console.log('Saved refreshed tokens to Supabase');
  } catch (error) {
    try {
      const { setEpassTokens: setLocalTokens } = await import('./db-fs');
      await setLocalTokens(tokenCache.accessToken, tokenCache.refreshToken);
      console.log('Saved refreshed tokens to local file');
    } catch (localError) {
      console.log('Could not save tokens to storage:', localError);
    }
  }

  return tokenCache.accessToken;
}

// Re-authenticate using username/password credentials
async function reAuthenticate(): Promise<string> {
  try {
    // Get credentials from Supabase
    const { getEpassCredentials } = await import('./db-supabase');
    const credentials = await getEpassCredentials();

    if (!credentials) {
      // Try environment variables as fallback
      const username = process.env.EPASS_USERNAME;
      const password = process.env.EPASS_PASSWORD;

      if (!username || !password) {
        throw new EPassTokenError(
          'Không tìm thấy thông tin đăng nhập. Vui lòng cấu hình tài khoản ePass.',
          true
        );
      }

      console.log('Using credentials from environment variables for re-authentication');
      return await authenticateWithCredentials(username, password);
    }

    console.log('Using credentials from Supabase for re-authentication');
    return await authenticateWithCredentials(credentials.username, credentials.password);
  } catch (error) {
    if (error instanceof EPassTokenError) {
      throw error;
    }
    throw new EPassTokenError(
      'Không thể đăng nhập lại. Vui lòng kiểm tra thông tin đăng nhập.',
      true
    );
  }
}

// Authenticate with username/password and save tokens
async function authenticateWithCredentials(username: string, password: string): Promise<string> {
  const response = await fetch(EPASS_CONFIG.tokenURL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'password',
      client_id: EPASS_CONFIG.clientId,
      username,
      password,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Re-authentication failed:', response.status, error);
    throw new EPassTokenError(
      'Đăng nhập thất bại. Vui lòng kiểm tra tên đăng nhập và mật khẩu.',
      true
    );
  }

  const data = await response.json();

  // Update cache with new tokens
  tokenCache = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  // Save new tokens to Supabase if available, otherwise to local file
  try {
    const { setEpassTokens: setSupabaseTokens } = await import('./db-supabase');
    await setSupabaseTokens(tokenCache.accessToken, tokenCache.refreshToken);
    console.log('Successfully re-authenticated and saved new tokens to Supabase');
  } catch (error) {
    try {
      const { setEpassTokens: setLocalTokens } = await import('./db-fs');
      await setLocalTokens(tokenCache.accessToken, tokenCache.refreshToken);
      console.log('Successfully re-authenticated and saved new tokens to local file');
    } catch (localError) {
      console.log('Could not save tokens to storage:', localError);
    }
  }

  return tokenCache.accessToken;
}

// Get valid access token (refresh if needed)
export async function getAccessToken(): Promise<string> {
  const cache = await initializeToken();

  if (await needsRefresh()) {
    return await refreshAccessToken();
  }

  return cache.accessToken;
}

// Make authenticated request to ePass API
export async function fetchEPASS(endpoint: string, options?: RequestInit): Promise<Response> {
  const url = endpoint.startsWith('http')
    ? endpoint
    : `${EPASS_CONFIG.baseURL}${endpoint}`;

  try {
    const token = await getAccessToken();

    const response = await fetch(url, {
      ...options,
      headers: {
        ...options?.headers,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    // If unauthorized, try refreshing token once
    if (response.status === 401) {
      console.log('Access token expired, attempting refresh...');
      const newToken = await refreshAccessToken();

      // Retry with new token
      return fetch(url, {
        ...options,
        headers: {
          ...options?.headers,
          Authorization: `Bearer ${newToken}`,
          'Content-Type': 'application/json',
        },
      });
    }

    return response;
  } catch (error) {
    // Re-throw token errors so they can be properly handled by the caller
    if (error instanceof EPassTokenError) {
      throw error;
    }
    // Wrap other errors
    throw error;
  }
}
