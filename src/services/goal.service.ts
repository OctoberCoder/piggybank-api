import { db } from '../db/client.js';
import { SavingsGoal } from '../types/index.js';

export async function createGoal(walletId: string, name: string, emoji: string, targetAmount: number): Promise<SavingsGoal> {
  const result = await db.query(
    `INSERT INTO savings_goals (wallet_id, name, emoji, target_amount) VALUES ($1, $2, $3, $4) RETURNING *`,
    [walletId, name, emoji, targetAmount]
  );
  return result.rows[0];
}

export async function getGoals(walletId: string): Promise<SavingsGoal[]> {
  const result = await db.query(
    `SELECT * FROM savings_goals WHERE wallet_id = $1 AND status IN ('active', 'completed') ORDER BY created_at DESC`,
    [walletId]
  );
  return result.rows;
}

export async function getGoal(goalId: string): Promise<SavingsGoal | null> {
  const result = await db.query(`SELECT * FROM savings_goals WHERE id = $1`, [goalId]);
  return result.rows[0] || null;
}

export async function updateGoalProgress(goalId: string, amountChange: number, expectedVersion: number): Promise<SavingsGoal> {
  // amountChange can be positive (add money) or negative (withdraw)
  const result = await db.query(
    `UPDATE savings_goals 
     SET current_amount = current_amount + $1, version = version + 1
     WHERE id = $2 AND version = $3
     RETURNING *`,
    [amountChange, goalId, expectedVersion]
  );

  if (result.rows.length === 0) throw new Error('VERSION_CONFLICT');
  
  const goal = result.rows[0];

  // Check if goal is now completed
  if (goal.current_amount >= goal.target_amount && goal.status === 'active' && !goal.celebration_shown) {
    const completedResult = await db.query(
      `UPDATE savings_goals SET status = 'completed', completed_at = NOW(), celebration_shown = true
       WHERE id = $1 RETURNING *`,
      [goalId]
    );
    return completedResult.rows[0];
  }

  return goal;
}

export async function cancelGoal(goalId: string, walletId: string): Promise<void> {
  const goal = await getGoal(goalId);
  if (!goal || goal.status !== 'active') throw new Error('Goal not active');

  await db.query(
    `UPDATE savings_goals SET status = 'cancelled' WHERE id = $1`,
    [goalId]
  );

  // Return funds to wallet
  if (goal.current_amount > 0) {
    await db.query(
      `UPDATE wallets SET balance = balance + $1, version = version + 1, updated_at = NOW()
       WHERE id = $2`,
      [goal.current_amount, walletId]
    );
  }
}
