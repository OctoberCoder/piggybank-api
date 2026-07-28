import { db } from '../db/client.js';
import { SpendingCategory } from '../types/index.js';

const SYSTEM_CATEGORIES = [
  { name: 'Savings', emoji: '💰' },
  { name: 'Loan', emoji: '🏦' },
  { name: 'Deposit', emoji: '📥' },
  { name: 'Withdrawal', emoji: '📤' },
  { name: 'Interest', emoji: '📈' },
  { name: 'Allowance', emoji: '🔄' },
];

const DEFAULT_CUSTOM_CATEGORIES = [
  { name: 'Gaming', emoji: '🎮' },
  { name: 'Food', emoji: '🍕' },
  { name: 'Books', emoji: '📚' },
  { name: 'Gifts', emoji: '🎁' },
  { name: 'Shopping', emoji: '🛍️' },
  { name: 'Tech', emoji: '📱' },
  { name: 'Creative', emoji: '🎨' },
  { name: 'Sports', emoji: '⚽' },
  { name: 'Music', emoji: '🎵' },
  { name: 'Other', emoji: '🔧' },
];

export async function seedFamilyCategories(familyId: string): Promise<void> {
  const allCategories = [
    ...SYSTEM_CATEGORIES.map(c => ({ ...c, is_system: true })),
    ...DEFAULT_CUSTOM_CATEGORIES.map(c => ({ ...c, is_system: false })),
  ];

  for (const cat of allCategories) {
    await db.query(
      `INSERT INTO spending_categories (family_id, name, emoji, is_system)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT DO NOTHING`,
      [familyId, cat.name, cat.emoji, cat.is_system]
    );
  }
}

export async function getSystemCategory(familyId: string, type: string): Promise<SpendingCategory> {
  const typeToCategory: Record<string, string> = {
    deposit: 'Deposit',
    withdrawal: 'Withdrawal',
    loan_disbursement: 'Loan',
    loan_repayment: 'Loan',
    interest_earned: 'Interest',
    interest_charged: 'Interest',
    allowance: 'Allowance',
    goal_deposit: 'Savings',
    goal_withdrawal: 'Savings',
  };

  const categoryName = typeToCategory[type] || 'Other';
  const result = await db.query(
    `SELECT * FROM spending_categories WHERE family_id = $1 AND name = $2 AND is_system = true`,
    [familyId, categoryName]
  );
  return result.rows[0];
}
