/**
 * TickTick SDK
 *
 * A TypeScript SDK for interacting with the TickTick Open API.
 *
 * @example
 * ```typescript
 * import { TickTickClient, Priority, Status } from './sdk';
 *
 * const client = new TickTickClient({
 *   accessToken: 'your-oauth-access-token',
 *   region: 'global',
 * });
 *
 * // Get user info
 * const user = await client.getUser();
 *
 * // List projects
 * const projects = await client.listProjects();
 *
 * // Create a task
 * const task = await client.createTask({
 *   title: 'My task',
 *   projectId: projects[0].id,
 *   priority: Priority.High,
 * });
 *
 * // Complete the task
 * await client.completeTask(task.projectId, task.id);
 * ```
 *
 * @packageDocumentation
 */

// =============================================================================
// Client
// =============================================================================

export { TickTickClient } from "./client.js";

// =============================================================================
// Types
// =============================================================================

export type {
  // User
  User,

  // Project
  Project,
  CreateProjectInput,
  UpdateProjectInput,
  ProjectWithTasks,

  // Task
  Task,
  CreateTaskInput,
  UpdateTaskInput,
  BatchCreateTasksInput,

  // Checklist Item
  ChecklistItem,
  ChecklistItemInput,

  // OAuth
  TokenResponse,
  OAuthError,

  // Configuration
  TickTickClientConfig,
  Region,
  ViewMode,
  ProjectKind,
  TaskKind,

  // Errors
  ApiErrorResponse,
} from "./types.js";

// =============================================================================
// Enums
// =============================================================================

export { Priority, Status } from "./types.js";

// =============================================================================
// Error Classes
// =============================================================================

export {
  TickTickError,
  TickTickApiError,
  TickTickAuthError,
  TickTickForbiddenError,
  TickTickNotFoundError,
  TickTickRateLimitError,
  TickTickBadRequestError,
  TickTickTimeoutError,
  TickTickNetworkError,
  createErrorFromResponse,
} from "./errors.js";
