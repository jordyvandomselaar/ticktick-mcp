import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { TickTickClient } from "../sdk/client.js";

/**
 * Tool: Delete project
 *
 * Deletes a project.
 */
export function registerDeleteProjectTool(
  server: McpServer,
  getClient: () => Promise<TickTickClient>
) {
  server.registerTool(
    "delete_project",
    {
      description: "Delete a project from TickTick.",
      inputSchema: {
        projectId: z.string().describe("The ID of the project to delete"),
      },
    },
    async ({ projectId }) => {
      try {
        const client = await getClient();
        await client.deleteProject(projectId);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  message: "Project deleted successfully!",
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
