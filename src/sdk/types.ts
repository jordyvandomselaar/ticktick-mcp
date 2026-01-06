/**
 * TickTick SDK Types
 *
 * TypeScript interfaces and types for the TickTick API.
 * Based on the official TickTick Open API documentation.
 */

// =============================================================================
// Enums and Constants
// =============================================================================

/**
 * Task priority levels.
 * Values match TickTick API: 0=None, 1=Low, 3=Medium, 5=High
 */
export enum Priority {
  /** No priority set (default) */
  None = 0,
  /** Low priority - can wait */
  Low = 1,
  /** Medium priority - should be done soon */
  Medium = 3,
  /** High priority - urgent/important */
  High = 5,
}

/**
 * Task status.
 * Note: Task and ChecklistItem have different completed values.
 */
export enum TaskStatus {
  /** Task is active and not yet completed */
  Active = 0,
  /** Task has been completed */
  Completed = 2,
}

/**
 * Checklist item status.
 */
export enum ChecklistItemStatus {
  /** Subtask is unchecked/incomplete */
  Unchecked = 0,
  /** Subtask is checked/complete */
  Checked = 1,
}

/**
 * Project view modes available in TickTick.
 */
export enum ViewMode {
  /** Traditional list view - tasks in a vertical list */
  List = 'list',
  /** Kanban board view - tasks in columns by status */
  Kanban = 'kanban',
  /** Timeline/Gantt view - tasks on a calendar timeline */
  Timeline = 'timeline',
}

/**
 * Types of projects in TickTick.
 */
export enum ProjectKind {
  /** Standard task list project */
  Task = 'TASK',
  /** Note-taking project */
  Note = 'NOTE',
}

/**
 * Task kind.
 */
export type TaskKind = "TEXT" | "NOTE" | "CHECKLIST";

/**
 * Project permission level.
 */
export type Permission = "read" | "write" | "comment";

/**
 * API region configuration.
 */
export type Region = "global" | "china";

// =============================================================================
// Reminder Helpers
// =============================================================================

/**
 * Reminder trigger in iCalendar TRIGGER format.
 * Examples: 'TRIGGER:PT0S' (at time), 'TRIGGER:-PT15M' (15 minutes before)
 */
export type ReminderTrigger = string;

/**
 * Reminder at the exact time of the task.
 */
export const REMINDER_AT_TIME: ReminderTrigger = "TRIGGER:PT0S";

/**
 * Create a reminder trigger for X minutes before the task.
 *
 * @param minutes - Number of minutes before the task (positive number)
 * @returns iCalendar TRIGGER string
 *
 * @example
 * ```typescript
 * reminderMinutesBefore(15)  // 15 minutes before
 * reminderMinutesBefore(30)  // 30 minutes before
 * ```
 */
export function reminderMinutesBefore(minutes: number): ReminderTrigger {
  return `TRIGGER:-PT${minutes}M`;
}

/**
 * Create a reminder trigger for X hours before the task.
 *
 * @param hours - Number of hours before the task (positive number)
 * @returns iCalendar TRIGGER string
 *
 * @example
 * ```typescript
 * reminderHoursBefore(1)   // 1 hour before
 * reminderHoursBefore(24)  // 1 day before
 * ```
 */
export function reminderHoursBefore(hours: number): ReminderTrigger {
  return `TRIGGER:-PT${hours}H`;
}

/**
 * Create a reminder trigger for X days before the task.
 *
 * @param days - Number of days before the task (positive number)
 * @returns iCalendar TRIGGER string
 *
 * @example
 * ```typescript
 * reminderDaysBefore(1)  // 1 day before
 * reminderDaysBefore(7)  // 1 week before
 * ```
 */
export function reminderDaysBefore(days: number): ReminderTrigger {
  return `TRIGGER:-P${days}D`;
}

// =============================================================================
// Recurrence Helpers
// =============================================================================

/**
 * Recurrence rule in iCalendar RRULE format.
 * Examples: 'RRULE:FREQ=DAILY;INTERVAL=1', 'RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE,FR'
 */
export type RecurrenceRule = string;

/**
 * Recurrence frequency types.
 */
export type Frequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

/**
 * Days of the week in iCalendar format.
 */
export type Weekday = 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA' | 'SU';

/**
 * Create a daily recurrence rule.
 *
 * @param interval - Number of days between recurrences (default: 1 = every day)
 * @returns iCalendar RRULE string
 *
 * @example
 * ```typescript
 * repeatDaily()      // Every day
 * repeatDaily(1)     // Every day
 * repeatDaily(2)     // Every 2 days
 * repeatDaily(7)     // Every week (7 days)
 * ```
 */
export function repeatDaily(interval = 1): RecurrenceRule {
  return `RRULE:FREQ=DAILY;INTERVAL=${interval}`;
}

/**
 * Create a weekly recurrence rule.
 *
 * @param interval - Number of weeks between recurrences (default: 1 = every week)
 * @param days - Optional array of weekdays (e.g., ['MO', 'WE', 'FR'] for Mon/Wed/Fri)
 * @returns iCalendar RRULE string
 *
 * @example
 * ```typescript
 * repeatWeekly()                      // Every week
 * repeatWeekly(1)                     // Every week
 * repeatWeekly(2)                     // Every 2 weeks
 * repeatWeekly(1, ['MO', 'WE', 'FR']) // Every Mon, Wed, Fri
 * repeatWeekly(2, ['SA', 'SU'])       // Every other weekend
 * ```
 */
export function repeatWeekly(interval = 1, days?: Weekday[]): RecurrenceRule {
  let rule = `RRULE:FREQ=WEEKLY;INTERVAL=${interval}`;
  if (days?.length) {
    rule += `;BYDAY=${days.join(',')}`;
  }
  return rule;
}

/**
 * Create a monthly recurrence rule.
 *
 * @param interval - Number of months between recurrences (default: 1 = every month)
 * @returns iCalendar RRULE string
 *
 * @example
 * ```typescript
 * repeatMonthly()    // Every month
 * repeatMonthly(1)   // Every month
 * repeatMonthly(3)   // Every quarter (3 months)
 * repeatMonthly(6)   // Every 6 months
 * repeatMonthly(12)  // Every year (12 months)
 * ```
 */
export function repeatMonthly(interval = 1): RecurrenceRule {
  return `RRULE:FREQ=MONTHLY;INTERVAL=${interval}`;
}

/**
 * Create a yearly recurrence rule.
 *
 * @param interval - Number of years between recurrences (default: 1 = every year)
 * @returns iCalendar RRULE string
 *
 * @example
 * ```typescript
 * repeatYearly()     // Every year
 * repeatYearly(1)    // Every year
 * repeatYearly(2)    // Every 2 years
 * ```
 */
export function repeatYearly(interval = 1): RecurrenceRule {
  return `RRULE:FREQ=YEARLY;INTERVAL=${interval}`;
}

// =============================================================================
// User
// =============================================================================

/**
 * TickTick user information.
 */
export interface User {
  /** Unique user identifier */
  id: string;
  /** User's email/username */
  username: string;
  /** User's display name */
  name: string;
}

// =============================================================================
// Checklist Item (Subtask)
// =============================================================================

/**
 * A subtask/checklist item within a task.
 */
export interface ChecklistItem {
  /** Unique item identifier */
  id: string;
  /** Item text/title */
  title: string;
  /** Item status: 0 = unchecked, 1 = checked */
  status: ChecklistItemStatus;
  /** When the item was completed (ISO 8601) */
  completedTime: string | null;
  /** Whether this has an all-day date */
  isAllDay: boolean;
  /** Start date (ISO 8601) */
  startDate: string | null;
  /** Timezone (IANA format) */
  timeZone: string;
  /** Position in the checklist */
  sortOrder: number;
}

/**
 * Input for creating a checklist item.
 */
export interface ChecklistItemInput {
  /** Item text/title */
  title: string;
  /** Item status: 0 = unchecked, 1 = checked */
  status?: ChecklistItemStatus;
  /** Whether this has an all-day date */
  isAllDay?: boolean;
  /** Start date (ISO 8601) */
  startDate?: string | null;
  /** Timezone (IANA format) */
  timeZone?: string;
  /** Position in the checklist */
  sortOrder?: number;
}

// =============================================================================
// Task
// =============================================================================

/**
 * Complete Task object as returned by the API.
 */
export interface Task {
  // Identifiers
  /** Unique task identifier */
  id: string;
  /** ID of the parent project */
  projectId: string;

  // Content
  /** Task title */
  title: string;
  /** Task description/notes */
  content: string;
  /** Additional description */
  desc: string;

  // Timing
  /** Whether this is an all-day task */
  isAllDay: boolean;
  /** Start date (ISO 8601) */
  startDate: string | null;
  /** Due date (ISO 8601) */
  dueDate: string | null;
  /** IANA timezone */
  timeZone: string;
  /**
   * Whether the date is timezone-independent (floating).
   * Note: Field is present in API responses but not documented in official API docs.
   * Floating dates are not anchored to a specific timezone.
   */
  isFloating: boolean;

  // Reminders & Recurrence
  /** Array of reminders (iCalendar TRIGGER format) */
  reminders: string[];
  /** Recurrence rule (RRULE format) */
  repeatFlag: string;

  // Status & Priority
  /** Priority: 0=None, 1=Low, 3=Medium, 5=High */
  priority: Priority;
  /** Status: 0=Normal, 2=Completed */
  status: TaskStatus;
  /** When task was completed (ISO 8601) */
  completedTime: string | null;

  // Organization
  /** Position in list */
  sortOrder: number;
  /**
   * Array of tag names.
   * Note: Tags field is present in API responses but not documented in official API docs.
   * Field has been verified to work in practice.
   */
  tags: string[];

  // Subtasks
  /** Array of subtasks/checklist items */
  items: ChecklistItem[];

  // Metadata
  /** Last modification timestamp (ISO 8601) */
  modifiedTime: string;
  /** Creation timestamp (ISO 8601) */
  createdTime: string;
  /** Version identifier for sync */
  etag: string;
  /** Deletion flag (0=not deleted) */
  deleted: number;
  /** User ID of creator */
  creator: number;
  /** Task type */
  kind: TaskKind;
}

/**
 * Input for creating a new task.
 */
export interface CreateTaskInput {
  /** Task title (required) */
  title: string;
  /**
   * Project ID - if not specified, task will be created in the default inbox project.
   * Note: API behavior may vary - if tasks are not appearing, provide an explicit projectId.
   */
  projectId?: string;
  /** Task description/notes */
  content?: string;
  /** Whether this is an all-day task */
  isAllDay?: boolean;
  /** Start date (ISO 8601: yyyy-MM-dd'T'HH:mm:ssZ) */
  startDate?: string;
  /** Due date (ISO 8601: yyyy-MM-dd'T'HH:mm:ssZ) */
  dueDate?: string;
  /** IANA timezone (e.g., "America/New_York") */
  timeZone?: string;
  /** Array of reminders in iCalendar TRIGGER format */
  reminders?: string[];
  /** Recurrence rule in RRULE format */
  repeatFlag?: string;
  /** Priority: 0=None, 1=Low, 3=Medium, 5=High */
  priority?: Priority;
  /** Array of subtask/checklist items */
  items?: ChecklistItemInput[];
  /** Position in task list */
  sortOrder?: number;
  /** Additional description */
  desc?: string;
}

/**
 * Input for updating an existing task.
 * All fields are optional - only include fields you want to update.
 */
export interface UpdateTaskInput {
  /** Task title */
  title?: string;
  /** Project ID (to move task to another project) */
  projectId?: string;
  /** Task description/notes */
  content?: string;
  /** Whether this is an all-day task */
  isAllDay?: boolean;
  /** Start date (ISO 8601) */
  startDate?: string | null;
  /** Due date (ISO 8601) */
  dueDate?: string | null;
  /** IANA timezone */
  timeZone?: string;
  /** Array of reminders in iCalendar TRIGGER format */
  reminders?: string[];
  /** Recurrence rule in RRULE format */
  repeatFlag?: string;
  /** Priority: 0=None, 1=Low, 3=Medium, 5=High */
  priority?: Priority;
  /** Array of subtask/checklist items */
  items?: ChecklistItemInput[];
  /** Array of tag names */
  tags?: string[];
}

// =============================================================================
// Project
// =============================================================================

/**
 * Complete Project object as returned by the API.
 */
export interface Project {
  /** Unique project identifier */
  id: string;
  /** Project name */
  name: string;
  /** Hex color code (e.g., "#ff6b6b") */
  color: string;
  /** Position in project list */
  sortOrder: number;
  /** Whether project is archived */
  closed: boolean;
  /** Parent folder ID */
  groupId: string | null;
  /** View mode: "list", "kanban", or "timeline" */
  viewMode: ViewMode;
  /** Project type: "TASK" or "NOTE" */
  kind: ProjectKind;
  /** Permission level: "read", "write", or "comment" */
  permission?: Permission;
}

/**
 * Input for creating a new project.
 */
export interface CreateProjectInput {
  /** Project name (required) */
  name: string;
  /** Hex color code (e.g., "#ff6b6b") */
  color?: string;
  /** View mode: "list", "kanban", or "timeline" */
  viewMode?: ViewMode;
  /** Project type: "TASK" or "NOTE" */
  kind?: ProjectKind;
  /** Position in project list */
  sortOrder?: number;
}

/**
 * Input for updating an existing project.
 * All fields are optional - only include fields you want to update.
 */
export interface UpdateProjectInput {
  /** Project name */
  name?: string;
  /** Hex color code */
  color?: string;
  /** View mode */
  viewMode?: ViewMode;
  /** Project type */
  kind?: ProjectKind;
  /** Position in project list */
  sortOrder?: number;
}

/**
 * Column in a Kanban board.
 */
export interface Column {
  /** Unique column identifier */
  id: string;
  /** Project ID this column belongs to */
  projectId: string;
  /** Column name */
  name: string;
  /** Position in column list */
  sortOrder: number;
}

/**
 * Project data including all tasks and columns.
 */
export interface ProjectWithTasks {
  /** The project */
  project: Project;
  /** All tasks in the project */
  tasks: Task[];
  /** Kanban columns (for kanban view projects) */
  columns: Column[];
}

// =============================================================================
// Batch Operations
// =============================================================================

/**
 * Input for batch creating tasks.
 */
export interface BatchCreateTasksInput {
  /** Array of tasks to create */
  add: CreateTaskInput[];
}

// =============================================================================
// OAuth / Authentication
// =============================================================================

/**
 * OAuth token response from the token endpoint.
 */
export interface TokenResponse {
  /** The access token for API requests */
  access_token: string;
  /** Token type (typically "bearer") */
  token_type: string;
  /** Token expiration time in seconds */
  expires_in: number;
  /** Refresh token for obtaining new access tokens */
  refresh_token: string;
}

/**
 * OAuth error response.
 */
export interface OAuthError {
  /** Error code */
  error: string;
  /** Human-readable error description */
  error_description: string;
}

// =============================================================================
// SDK Configuration
// =============================================================================

/**
 * Configuration options for the TickTick SDK client.
 */
export interface TickTickClientConfig {
  /** OAuth access token */
  accessToken: string;
  /** API region: "global" (ticktick.com) or "china" (dida365.com) */
  region?: Region;
  /** Optional custom base URL (overrides region setting) */
  baseUrl?: string;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
}

// =============================================================================
// API Error Response
// =============================================================================

/**
 * Generic API error response structure.
 */
export interface ApiErrorResponse {
  /** Error code or type */
  error?: string;
  /** Error message */
  message?: string;
  /** Detailed error description */
  error_description?: string;
}
