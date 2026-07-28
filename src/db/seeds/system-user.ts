import { db } from '../client.js';

export async function seedSystemUser(): Promise<string> {
  const result = await db.query(
    `INSERT INTO users (name, is_lightweight)
     VALUES ('System', true)
     ON CONFLICT DO NOTHING
     RETURNING id`
  );

  if (result.rows.length === 0) {
    const existing = await db.query(
      `SELECT id FROM users WHERE name = 'System' AND is_lightweight = true`
    );
    return existing.rows[0].id;
  }

  return result.rows[0].id;
}
