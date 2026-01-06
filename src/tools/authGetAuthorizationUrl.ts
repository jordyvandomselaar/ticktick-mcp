import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { TickTickOAuth } from "../oauth.js";

/**
 * Tool: Get OAuth authorization URL
 *
 * Returns the URL that users should visit to authorize the application.
 * This initiates the OAuth 2.0 authorization code flow.
 */
export function registerAuthGetAuthorizationUrlTool(
  server: McpServer,
  getOAuthHelper: () => TickTickOAuth
) {
  server.tool(
    "auth_get_authorization_url",
    "Get the OAuth authorization URL for TickTick. Returns a URL that the user should visit in their browser to authorize the application.",
    {},
    async () => {
      try {
        const oauth = getOAuthHelper();
        const { url, state } = oauth.getAuthorizationUrl();

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  authorizationUrl: url,
                  state: state,
                  instructions: [
                    "1. Open the authorization URL in your browser",
                    "2. Log in to TickTick and authorize the application",
                    "3. After authorization, you will be redirected to a URL containing a 'code' parameter",
                    "4. Copy the 'code' value from the URL",
                    "5. Use the auth_exchange_code tool with the code to complete authentication",
                  ],
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
                  hint: "Make sure TICKTICK_CLIENT_ID and TICKTICK_CLIENT_SECRET environment variables are set",
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
