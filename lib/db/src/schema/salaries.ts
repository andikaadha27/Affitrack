import { pgTable, serial, timestamp, integer, numeric, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { employeesTable } from "./employees";
import { relations } from "drizzle-orm";

export const salariesTable = pgTable("salaries", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull().references(() => employeesTable.id, { onDelete: "cascade" }),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  attendanceCount: integer("attendance_count").notNull().default(0),
  workingDays: integer("working_days").notNull().default(0),
  baseSalary: numeric("base_salary", { precision: 15, scale: 2 }).notNull(),
  calculatedAmount: numeric("calculated_amount", { precision: 15, scale: 2 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("salaries_employee_idx").on(table.employeeId),
  index("salaries_month_year_idx").on(table.month, table.year),
]);

export const salariesRelations = relations(salariesTable, ({ one }) => ({
  employee: one(employeesTable, {
    fields: [salariesTable.employeeId],
    references: [employeesTable.id],
  }),
}));

export const insertSalarySchema = createInsertSchema(salariesTable).omit({ id: true, createdAt: true });
export type InsertSalary = z.infer<typeof insertSalarySchema>;
export type Salary = typeof salariesTable.$inferSelect;
