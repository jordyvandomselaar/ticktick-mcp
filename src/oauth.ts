/**
 * TickTick OAuth Helper Module
 *
 * Handles OAuth 2.0 authentication flow for TickTick API:
 * - Building authorization URLs
 * - Token exchange (authorization code -> access token)
 * - Token refresh
 * - File-based token storage
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
import type { TokenResponse, Region } from "./sdk/types.js";

// =============================================================================
// Types
// =============================================================================

/**
 * OAuth configuration for TickTick.
 */
export interface OAuthConfig {
  /** Your application's client ID */
  clientId: string;
  /** Your application's client secret */
  clientSecret: string;
  /** OAuth redirect URI */
  redirectUri: string;
  /** API region: "global" (ticktick.com) or "china" (dida365.com) */
  region?: Region;
}

/**
 * Stored token data with metadata.
 */
export interface StoredToken {
  /** The access token for API requests */
  accessToken: string;
  /** The refresh token for obtaining new access tokens */
  refreshToken: string;
  /** When the access token expires (Unix timestamp in milliseconds) */
  expiresAt: number;
  /** Token type (typically "bearer") */
  tokenType: string;
  /** When the token was stored (Unix timestamp in milliseconds) */
  storedAt: number;
}

/**
 * Authentication status information.
 */
export interface AuthStatus {
  /** Whether the user is authenticated */
  isAuthenticated: boolean;
  /** Whether the access token has expired */
  isExpired: boolean;
  /** When the access token expires (ISO string), if authenticated */
  expiresAt?: string;
  /** Seconds until expiration, if authenticated and not expired */
  expiresIn?: number;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * OAuth URLs for different regions.
 */
const OAUTH_URLS = {
  global: {
    authorize: "https://ticktick.com/oauth/authorize",
    token: "https://ticktick.com/oauth/token",
  },
  china: {
    authorize: "https://dida365.com/oauth/authorize",
    token: "https://dida365.com/oauth/token",
  },
} as const;

/**
 * Default scopes for TickTick OAuth.
 */
const DEFAULT_SCOPES = ["tasks:read", "tasks:write"];

/**
 * Default token storage path.
 */
const DEFAULT_TOKEN_PATH = join(homedir(), ".ticktick-mcp", "tokens.json");

// =============================================================================
// OAuth Helper Class
// =============================================================================

/**
 * TickTick OAuth Helper
 *
 * Provides methods for handling the OAuth 2.0 flow with TickTick.
 *
 * @example
 * ```typescript
 * const oauth = new TickTickOAuth({
 *   clientId: 'your-client-id',
 *   clientSecret: 'your-client-secret',
 *   redirectUri: 'http://localhost:8000/callback',
 *   region: 'global',
 * });
 *
 * // Generate authorization URL
 * const { url, state } = oauth.getAuthorizationUrl();
 *
 * // After user authorizes, exchange code for tokens
 * const tokens = await oauth.exchangeCode(authorizationCode);
 *
 * // Later, refresh the tokens
 * const newTokens = await oauth.refreshToken(tokens.refresh_token);
 * ```
 */
export class TickTickOAuth {
  private readonly config: OAuthConfig;
  private readonly tokenPath: string;
  private readonly oauthUrls: { authorize: string; token: string };

  /**
   * Create a new TickTick OAuth helper.
   *
   * @param config - OAuth configuration
   * @param tokenPath - Optional custom path for token storage
   */
  constructor(config: OAuthConfig, tokenPath?: string) {
    this.config = config;
    this.tokenPath = tokenPath ?? DEFAULT_TOKEN_PATH;
    this.oauthUrls = OAUTH_URLS[config.region ?? "global"];
  }

  // ===========================================================================
  // Authorization URL
  // ===========================================================================

  /**
   * Generate the authorization URL for initiating OAuth flow.
   *
   * @param scopes - Optional array of scopes (defaults to tasks:read tasks:write)
   * @param state - Optional state parameter for CSRF protection (auto-generated if not provided)
   * @returns The authorization URL and the state parameter
   *
   * @example
   * ```typescript
   * const { url, state } = oauth.getAuthorizationUrl();
   * // Redirect user to url
   * // Store state to verify in callback
   * ```
   */
  getAuthorizationUrl(
    scopes?: string[],
    state?: string
  ): { url: string; state: string } {
    const finalState = state ?? generateRandomState();
    const finalScopes = scopes ?? DEFAULT_SCOPES;

    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: "code",
      scope: finalScopes.join(" "),
      state: finalState,
    });

    return {
      url: `${this.oauthUrls.authorize}?${params.toString()}`,
      state: finalState,
    };
  }

  // ===========================================================================
  // Token Exchange
  // ===========================================================================

  /**
   * Exchange an authorization code for access and refresh tokens.
   *
   * @param code - The authorization code from the OAuth callback
   * @returns The token response
   * @throws Error if the token exchange fails
   *
   * @example
   * ```typescript
   * // After user is redirected back with ?code=xxx
   * const tokens = await oauth.exchangeCode(code);
   * console.log(`Access token: ${tokens.access_token}`);
   * ```
   */
  async exchangeCode(code: string): Promise<TokenResponse> {
    const body = new URLSearchParams({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: this.config.redirectUri,
    });

    const response = await fetch(this.oauthUrls.token, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Token exchange failed: HTTP ${response.status}`;
      try {
        const errorJson = JSON.parse(errorText) as {
          error?: string;
          error_description?: string;
        };
        if (errorJson.error_description) {
          errorMessage = `Token exchange failed: ${errorJson.error_description}`;
        } else if (errorJson.error) {
          errorMessage = `Token exchange failed: ${errorJson.error}`;
        }
      } catch {
        // Use default error message
      }
      throw new Error(errorMessage);
    }

    const tokens = (await response.json()) as TokenResponse;
    return tokens;
  }

  // ===========================================================================
  // Token Refresh
  // ===========================================================================

  /**
   * Refresh an expired access token using the refresh token.
   *
   * @param refreshToken - The refresh token
   * @returns The new token response
   * @throws Error if the token refresh fails
   *
   * @example
   * ```typescript
   * const newTokens = await oauth.refreshToken(storedToken.refreshToken);
   * await oauth.storeToken(newTokens);
   * ```
   */
  async refreshToken(refreshToken: string): Promise<TokenResponse> {
    const body = new URLSearchParams({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    });

    const response = await fetch(this.oauthUrls.token, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Token refresh failed: HTTP ${response.status}`;
      try {
        const errorJson = JSON.parse(errorText) as {
          error?: string;
          error_description?: string;
        };
        if (errorJson.error_description) {
          errorMessage = `Token refresh failed: ${errorJson.error_description}`;
        } else if (errorJson.error) {
          errorMessage = `Token refresh failed: ${errorJson.error}`;
        }
      } catch {
        // Use default error message
      }
      throw new Error(errorMessage);
    }

    const tokens = (await response.json()) as TokenResponse;
    return tokens;
  }

  // ===========================================================================
  // Token Storage
  // ===========================================================================

  /**
   * Store tokens to the file system.
   *
   * @param tokens - The token response to store
   *
   * @example
   * ```typescript
   * const tokens = await oauth.exchangeCode(code);
   * await oauth.storeToken(tokens);
   * ```
   */
  async storeToken(tokens: TokenResponse): Promise<void> {
    const storedToken: StoredToken = {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: Date.now() + tokens.expires_in * 1000,
      tokenType: tokens.token_type,
      storedAt: Date.now(),
    };

    // Ensure directory exists
    const dir = dirname(this.tokenPath);
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }

    await writeFile(this.tokenPath, JSON.stringify(storedToken, null, 2), {
      encoding: "utf-8",
      mode: 0o600, // Only owner can read/write
    });
  }

  /**
   * Load stored tokens from the file system.
   *
   * @returns The stored token data, or null if not found
   *
   * @example
   * ```typescript
   * const storedToken = await oauth.loadToken();
   * if (storedToken && !oauth.isTokenExpired(storedToken)) {
   *   // Use the token
   * }
   * ```
   */
  async loadToken(): Promise<StoredToken | null> {
    if (!existsSync(this.tokenPath)) {
      return null;
    }

    try {
      const content = await readFile(this.tokenPath, { encoding: "utf-8" });
      const storedToken = JSON.parse(content) as StoredToken;
      return storedToken;
    } catch {
      return null;
    }
  }

  /**
   * Clear stored tokens from the file system.
   *
   * @example
   * ```typescript
   * await oauth.clearToken();
   * ```
   */
  async clearToken(): Promise<void> {
    if (existsSync(this.tokenPath)) {
      await writeFile(this.tokenPath, "", { encoding: "utf-8" });
    }
  }

  /**
   * Check if a stored token is expired.
   *
   * @param storedToken - The stored token to check
   * @param bufferSeconds - Buffer time before actual expiration (default: 60 seconds)
   * @returns True if the token is expired or will expire within the buffer time
   */
  isTokenExpired(storedToken: StoredToken, bufferSeconds = 60): boolean {
    const bufferMs = bufferSeconds * 1000;
    return Date.now() >= storedToken.expiresAt - bufferMs;
  }

  /**
   * Get authentication status.
   *
   * @returns The current authentication status
   *
   * @example
   * ```typescript
   * const status = await oauth.getAuthStatus();
   * if (status.isAuthenticated && !status.isExpired) {
   *   console.log(`Token expires in ${status.expiresIn} seconds`);
   * }
   * ```
   */
  async getAuthStatus(): Promise<AuthStatus> {
    const storedToken = await this.loadToken();

    if (!storedToken) {
      return {
        isAuthenticated: false,
        isExpired: true,
      };
    }

    const isExpired = this.isTokenExpired(storedToken);
    const expiresAt = new Date(storedToken.expiresAt).toISOString();
    const expiresIn = isExpired
      ? 0
      : Math.floor((storedToken.expiresAt - Date.now()) / 1000);

    return {
      isAuthenticated: true,
      isExpired,
      expiresAt,
      expiresIn,
    };
  }

  /**
   * Get a valid access token, refreshing if necessary.
   *
   * This method will:
   * 1. Load the stored token
   * 2. If expired or about to expire, refresh it
   * 3. Return the valid access token
   *
   * @returns The valid access token
   * @throws Error if no token is stored or refresh fails
   *
   * @example
   * ```typescript
   * const accessToken = await oauth.getValidAccessToken();
   * // Use accessToken for API requests
   * ```
   */
  async getValidAccessToken(): Promise<string> {
    const storedToken = await this.loadToken();

    if (!storedToken) {
      throw new Error(
        "Not authenticated. Please complete the OAuth flow first."
      );
    }

    // Check if token needs refresh (with 60 second buffer)
    if (this.isTokenExpired(storedToken)) {
      try {
        const newTokens = await this.refreshToken(storedToken.refreshToken);
        await this.storeToken(newTokens);
        return newTokens.access_token;
      } catch (error) {
        throw new Error(
          `Failed to refresh token: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    return storedToken.accessToken;
  }

  /**
   * Get the token storage path.
   */
  getTokenPath(): string {
    return this.tokenPath;
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Generate a random state string for CSRF protection.
 */
function generateRandomState(): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  const randomValues = new Uint8Array(32);
  crypto.getRandomValues(randomValues);
  for (const value of randomValues) {
    result += chars[value % chars.length];
  }
  return result;
}

/**
 * Create an OAuth helper from environment variables.
 *
 * Expected environment variables:
 * - TICKTICK_CLIENT_ID
 * - TICKTICK_CLIENT_SECRET
 * - TICKTICK_REDIRECT_URI (optional, defaults to http://localhost:8000/callback)
 * - TICKTICK_REGION (optional, defaults to "global")
 * - TICKTICK_TOKEN_PATH (optional, defaults to ~/.ticktick-mcp/tokens.json)
 *
 * @returns A configured TickTickOAuth instance
 * @throws Error if required environment variables are not set
 */
export function createOAuthFromEnv(): TickTickOAuth {
  const clientId = process.env.TICKTICK_CLIENT_ID;
  const clientSecret = process.env.TICKTICK_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      "Missing required environment variables: TICKTICK_CLIENT_ID and TICKTICK_CLIENT_SECRET must be set"
    );
  }

  const config: OAuthConfig = {
    clientId,
    clientSecret,
    redirectUri:
      process.env.TICKTICK_REDIRECT_URI ?? "http://localhost:8000/callback",
    region: (process.env.TICKTICK_REGION as Region) ?? "global",
  };

  const tokenPath = process.env.TICKTICK_TOKEN_PATH;

  return new TickTickOAuth(config, tokenPath);
}
