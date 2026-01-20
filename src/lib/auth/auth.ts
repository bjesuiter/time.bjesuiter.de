import { db } from "@/db"; // your drizzle instance
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { reactStartCookies } from "better-auth/react-start";

// Note: src/lib/auth.ts is a magic location found automatically by better-auth.
export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "sqlite",
  }),
  trustedOrigins: [
    "http://localhost:3000",
    "http://localhost:3001",
    "https://time.bjesuiter.de",
  ],
  emailAndPassword: {
    enabled: true,
  },
  // socialProviders: {
  //     google: {
  //         clientId: process.env.GOOGLE_CLIENT_ID as string,
  //         clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
  //     },
  // },
  //
  plugins: [
    // make sure this is the last plugin in the array
    reactStartCookies(),
  ],
});
