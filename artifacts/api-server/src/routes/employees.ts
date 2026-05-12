import { Router } from "express";
import { eq, desc, count } from "drizzle-orm";
import { db, employeesTable, activityTable } from "@workspace/db";
import {
  ListEmployeesQueryParams,
  CreateEmployeeBody,
  GetEmployeeParams,
  UpdateEmployeeParams,
  UpdateEmployeeBody,
  DeleteEmployeeParams,
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

router.get("/employees", requireAuth, async (req, res): Promise<void> => {
  const parsed = ListEmployeesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { page = 1, limit = 50, active } = parsed.data;
  const offset = (page - 1) * limit;

  const where = active !== undefined ? eq(employeesTable.isActive, active) : undefined;

  const [data, totalResult] = await Promise.all([
    db.select().from(employeesTable)
      .where(where)
      .orderBy(desc(employeesTable.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ count: count() }).from(employeesTable).where(where),
  ]);

  res.json({
    data: data.map(formatEmployee),
    total: totalResult[0].count,
    page,
    limit,
  });
});

router.post("/employees", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateEmployeeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { name, role, phone, salaryType, salaryAmount, isActive } = parsed.data;

  const [employee] = await db.insert(employeesTable).values({
    name,
    role,
    phone: phone ?? null,
    salaryType,
    salaryAmount: String(salaryAmount),
    isActive: isActive ?? true,
  }).returning();

  await db.insert(activityTable).values({
    type: "employee",
    description: `Karyawan baru: ${name} (${role})`,
    amount: null,
  });

  res.status(201).json(formatEmployee(employee));
});

router.get("/employees/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetEmployeeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [employee] = await db.select().from(employeesTable).where(eq(employeesTable.id, params.data.id));
  if (!employee) {
    res.status(404).json({ error: "Employee not found" });
    return;
  }

  res.json(formatEmployee(employee));
});

router.patch("/employees/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateEmployeeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateEmployeeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.role !== undefined) updates.role = parsed.data.role;
  if (parsed.data.phone !== undefined) updates.phone = parsed.data.phone;
  if (parsed.data.salaryType !== undefined) updates.salaryType = parsed.data.salaryType;
  if (parsed.data.salaryAmount !== undefined) updates.salaryAmount = String(parsed.data.salaryAmount);
  if (parsed.data.isActive !== undefined) updates.isActive = parsed.data.isActive;

  const [employee] = await db.update(employeesTable)
    .set(updates)
    .where(eq(employeesTable.id, params.data.id))
    .returning();

  if (!employee) {
    res.status(404).json({ error: "Employee not found" });
    return;
  }

  res.json(formatEmployee(employee));
});

router.delete("/employees/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteEmployeeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db.delete(employeesTable).where(eq(employeesTable.id, params.data.id)).returning();
  if (!deleted) {
    res.status(404).json({ error: "Employee not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
