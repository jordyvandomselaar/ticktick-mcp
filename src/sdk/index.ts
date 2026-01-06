/**
 * TickTick SDK
 *
 * A TypeScript SDK for interacting with the TickTick Open API.
 *
 * @example
 * ```typescript
 * import { TickTickClient, Priority, TaskStatus, ChecklistItemStatus } from './sdk';
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
  Column,

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
  TaskKind,
  Permission,

  // Reminders
  ReminderTrigger,

  // Recurrence
  RecurrenceRule,
  Frequency,
  Weekday,

  // Errors
  ApiErrorResponse,
} from "./types.js";

// =============================================================================
// Enums
// =============================================================================

export { Priority, TaskStatus, ChecklistItemStatus, ViewMode, ProjectKind } from "./types.js";

// =============================================================================
// Reminder Helpers
// =============================================================================

export {
  REMINDER_AT_TIME,
  reminderMinutesBefore,
  reminderHoursBefore,
  reminderDaysBefore,
} from "./types.js";

// =============================================================================
// Recurrence Helpers
// =============================================================================

export {
  repeatDaily,
  repeatWeekly,
  repeatMonthly,
  repeatYearly,
} from "./types.js";

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
