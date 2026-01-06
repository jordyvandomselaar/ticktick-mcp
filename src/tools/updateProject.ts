import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { TickTickClient } from "../sdk/client.js";

/**
 * Tool: Update project
 *
 * Updates an existing project.
 */
export function registerUpdateProjectTool(
  server: McpServer,
  getClient: () => Promise<TickTickClient>
) {
  server.tool(
    "update_project",
    "Update an existing project in TickTick.",
    {
      projectId: z.string().describe("The ID of the project to update"),
      name: z.string().optional().describe("New name for the project"),
      color: z
        .string()
        .optional()
        .describe('New hex color code (e.g., "#ff6b6b")'),
      viewMode: z
        .enum(["list", "kanban", "timeline"])
        .optional()
        .describe("New view mode for the project"),
    },
    async ({ projectId, name, color, viewMode }) => {
      try {
        const client = await getClient();
        const project = await client.updateProject(projectId, {
          name,
          color,
          viewMode: viewMode as any,
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  message: `Project "${project.name}" updated successfully!`,
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
