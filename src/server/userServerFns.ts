import { createServerFn } from "@tanstack/react-start";
import { envStore } from "@/lib/env/envStore";
import { db } from "@/db";
import { eq } from "drizzle-orm";
import { user } from "@/db/schema/better-auth";
import { auth } from "@/lib/auth/auth";
import { logger } from "@/lib/logger";

// Check if user signup is allowed via environment variable
export const isUserSignupAllowed = createServerFn({ method: "GET" }).handler(
  async () => {
    return envStore.ALLOW_USER_SIGNUP;
  },
);

// Sign up a new user with environment variable check
export const signUpUser = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { email: string; password: string; name?: string }) => data,
  )
  .handler(
    async ({
      data,
    }: {
      data: { email: string; password: string; name?: string };
    }) => {
      // Check if user signup is allowed
      if (!envStore.ALLOW_USER_SIGNUP) {
        throw new Error("User registration is currently disabled");
      }

      // Use Better-auth server-side to create the user
      const result = await auth.api.signUpEmail({
        body: {
          email: data.email,
          password: data.password,
          name: data.name || "",
        },
      });

      if (!result) {
        throw new Error("Failed to create account");
      }

      return { success: true };
    },
  );

// Register admin user with force option
export const registerAdminUser = createServerFn({ method: "POST" })
  .inputValidator((data: { force?: boolean }) => data)
  .handler(async ({ data }) => {
    const { force } = data;
    // Check if admin credentials are configured
    if (!envStore.ADMIN_EMAIL || !envStore.ADMIN_PASSWORD) {
      throw new Response(
        "Admin credentials are not configured. Please set ADMIN_EMAIL, ADMIN_LABEL, and ADMIN_PASSWORD in your .env file.",
        { status: 500 },
      );
    }

    const adminEmail = envStore.ADMIN_EMAIL;
    const adminName = envStore.ADMIN_LABEL || "Admin";
    const adminPassword = envStore.ADMIN_PASSWORD;

    try {
      // Check if user already exists
      const existingUser = await db.query.user.findFirst({
        where: eq(user.email, adminEmail),
      });

      if (existingUser && !force) {
        return {
          success: false,
          message: `User with email "${adminEmail}" is already registered.`,
          userEmail: adminEmail,
          canForceRegister: true,
        };
      }

      // If force=true and user exists, delete the existing user first
      if (existingUser && force) {
        // Delete user (cascades to sessions and accounts)
        await db.delete(user).where(eq(user.email, adminEmail));
      }

      // Register the admin user
      const result = await auth.api.signUpEmail({
        body: {
          email: adminEmail,
          password: adminPassword,
          name: adminName,
        },
      });

      if (!result) {
        return {
          success: false,
          message:
            "Failed to register admin user. Please check your configuration.",
        };
      }

      return {
        success: true,
        message: `Admin user "${adminName}" (${adminEmail}) has been successfully ${
          force ? "re-" : ""
        }registered!`,
        userEmail: adminEmail,
      };
    } catch (error) {
      logger.error("Admin registration error:", error);
      return {
        success: false,
        message: `Error during registration: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  });
