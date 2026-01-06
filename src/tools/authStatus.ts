import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { TickTickOAuth } from "../oauth.js";

/**
 * Tool: Check authentication status
 *
 * Returns information about the current authentication state.
 */
export function registerAuthStatusTool(
  server: McpServer,
  getOAuthHelper: () => TickTickOAuth
) {
  server.tool(
    "auth_status",
    "Check the current authentication status. Shows whether the user is authenticated and when the token expires.",
    {},
    async () => {
      try {
        const oauth = getOAuthHelper();
        const status = await oauth.getAuthStatus();

        if (!status.isAuthenticated) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    success: true,
                    isAuthenticated: false,
                    message:
                      "Not authenticated. Use auth_get_authorization_url to start the OAuth flow.",
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  isAuthenticated: true,
                  isExpired: status.isExpired,
                  expiresAt: status.expiresAt,
                  expiresIn: status.expiresIn,
                  message: status.isExpired
                    ? "Token is expired. It will be automatically refreshed on next API call."
                    : `Token is valid for ${status.expiresIn} more seconds.`,
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
