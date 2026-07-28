import { db, inTransaction } from '../db/client.js';

export async function processInterest(systemUserId: string): Promise<{ earned: number; charged: number }> {
  let totalEarned = 0;
  let totalCharged = 0;

  const wallets = await db.query(
    `SELECT w.id, w.balance, f.id as family_id, f.annual_interest_rate, f.overdraft_limit
     FROM wallets w
     JOIN families f ON f.id = w.family_id
     WHERE f.deleted_at IS NULL AND w.balance > 0`
  );

  for (const wallet of wallets.rows) {
    const todayCheck = await db.query(
      `SELECT id FROM transactions WHERE wallet_id = $1 AND type = 'interest_earned' AND created_at::date = CURRENT_DATE`,
      [wallet.id]
    );
    if (todayCheck.rows.length > 0) continue;

    const rate = parseFloat(wallet.annual_interest_rate);
    const interest = parseFloat(wallet.balance) * (rate / 365);
    const roundedInterest = Math.round(interest * 100) / 100;

    if (roundedInterest < 0.01) continue;

    const catResult = await db.query(
      `SELECT id FROM spending_categories WHERE family_id = $1 AND name = 'Interest' AND is_system = true`,
      [wallet.family_id]
    );
    const categoryId = catResult.rows[0]?.id;

    await db.query(
      `INSERT INTO transactions (wallet_id, type, amount, category_id, initiated_by, initiator_role, metadata)
       VALUES ($1, 'interest_earned', $2, $3, $4, 'system', $5)`,
      [wallet.id, roundedInterest, categoryId, systemUserId, JSON.stringify({ interest_rate: rate })]
    );

    await db.query(
      `UPDATE wallets SET balance = balance + $1, version = version + 1, updated_at = NOW() WHERE id = $2`,
      [roundedInterest, wallet.id]
    );

    totalEarned += roundedInterest;
  }

  const loans = await db.query(
    `SELECT l.id, l.wallet_id, l.outstanding, l.interest_rate, w.balance, w.family_id, f.overdraft_limit
     FROM loans l
     JOIN wallets w ON w.id = l.wallet_id
     JOIN families f ON f.id = w.family_id
     WHERE l.status = 'active' AND f.deleted_at IS NULL`
  );

  for (const loan of loans.rows) {
    const todayCheck = await db.query(
      `SELECT id FROM transactions WHERE wallet_id = $1 AND type = 'interest_charged' AND metadata->>'loan_id' = $2 AND created_at::date = CURRENT_DATE`,
      [loan.wallet_id, loan.id]
    );
    if (todayCheck.rows.length > 0) continue;

    const rate = parseFloat(loan.interest_rate);
    const interest = parseFloat(loan.outstanding) * (rate / 365);
    const roundedInterest = Math.round(interest * 100) / 100;

    if (roundedInterest < 0.01) continue;

    const overdraftLimit = parseFloat(loan.overdraft_limit || '0');
    const walletBalance = parseFloat(loan.balance);

    if (walletBalance - roundedInterest < -overdraftLimit) {
      continue;
    }

    const catResult = await db.query(
      `SELECT id FROM spending_categories WHERE family_id = $1 AND name = 'Interest' AND is_system = true`,
      [loan.family_id]
    );
    const categoryId = catResult.rows[0]?.id;

    await db.query(
      `INSERT INTO transactions (wallet_id, type, amount, category_id, initiated_by, initiator_role, metadata)
       VALUES ($1, 'interest_charged', $2, $3, $4, 'system', $5)`,
      [loan.wallet_id, -roundedInterest, categoryId, systemUserId, JSON.stringify({ loan_id: loan.id, interest_rate: rate })]
    );

    await db.query(
      `UPDATE wallets SET balance = balance - $1, version = version + 1, updated_at = NOW() WHERE id = $2`,
      [roundedInterest, loan.wallet_id]
    );

    await db.query(
      `UPDATE loans SET outstanding = outstanding + $1 WHERE id = $2`,
      [roundedInterest, loan.id]
    );

    totalCharged += roundedInterest;
  }

  return { earned: totalEarned, charged: totalCharged };
}
