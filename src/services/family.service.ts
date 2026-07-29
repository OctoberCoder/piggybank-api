import { db, inTransaction } from '../db/client.js';
import { Family } from '../types/index.js';
import { seedFamilyCategories } from './category.service.js';

export async function createFamily(name: string, currency: string, createdBy: string): Promise<Family> {
  return inTransaction(async (client) => {
    const familyResult = await client.query(
      `INSERT INTO families (name, currency, created_by) VALUES ($1, $2, $3) RETURNING *`,
      [name, currency, createdBy]
    );
    const family = familyResult.rows[0];

    await client.query(
      `INSERT INTO family_parents (family_id, user_id, role) VALUES ($1, $2, 'primary')`,
      [family.id, createdBy]
    );

    await seedFamilyCategories(family.id, client);

    return family;
  });
}

export async function getFamily(familyId: string): Promise<Family | null> {
  const result = await db.query(
    `SELECT * FROM families WHERE id = $1 AND deleted_at IS NULL`,
    [familyId]
  );
  return result.rows[0] || null;
}

export async function getFamilyParents(familyId: string): Promise<any[]> {
  const result = await db.query(
    `SELECT fp.*, u.name, u.email, u.avatar_color
     FROM family_parents fp
     JOIN users u ON u.id = fp.user_id
     WHERE fp.family_id = $1`,
    [familyId]
  );
  return result.rows;
}

export async function getFamilyChildren(familyId: string): Promise<any[]> {
  const result = await db.query(
    `SELECT u.id, u.name, u.avatar_color, w.id as wallet_id, w.balance
     FROM users u
     JOIN wallets w ON w.user_id = u.id
     WHERE w.family_id = $1 AND u.is_lightweight = true`,
    [familyId]
  );
  return result.rows;
}

export async function updateFamily(familyId: string, updates: Record<string, any>): Promise<Family> {
  const fields: string[] = [];
  const values: any[] = [];
  let i = 1;

  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) {
      fields.push(`${key} = $${i}`);
      values.push(value);
      i++;
    }
  }

  fields.push(`updated_at = NOW()`);
  values.push(familyId);

  const result = await db.query(
    `UPDATE families SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
    values
  );
  return result.rows[0];
}

export async function softDeleteFamily(familyId: string): Promise<void> {
  await db.query(
    `UPDATE families SET deleted_at = NOW() WHERE id = $1`,
    [familyId]
  );
}

export async function getFamiliesForUser(userId: string): Promise<Family[]> {
  const result = await db.query(
    `SELECT f.* FROM families f
     JOIN family_parents fp ON fp.family_id = f.id
     WHERE fp.user_id = $1 AND f.deleted_at IS NULL`,
    [userId]
  );
  return result.rows;
}
