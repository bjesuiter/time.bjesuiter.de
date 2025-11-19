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
 * 
 * Commands:
 *   get-client-and-project-ids
 *     Fetches client ID and all project IDs for the "secunet" client.
 * 
 * Usage:
 *   bun run playground/clockify-api.bun.ts get-client-and-project-ids
 */

import { parseArgs } from "util";
import { getClients, getProjects } from "../src/lib/clockify/client";

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
  bun run playground/clockify-api.bun.ts <command>

Commands:
  get-client-and-project-ids    Get client ID and project IDs for "${CLIENT_NAME}"
  help                          Show this help message

Environment Variables (Required):
  CLOCKIFY_TEST_API_KEY         Your Clockify API key
  CLOCKIFY_TEST_WORKSPACE_ID    Your workspace ID

Examples:
  bun run playground/clockify-api.bun.ts get-client-and-project-ids
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
