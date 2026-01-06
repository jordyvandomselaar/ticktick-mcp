import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { TickTickClient } from "../sdk/client.js";

/**
 * Tool: Get project by ID (metadata only)
 *
 * Returns a specific project's metadata without its tasks.
 */
export function registerGetProjectByIdTool(
  server: McpServer,
  getClient: () => Promise<TickTickClient>
) {
  server.registerTool(
    "get_project_by_id",
    {
      description: "Get a specific project's metadata by ID (without tasks). Use this when you only need project info, not its tasks.",
      inputSchema: {
        projectId: z.string().describe("The ID of the project to retrieve"),
      },
    },
    async ({ projectId }) => {
      try {
        const client = await getClient();
        const project = await client.getProject(projectId);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  project: {
                    id: project.id,
                    name: project.name,
                    color: project.color,
                    viewMode: project.viewMode,
                    closed: project.closed,
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
