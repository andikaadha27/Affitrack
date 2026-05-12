import { Router } from "express";
import { and, gte, lte, eq, desc, count } from "drizzle-orm";
import { db, adsTable, activityTable } from "@workspace/db";
import {
  ListAdsQueryParams,
  CreateAdBody,
  UpdateAdParams,
  UpdateAdBody,
  DeleteAdParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router = Router();

const AD_FEE_RATE = 0.11;

function formatAd(a: typeof adsTable.$inferSelect) {
  return {
    id: a.id,
    date: a.date,
    amount: parseFloat(a.amount),
    fee: parseFloat(a.fee),
    totalWithFee: parseFloat(a.totalWithFee),
    platform: a.platform,
    campaign: a.campaign,
    notes: a.notes,
    createdAt: a.createdAt.toISOString(),
  };
}

router.get("/ads", requireAuth, async (req, res): Promise<void> => {
  const parsed = ListAdsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { page = 1, limit = 20, startDate, endDate } = parsed.data;
  const offset = (page - 1) * limit;

  const conditions = [];
  if (startDate) conditions.push(gte(adsTable.date, startDate));
  if (endDate) conditions.push(lte(adsTable.date, endDate));
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [data, totalResult] = await Promise.all([
    db.select().from(adsTable)
      .where(where)
      .orderBy(desc(adsTable.date))
      .limit(limit)
      .offset(offset),
    db.select({ count: count() }).from(adsTable).where(where),
  ]);

  res.json({
    data: data.map(formatAd),
    total: totalResult[0].count,
    page,
    limit,
  });
});

router.post("/ads", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateAdBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { date, amount, platform, campaign, notes } = parsed.data;
  const fee = amount * AD_FEE_RATE;
  const totalWithFee = amount + fee;

  const [ad] = await db.insert(adsTable).values({
    date,
    amount: String(amount),
    fee: String(fee),
    totalWithFee: String(totalWithFee),
    platform,
    campaign: campaign ?? null,
    notes: notes ?? null,
  }).returning();

  await db.insert(activityTable).values({
    type: "ad",
    description: `Iklan ditambahkan: ${platform} - Rp ${amount.toLocaleString("id-ID")} (+11% fee)`,
    amount: String(totalWithFee),
  });

  res.status(201).json(formatAd(ad));
});

router.patch("/ads/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateAdParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateAdBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.date !== undefined) updates.date = parsed.data.date;
  if (parsed.data.amount !== undefined) {
    const fee = parsed.data.amount * AD_FEE_RATE;
    updates.amount = String(parsed.data.amount);
    updates.fee = String(fee);
    updates.totalWithFee = String(parsed.data.amount + fee);
  }
  if (parsed.data.platform !== undefined) updates.platform = parsed.data.platform;
  if (parsed.data.campaign !== undefined) updates.campaign = parsed.data.campaign;
  if (parsed.data.notes !== undefined) updates.notes = parsed.data.notes;

  const [ad] = await db.update(adsTable)
    .set(updates)
    .where(eq(adsTable.id, params.data.id))
    .returning();

  if (!ad) {
    res.status(404).json({ error: "Ad not found" });
    return;
  }

  res.json(formatAd(ad));
});

router.delete("/ads/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteAdParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db.delete(adsTable).where(eq(adsTable.id, params.data.id)).returning();
  if (!deleted) {
    res.status(404).json({ error: "Ad not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
