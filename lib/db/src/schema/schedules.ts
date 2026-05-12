import { pgTable, text, serial, timestamp, integer, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { employeesTable } from "./employees";
import { relations } from "drizzle-orm";

export const schedulesTable = pgTable("schedules", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull().references(() => employeesTable.id, { onDelete: "cascade" }),
  date: text("date").notNull(),
  shift: text("shift", { enum: ["morning", "afternoon", "evening", "full"] }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("schedules_date_idx").on(table.date),
  index("schedules_employee_idx").on(table.employeeId),
]);

export const schedulesRelations = relations(schedulesTable, ({ one }) => ({
  employee: one(employeesTable, {
    fields: [schedulesTable.employeeId],
    references: [employeesTable.id],
  }),
}));

export const insertScheduleSchema = createInsertSchema(schedulesTable).omit({ id: true, createdAt: true });
export type InsertSchedule = z.infer<typeof insertScheduleSchema>;
export type Schedule = typeof schedulesTable.$inferSelect;
