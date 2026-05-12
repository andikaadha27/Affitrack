import { Router } from "express";
import { and, gte, lte, eq, desc, sql, count } from "drizzle-orm";
import { db, revenuesTable, activityTable } from "@workspace/db";
import {
  ListRevenuesQueryParams,
  CreateRevenueBody,
  GetRevenueParams,
  UpdateRevenueParams,
  UpdateRevenueBody,
  DeleteRevenueParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router = Router();

function formatRevenue(r: typeof revenuesTable.$inferSelect) {
  return {
    id: r.id,
    date: r.date,
    amount: parseFloat(r.amount),
    actualAmount: r.actualAmount != null ? parseFloat(r.actualAmount) : null,
    product: r.product,
    units: r.units,
    notes: r.notes,
    createdAt: r.createdAt.toISOString(),
  };
}

router.get("/revenues", requireAuth, async (req, res): Promise<void> => {
  const parsed = ListRevenuesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { page = 1, limit = 20, startDate, endDate } = parsed.data;
  const offset = (page - 1) * limit;

  const conditions = [];
  if (startDate) conditions.push(gte(revenuesTable.date, startDate));
  if (endDate) conditions.push(lte(revenuesTable.date, endDate));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [data, totalResult] = await Promise.all([
    db.select().from(revenuesTable)
      .where(where)
      .orderBy(desc(revenuesTable.date))
      .limit(limit)
      .offset(offset),
    db.select({ count: count() }).from(revenuesTable).where(where),
  ]);

  res.json({
    data: data.map(formatRevenue),
    total: totalResult[0].count,
    page,
    limit,
  });
});

router.post("/revenues", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateRevenueBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { date, amount, actualAmount, product, units, notes } = parsed.data;

  const [revenue] = await db.insert(revenuesTable).values({
    date,
    amount: String(amount),
    actualAmount: actualAmount != null ? String(actualAmount) : null,
    product,
    units: units ?? null,
    notes: notes ?? null,
  }).returning();

  await db.insert(activityTable).values({
    type: "revenue",
    description: `Revenue ditambahkan: ${product} - Rp ${amount.toLocaleString("id-ID")}`,
    amount: String(amount),
  });

  res.status(201).json(formatRevenue(revenue));
});

router.get("/revenues/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetRevenueParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [revenue] = await db.select().from(revenuesTable).where(eq(revenuesTable.id, params.data.id));
  if (!revenue) {
    res.status(404).json({ error: "Revenue not found" });
    return;
  }

  res.json(formatRevenue(revenue));
});

router.patch("/revenues/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateRevenueParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateRevenueBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.date !== undefined) updates.date = parsed.data.date;
  if (parsed.data.amount !== undefined) updates.amount = String(parsed.data.amount);
  if (parsed.data.actualAmount !== undefined) updates.actualAmount = parsed.data.actualAmount != null ? String(parsed.data.actualAmount) : null;
  if (parsed.data.product !== undefined) updates.product = parsed.data.product;
  if (parsed.data.units !== undefined) updates.units = parsed.data.units;
  if (parsed.data.notes !== undefined) updates.notes = parsed.data.notes;

  const [revenue] = await db.update(revenuesTable)
    .set(updates)
    .where(eq(revenuesTable.id, params.data.id))
    .returning();

  if (!revenue) {
    res.status(404).json({ error: "Revenue not found" });
    return;
  }

  res.json(formatRevenue(revenue));
});

router.delete("/revenues/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteRevenueParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db.delete(revenuesTable).where(eq(revenuesTable.id, params.data.id)).returning();
  if (!deleted) {
    res.status(404).json({ error: "Revenue not found" });
    return;
  }

  await db.insert(activityTable).values({
    type: "revenue",
    description: `Revenue dihapus: ${deleted.product}`,
    amount: deleted.amount,
  });

  res.sendStatus(204);
});

export default router;
