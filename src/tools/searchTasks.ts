import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { TickTickClient } from "../sdk/client.js";

/**
 * Tool: Search tasks
 *
 * Search for tasks by keyword across all projects.
 */
export function registerSearchTasksTool(
  server: McpServer,
  getClient: () => Promise<TickTickClient>
) {
  server.registerTool(
    "search_tasks",
    {
      description: "Search for tasks by keyword across all projects. Useful for finding tasks by text content.",
      inputSchema: {
        query: z.string().describe("Search term (required)"),
        searchIn: z.array(z.enum(['title', 'content', 'desc'])).optional().describe("Fields to search in (default: ['title', 'content'])"),
        projectIds: z.array(z.string()).optional().describe("Optional: limit to specific project IDs"),
        status: z.enum(['active', 'completed', 'all']).optional().describe("Task status filter (default: 'active')"),
        caseSensitive: z.boolean().optional().describe("Case-sensitive search (default: false)"),
        limit: z.number().optional().describe("Maximum results to return (default: 20)"),
      },
    },
    async ({ query, searchIn = ['title', 'content'], projectIds, status = 'active', caseSensitive = false, limit = 20 }) => {
      try {
        const client = await getClient();

        const searchQuery = caseSensitive ? query : query.toLowerCase();
        let allTasks: any[] = [];

        if (projectIds && projectIds.length > 0) {
          // Search in specific projects
          for (const projectId of projectIds) {
            try {
              const data = await client.getProjectWithTasks(projectId);
              const tasksWithProject = data.tasks.map(t => ({
                ...t,
                projectName: data.project.name,
              }));
              allTasks = allTasks.concat(tasksWithProject);
            } catch {
              continue;
            }
          }
        } else {
          // Search all projects
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

        // Filter by status
        let filteredTasks = allTasks;
        if (status === 'active') {
          filteredTasks = filteredTasks.filter(t => t.status === 0);
        } else if (status === 'completed') {
          filteredTasks = filteredTasks.filter(t => t.status === 2);
        }

        // Search and collect matches
        const matches: any[] = [];
        for (const task of filteredTasks) {
          const matchedIn: string[] = [];

          for (const field of searchIn) {
            let fieldValue = '';
            if (field === 'title') fieldValue = task.title || '';
            else if (field === 'content') fieldValue = task.content || '';
            else if (field === 'desc') fieldValue = task.desc || '';

            const searchText = caseSensitive ? fieldValue : fieldValue.toLowerCase();
            if (searchText.includes(searchQuery)) {
              matchedIn.push(field);
            }
          }

          if (matchedIn.length > 0) {
            matches.push({
              ...task,
              matchedIn,
            });
          }

          if (matches.length >= limit) break;
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  query: query,
                  count: matches.length,
                  tasks: matches.map(t => ({
                    id: t.id,
                    title: t.title,
                    projectId: t.projectId,
                    projectName: t.projectName,
                    content: t.content,
                    dueDate: t.dueDate,
                    priority: t.priority,
                    status: t.status,
                    tags: t.tags,
                    matchedIn: t.matchedIn,
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
