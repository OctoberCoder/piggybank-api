import { db } from './db/client.js';
import { seedSystemUser } from './db/seeds/system-user.js';

async function migrate() {
  console.log('Running migrations...');

  const tables = [
    `CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR UNIQUE,
      password_hash VARCHAR,
      name VARCHAR NOT NULL,
      pin_hash VARCHAR,
      avatar_color VARCHAR,
      is_lightweight BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS families (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR NOT NULL,
      currency VARCHAR DEFAULT 'NGN',
      currency_symbol VARCHAR DEFAULT '₦',
      currency_decimals INTEGER DEFAULT 2,
      annual_interest_rate DECIMAL(5,4) DEFAULT 0.02,
      overdraft_limit DECIMAL(12,2) DEFAULT 0,
      created_by UUID REFERENCES users(id),
      deleted_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS family_parents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      family_id UUID REFERENCES families(id),
      user_id UUID REFERENCES users(id),
      role VARCHAR DEFAULT 'secondary',
      created_at TIMESTAMP DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS family_invitations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      family_id UUID REFERENCES families(id),
      email VARCHAR NOT NULL,
      token VARCHAR UNIQUE NOT NULL,
      invited_by UUID REFERENCES users(id),
      accepted_at TIMESTAMP,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )`,
    `CREATE INDEX IF NOT EXISTS idx_invitations_token ON family_invitations(token) WHERE accepted_at IS NULL`,
    `CREATE TABLE IF NOT EXISTS wallets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      family_id UUID REFERENCES families(id),
      user_id UUID REFERENCES users(id),
      balance DECIMAL(12,2) DEFAULT 0,
      version INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS spending_categories (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      family_id UUID REFERENCES families(id),
      name VARCHAR NOT NULL,
      emoji VARCHAR NOT NULL,
      is_system BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS transactions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      wallet_id UUID REFERENCES wallets(id),
      type VARCHAR NOT NULL,
      amount DECIMAL(12,2) NOT NULL,
      category_id UUID REFERENCES spending_categories(id),
      description TEXT,
      initiated_by UUID REFERENCES users(id),
      initiator_role VARCHAR NOT NULL,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT NOW()
    )`,
    `CREATE INDEX IF NOT EXISTS idx_transactions_wallet_created ON transactions(wallet_id, created_at DESC)`,
    `CREATE TABLE IF NOT EXISTS allowance_rules (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      family_id UUID REFERENCES families(id),
      wallet_id UUID REFERENCES wallets(id),
      amount DECIMAL(12,2) NOT NULL,
      frequency VARCHAR NOT NULL,
      day_of_week INTEGER,
      next_payout TIMESTAMP NOT NULL,
      debt_deduction_type VARCHAR DEFAULT 'percentage',
      debt_deduction_value DECIMAL(12,2) DEFAULT 30,
      active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`,
    `CREATE INDEX IF NOT EXISTS idx_allowance_next_payout ON allowance_rules(next_payout) WHERE active = true`,
    `CREATE TABLE IF NOT EXISTS loans (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      wallet_id UUID REFERENCES wallets(id),
      principal DECIMAL(12,2) NOT NULL,
      interest_rate DECIMAL(5,4) NOT NULL,
      outstanding DECIMAL(12,2) NOT NULL,
      status VARCHAR DEFAULT 'pending_approval',
      requested_by UUID REFERENCES users(id),
      approved_by UUID REFERENCES users(id),
      parent_note TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      approved_at TIMESTAMP,
      paid_off_at TIMESTAMP
    )`,
    `CREATE INDEX IF NOT EXISTS idx_loans_wallet_status ON loans(wallet_id, status)`,
    `CREATE TABLE IF NOT EXISTS loan_payments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      loan_id UUID REFERENCES loans(id),
      amount DECIMAL(12,2) NOT NULL,
      created_by UUID REFERENCES users(id),
      created_at TIMESTAMP DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS savings_goals (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      wallet_id UUID REFERENCES wallets(id),
      name VARCHAR NOT NULL,
      emoji VARCHAR,
      target_amount DECIMAL(12,2) NOT NULL,
      current_amount DECIMAL(12,2) DEFAULT 0,
      status VARCHAR DEFAULT 'active',
      celebration_shown BOOLEAN DEFAULT false,
      version INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT NOW(),
      completed_at TIMESTAMP
    )`,
    `CREATE INDEX IF NOT EXISTS idx_goals_wallet_status ON savings_goals(wallet_id, status)`,
    `CREATE TABLE IF NOT EXISTS lessons (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      family_id UUID REFERENCES families(id),
      title VARCHAR NOT NULL,
      content TEXT NOT NULL,
      sort_order INTEGER NOT NULL,
      prerequisite_id UUID REFERENCES lessons(id),
      trigger_event VARCHAR NOT NULL,
      shown BOOLEAN DEFAULT false,
      shown_at TIMESTAMP
    )`,
    `CREATE INDEX IF NOT EXISTS idx_lessons_family_order ON lessons(family_id, sort_order)`,
    `CREATE TABLE IF NOT EXISTS spending_requests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      wallet_id UUID REFERENCES wallets(id),
      child_user_id UUID REFERENCES users(id),
      description VARCHAR NOT NULL,
      amount DECIMAL(12,2) NOT NULL,
      category_id UUID REFERENCES spending_categories(id),
      status VARCHAR DEFAULT 'pending',
      parent_note TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      resolved_at TIMESTAMP,
      resolved_by UUID REFERENCES users(id)
    )`,
    `CREATE TABLE IF NOT EXISTS notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id),
      title VARCHAR NOT NULL,
      body TEXT NOT NULL,
      data JSONB DEFAULT '{}',
      read BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS refresh_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id),
      token VARCHAR UNIQUE NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS magic_links (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR NOT NULL,
      token VARCHAR UNIQUE NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      used BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW()
    )`,
  ];

  for (const sql of tables) {
    try {
      await db.query(sql);
    } catch (err: any) {
      console.error('Migration error:', err.message);
    }
  }

  console.log('Migrations complete');
}

// Run on startup
try {
  await migrate();
  await seedSystemUser();
  console.log('Startup complete');
} catch (err) {
  console.error('Startup error:', err);
}
