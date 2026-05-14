import { Router } from "express";
import { and, gte, lte, sql, eq } from "drizzle-orm";
import { db, revenuesTable, adsTable, expensesTable, salariesTable, attendanceTable, employeesTable } from "@workspace/db";
import { GetDashboardTrendsQueryParams } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.get("/dashboard/summary", requireAuth, async (_req, res): Promise<void> => {
  const today = new Date().toISOString().split("T")[0];
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split("T")[0];
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split("T")[0];
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

  const [
    todayRevenues,
    todayAds,
    todayPresentAttendance,
    monthRevenues,
    monthAds,
    monthExpenses,
    monthSalaries,
    lastMonthRevenues,
    lastMonthAds,
    lastMonthExpenses,
    lastMonthSalaries,
  ] = await Promise.all([
    db.select().from(revenuesTable).where(sql`${revenuesTable.date} = ${today}`),
    db.select().from(adsTable).where(sql`${adsTable.date} = ${today}`),
    // Today's present employees with their salary info
    db.select({ employee: employeesTable })
      .from(attendanceTable)
      .innerJoin(employeesTable, eq(attendanceTable.employeeId, employeesTable.id))
      .where(and(sql`${attendanceTable.date} = ${today}`, eq(attendanceTable.status, "present"))),
    db.select().from(revenuesTable).where(
      and(gte(revenuesTable.date, monthStart), lte(revenuesTable.date, today))
    ),
    db.select().from(adsTable).where(
      and(gte(adsTable.date, monthStart), lte(adsTable.date, today))
    ),
    db.select().from(expensesTable).where(
      and(gte(expensesTable.date, monthStart), lte(expensesTable.date, today))
    ),
    db.select().from(salariesTable).where(
      and(
        sql`${salariesTable.month} = ${now.getMonth() + 1}`,
        sql`${salariesTable.year} = ${now.getFullYear()}`
      )
    ),
    db.select().from(revenuesTable).where(
      and(gte(revenuesTable.date, lastMonthStart), lte(revenuesTable.date, lastMonthEnd))
    ),
    db.select().from(adsTable).where(
      and(gte(adsTable.date, lastMonthStart), lte(adsTable.date, lastMonthEnd))
    ),
    db.select().from(expensesTable).where(
      and(gte(expensesTable.date, lastMonthStart), lte(expensesTable.date, lastMonthEnd))
    ),
    db.select().from(salariesTable).where(
      and(
        sql`${salariesTable.month} = ${now.getMonth()}`,
        sql`${salariesTable.year} = ${now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()}`
      )
    ),
  ]);

  const sum = (arr: { amount: string | null }[]) =>
    arr.reduce((acc, r) => acc + parseFloat(r.amount ?? "0"), 0);
  const sumActual = (arr: { actualAmount: string | null }[]) =>
    arr.reduce((acc, r) => acc + parseFloat(r.actualAmount ?? "0"), 0);
  const sumCalc = (arr: { calculatedAmount: string }[]) =>
    arr.reduce((acc, r) => acc + parseFloat(r.calculatedAmount), 0);
  const sumTotal = (arr: { totalWithFee: string }[]) =>
    arr.reduce((acc, r) => acc + parseFloat(r.totalWithFee), 0);

  // Calculate today's salary cost from employees present today
  const todaySalary = todayPresentAttendance.reduce((acc, { employee }) => {
    const rate = parseFloat(employee.salaryAmount);
    if (employee.salaryType === "daily") {
      return acc + rate;
    } else {
      // Monthly employee: prorate to daily cost
      return acc + rate / daysInMonth;
    }
  }, 0);

  const todayRevenue = sum(todayRevenues);
  const todayActualRevenue = sumActual(todayRevenues);
  const todayAdsAmount = sum(todayAds);
  const todayAdsWithFee = sumTotal(todayAds);
  const todayProfit = (todayActualRevenue || todayRevenue) - todayAdsWithFee - todaySalary;

  const monthRevenue = sum(monthRevenues);
  const monthActualRevenue = sumActual(monthRevenues);
  const monthAdsWithFee = sumTotal(monthAds);
  const monthExpensesTotal = sum(monthExpenses);
  const monthSalaryTotal = sumCalc(monthSalaries);
  const monthProfit = (monthActualRevenue || monthRevenue) - monthAdsWithFee - monthExpensesTotal - monthSalaryTotal;
  const profitMargin = monthRevenue > 0 ? (monthProfit / monthRevenue) * 100 : 0;

  // Last month profit for growth calculation
  const lmRevenue = sum(lastMonthRevenues);
  const lmActualRevenue = sumActual(lastMonthRevenues);
  const lmAdsWithFee = sumTotal(lastMonthAds);
  const lmExpenses = sum(lastMonthExpenses);
  const lmSalary = sumCalc(lastMonthSalaries);
  const lastMonthProfit = (lmActualRevenue || lmRevenue) - lmAdsWithFee - lmExpenses - lmSalary;
  const growthRate = lastMonthProfit !== 0 ? ((monthProfit - lastMonthProfit) / Math.abs(lastMonthProfit)) * 100 : 0;

  res.json({
    todayRevenue,
    todayActualRevenue,
    todayAds: todayAdsAmount,
    todayAdsWithFee,
    todaySalary,
    todayProfit,
    monthRevenue,
    monthActualRevenue,
    monthProfit,
    monthSalary: monthSalaryTotal,
    monthExpenses: monthExpensesTotal,
    profitMargin,
    growthRate,
  });
});

router.get("/dashboard/trends", requireAuth, async (req, res): Promise<void> => {
  const parsed = GetDashboardTrendsQueryParams.safeParse(req.query);
  const period = parsed.success ? parsed.data.period : "7d";

  const now = new Date();
  let startDate: string;

  if (period === "7d") {
    const d = new Date(now);
    d.setDate(d.getDate() - 6);
    startDate = d.toISOString().split("T")[0];
  } else if (period === "30d") {
    const d = new Date(now);
    d.setDate(d.getDate() - 29);
    startDate = d.toISOString().split("T")[0];
  } else {
    startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  }

  const endDate = now.toISOString().split("T")[0];

  const [revenues, ads] = await Promise.all([
    db.select().from(revenuesTable).where(
      and(gte(revenuesTable.date, startDate), lte(revenuesTable.date, endDate))
    ),
    db.select().from(adsTable).where(
      and(gte(adsTable.date, startDate), lte(adsTable.date, endDate))
    ),
  ]);

  // Build date range
  const days: string[] = [];
  const cur = new Date(startDate);
  const end = new Date(endDate);
  while (cur <= end) {
    days.push(cur.toISOString().split("T")[0]);
    cur.setDate(cur.getDate() + 1);
  }

  const revenueByDate: Record<string, { revenue: number; actualRevenue: number }> = {};
  for (const r of revenues) {
    if (!revenueByDate[r.date]) revenueByDate[r.date] = { revenue: 0, actualRevenue: 0 };
    revenueByDate[r.date].revenue += parseFloat(r.amount);
    revenueByDate[r.date].actualRevenue += parseFloat(r.actualAmount ?? "0");
  }

  const adsByDate: Record<string, number> = {};
  for (const a of ads) {
    adsByDate[a.date] = (adsByDate[a.date] ?? 0) + parseFloat(a.totalWithFee);
  }

  const trends = days.map((date) => {
    const rev = revenueByDate[date]?.revenue ?? 0;
    const actualRev = revenueByDate[date]?.actualRevenue ?? 0;
    const adsVal = adsByDate[date] ?? 0;
    const profit = (actualRev || rev) - adsVal;
    return { date, revenue: rev, actualRevenue: actualRev, ads: adsVal, profit };
  });

  res.json(trends);
});

export default router;
