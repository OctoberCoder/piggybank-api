import { db } from '../db/client.js';
import { Transaction, TransactionType } from '../types/index.js';
import { getSystemCategory } from './category.service.js';

interface CreateTransactionParams {
  walletId: string;
  familyId: string;
  type: TransactionType;
  amount: number;
  description?: string;
  initiatedBy: string;
  initiatorRole: 'parent' | 'child' | 'system';
  metadata?: Record<string, unknown>;
}

export async function createTransaction(params: CreateTransactionParams): Promise<Transaction> {
  const category = await getSystemCategory(params.familyId, params.type);

  const result = await db.query(
    `INSERT INTO transactions (wallet_id, type, amount, category_id, description, initiated_by, initiator_role, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      params.walletId,
      params.type,
      params.amount,
      category.id,
      params.description || null,
      params.initiatedBy,
      params.initiatorRole,
      JSON.stringify(params.metadata || {}),
    ]
  );

  return result.rows[0];
}

export async function getTransactions(walletId: string, page: number = 1, limit: number = 20): Promise<{ data: Transaction[]; total: number; page: number; limit: number; has_more: boolean }> {
  const offset = (page - 1) * limit;

  const [dataResult, countResult] = await Promise.all([
    db.query(
      `SELECT t.*, sc.emoji as category_emoji, sc.name as category_name
       FROM transactions t
       LEFT JOIN spending_categories sc ON sc.id = t.category_id
       WHERE t.wallet_id = $1
       ORDER BY t.created_at DESC
       LIMIT $2 OFFSET $3`,
      [walletId, limit, offset]
    ),
    db.query(`SELECT COUNT(*) FROM transactions WHERE wallet_id = $1`, [walletId]),
  ]);

  const total = parseInt(countResult.rows[0].count);

  return {
    data: dataResult.rows,
    total,
    page,
    limit,
    has_more: offset + limit < total,
  };
}
