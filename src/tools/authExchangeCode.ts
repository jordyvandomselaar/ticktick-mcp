import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { TickTickOAuth } from "../oauth.js";

/**
 * Tool: Exchange authorization code for tokens
 *
 * Exchanges an authorization code (from the OAuth callback) for access and refresh tokens.
 */
export function registerAuthExchangeCodeTool(
  server: McpServer,
  getOAuthHelper: () => TickTickOAuth
) {
  server.tool(
    "auth_exchange_code",
    "Exchange an OAuth authorization code for access tokens. Use this after the user has authorized the application and received a code.",
    {
      code: z.string().describe("The authorization code from the OAuth callback URL"),
    },
    async ({ code }) => {
      try {
        const oauth = getOAuthHelper();
        const tokens = await oauth.exchangeCode(code);
        await oauth.storeToken(tokens);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  message: "Authentication successful! Tokens have been stored.",
                  expiresIn: tokens.expires_in,
                  tokenType: tokens.token_type,
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
