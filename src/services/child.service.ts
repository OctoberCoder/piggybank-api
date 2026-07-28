import bcrypt from 'bcrypt';
import { db, inTransaction } from '../db/client.js';

const BCRYPT_COST = 12;

export async function addChild(familyId: string, name: string): Promise<any> {
  return inTransaction(async (client) => {
    const userResult = await client.query(
      `INSERT INTO users (name, is_lightweight) VALUES ($1, true) RETURNING *`,
      [name]
    );
    const user = userResult.rows[0];

    const walletResult = await client.query(
      `INSERT INTO wallets (family_id, user_id) VALUES ($1, $2) RETURNING *`,
      [familyId, user.id]
    );
    const wallet = walletResult.rows[0];

    return { user, wallet };
  });
}

export async function setChildPin(userId: string, pin: string): Promise<void> {
  const hash = await bcrypt.hash(pin, BCRYPT_COST);
  await db.query(`UPDATE users SET pin_hash = $1 WHERE id = $2`, [hash, userId]);
}

export async function verifyChildPin(userId: string, pin: string): Promise<boolean> {
  const result = await db.query(`SELECT pin_hash FROM users WHERE id = $1`, [userId]);
  const user = result.rows[0];
  if (!user?.pin_hash) return false;
  return bcrypt.compare(pin, user.pin_hash);
}
