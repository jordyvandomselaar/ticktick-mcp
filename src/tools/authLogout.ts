import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { TickTickOAuth } from "../oauth.js";

/**
 * Tool: Logout / Clear tokens
 *
 * Remove stored authentication tokens.
 */
export function registerAuthLogoutTool(
  server: McpServer,
  getOAuthHelper: () => TickTickOAuth
) {
  server.tool(
    "auth_logout",
    "Remove stored authentication tokens. This will log out the user from the TickTick integration.",
    {},
    async () => {
      try {
        const oauth = getOAuthHelper();
        await oauth.clearToken();

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  message:
                    "Logged out successfully. Stored tokens have been cleared.",
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
