import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { TickTickClient } from "../sdk/client.js";

/**
 * Tool: Create project
 *
 * Creates a new project.
 */
export function registerCreateProjectTool(
  server: McpServer,
  getClient: () => Promise<TickTickClient>
) {
  server.registerTool(
    "create_project",
    {
      description: "Create a new project in TickTick.",
      inputSchema: {
        name: z.string().describe("The name of the project"),
        color: z
          .string()
          .optional()
          .describe('Hex color code (e.g., "#ff6b6b")'),
        viewMode: z
          .enum(["list", "kanban", "timeline"])
          .optional()
          .describe("View mode for the project"),
      },
    },
    async ({ name, color, viewMode }) => {
      try {
        const client = await getClient();
        const project = await client.createProject({
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
                  message: `Project "${project.name}" created successfully!`,
                  project: {
                    id: project.id,
                    name: project.name,
                    color: project.color,
                    viewMode: project.viewMode,
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
