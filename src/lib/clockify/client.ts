import { HTTPError } from "ky";
import { createClockifyApi } from "./api-instance";
import type {
    ClockifyClient,
    ClockifyError,
    ClockifyProject,
    ClockifyResult,
    ClockifyUser,
    ClockifyWorkspace,
} from "./types";

/**
 * Helper function to handle API errors
 */
async function handleError(error: unknown): Promise<ClockifyError> {
    if (error instanceof HTTPError) {
        try {
            const errorData = await error.response.json();
            return {
                message: errorData.message || error.message,
                code: error.response.status,
            };
        } catch {
            return {
                message: error.message,
                code: error.response.status,
            };
        }
    }

    if (error instanceof Error) {
        return {
            message: error.message,
        };
    }

    return {
        message: "An unknown error occurred",
    };
}

/**
 * Validates the API key and fetches user information
 * @param apiKey - The Clockify API key to validate
 * @returns User information if valid, error otherwise
 */
export async function validateApiKey(
    apiKey: string,
): Promise<ClockifyResult<ClockifyUser>> {
    try {
        const api = createClockifyApi(apiKey);
        const user = await api.get("user").json<ClockifyUser>();
        return { success: true, data: user };
    } catch (error) {
        return { success: false, error: await handleError(error) };
    }
}

/**
 * Fetches user information including timezone and weekStart settings
 * This is an alias for validateApiKey for semantic clarity
 * @param apiKey - The Clockify API key
 * @returns User information
 */
export async function getUserInfo(
    apiKey: string,
): Promise<ClockifyResult<ClockifyUser>> {
    return validateApiKey(apiKey);
}

/**
 * Fetches all workspaces accessible by the user
 * @param apiKey - The Clockify API key
 * @returns List of workspaces
 */
export async function getWorkspaces(
    apiKey: string,
): Promise<ClockifyResult<ClockifyWorkspace[]>> {
    try {
        const api = createClockifyApi(apiKey);
        const workspaces = await api.get("workspaces").json<
            ClockifyWorkspace[]
        >();
        return { success: true, data: workspaces };
    } catch (error) {
        return { success: false, error: await handleError(error) };
    }
}

/**
 * Fetches all clients in a workspace
 * @param apiKey - The Clockify API key
 * @param workspaceId - The workspace ID
 * @returns List of clients
 */
export async function getClients(
    apiKey: string,
    workspaceId: string,
): Promise<ClockifyResult<ClockifyClient[]>> {
    try {
        const api = createClockifyApi(apiKey);
        const clients = await api
            .get(`workspaces/${workspaceId}/clients`)
            .json<ClockifyClient[]>();
        return { success: true, data: clients };
    } catch (error) {
        return { success: false, error: await handleError(error) };
    }
}

/**
 * Fetches all projects in a workspace, optionally filtered by client
 * @param apiKey - The Clockify API key
 * @param workspaceId - The workspace ID
 * @param clientId - Optional client ID to filter projects
 * @returns List of projects
 */
export async function getProjects(
    apiKey: string,
    workspaceId: string,
    clientId?: string,
): Promise<ClockifyResult<ClockifyProject[]>> {
    try {
        const api = createClockifyApi(apiKey);

        // Build query parameters
        const searchParams = new URLSearchParams();
        if (clientId) {
            searchParams.set("clients", clientId);
        }

        const url = `workspaces/${workspaceId}/projects${
            searchParams.toString() ? `?${searchParams.toString()}` : ""
        }`;

        const projects = await api.get(url).json<ClockifyProject[]>();
        return { success: true, data: projects };
    } catch (error) {
        return { success: false, error: await handleError(error) };
    }
}
