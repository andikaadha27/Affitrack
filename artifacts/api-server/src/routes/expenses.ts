import { Router } from "express";
import { and, gte, lte, eq, desc, count } from "drizzle-orm";
import { db, expensesTable, activityTable } from "@workspace/db";
import {
  ListExpensesQueryParams,
  CreateExpenseBody,
  UpdateExpenseParams,
  UpdateExpenseBody,
  DeleteExpenseParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router = Router();

function formatExpense(e: typeof expensesTable.$inferSelect) {
  return {
    id: e.id,
    category: e.category,
    amount: parseFloat(e.amount),
    date: e.date,
    notes: e.notes,
    createdAt: e.createdAt.toISOString(),
  };
}

router.get("/expenses", requireAuth, async (req, res): Promise<void> => {
  const parsed = ListExpensesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { page = 1, limit = 20, startDate, endDate } = parsed.data;
  const offset = (page - 1) * limit;

  const conditions = [];
  if (startDate) conditions.push(gte(expensesTable.date, startDate));
  if (endDate) conditions.push(lte(expensesTable.date, endDate));
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [data, totalResult] = await Promise.all([
    db.select().from(expensesTable)
      .where(where)
      .orderBy(desc(expensesTable.date))
      .limit(limit)
      .offset(offset),
    db.select({ count: count() }).from(expensesTable).where(where),
  ]);

  res.json({
    data: data.map(formatExpense),
    total: totalResult[0].count,
    page,
    limit,
  });
});

router.post("/expenses", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateExpenseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { category, amount, date, notes } = parsed.data;

  const [expense] = await db.insert(expensesTable).values({
    category,
    amount: String(amount),
    date,
    notes: notes ?? null,
  }).returning();

  await db.insert(activityTable).values({
    type: "expense",
    description: `Pengeluaran: ${category} - Rp ${amount.toLocaleString("id-ID")}`,
    amount: String(amount),
  });

  res.status(201).json(formatExpense(expense));
});

router.patch("/expenses/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateExpenseParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateExpenseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.category !== undefined) updates.category = parsed.data.category;
  if (parsed.data.amount !== undefined) updates.amount = String(parsed.data.amount);
  if (parsed.data.date !== undefined) updates.date = parsed.data.date;
  if (parsed.data.notes !== undefined) updates.notes = parsed.data.notes;

  const [expense] = await db.update(expensesTable)
    .set(updates)
    .where(eq(expensesTable.id, params.data.id))
    .returning();

  if (!expense) {
    res.status(404).json({ error: "Expense not found" });
    return;
  }

  res.json(formatExpense(expense));
});

router.delete("/expenses/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteExpenseParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db.delete(expensesTable).where(eq(expensesTable.id, params.data.id)).returning();
  if (!deleted) {
    res.status(404).json({ error: "Expense not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
