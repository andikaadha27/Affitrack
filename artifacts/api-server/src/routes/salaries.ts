import { Router } from "express";
import { and, eq, sql } from "drizzle-orm";
import { db, salariesTable, employeesTable, attendanceTable, activityTable } from "@workspace/db";
import {
  ListSalariesQueryParams,
  CalculateSalariesBody,
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

function formatSalary(s: typeof salariesTable.$inferSelect, employee?: typeof employeesTable.$inferSelect) {
  return {
    id: s.id,
    employeeId: s.employeeId,
    employee: employee ? formatEmployee(employee) : undefined,
    month: s.month,
    year: s.year,
    attendanceCount: s.attendanceCount,
    workingDays: s.workingDays,
    baseSalary: parseFloat(s.baseSalary),
    calculatedAmount: parseFloat(s.calculatedAmount),
    createdAt: s.createdAt.toISOString(),
  };
}

router.get("/salaries", requireAuth, async (req, res): Promise<void> => {
  const parsed = ListSalariesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { month, year, employeeId } = parsed.data;

  const conditions = [];
  if (month !== undefined) conditions.push(eq(salariesTable.month, month));
  if (year !== undefined) conditions.push(eq(salariesTable.year, year));
  if (employeeId !== undefined) conditions.push(eq(salariesTable.employeeId, employeeId));
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db.select()
    .from(salariesTable)
    .leftJoin(employeesTable, eq(salariesTable.employeeId, employeesTable.id))
    .where(where)
    .orderBy(salariesTable.year, salariesTable.month);

  res.json(rows.map((r) => formatSalary(r.salaries, r.employees ?? undefined)));
});

router.post("/salaries/calculate", requireAuth, async (req, res): Promise<void> => {
  const parsed = CalculateSalariesBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { month, year } = parsed.data;

  // Get all active employees
  const employees = await db.select().from(employeesTable).where(eq(employeesTable.isActive, true));

  // Calculate working days in the month
  const daysInMonth = new Date(year, month, 0).getDate();

  const results = [];

  for (const emp of employees) {
    // Get attendance count for this employee in the given month
    const monthStr = String(month).padStart(2, "0");
    const startDate = `${year}-${monthStr}-01`;
    const endDate = `${year}-${monthStr}-${String(daysInMonth).padStart(2, "0")}`;

    const attendanceRows = await db.select()
      .from(attendanceTable)
      .where(
        and(
          eq(attendanceTable.employeeId, emp.id),
          sql`${attendanceTable.date} >= ${startDate}`,
          sql`${attendanceTable.date} <= ${endDate}`,
          eq(attendanceTable.status, "present")
        )
      );

    const attendanceCount = attendanceRows.length;
    const baseSalary = parseFloat(emp.salaryAmount);
    let calculatedAmount = 0;

    if (emp.salaryType === "daily") {
      calculatedAmount = attendanceCount * baseSalary;
    } else {
      // Monthly: prorated based on attendance
      const workingDays = daysInMonth;
      calculatedAmount = attendanceCount > 0
        ? (attendanceCount / workingDays) * baseSalary
        : 0;
    }

    // Upsert: delete existing for this employee/month/year and insert new
    await db.delete(salariesTable).where(
      and(
        eq(salariesTable.employeeId, emp.id),
        eq(salariesTable.month, month),
        eq(salariesTable.year, year)
      )
    );

    const [salary] = await db.insert(salariesTable).values({
      employeeId: emp.id,
      month,
      year,
      attendanceCount,
      workingDays: daysInMonth,
      baseSalary: String(baseSalary),
      calculatedAmount: String(calculatedAmount),
    }).returning();

    results.push(formatSalary(salary, emp));
  }

  await db.insert(activityTable).values({
    type: "salary",
    description: `Penggajian dihitung: ${month}/${year} (${results.length} karyawan)`,
    amount: String(results.reduce((sum, r) => sum + r.calculatedAmount, 0)),
  });

  res.json(results);
});

export default router;
