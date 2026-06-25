// Business logic: pure analytics calculations.
//
// No I/O, no Supabase, no env reads. Every function takes raw numbers and
// returns derived metrics so the rules for Revenue, Net Sales, Net Profit,
// and CPP live in exactly one place and are trivially unit-testable.

export type RevenueInput = {
  /** Sum of `orders.total` for revenue-bucket orders (pending/confirmed/shipped/delivered). */
  grossRevenue: number;
  /** Sum of `orders.total` for returned/refunded orders in the same window. */
  returnsAmount: number;
  /** Sum of `orders.total` for cancelled orders in the same window. */
  cancelledAmount?: number;
};

export type NetProfitInput = {
  netSales: number;
  adSpend: number;
  /** Non-ad operating expenses (shipping, salaries, etc.). Optional. */
  otherExpenses?: number;
  /** Cost of goods sold, if tracked. Optional. */
  cogs?: number;
};

/** Gross Revenue: total billed value of revenue-bucket orders, returns NOT yet subtracted. */
export function revenue(input: RevenueInput): number {
  return round2(Math.max(0, Number(input.grossRevenue) || 0));
}

/** Net Sales = Gross Sales (Confirmed + Delivered orders). Never negative. */
export function netSales(input: RevenueInput): number {
  const gross = Number(input.grossRevenue) || 0;
  return round2(Math.max(0, gross));
}

/**
 * Net Profit = Net Sales − Ad Spend − Other Expenses − COGS.
 * Returns and Cancelled are already removed inside Net Sales, so they are
 * NOT subtracted again here.
 */
export function netProfit(input: NetProfitInput): number {
  const sales = Number(input.netSales) || 0;
  const ads = Math.max(0, Number(input.adSpend) || 0);
  const other = Math.max(0, Number(input.otherExpenses ?? 0) || 0);
  const cogs = Math.max(0, Number(input.cogs ?? 0) || 0);
  return round2(sales - ads - other - cogs);
}

/**
 * CPP — Cost Per Purchase. Ad spend divided by number of purchases.
 * Returns null when there are no purchases (avoids /0 and misleading zeros).
 */
export function cpp(adSpend: number, purchases: number): number | null {
  const p = Math.trunc(Number(purchases) || 0);
  if (p <= 0) return null;
  const ads = Math.max(0, Number(adSpend) || 0);
  return round2(ads / p);
}

function round2(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}
