import { Router } from "express";
import { desc } from "drizzle-orm";
import { db, activityTable } from "@workspace/db";
import { ListActivityQueryParams } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.get("/activity", requireAuth, async (req, res): Promise<void> => {
  const parsed = ListActivityQueryParams.safeParse(req.query);
  const limit = parsed.success && parsed.data.limit ? parsed.data.limit : 20;

  const rows = await db.select().from(activityTable)
    .orderBy(desc(activityTable.createdAt))
    .limit(limit);

  res.json(rows.map((r) => ({
    id: r.id,
    type: r.type,
    description: r.description,
    amount: r.amount != null ? parseFloat(r.amount) : null,
    createdAt: r.createdAt.toISOString(),
  })));
});

export default router;
