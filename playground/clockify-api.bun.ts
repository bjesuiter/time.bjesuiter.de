#!/usr/bin/env bun

/**
 * Clockify API Playground Script
 * 
 * This script fetches client and project information from Clockify API.
 * It finds the "secunet" client and lists all projects for that client.
 * 
 * Required environment variables:
 * - CLOCKIFY_TEST_API_KEY: Your Clockify API key
 * - CLOCKIFY_TEST_WORKSPACE_ID: Your workspace ID
 * 
 * Usage:
 *   bun run playground/clockify-api.bun.ts
 */

import { getClients, getProjects } from "../src/lib/clockify/client";

async function main() {
  // Get environment variables
  const apiKey = process.env.CLOCKIFY_TEST_API_KEY;
  const workspaceId = process.env.CLOCKIFY_TEST_WORKSPACE_ID;

  if (!apiKey) {
    console.error("❌ Error: CLOCKIFY_TEST_API_KEY environment variable not set");
    process.exit(1);
  }

  if (!workspaceId) {
    console.error("❌ Error: CLOCKIFY_TEST_WORKSPACE_ID environment variable not set");
    process.exit(1);
  }

  console.log("🔍 Fetching Clockify data...\n");
  console.log(`Workspace ID: ${workspaceId}\n`);

  // Fetch all clients
  console.log("📋 Fetching clients...");
  const clientsResult = await getClients(apiKey, workspaceId);

  if (!clientsResult.success) {
    console.error(`❌ Error fetching clients: ${clientsResult.error.message}`);
    process.exit(1);
  }

  console.log(`✅ Found ${clientsResult.data.length} clients\n`);

  // Find "secunet" client (case-insensitive)
  const secunetClient = clientsResult.data.find(
    (client) => client.name.toLowerCase() === "secunet"
  );

  if (!secunetClient) {
    console.error('❌ Error: No client named "secunet" found');
    console.log("\n📋 Available clients:");
    clientsResult.data.forEach((client) => {
      console.log(`  - ${client.name} (ID: ${client.id})`);
    });
    process.exit(1);
  }

  console.log("✅ Found secunet client:");
  console.log(`   Name: ${secunetClient.name}`);
  console.log(`   ID: ${secunetClient.id}`);
  console.log(`   Archived: ${secunetClient.archived}`);
  if (secunetClient.address) {
    console.log(`   Address: ${secunetClient.address}`);
  }
  if (secunetClient.note) {
    console.log(`   Note: ${secunetClient.note}`);
  }
  console.log();

  // Fetch all projects for secunet client
  console.log("📋 Fetching projects for secunet...");
  const projectsResult = await getProjects(apiKey, workspaceId, secunetClient.id);

  if (!projectsResult.success) {
    console.error(`❌ Error fetching projects: ${projectsResult.error.message}`);
    process.exit(1);
  }

  console.log(`✅ Found ${projectsResult.data.length} projects for secunet\n`);

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
  console.log(`export CLOCKIFY_TEST_CLIENT_ID="${secunetClient.id}"`);
  
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
  console.log(`   Client: ${secunetClient.name} (${secunetClient.id})`);
  console.log(`   Total Projects: ${projectsResult.data.length}`);
  console.log(`   Active Projects: ${activeProjects.length}`);
  console.log(`   Archived Projects: ${projectsResult.data.length - activeProjects.length}`);
}

// Run the main function
main().catch((error) => {
  console.error("❌ Unexpected error:", error);
  process.exit(1);
});
