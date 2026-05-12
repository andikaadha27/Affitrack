import { pgTable, text, serial, timestamp, numeric, integer, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const revenuesTable = pgTable("revenues", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  actualAmount: numeric("actual_amount", { precision: 15, scale: 2 }),
  product: text("product").notNull(),
  units: integer("units"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("revenues_date_idx").on(table.date),
]);

export const insertRevenueSchema = createInsertSchema(revenuesTable).omit({ id: true, createdAt: true });
export type InsertRevenue = z.infer<typeof insertRevenueSchema>;
export type Revenue = typeof revenuesTable.$inferSelect;
