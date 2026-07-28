import { db, inTransaction } from '../db/client.js';
import { SpendingRequest } from '../types/index.js';

export async function submitRequest(
  walletId: string,
  childUserId: string,
  description: string,
  amount: number,
  categoryId: string
): Promise<SpendingRequest> {
  const result = await db.query(
    `INSERT INTO spending_requests (wallet_id, child_user_id, description, amount, category_id)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [walletId, childUserId, description, amount, categoryId]
  );
  return result.rows[0];
}

export async function approveRequest(requestId: string, resolvedBy: string, parentNote?: string): Promise<void> {
  await inTransaction(async (client) => {
    const result = await client.query(
      `UPDATE spending_requests SET status = 'approved', resolved_at = NOW(), resolved_by = $1,
       parent_note = COALESCE($2, parent_note) WHERE id = $3 AND status = 'pending'
       RETURNING *`,
      [resolvedBy, parentNote, requestId]
    );

    if (result.rows.length === 0) throw new Error('Request not found or already resolved');

    const request = result.rows[0];

    const walletResult = await client.query(
      `SELECT * FROM wallets WHERE id = $1 FOR UPDATE`,
      [request.wallet_id]
    );
    const wallet = walletResult.rows[0];

    if (Number(wallet.balance) < Number(request.amount)) {
      throw new Error('INSUFFICIENT_FUNDS');
    }

    await client.query(
      `UPDATE wallets SET balance = balance - $1, version = version + 1, updated_at = NOW()
       WHERE id = $2`,
      [request.amount, request.wallet_id]
    );

    const categoryResult = await client.query(
      `SELECT id FROM spending_categories WHERE id = $1`,
      [request.category_id]
    );

    await client.query(
      `INSERT INTO transactions (wallet_id, type, amount, category_id, description, initiated_by, initiator_role, metadata)
       VALUES ($1, 'withdrawal', $2, $3, $4, $5, 'child', $6)`,
      [
        request.wallet_id,
        -request.amount,
        categoryResult.rows[0]?.id || request.category_id,
        request.description,
        request.child_user_id,
        JSON.stringify({
          request_id: request.id,
          approved_by: resolvedBy,
          teaching_note: request.parent_note || undefined,
        }),
      ]
    );
  });
}

export async function denyRequest(requestId: string, resolvedBy: string, parentNote?: string): Promise<void> {
  const result = await db.query(
    `UPDATE spending_requests SET status = 'denied', resolved_at = NOW(), resolved_by = $1,
     parent_note = COALESCE($2, parent_note) WHERE id = $3 AND status = 'pending'
     RETURNING *`,
    [resolvedBy, parentNote, requestId]
  );

  if (result.rows.length === 0) throw new Error('Request not found or already resolved');
}

export async function getPendingRequests(familyId: string): Promise<SpendingRequest[]> {
  const result = await db.query(
    `SELECT sr.*, w.family_id, u.name as child_name
     FROM spending_requests sr
     JOIN wallets w ON w.id = sr.wallet_id
     JOIN users u ON u.id = sr.child_user_id
     WHERE w.family_id = $1 AND sr.status = 'pending'
     ORDER BY sr.created_at DESC`,
    [familyId]
  );
  return result.rows;
}

export async function getRequestsByWallet(walletId: string): Promise<SpendingRequest[]> {
  const result = await db.query(
    `SELECT * FROM spending_requests WHERE wallet_id = $1 ORDER BY created_at DESC`,
    [walletId]
  );
  return result.rows;
}
