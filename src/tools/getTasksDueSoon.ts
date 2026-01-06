import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { TickTickClient } from "../sdk/client.js";

/**
 * Tool: Get tasks due soon
 *
 * Returns tasks due within a specified number of days across all projects.
 */
export function registerGetTasksDueSoonTool(
  server: McpServer,
  getClient: () => Promise<TickTickClient>
) {
  server.registerTool(
    "get_tasks_due_soon",
    {
      description: "Get tasks that are due soon (within the next N days). Useful for finding urgent work across all projects.",
      inputSchema: {
        days: z.number().optional().describe("Number of days to look ahead (default: 7)"),
        includeOverdue: z.boolean().optional().describe("Include past-due tasks (default: true)"),
        projectId: z.string().optional().describe("Optional: limit to a specific project"),
        status: z.enum(['active', 'all']).optional().describe("Task status filter (default: 'active')"),
      },
    },
    async ({ days = 7, includeOverdue = true, projectId, status = 'active' }) => {
      try {
        const client = await getClient();

        // Calculate date range
        const now = new Date();
        const futureDate = new Date();
        futureDate.setDate(now.getDate() + days);

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
            if (!project.closed) { // Skip archived projects
              try {
                const data = await client.getProjectWithTasks(project.id);
                const tasksWithProject = data.tasks.map(t => ({
                  ...t,
                  projectName: project.name,
                }));
                allTasks = allTasks.concat(tasksWithProject);
              } catch {
                // Skip projects that can't be fetched
                continue;
              }
            }
          }
        }

        // Filter tasks
        let filteredTasks = allTasks;

        // Filter by status
        if (status === 'active') {
          filteredTasks = filteredTasks.filter(t => t.status === 0);
        }

        // Filter by due date
        filteredTasks = filteredTasks.filter(t => {
          if (!t.dueDate) return false;

          const dueDate = new Date(t.dueDate);
          const isOverdue = dueDate < now;
          const isDueSoon = dueDate >= now && dueDate <= futureDate;

          if (includeOverdue && isOverdue) return true;
          if (isDueSoon) return true;
          return false;
        });

        // Sort by due date ascending (earliest first)
        filteredTasks.sort((a, b) => {
          const aDate = new Date(a.dueDate).getTime();
          const bDate = new Date(b.dueDate).getTime();
          return aDate - bDate;
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  count: filteredTasks.length,
                  daysAhead: days,
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
