import { pgTable, text, serial, timestamp, integer, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { employeesTable } from "./employees";
import { relations } from "drizzle-orm";

export const attendanceTable = pgTable("attendance", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull().references(() => employeesTable.id, { onDelete: "cascade" }),
  date: text("date").notNull(),
  status: text("status", { enum: ["present", "absent", "leave"] }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("attendance_date_idx").on(table.date),
  index("attendance_employee_idx").on(table.employeeId),
]);

export const attendanceRelations = relations(attendanceTable, ({ one }) => ({
  employee: one(employeesTable, {
    fields: [attendanceTable.employeeId],
    references: [employeesTable.id],
  }),
}));

export const insertAttendanceSchema = createInsertSchema(attendanceTable).omit({ id: true, createdAt: true });
export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;
export type Attendance = typeof attendanceTable.$inferSelect;
