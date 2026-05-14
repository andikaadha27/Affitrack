import { Router } from "express";
import { and, gte, lte, eq, desc, count, inArray } from "drizzle-orm";
import { db, attendanceTable, employeesTable, activityTable } from "@workspace/db";
import {
  ListAttendanceQueryParams,
  MarkAttendanceBody,
  BulkMarkAttendanceBody,
  UpdateAttendanceParams,
  UpdateAttendanceBody,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router = Router();

function formatEmployee(e: typeof employeesTable.$inferSelect) {
  return {
    id: e.id,
    name: e.name,
    role: e.role,
    phone: e.phone,
    salaryType: e.salaryType,
    salaryAmount: parseFloat(e.salaryAmount),
    isActive: e.isActive,
    createdAt: e.createdAt.toISOString(),
  };
}

function formatAttendance(a: typeof attendanceTable.$inferSelect, employee?: typeof employeesTable.$inferSelect) {
  return {
    id: a.id,
    employeeId: a.employeeId,
    employee: employee ? formatEmployee(employee) : undefined,
    date: a.date,
    status: a.status,
    createdAt: a.createdAt.toISOString(),
  };
}

router.get("/attendance", requireAuth, async (req, res): Promise<void> => {
  const parsed = ListAttendanceQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { page = 1, limit = 50, startDate, endDate, employeeId } = parsed.data;
  const offset = (page - 1) * limit;

  const conditions = [];
  if (startDate) conditions.push(gte(attendanceTable.date, startDate));
  if (endDate) conditions.push(lte(attendanceTable.date, endDate));
  if (employeeId) conditions.push(eq(attendanceTable.employeeId, employeeId));
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, totalResult] = await Promise.all([
    db.select()
      .from(attendanceTable)
      .leftJoin(employeesTable, eq(attendanceTable.employeeId, employeesTable.id))
      .where(where)
      .orderBy(desc(attendanceTable.date))
      .limit(limit)
      .offset(offset),
    db.select({ count: count() }).from(attendanceTable).where(where),
  ]);

  res.json({
    data: rows.map((r) => formatAttendance(r.attendance, r.employees ?? undefined)),
    total: totalResult[0].count,
    page,
    limit,
  });
});

router.post("/attendance", requireAuth, async (req, res): Promise<void> => {
  const parsed = MarkAttendanceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { employeeId, date, status } = parsed.data;

  // Delete any existing record for this employee on this date before inserting
  await db.delete(attendanceTable).where(
    and(eq(attendanceTable.date, date), eq(attendanceTable.employeeId, employeeId))
  );

  const [attendance] = await db.insert(attendanceTable).values({ employeeId, date, status }).returning();
  const [employee] = await db.select().from(employeesTable).where(eq(employeesTable.id, employeeId));

  await db.insert(activityTable).values({
    type: "attendance",
    description: `Absensi: ${employee?.name ?? "Unknown"} - ${status} (${date})`,
    amount: null,
  });

  res.status(201).json(formatAttendance(attendance, employee));
});

router.post("/attendance/bulk", requireAuth, async (req, res): Promise<void> => {
  const parsed = BulkMarkAttendanceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { date, employeeIds, status } = parsed.data;

  const values = employeeIds.map((id) => ({ employeeId: id, date, status }));

  // Delete existing for those employees on that date and re-insert
  await db.delete(attendanceTable).where(
    and(
      eq(attendanceTable.date, date),
      inArray(attendanceTable.employeeId, employeeIds)
    )
  );

  const inserted = await db.insert(attendanceTable).values(values).returning();

  await db.insert(activityTable).values({
    type: "attendance",
    description: `Bulk absensi ${employeeIds.length} karyawan - ${status} (${date})`,
    amount: null,
  });

  res.json({ count: inserted.length });
});

router.patch("/attendance/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateAttendanceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateAttendanceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [attendance] = await db.update(attendanceTable)
    .set({ status: parsed.data.status })
    .where(eq(attendanceTable.id, params.data.id))
    .returning();

  if (!attendance) {
    res.status(404).json({ error: "Attendance not found" });
    return;
  }

  const [employee] = await db.select().from(employeesTable).where(eq(employeesTable.id, attendance.employeeId));
  res.json(formatAttendance(attendance, employee));
});

export default router;
