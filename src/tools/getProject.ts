import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { TickTickClient } from "../sdk/client.js";

/**
 * Tool: Get project with tasks
 *
 * Returns a specific project and all its tasks.
 */
export function registerGetProjectTool(
  server: McpServer,
  getClient: () => Promise<TickTickClient>
) {
  server.tool(
    "get_project",
    "Get a specific project and all its tasks.",
    {
      projectId: z.string().describe("The ID of the project to retrieve"),
    },
    async ({ projectId }) => {
      try {
        const client = await getClient();
        const data = await client.getProjectWithTasks(projectId);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  project: {
                    id: data.project.id,
                    name: data.project.name,
                    color: data.project.color,
                    viewMode: data.project.viewMode,
                    closed: data.project.closed,
                  },
                  taskCount: data.tasks.length,
                  tasks: data.tasks.map((t) => ({
                    id: t.id,
                    title: t.title,
                    content: t.content,
                    priority: t.priority,
                    status: t.status,
                    dueDate: t.dueDate,
                    tags: t.tags,
                  })),
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
