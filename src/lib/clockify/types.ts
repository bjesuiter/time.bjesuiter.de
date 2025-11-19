/**
 * Clockify API Type Definitions
 * Based on Clockify API documentation: https://clockify.me/developers-api
 */

export interface ClockifyUser {
  id: string;
  email: string;
  name: string;
  memberships: ClockifyMembership[];
  profilePicture?: string;
  activeWorkspace: string;
  defaultWorkspace: string;
  settings: ClockifyUserSettings;
  status: string;
}

export interface ClockifyMembership {
  userId: string;
  hourlyRate: {
    amount: number;
    currency: string;
  } | null;
  costRate: {
    amount: number;
    currency: string;
  } | null;
  targetId: string;
  membershipType: string;
  membershipStatus: string;
}

export interface ClockifyUserSettings {
  weekStart: "MONDAY" | "SUNDAY";
  timeZone: string;
  timeFormat: string;
  dateFormat: string;
  sendNewsletter: boolean;
  weeklyUpdates: boolean;
  longRunning: boolean;
  scheduledReports: boolean;
  approval: boolean;
  pto: boolean;
  alerts: boolean;
  reminders: boolean;
  timeTrackingManual: boolean;
  summaryReportSettings: {
    group: string;
    subgroup: string;
  };
  isCompactViewOn: boolean;
  dashboardSelection: string;
  dashboardViewType: string;
  dashboardPinToTop: boolean;
  projectListCollapse: number;
  collapseAllProjectLists: boolean;
  groupSimilarEntriesDisabled: boolean;
  myStartOfDay: string;
  projectPickerTaskFilter: boolean;
  lang: string;
  multiFactorEnabled: boolean;
  theme: string;
  scheduling: boolean;
  onboarding: boolean;
  showOnlyWorkingDays: boolean;
}

export interface ClockifyWorkspace {
  id: string;
  name: string;
  hourlyRate: {
    amount: number;
    currency: string;
  };
  memberships: ClockifyMembership[];
  workspaceSettings: {
    timeRoundingInReports: boolean;
    onlyAdminsSeeBillableRates: boolean;
    onlyAdminsCreateProject: boolean;
    onlyAdminsSeeDashboard: boolean;
    defaultBillableProjects: boolean;
    lockTimeEntries: string | null;
    round: {
      round: string;
      minutes: string;
    };
    projectFavorites: boolean;
    canSeeTimeSheet: boolean;
    canSeeTracker: boolean;
    projectPickerSpecialFilter: boolean;
    forceProjects: boolean;
    forceTasks: boolean;
    forceTags: boolean;
    forceDescription: boolean;
    onlyAdminsSeeAllTimeEntries: boolean;
    onlyAdminsSeePublicProjectsEntries: boolean;
    trackTimeDownToSecond: boolean;
    projectGroupingLabel: string;
    adminOnlyPages: string[];
    automaticLock: {
      changeDay: string;
      dayOfMonth: number;
      firstDay: string;
      olderThanPeriod: string;
      olderThanValue: number;
      type: string;
    } | null;
    onlyAdminsCreateTag: boolean;
    onlyAdminsCreateTask: boolean;
    timeTrackingMode: string;
    isProjectPublicByDefault: boolean;
  };
  imageUrl?: string;
  featureSubscriptionType?: string;
}

export interface ClockifyClient {
  id: string;
  name: string;
  workspaceId: string;
  archived: boolean;
  address?: string;
  note?: string;
}

export interface ClockifyProject {
  id: string;
  name: string;
  hourlyRate: {
    amount: number;
    currency: string;
  } | null;
  clientId: string;
  clientName: string;
  workspaceId: string;
  billable: boolean;
  memberships: ClockifyMembership[];
  color: string;
  estimate: {
    estimate: string;
    type: string;
  } | null;
  archived: boolean;
  duration?: string;
  costRate: {
    amount: number;
    currency: string;
  } | null;
  timeEstimate: {
    estimate: number;
    type: string;
    resetOption: string | null;
    active: boolean;
    includeNonBillable: boolean;
  } | null;
  budgetEstimate: {
    estimate: number;
    type: string;
    resetOption: string | null;
    active: boolean;
  } | null;
  note?: string;
  template: boolean;
  public: boolean;
}

export interface ClockifyError {
  message: string;
  code?: number;
}

/**
 * Result wrapper for API calls
 */
export type ClockifyResult<T> =
  | { success: true; data: T }
  | { success: false; error: ClockifyError };

/**
 * Summary Report API Types
 */

/**
 * Request body for Clockify Summary Report API
 * Endpoint: POST /workspaces/{workspaceId}/reports/summary
 */
export interface ClockifySummaryReportRequest {
  dateRangeStart: string; // ISO 8601 format: "2024-01-01T00:00:00.000Z"
  dateRangeEnd: string; // ISO 8601 format: "2024-01-31T23:59:59.999Z"
  summaryFilter: {
    groups: string[]; // e.g., ["DATE"], ["PROJECT"], ["DATE", "PROJECT"]
  };
  clients?: {
    ids: string[];
    contains: "CONTAINS" | "DOES_NOT_CONTAIN";
  };
  projects?: {
    ids: string[];
    contains: "CONTAINS" | "DOES_NOT_CONTAIN";
  };
  exportType?: string; // e.g., "JSON"
}

/**
 * Response from Clockify Summary Report API
 */
export interface ClockifySummaryReportResponse {
  groupOne: ClockifySummaryReportGroup[];
  totals: Array<{
    totalTime: number; // Total duration in milliseconds
    totalAmount: number;
    entriesCount: number;
  }>;
}

/**
 * A single group in the summary report (can represent DATE, PROJECT, etc.)
 */
export interface ClockifySummaryReportGroup {
  _id: string; // Date string (when grouped by DATE) or Project ID (when grouped by PROJECT)
  name: string; // Formatted date string or Project name
  duration: number; // Duration in milliseconds
  amount: number;
  children?: ClockifySummaryReportGroup[]; // Nested groups (e.g., projects within a date)
}

/**
 * Weekly Time Report API Types
 */

/**
 * Input parameters for getWeeklyTimeReport function
 */
export interface WeeklyTimeReportInput {
  workspaceId: string;
  clientId: string;
  projectIds: string[]; // Array of tracked project IDs
  startDate: string; // ISO 8601 format: "2025-11-18T00:00:00.000Z"
  endDate: string; // ISO 8601 format: "2025-11-24T23:59:59.999Z"
}

/**
 * Output from getWeeklyTimeReport function
 */
export interface WeeklyTimeReportOutput {
  dailyBreakdown: Record<string, DailyBreakdown>; // Key: date in YYYY-MM-DD format
}

/**
 * Time data for a single day
 */
export interface DailyBreakdown {
  date: string; // Date in YYYY-MM-DD format (e.g., "2025-11-18")
  trackedProjects: Record<string, ProjectTime>; // Key: projectId
  totalSeconds: number; // Total time logged for all projects on this day
  extraWorkSeconds: number; // Difference: totalSeconds - sum of tracked projects
}

/**
 * Time data for a specific project
 */
export interface ProjectTime {
  projectId: string;
  projectName: string;
  seconds: number;
}
