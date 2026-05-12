import { pgTable, text, serial, timestamp, numeric, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const expensesTable = pgTable("expenses", {
  id: serial("id").primaryKey(),
  category: text("category").notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  date: text("date").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("expenses_date_idx").on(table.date),
]);

export const insertExpenseSchema = createInsertSchema(expensesTable).omit({ id: true, createdAt: true });
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Expense = typeof expensesTable.$inferSelect;
