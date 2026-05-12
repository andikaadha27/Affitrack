import { Router } from "express";
import { and, gte, lte, eq, sql } from "drizzle-orm";
import { db, schedulesTable, employeesTable } from "@workspace/db";
import {
  ListSchedulesQueryParams,
  CreateScheduleBody,
  UpdateScheduleParams,
  UpdateScheduleBody,
  DeleteScheduleParams,
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

function formatSchedule(s: typeof schedulesTable.$inferSelect, employee?: typeof employeesTable.$inferSelect) {
  return {
    id: s.id,
    employeeId: s.employeeId,
    employee: employee ? formatEmployee(employee) : undefined,
    date: s.date,
    shift: s.shift,
    createdAt: s.createdAt.toISOString(),
  };
}

router.get("/schedules", requireAuth, async (req, res): Promise<void> => {
  const parsed = ListSchedulesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { startDate, endDate, employeeId } = parsed.data;

  const conditions = [];
  if (startDate) conditions.push(gte(schedulesTable.date, startDate));
  if (endDate) conditions.push(lte(schedulesTable.date, endDate));
  if (employeeId) conditions.push(eq(schedulesTable.employeeId, employeeId));
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select()
    .from(schedulesTable)
    .leftJoin(employeesTable, eq(schedulesTable.employeeId, employeesTable.id))
    .where(where)
    .orderBy(schedulesTable.date);

  res.json(rows.map((r) => formatSchedule(r.schedules, r.employees ?? undefined)));
});

router.post("/schedules", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateScheduleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { employeeId, date, shift } = parsed.data;

  const [schedule] = await db.insert(schedulesTable).values({ employeeId, date, shift }).returning();
  const [employee] = await db.select().from(employeesTable).where(eq(employeesTable.id, employeeId));

  res.status(201).json(formatSchedule(schedule, employee));
});

router.patch("/schedules/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateScheduleParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateScheduleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [schedule] = await db.update(schedulesTable)
    .set({ shift: parsed.data.shift })
    .where(eq(schedulesTable.id, params.data.id))
    .returning();

  if (!schedule) {
    res.status(404).json({ error: "Schedule not found" });
    return;
  }

  const [employee] = await db.select().from(employeesTable).where(eq(employeesTable.id, schedule.employeeId));
  res.json(formatSchedule(schedule, employee));
});

router.delete("/schedules/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteScheduleParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db.delete(schedulesTable).where(eq(schedulesTable.id, params.data.id)).returning();
  if (!deleted) {
    res.status(404).json({ error: "Schedule not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
