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
