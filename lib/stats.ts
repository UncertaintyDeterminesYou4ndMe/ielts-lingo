import { eq, lt } from "drizzle-orm";
import { db } from "./db";
import { cards, userStats } from "./db/schema";

function dateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function yesterdayOf(d: Date): string {
  const y = new Date(d);
  y.setDate(y.getDate() - 1);
  return dateStr(y);
}

export interface TodayStats {
  date: string;
  xp: number;
  streak: number;
  minutes: number;
}

export function getTodayStats(now: Date = new Date()): TodayStats {
  const today = dateStr(now);
  const row = db.select().from(userStats).where(eq(userStats.date, today)).get();
  return row ?? { date: today, xp: 0, streak: 0, minutes: 0 };
}

/** 完成一次练习后调用：累加 XP/时长，首次开口的当天顺带结算 streak。 */
export function awardXp(xp: number, minutes: number, now: Date = new Date()): TodayStats {
  const today = dateStr(now);
  const existing = db.select().from(userStats).where(eq(userStats.date, today)).get();

  if (existing) {
    const updated = {
      xp: existing.xp + xp,
      minutes: existing.minutes + minutes,
    };
    db.update(userStats).set(updated).where(eq(userStats.date, today)).run();
    return { date: today, streak: existing.streak, ...updated };
  }

  const yesterday = db
    .select()
    .from(userStats)
    .where(eq(userStats.date, yesterdayOf(now)))
    .get();
  const streak = (yesterday?.streak ?? 0) + 1;

  db.insert(userStats).values({ date: today, xp, streak, minutes }).run();
  return { date: today, xp, streak, minutes };
}

export function getDueReviewCount(now: Date = new Date()): number {
  const rows = db.select({ id: cards.id }).from(cards).where(lt(cards.due, now)).all();
  return rows.length;
}
