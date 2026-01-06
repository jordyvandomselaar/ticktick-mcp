import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { TickTickClient } from "../sdk/client.js";

/**
 * Tool: Get current user
 *
 * Returns information about the authenticated TickTick user.
 */
export function registerGetUserTool(
  server: McpServer,
  getClient: () => Promise<TickTickClient>
) {
  server.tool(
    "get_user",
    "Get the current authenticated user's information from TickTick.",
    {},
    async () => {
      try {
        const client = await getClient();
        const user = await client.getUser();

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  user: {
                    id: user.id,
                    username: user.username,
                    name: user.name,
                  },
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
