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
 */
export enum Priority {
  None = 0,
  Low = 1,
  Medium = 3,
  High = 5,
}

/**
 * Task/checklist item status.
 */
export enum Status {
  Normal = 0,
  Completed = 1,
}

/**
 * Project view modes.
 */
export type ViewMode = "list" | "kanban" | "timeline";

/**
 * Project/task kind.
 */
export type ProjectKind = "TASK" | "NOTE";

/**
 * Task kind.
 */
export type TaskKind = "TEXT";

/**
 * API region configuration.
 */
export type Region = "global" | "china";

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
  status: Status;
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
  status?: Status;
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
  allDay: boolean;
  /** Start date (ISO 8601) */
  startDate: string | null;
  /** Due date (ISO 8601) */
  dueDate: string | null;
  /** IANA timezone */
  timeZone: string;
  /** Whether the date is timezone-independent */
  isFloating: boolean;

  // Reminders & Recurrence
  /** Array of reminders (iCalendar TRIGGER format) */
  reminders: string[];
  /** Recurrence rule (RRULE format) */
  repeat: string;

  // Status & Priority
  /** Priority: 0=None, 1=Low, 3=Medium, 5=High */
  priority: Priority;
  /** Status: 0=Normal, 1=Completed */
  status: Status;
  /** When task was completed (ISO 8601) */
  completedTime: string | null;

  // Organization
  /** Position in list */
  sortOrder: number;
  /** Array of tag names */
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
  /** Project ID (defaults to inbox if not specified) */
  projectId?: string;
  /** Task description/notes */
  content?: string;
  /** Whether this is an all-day task */
  allDay?: boolean;
  /** Start date (ISO 8601: yyyy-MM-dd'T'HH:mm:ssZ) */
  startDate?: string;
  /** Due date (ISO 8601: yyyy-MM-dd'T'HH:mm:ssZ) */
  dueDate?: string;
  /** IANA timezone (e.g., "America/New_York") */
  timeZone?: string;
  /** Array of reminders in iCalendar TRIGGER format */
  reminders?: string[];
  /** Recurrence rule in RRULE format */
  repeat?: string;
  /** Priority: 0=None, 1=Low, 3=Medium, 5=High */
  priority?: Priority;
  /** Array of subtask/checklist items */
  items?: ChecklistItemInput[];
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
  allDay?: boolean;
  /** Start date (ISO 8601) */
  startDate?: string | null;
  /** Due date (ISO 8601) */
  dueDate?: string | null;
  /** IANA timezone */
  timeZone?: string;
  /** Array of reminders in iCalendar TRIGGER format */
  reminders?: string[];
  /** Recurrence rule in RRULE format */
  repeat?: string;
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
}

/**
 * Project data including all tasks.
 */
export interface ProjectWithTasks {
  /** The project */
  project: Project;
  /** All tasks in the project */
  tasks: Task[];
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
