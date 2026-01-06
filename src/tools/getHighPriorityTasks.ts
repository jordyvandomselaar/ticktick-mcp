import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { TickTickClient } from "../sdk/client.js";

/**
 * Tool: Get high priority tasks
 *
 * Returns high priority tasks across all projects.
 */
export function registerGetHighPriorityTasksTool(
  server: McpServer,
  getClient: () => Promise<TickTickClient>
) {
  server.tool(
    "get_high_priority_tasks",
    "Get high priority tasks across all projects. Useful for finding the most important work.",
    {
      minPriority: z.number().optional().describe("Minimum priority level: 0=None, 1=Low, 3=Medium, 5=High (default: 3)"),
      projectId: z.string().optional().describe("Optional: limit to a specific project"),
      includeCompleted: z.boolean().optional().describe("Include completed tasks (default: false)"),
      limit: z.number().optional().describe("Maximum results to return (default: 10)"),
    },
    async ({ minPriority = 3, projectId, includeCompleted = false, limit = 10 }) => {
      try {
        const client = await getClient();

        let allTasks: any[] = [];

        if (projectId) {
          // Fetch tasks from specific project
          const data = await client.getProjectWithTasks(projectId);
          allTasks = data.tasks.map(t => ({
            ...t,
            projectName: data.project.name,
          }));
        } else {
          // Fetch all projects and their tasks
          const projects = await client.listProjects();
          for (const project of projects) {
            if (!project.closed) {
              try {
                const data = await client.getProjectWithTasks(project.id);
                const tasksWithProject = data.tasks.map(t => ({
                  ...t,
                  projectName: project.name,
                }));
                allTasks = allTasks.concat(tasksWithProject);
              } catch {
                continue;
              }
            }
          }
        }

        // Filter tasks
        let filteredTasks = allTasks;

        // Filter by completion status
        if (!includeCompleted) {
          filteredTasks = filteredTasks.filter(t => t.status === 0);
        }

        // Filter by priority
        filteredTasks = filteredTasks.filter(t => t.priority >= minPriority);

        // Sort by priority desc (high first), then by dueDate asc (earliest first)
        filteredTasks.sort((a, b) => {
          // First sort by priority (descending)
          if (a.priority !== b.priority) {
            return b.priority - a.priority;
          }
          // Then by due date (ascending, nulls last)
          if (a.dueDate && b.dueDate) {
            return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
          }
          if (a.dueDate) return -1;
          if (b.dueDate) return 1;
          return 0;
        });

        // Apply limit
        filteredTasks = filteredTasks.slice(0, limit);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  count: filteredTasks.length,
                  minPriority,
                  tasks: filteredTasks.map(t => ({
                    id: t.id,
                    title: t.title,
                    projectId: t.projectId,
                    projectName: t.projectName,
                    dueDate: t.dueDate,
                    priority: t.priority,
                    status: t.status,
                    content: t.content,
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
