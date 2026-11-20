import "server-only";
import { prisma } from "@/lib/prisma";

const SETTING_KEY = "month_fresh_starts";
const ESTIMATE_WINDOW = 3;
const ESTIMATE_LOOKBACK = 12;

/** "YYYY-MM" identifier for a calendar month. */
export type MonthKey = string;

export interface FreshStart {
  month: MonthKey;
  balances: Record<string, number>;
  untracked: MonthKey[];
  createdAt: string;
}

export class FreshStartError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FreshStartError";
  }
}

export function toMonthKey(year: number, month: number): MonthKey {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function parseMonthKey(key: MonthKey): { year: number; month: number } {
  const [y, m] = key.split("-").map((p) => Number.parseInt(p, 10));
  return { year: y, month: m };
}

export function shiftMonth(key: MonthKey, delta: number): MonthKey {
  const { year, month } = parseMonthKey(key);
  const index = year * 12 + (month - 1) + delta;
  return toMonthKey(Math.floor(index / 12), (index % 12) + 1);
}

export function monthStart(key: MonthKey): Date {
  const { year, month } = parseMonthKey(key);
  return new Date(year, month - 1, 1, 0, 0, 0, 0);
}

export function dateToMonthKey(date: Date): MonthKey {
  return toMonthKey(date.getFullYear(), date.getMonth() + 1);
}

function isFreshStart(value: unknown): value is FreshStart {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.month === "string" &&
    typeof v.balances === "object" &&
    v.balances !== null &&
    Array.isArray(v.untracked)
  );
}

/** All fresh starts, oldest month first. Malformed stored entries are ignored. */
export async function listFreshStarts(): Promise<FreshStart[]> {
  const row = await prisma.setting.findUnique({ where: { key: SETTING_KEY } });
  if (!row) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(row.value);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed.filter(isFreshStart).sort((a, b) => a.month.localeCompare(b.month));
}

async function save(entries: FreshStart[]): Promise<void> {
  const value = JSON.stringify(entries);
  await prisma.setting.upsert({
    where: { key: SETTING_KEY },
    update: { value },
    create: { key: SETTING_KEY, value },
  });
}

export async function getUntrackedMonths(): Promise<Set<MonthKey>> {
  const entries = await listFreshStarts();
  return new Set(entries.flatMap((e) => e.untracked));
}

/**
 * Open `month` with explicit opening balances. Balances apply from the first day
 * of that month; earlier transactions no longer affect those accounts' balances.
 * Months in `untracked` are reported with estimated values in analytics.
 */
export async function createFreshStart(input: {
  month: MonthKey;
  balances: Record<string, number>;
  untracked: MonthKey[];
}): Promise<FreshStart> {
  const accountIds = Object.keys(input.balances);
  if (accountIds.length === 0) throw new FreshStartError("At least one account balance is required");
  const known = await prisma.account.count({ where: { id: { in: accountIds } } });
  if (known !== accountIds.length) throw new FreshStartError("One or more accounts do not exist");
  if (input.untracked.some((m) => m >= input.month)) {
    throw new FreshStartError("Untracked months must be before the month being opened");
  }

  const entries = await listFreshStarts();
  if (entries.some((e) => e.month === input.month)) {
    throw new FreshStartError("This month already has a fresh start; undo it first");
  }
  const entry: FreshStart = {
    month: input.month,
    balances: Object.fromEntries(accountIds.map((id) => [id, Number(input.balances[id].toFixed(3))])),
    untracked: [...new Set(input.untracked)].sort(),
    createdAt: new Date().toISOString(),
  };
  await save([...entries, entry]);
  return entry;
}

export async function deleteFreshStart(month: MonthKey): Promise<void> {
  const entries = await listFreshStarts();
  const remaining = entries.filter((e) => e.month !== month);
  if (remaining.length === entries.length) throw new FreshStartError("No fresh start for this month");
  await save(remaining);
}

/** Latest fresh start per account: accountId -> { month, amount }. */
export function anchorsByAccount(entries: FreshStart[]): Map<string, { month: MonthKey; amount: number }> {
  const result = new Map<string, { month: MonthKey; amount: number }>();
  for (const entry of entries) {
    for (const [accountId, amount] of Object.entries(entry.balances)) {
      result.set(accountId, { month: entry.month, amount });
    }
  }
  return result;
}

/**
 * Replace each untracked month's values with the average of up to
 * ESTIMATE_WINDOW preceding tracked months that have activity.
 * Keys of each record are summed independently (e.g. income, expenses, categories).
 */
export function estimateUntracked(
  buckets: Map<MonthKey, Record<string, number>>,
  targets: MonthKey[],
  untracked: Set<MonthKey>
): Map<MonthKey, Record<string, number>> {
  const estimates = new Map<MonthKey, Record<string, number>>();
  for (const target of targets) {
    if (!untracked.has(target)) continue;
    const samples: Record<string, number>[] = [];
    for (let i = 1; i <= ESTIMATE_LOOKBACK && samples.length < ESTIMATE_WINDOW; i++) {
      const key = shiftMonth(target, -i);
      if (untracked.has(key)) continue;
      const bucket = buckets.get(key);
      if (bucket && Object.values(bucket).some((v) => v !== 0)) samples.push(bucket);
    }
    const sum: Record<string, number> = {};
    for (const sample of samples) {
      for (const [k, v] of Object.entries(sample)) sum[k] = (sum[k] ?? 0) + v;
    }
    estimates.set(
      target,
      Object.fromEntries(
        Object.entries(sum).map(([k, v]) => [k, Number((v / (samples.length || 1)).toFixed(2))])
      )
    );
  }
  return estimates;
}

export const ESTIMATE_LOOKBACK_MONTHS = ESTIMATE_LOOKBACK;
