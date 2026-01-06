import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { TickTickClient } from "../sdk/client.js";

/**
 * Tool: Delete task
 *
 * Deletes a task.
 */
export function registerDeleteTaskTool(
  server: McpServer,
  getClient: () => Promise<TickTickClient>
) {
  server.tool(
    "delete_task",
    "Delete a task from TickTick.",
    {
      projectId: z.string().describe("The project ID containing the task"),
      taskId: z.string().describe("The ID of the task to delete"),
    },
    async ({ projectId, taskId }) => {
      try {
        const client = await getClient();
        await client.deleteTask(projectId, taskId);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  message: "Task deleted successfully!",
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
