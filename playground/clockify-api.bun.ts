#!/usr/bin/env bun

/**
 * Clockify API CLI Tool
 * 
 * A simple CLI for interacting with the Clockify API.
 * Hardcoded to work with the "secunet" client.
 * 
 * Required environment variables:
 * - CLOCKIFY_TEST_API_KEY: Your Clockify API key
 * - CLOCKIFY_TEST_WORKSPACE_ID: Your workspace ID
 * - CLOCKIFY_TEST_CLIENT_ID: The secunet client ID (from get-client-and-project-ids)
 * - CLOCKIFY_TEST_PROJECT_IDS: Comma-separated project IDs (from get-client-and-project-ids)
 * 
 * Commands:
 *   get-client-and-project-ids
 *     Fetches client ID and all project IDs for the "secunet" client.
 * 
 *   get-weekly-time-report
 *     Fetches the weekly time report for the current week.
 * 
 * Usage:
 *   bun run playground/clockify-api.bun.ts get-client-and-project-ids
 *   bun run playground/clockify-api.bun.ts get-weekly-time-report
 */

import { parseArgs } from "util";
import { getClients, getProjects, getWeeklyTimeReport } from "../src/lib/clockify/client";

// Hardcoded client name
const CLIENT_NAME = "secunet";

// Parse CLI arguments
const { values, positionals } = parseArgs({
  args: Bun.argv,
  options: {
    help: {
      type: "boolean",
      default: false,
    },
    raw: {
      type: "boolean",
      default: false,
    },
  },
  strict: false,
  allowPositionals: true,
});

const command = positionals[2]; // Bun.argv[0] is bun, [1] is script path, [2] is command

// Help text
function showHelp() {
  console.log(`
Clockify API CLI Tool
Client: "${CLIENT_NAME}" (hardcoded)

Usage:
  bun run playground/clockify-api.bun.ts <command> [options]

Commands:
  get-client-and-project-ids    Get client ID and project IDs for "${CLIENT_NAME}"
  get-weekly-time-report        Get weekly time report for current week
  help                          Show this help message

Options:
  --raw                         Show raw JSON response (for debugging)
  --help                        Show this help message

Environment Variables (Required):
  CLOCKIFY_TEST_API_KEY         Your Clockify API key
  CLOCKIFY_TEST_WORKSPACE_ID    Your workspace ID
  
  For get-weekly-time-report:
  CLOCKIFY_TEST_CLIENT_ID       Client ID (get from get-client-and-project-ids)
  CLOCKIFY_TEST_PROJECT_IDS     Comma-separated project IDs

Examples:
  # First, get the client and project IDs
  bun run playground/clockify-api.bun.ts get-client-and-project-ids
  
  # Then export the generated environment variables and run the report
  bun run playground/clockify-api.bun.ts get-weekly-time-report
  
  # Show raw JSON response
  bun run playground/clockify-api.bun.ts get-weekly-time-report --raw
  
  # Show help
  bun run playground/clockify-api.bun.ts help
`);
}

// Get environment variables
function getEnvVars(): { apiKey: string; workspaceId: string } | null {
  const apiKey = process.env.CLOCKIFY_TEST_API_KEY;
  const workspaceId = process.env.CLOCKIFY_TEST_WORKSPACE_ID;

  if (!apiKey) {
    console.error("❌ Error: CLOCKIFY_TEST_API_KEY environment variable not set");
    return null;
  }

  if (!workspaceId) {
    console.error("❌ Error: CLOCKIFY_TEST_WORKSPACE_ID environment variable not set");
    return null;
  }

  return { apiKey, workspaceId };
}

// Command: get-client-and-project-ids
async function getClientAndProjectIds() {
  const env = getEnvVars();
  if (!env) {
    process.exit(1);
  }

  const { apiKey, workspaceId } = env;

  console.log("🔍 Fetching Clockify data...\n");
  console.log(`Workspace ID: ${workspaceId}`);
  console.log(`Looking for client: "${CLIENT_NAME}"\n`);

  // Fetch all clients
  console.log("📋 Fetching clients...");
  const clientsResult = await getClients(apiKey, workspaceId);

  if (!clientsResult.success) {
    console.error(`❌ Error fetching clients: ${clientsResult.error.message}`);
    process.exit(1);
  }

  console.log(`✅ Found ${clientsResult.data.length} clients\n`);

  // Find client by name (case-insensitive)
  const targetClient = clientsResult.data.find(
    (client) => client.name.toLowerCase() === CLIENT_NAME.toLowerCase()
  );

  if (!targetClient) {
    console.error(`❌ Error: No client named "${CLIENT_NAME}" found`);
    console.log("\n📋 Available clients:");
    clientsResult.data.forEach((client) => {
      console.log(`  - ${client.name} (ID: ${client.id})`);
    });
    process.exit(1);
  }

  console.log(`✅ Found client: ${targetClient.name}`);
  console.log(`   ID: ${targetClient.id}`);
  console.log(`   Archived: ${targetClient.archived}`);
  if (targetClient.address) {
    console.log(`   Address: ${targetClient.address}`);
  }
  if (targetClient.note) {
    console.log(`   Note: ${targetClient.note}`);
  }
  console.log();

  // Fetch all projects for the client
  console.log(`📋 Fetching projects for ${targetClient.name}...`);
  const projectsResult = await getProjects(apiKey, workspaceId, targetClient.id);

  if (!projectsResult.success) {
    console.error(`❌ Error fetching projects: ${projectsResult.error.message}`);
    process.exit(1);
  }

  console.log(`✅ Found ${projectsResult.data.length} projects\n`);

  if (projectsResult.data.length === 0) {
    console.log("⚠️  No projects found for this client");
    process.exit(0);
  }

  // Display all projects
  console.log("📦 Projects:");
  projectsResult.data.forEach((project, index) => {
    console.log(`\n${index + 1}. ${project.name}`);
    console.log(`   ID: ${project.id}`);
    console.log(`   Client: ${project.clientName}`);
    console.log(`   Billable: ${project.billable}`);
    console.log(`   Archived: ${project.archived}`);
    console.log(`   Color: ${project.color}`);
    if (project.note) {
      console.log(`   Note: ${project.note}`);
    }
  });

  // Generate environment variables for testing
  console.log("\n" + "=".repeat(80));
  console.log("🔧 Environment Variables for Testing:");
  console.log("=".repeat(80));
  console.log(`export CLOCKIFY_TEST_CLIENT_ID="${targetClient.id}"`);
  
  const activeProjects = projectsResult.data.filter(p => !p.archived);
  if (activeProjects.length > 0) {
    const projectIds = activeProjects.map(p => p.id).join(",");
    console.log(`export CLOCKIFY_TEST_PROJECT_IDS="${projectIds}"`);
    
    console.log("\n📝 Active Project Names:");
    activeProjects.forEach(p => {
      console.log(`   - ${p.name}`);
    });
  } else {
    console.log("⚠️  No active projects found (all are archived)");
    const projectIds = projectsResult.data.map(p => p.id).join(",");
    console.log(`export CLOCKIFY_TEST_PROJECT_IDS="${projectIds}" # All archived`);
  }

  console.log("\n" + "=".repeat(80));
  
  // Summary
  console.log("\n📊 Summary:");
  console.log(`   Client: ${targetClient.name} (${targetClient.id})`);
  console.log(`   Total Projects: ${projectsResult.data.length}`);
  console.log(`   Active Projects: ${activeProjects.length}`);
  console.log(`   Archived Projects: ${projectsResult.data.length - activeProjects.length}`);
}

// Helper function to get the current week's Monday and Sunday
function getCurrentWeek(): { monday: Date; sunday: Date } {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  
  // Calculate days to Monday (if today is Sunday, go back 6 days; if Monday, 0 days)
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  
  const monday = new Date(now);
  monday.setDate(now.getDate() - daysToMonday);
  monday.setHours(0, 0, 0, 0);
  
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  
  return { monday, sunday };
}

// Command: get-weekly-time-report
async function getWeeklyTimeReportCommand() {
  const env = getEnvVars();
  if (!env) {
    process.exit(1);
  }

  const { apiKey, workspaceId } = env;
  
  // Get additional required env vars
  const clientId = process.env.CLOCKIFY_TEST_CLIENT_ID;
  const projectIdsStr = process.env.CLOCKIFY_TEST_PROJECT_IDS;

  if (!clientId) {
    console.error("❌ Error: CLOCKIFY_TEST_CLIENT_ID environment variable not set");
    console.log("\nRun 'get-client-and-project-ids' first to get the client ID:");
    console.log("  bun run playground/clockify-api.bun.ts get-client-and-project-ids\n");
    process.exit(1);
  }

  // Get current week boundaries
  const { monday, sunday } = getCurrentWeek();
  const startDate = monday.toISOString();
  const endDate = sunday.toISOString();

  console.log("🔍 Fetching weekly time report...\n");
  console.log(`Workspace ID: ${workspaceId}`);
  console.log(`Client ID: ${clientId}`);
  console.log(`Week: ${monday.toISOString().split('T')[0]} to ${sunday.toISOString().split('T')[0]}\n`);

  // Parse project IDs (optional)
  const projectIds = projectIdsStr ? projectIdsStr.split(",") : [];
  if (projectIds.length > 0) {
    console.log(`Tracking ${projectIds.length} project(s)\n`);
  } else {
    console.log("⚠️  No tracked projects specified (all work will show as extra work)\n");
  }

  // Fetch the weekly time report
  const result = await getWeeklyTimeReport(apiKey, {
    workspaceId,
    clientId,
    projectIds,
    startDate,
    endDate,
  });

  if (!result.success) {
    console.error(`❌ Error fetching weekly time report: ${result.error.message}`);
    process.exit(1);
  }

  console.log("✅ Successfully fetched weekly time report\n");

  // If --raw flag is set, show raw JSON and exit
  if (values.raw) {
    console.log("🔍 Raw JSON Response:");
    console.log("=".repeat(80));
    console.log(JSON.stringify(result.data, null, 2));
    console.log("=".repeat(80));
    process.exit(0);
  }

  // Display the results
  const { dailyBreakdown } = result.data;
  const dates = Object.keys(dailyBreakdown).sort();

  if (dates.length === 0) {
    console.log("⚠️  No time entries found for this week");
    process.exit(0);
  }

  console.log("=" .repeat(80));
  console.log("📊 WEEKLY TIME REPORT");
  console.log("=".repeat(80));

  let weekTotalSeconds = 0;
  let weekTrackedSeconds = 0;
  let weekExtraSeconds = 0;

  for (const date of dates) {
    const day = dailyBreakdown[date];
    const dayDate = new Date(date);
    const dayName = dayDate.toLocaleDateString('en-US', { weekday: 'short' });
    
    console.log(`\n📅 ${dayName} ${date}`);
    console.log("-".repeat(80));

    // Display tracked projects
    const projectIds = Object.keys(day.trackedProjects);
    if (projectIds.length > 0) {
      console.log("\n  🎯 Tracked Projects:");
      for (const projectId of projectIds) {
        const project = day.trackedProjects[projectId];
        const hours = (project.seconds / 3600).toFixed(2);
        console.log(`     ${project.projectName}: ${hours}h (${project.seconds}s)`);
        weekTrackedSeconds += project.seconds;
      }
    } else {
      console.log("\n  🎯 Tracked Projects: None");
    }

    // Display totals for the day
    const totalHours = (day.totalSeconds / 3600).toFixed(2);
    const extraHours = (day.extraWorkSeconds / 3600).toFixed(2);
    
    console.log(`\n  📊 Day Summary:`);
    console.log(`     Total Time: ${totalHours}h (${day.totalSeconds}s)`);
    console.log(`     Extra Work: ${extraHours}h (${day.extraWorkSeconds}s)`);

    weekTotalSeconds += day.totalSeconds;
    weekExtraSeconds += day.extraWorkSeconds;
  }

  // Weekly summary
  console.log("\n" + "=".repeat(80));
  console.log("📈 WEEK SUMMARY");
  console.log("=".repeat(80));
  
  const weekTotalHours = (weekTotalSeconds / 3600).toFixed(2);
  const weekTrackedHours = (weekTrackedSeconds / 3600).toFixed(2);
  const weekExtraHours = (weekExtraSeconds / 3600).toFixed(2);
  
  console.log(`  Total Time Logged: ${weekTotalHours}h (${weekTotalSeconds}s)`);
  console.log(`  Tracked Projects:  ${weekTrackedHours}h (${weekTrackedSeconds}s)`);
  console.log(`  Extra Work:        ${weekExtraHours}h (${weekExtraSeconds}s)`);
  console.log(`  Days with Data:    ${dates.length}`);
  console.log();
}

// Main CLI handler
async function main() {
  if (values.help || !command || command === "help") {
    showHelp();
    process.exit(0);
  }

  switch (command) {
    case "get-client-and-project-ids":
      await getClientAndProjectIds();
      break;
    
    case "get-weekly-time-report":
      await getWeeklyTimeReportCommand();
      break;
    
    default:
      console.error(`❌ Error: Unknown command "${command}"`);
      console.log("\nRun with 'help' to see available commands:");
      console.log("  bun run playground/clockify-api.bun.ts help\n");
      process.exit(1);
  }
}

// Run the CLI
main().catch((error) => {
  console.error("❌ Unexpected error:", error);
  process.exit(1);
});
