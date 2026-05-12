import { pgTable, text, serial, timestamp, numeric, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const adsTable = pgTable("ads", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  fee: numeric("fee", { precision: 15, scale: 2 }).notNull(),
  totalWithFee: numeric("total_with_fee", { precision: 15, scale: 2 }).notNull(),
  platform: text("platform", { enum: ["Shopee", "TikTok", "Meta", "Google", "Other"] }).notNull(),
  campaign: text("campaign"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("ads_date_idx").on(table.date),
]);

export const insertAdSchema = createInsertSchema(adsTable).omit({ id: true, createdAt: true });
export type InsertAd = z.infer<typeof insertAdSchema>;
export type Ad = typeof adsTable.$inferSelect;
