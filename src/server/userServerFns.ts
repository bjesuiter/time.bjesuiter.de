import { createServerFn } from "@tanstack/react-start";
import { envStore } from "@/lib/env/envStore";
import { db } from "@/db";
import { eq } from "drizzle-orm";
import { user } from "@/db/schema/better-auth";
import { auth } from "@/lib/auth/auth";

export const registerAdminUser = createServerFn({ method: "POST" })
    .inputValidator((data: { force?: boolean }) => data)
    .handler(
        async ({ data }) => {
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
                        message:
                            `User with email "${adminEmail}" is already registered.`,
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
                    message:
                        `Admin user "${adminName}" (${adminEmail}) has been successfully ${
                            force ? "re-" : ""
                        }registered!`,
                    userEmail: adminEmail,
                };
            } catch (error) {
                console.error("Admin registration error:", error);
                return {
                    success: false,
                    message: `Error during registration: ${
                        error instanceof Error ? error.message : "Unknown error"
                    }`,
                };
            }
        },
    );
