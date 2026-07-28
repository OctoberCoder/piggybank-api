import { db } from '../db/client.js';
import { Wallet } from '../types/index.js';

export async function getWallet(walletId: string): Promise<Wallet | null> {
  const result = await db.query(`SELECT * FROM wallets WHERE id = $1`, [walletId]);
  return result.rows[0] || null;
}

export async function getWalletsByFamily(familyId: string): Promise<Wallet[]> {
  const result = await db.query(
    `SELECT w.*, u.name as child_name, u.avatar_color
     FROM wallets w
     JOIN users u ON u.id = w.user_id
     WHERE w.family_id = $1`,
    [familyId]
  );
  return result.rows;
}

export async function updateBalance(walletId: string, amount: number, expectedVersion: number): Promise<Wallet> {
  const result = await db.query(
    `UPDATE wallets 
     SET balance = balance + $1, version = version + 1, updated_at = NOW()
     WHERE id = $2 AND version = $3
     RETURNING *`,
    [amount, walletId, expectedVersion]
  );

  if (result.rows.length === 0) {
    throw new Error('VERSION_CONFLICT');
  }

  return result.rows[0];
}
