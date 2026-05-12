import { pgTable, text, serial, timestamp, numeric, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const activityTable = pgTable("activity", {
  id: serial("id").primaryKey(),
  type: text("type", { enum: ["revenue", "ad", "expense", "employee", "attendance", "salary"] }).notNull(),
  description: text("description").notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("activity_created_idx").on(table.createdAt),
]);

export const insertActivitySchema = createInsertSchema(activityTable).omit({ id: true, createdAt: true });
export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type Activity = typeof activityTable.$inferSelect;
