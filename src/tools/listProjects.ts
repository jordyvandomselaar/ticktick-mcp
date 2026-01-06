import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { TickTickClient } from "../sdk/client.js";

/**
 * Tool: List all projects
 *
 * Returns all projects for the authenticated user.
 */
export function registerListProjectsTool(
  server: McpServer,
  getClient: () => Promise<TickTickClient>
) {
  server.registerTool(
    "list_projects",
    {
      description: "List all projects in the user's TickTick account with optional filtering. By default, only returns active (non-archived) projects.",
      inputSchema: {
        includeArchived: z.boolean().optional().describe("Include archived/closed projects (default: false)"),
        kind: z.enum(['TASK', 'NOTE']).optional().describe("Filter by project type"),
        viewMode: z.enum(['list', 'kanban', 'timeline']).optional().describe("Filter by view mode"),
        search: z.string().optional().describe("Text search in project name (case-insensitive)"),
        limit: z.number().optional().describe("Maximum number of projects to return"),
      },
    },
    async ({ includeArchived, kind, viewMode, search, limit }) => {
      try {
        const client = await getClient();
        let projects = await client.listProjects();

        // Filter out archived projects by default
        if (!includeArchived) {
          projects = projects.filter(p => !p.closed);
        }

        // Filter by kind
        if (kind) {
          projects = projects.filter(p => p.kind === kind);
        }

        // Filter by viewMode
        if (viewMode) {
          projects = projects.filter(p => p.viewMode === viewMode);
        }

        // Filter by search text
        if (search) {
          const searchLower = search.toLowerCase();
          projects = projects.filter(p => p.name.toLowerCase().includes(searchLower));
        }

        // Apply limit
        if (limit && limit > 0) {
          projects = projects.slice(0, limit);
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  count: projects.length,
                  projects: projects.map((p) => ({
                    id: p.id,
                    name: p.name,
                    color: p.color,
                    viewMode: p.viewMode,
                    closed: p.closed,
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
