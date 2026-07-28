import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { db } from '../src/db/client.js';
import { config } from '../src/config.js';

export async function createTestUser(email?: string) {
  const hash = await bcrypt.hash('password123', 12);
  const result = await db.query(
    `INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING *`,
    [email || `test-${Date.now()}@example.com`, hash, 'Test User']
  );
  return result.rows[0];
}

export function generateTestToken(userId: string): string {
  return jwt.sign({ sub: userId }, config.jwt.secret, { expiresIn: '15m' });
}

export async function createTestFamily(userId: string) {
  const result = await db.query(
    `INSERT INTO families (name, currency, created_by) VALUES ('Test Family', 'NGN', $1) RETURNING *`,
    [userId]
  );
  const family = result.rows[0];

  await db.query(
    `INSERT INTO family_parents (family_id, user_id, role) VALUES ($1, $2, 'primary')`,
    [family.id, userId]
  );

  return family;
}

export async function createTestChild(familyId: string, name?: string) {
  const result = await db.query(
    `INSERT INTO users (name, is_lightweight) VALUES ($1, true) RETURNING *`,
    [name || 'Test Child']
  );
  const user = result.rows[0];

  const wallet = await db.query(
    `INSERT INTO wallets (family_id, user_id) VALUES ($1, $2) RETURNING *`,
    [familyId, user.id]
  );

  return { user, wallet: wallet.rows[0] };
}
