import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { customUint8Array } from "./types/customUint8Array";
import { customIsoDate } from "./types/customIsoDate";

export const UsersTable = sqliteTable("users", {
    id: text("id").primaryKey(),
    email: text().notNull(),
    label: text().notNull(),
    passwordHash: customUint8Array().notNull(),
    passwordSalt: text().notNull(),
    createdAt: customIsoDate().notNull(),
    updatedAt: customIsoDate().notNull(),
});
export type UserDB = typeof UsersTable.$inferSelect;
export type UserFrontend = Omit<UserDB, "passwordHash" | "passwordSalt">;
