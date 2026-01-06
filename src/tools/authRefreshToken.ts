import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { TickTickOAuth } from "../oauth.js";

/**
 * Tool: Refresh access token
 *
 * Manually refresh the access token using the stored refresh token.
 */
export function registerAuthRefreshTokenTool(
  server: McpServer,
  getOAuthHelper: () => TickTickOAuth
) {
  server.tool(
    "auth_refresh_token",
    "Manually refresh the OAuth access token. Usually not needed as tokens are automatically refreshed when expired.",
    {},
    async () => {
      try {
        const oauth = getOAuthHelper();
        const storedToken = await oauth.loadToken();

        if (!storedToken) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    success: false,
                    error: "Not authenticated. No stored token found.",
                  },
                  null,
                  2
                ),
              },
            ],
            isError: true,
          };
        }

        const newTokens = await oauth.refreshToken(storedToken.refreshToken);
        await oauth.storeToken(newTokens);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  message: "Token refreshed successfully!",
                  expiresIn: newTokens.expires_in,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: false,
                  error: errorMessage,
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }
    }
  );
}
