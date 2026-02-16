// ePass API configuration and token management
export const EPASS_CONFIG = {
  baseURL: 'https://backend.epass-vdtc.com.vn/doisoat2/api/v1',
  crmBaseURL: 'https://backend.epass-vdtc.com.vn/crm2/api/v1',
  tokenURL: 'https://login.epass-vdtc.com.vn/auth/realms/etc-internal/protocol/openid-connect/token',
  clientId: 'mobile-app-chupt',
  customerId: process.env.EPASS_CUSTOMER_ID || '1560176',
  contractId: process.env.EPASS_CONTRACT_ID || '1945130',
};

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
  const token = await getAccessToken();

  const url = endpoint.startsWith('http')
    ? endpoint
    : `${EPASS_CONFIG.baseURL}${endpoint}`;

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
}
