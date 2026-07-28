import { db } from '../db/client.js';
import { AllowanceRule } from '../types/index.js';
import { createTransaction } from './transaction.service.js';

export async function createOrUpdateRule(
  walletId: string,
  familyId: string,
  data: {
    amount: number;
    frequency: 'weekly' | 'biweekly' | 'monthly';
    day_of_week?: number;
    debt_deduction_type: 'percentage' | 'fixed';
    debt_deduction_value: number;
  }
): Promise<AllowanceRule> {
  const existing = await db.query(
    `SELECT * FROM allowance_rules WHERE wallet_id = $1 AND active = true`,
    [walletId]
  );

  const nextPayout = calculateNextPayout(data.frequency, data.day_of_week);

  if (existing.rows.length > 0) {
    const result = await db.query(
      `UPDATE allowance_rules
       SET amount = $1, frequency = $2, day_of_week = $3, next_payout = $4,
           debt_deduction_type = $5, debt_deduction_value = $6, updated_at = NOW()
       WHERE id = $7 RETURNING *`,
      [data.amount, data.frequency, data.day_of_week || null, nextPayout,
       data.debt_deduction_type, data.debt_deduction_value, existing.rows[0].id]
    );
    return result.rows[0];
  }

  const result = await db.query(
    `INSERT INTO allowance_rules (family_id, wallet_id, amount, frequency, day_of_week, next_payout, debt_deduction_type, debt_deduction_value)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [familyId, walletId, data.amount, data.frequency, data.day_of_week || null, nextPayout,
     data.debt_deduction_type, data.debt_deduction_value]
  );
  return result.rows[0];
}

export async function getRule(walletId: string): Promise<AllowanceRule | null> {
  const result = await db.query(
    `SELECT * FROM allowance_rules WHERE wallet_id = $1 AND active = true`,
    [walletId]
  );
  return result.rows[0] || null;
}

export async function deleteRule(ruleId: string): Promise<void> {
  await db.query(`UPDATE allowance_rules SET active = false WHERE id = $1`, [ruleId]);
}

export async function processPayouts(systemUserId: string): Promise<number> {
  const rulesResult = await db.query(
    `SELECT r.*, w.family_id, w.balance
     FROM allowance_rules r
     JOIN wallets w ON w.id = r.wallet_id
     JOIN families f ON f.id = w.family_id
     WHERE r.active = true AND r.next_payout <= NOW() AND f.deleted_at IS NULL
     FOR UPDATE OF w SKIP LOCKED`
  );

  let processed = 0;

  for (const rule of rulesResult.rows) {
    const todayCheck = await db.query(
      `SELECT id FROM transactions
       WHERE wallet_id = $1 AND type = 'allowance'
       AND metadata->>'rule_id' = $2
       AND created_at::date = CURRENT_DATE`,
      [rule.wallet_id, rule.id]
    );
    if (todayCheck.rows.length > 0) continue;

    let deduction = 0;
    if (rule.debt_deduction_type === 'percentage') {
      deduction = rule.amount * (rule.debt_deduction_value / 100);
    } else {
      deduction = Math.min(rule.debt_deduction_value, rule.amount);
    }

    if (deduction > 0) {
      const loanResult = await db.query(
        `SELECT id, outstanding FROM loans
         WHERE wallet_id = $1 AND status = 'active'
         ORDER BY created_at ASC LIMIT 1`,
        [rule.wallet_id]
      );

      if (loanResult.rows.length > 0) {
        const loan = loanResult.rows[0];
        const paymentAmount = Math.min(deduction, loan.outstanding);

        await db.query(
          `UPDATE loans SET outstanding = outstanding - $1 WHERE id = $2`,
          [paymentAmount, loan.id]
        );

        await db.query(
          `INSERT INTO loan_payments (loan_id, amount, created_by) VALUES ($1, $2, $3)`,
          [loan.id, paymentAmount, systemUserId]
        );

        await createTransaction({
          walletId: rule.wallet_id,
          familyId: rule.family_id,
          type: 'loan_repayment',
          amount: -paymentAmount,
          description: 'Auto-deducted from allowance for loan repayment',
          initiatedBy: systemUserId,
          initiatorRole: 'system',
          metadata: { loan_id: loan.id, rule_id: rule.id, deduction_type: rule.debt_deduction_type },
        });
      }
    }

    const netAmount = rule.amount - deduction;

    if (netAmount > 0) {
      await createTransaction({
        walletId: rule.wallet_id,
        familyId: rule.family_id,
        type: 'allowance',
        amount: netAmount,
        description: 'Weekly allowance',
        initiatedBy: systemUserId,
        initiatorRole: 'system',
        metadata: { rule_id: rule.id, deduction_amount: deduction },
      });

      await db.query(
        `UPDATE wallets SET balance = balance + $1, version = version + 1, updated_at = NOW()
         WHERE id = $2`,
        [netAmount, rule.wallet_id]
      );
    }

    const nextPayout = calculateNextPayout(rule.frequency as any, rule.day_of_week);
    await db.query(`UPDATE allowance_rules SET next_payout = $1 WHERE id = $2`, [nextPayout, rule.id]);

    processed++;
  }

  return processed;
}

function calculateNextPayout(frequency: string, dayOfWeek?: number): Date {
  const now = new Date();
  const next = new Date(now);

  switch (frequency) {
    case 'weekly': {
      const currentDay = next.getDay();
      const targetDay = dayOfWeek ?? currentDay;
      const diff = targetDay - currentDay;
      next.setDate(next.getDate() + (diff > 0 ? diff : 7 + diff));
      break;
    }
    case 'biweekly':
      next.setDate(next.getDate() + 14);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      break;
  }

  next.setHours(9, 0, 0, 0);
  return next;
}
