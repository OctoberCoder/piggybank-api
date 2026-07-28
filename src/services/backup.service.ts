import { db } from '../db/client.js';

export async function exportFamilyData(familyId: string): Promise<object> {
  const [family, parents, children, wallets, categories, allowanceRules, loans, goals, lessons] = await Promise.all([
    db.query(`SELECT * FROM families WHERE id = $1`, [familyId]),
    db.query(`SELECT fp.*, u.email, u.name FROM family_parents fp JOIN users u ON u.id = fp.user_id WHERE fp.family_id = $1`, [familyId]),
    db.query(`SELECT * FROM users WHERE family_id = $1 AND is_lightweight = true`, [familyId]),
    db.query(`SELECT * FROM wallets WHERE family_id = $1`, [familyId]),
    db.query(`SELECT * FROM spending_categories WHERE family_id = $1`, [familyId]),
    db.query(`SELECT * FROM allowance_rules WHERE family_id = $1`, [familyId]),
    db.query(`SELECT * FROM loans WHERE wallet_id IN (SELECT id FROM wallets WHERE family_id = $1)`, [familyId]),
    db.query(`SELECT * FROM savings_goals WHERE wallet_id IN (SELECT id FROM wallets WHERE family_id = $1)`, [familyId]),
    db.query(`SELECT * FROM lessons WHERE family_id = $1`, [familyId]),
  ]);

  const walletIds = wallets.rows.map((w: any) => w.id);
  let transactions: any[] = [];
  if (walletIds.length > 0) {
    const txResult = await db.query(
      `SELECT * FROM transactions WHERE wallet_id = ANY($1) ORDER BY created_at`,
      [walletIds]
    );
    transactions = txResult.rows;
  }

  return {
    backup_version: 1,
    created_at: new Date().toISOString(),
    family: family.rows[0],
    parents: parents.rows,
    children: children.rows,
    wallets: wallets.rows,
    categories: categories.rows,
    allowance_rules: allowanceRules.rows,
    loans: loans.rows,
    goals: goals.rows,
    lessons: lessons.rows,
    transactions,
  };
}

export async function restoreFamilyData(familyId: string, data: any): Promise<void> {
  const walletMap = new Map<string, string>();
  const categoryMap = new Map<string, string>();

  for (const cat of data.categories || []) {
    const result = await db.query(
      `INSERT INTO spending_categories (family_id, name, emoji, is_system) VALUES ($1, $2, $3, $4) RETURNING id`,
      [familyId, cat.name, cat.emoji, cat.is_system]
    );
    categoryMap.set(cat.id, result.rows[0].id);
  }

  for (const wallet of data.wallets || []) {
    const result = await db.query(
      `INSERT INTO wallets (id, family_id, user_id, balance, version) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO UPDATE SET balance = $4 RETURNING id`,
      [wallet.id, familyId, wallet.user_id, wallet.balance, wallet.version]
    );
  }
}
