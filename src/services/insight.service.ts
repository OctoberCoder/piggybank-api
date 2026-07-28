import { db } from '../db/client.js';

export async function getSpendingBreakdown(walletId: string, months: number = 1) {
  const since = new Date();
  since.setMonth(since.getMonth() - months);

  const result = await db.query(
    `SELECT sc.emoji, sc.name as category, SUM(t.amount) as total
     FROM transactions t
     JOIN spending_categories sc ON sc.id = t.category_id
     WHERE t.wallet_id = $1
       AND t.type IN ('withdrawal', 'deposit')
       AND t.amount < 0
       AND t.created_at >= $2
     GROUP BY sc.id, sc.name, sc.emoji
     ORDER BY total ASC`,
    [walletId, since]
  );

  const total = result.rows.reduce((sum: number, r: any) => sum + Math.abs(parseFloat(r.total)), 0);

  return {
    period: `${months} month${months > 1 ? 's' : ''}`,
    since: since.toISOString(),
    total_spent: Math.abs(total),
    categories: result.rows.map((r: any) => {
      const absAmount = Math.abs(parseFloat(r.total));
      return {
        emoji: r.emoji,
        category: r.category,
        amount: absAmount,
        percentage: total > 0 ? Math.round((absAmount / total) * 100) : 0,
      };
    }),
  };
}

export async function getMonthlySummary(familyId: string) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const isPartialMonth = now.getDate() < daysInMonth(now);

  const result = await db.query(
    `SELECT w.id as wallet_id, u.name as child_name,
       SUM(CASE WHEN t.type IN ('deposit', 'allowance', 'interest_earned') THEN t.amount ELSE 0 END) as total_deposited,
       SUM(CASE WHEN t.type IN ('withdrawal') THEN t.amount ELSE 0 END) as total_spent,
       SUM(CASE WHEN t.type = 'interest_earned' THEN t.amount ELSE 0 END) as total_interest
     FROM wallets w
     JOIN users u ON u.id = w.user_id
     LEFT JOIN transactions t ON t.wallet_id = w.id AND t.created_at >= $1
     WHERE w.family_id = $2 AND u.is_lightweight = true
     GROUP BY w.id, u.name`,
    [startOfMonth, familyId]
  );

  return {
    period: `${startOfMonth.toISOString().slice(0, 7)}`,
    projected: isPartialMonth,
    kids: result.rows.map((r: any) => ({
      name: r.child_name,
      deposited: parseFloat(r.total_deposited || '0'),
      spent: Math.abs(parseFloat(r.total_spent || '0')),
      interest_earned: parseFloat(r.total_interest || '0'),
    })),
  };
}

// Helper - daysInMonth polyfill
function daysInMonth(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}
