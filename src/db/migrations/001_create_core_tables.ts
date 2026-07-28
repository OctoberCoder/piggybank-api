import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('users', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    email: { type: 'varchar(255)', unique: true },
    password_hash: { type: 'varchar(255)' },
    name: { type: 'varchar(255)', notNull: true },
    pin_hash: { type: 'varchar(255)' },
    avatar_color: { type: 'varchar(50)' },
    is_lightweight: { type: 'boolean', notNull: true, default: false },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') },
  });

  pgm.createTable('families', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    name: { type: 'varchar(255)', notNull: true },
    currency: { type: 'varchar(10)', notNull: true, default: 'NGN' },
    currency_symbol: { type: 'varchar(10)', notNull: true, default: '₦' },
    currency_decimals: { type: 'integer', notNull: true, default: 2 },
    annual_interest_rate: { type: 'decimal(5,4)', notNull: true, default: 0.02 },
    overdraft_limit: { type: 'decimal(12,2)', notNull: true, default: 0 },
    created_by: { type: 'uuid', notNull: true, references: 'users(id)' },
    deleted_at: { type: 'timestamp' },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') },
  });

  pgm.createTable('family_parents', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    family_id: { type: 'uuid', notNull: true, references: 'families(id)' },
    user_id: { type: 'uuid', notNull: true, references: 'users(id)' },
    role: { type: 'varchar(20)', notNull: true, default: 'secondary' },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') },
  });

  pgm.createTable('family_invitations', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    family_id: { type: 'uuid', notNull: true, references: 'families(id)' },
    email: { type: 'varchar(255)', notNull: true },
    token: { type: 'varchar(255)', notNull: true, unique: true },
    invited_by: { type: 'uuid', notNull: true, references: 'users(id)' },
    accepted_at: { type: 'timestamp' },
    expires_at: { type: 'timestamp', notNull: true },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('family_invitations', 'token', { where: 'accepted_at IS NULL' });

  pgm.createTable('wallets', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    family_id: { type: 'uuid', notNull: true, references: 'families(id)' },
    user_id: { type: 'uuid', notNull: true, references: 'users(id)' },
    balance: { type: 'decimal(12,2)', notNull: true, default: 0 },
    version: { type: 'integer', notNull: true, default: 1 },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') },
  });

  pgm.createTable('spending_categories', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    family_id: { type: 'uuid', notNull: true, references: 'families(id)' },
    name: { type: 'varchar(255)', notNull: true },
    emoji: { type: 'varchar(50)', notNull: true },
    is_system: { type: 'boolean', notNull: true, default: false },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') },
  });

  pgm.createTable('transactions', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    wallet_id: { type: 'uuid', notNull: true, references: 'wallets(id)' },
    type: { type: 'varchar(50)', notNull: true },
    amount: { type: 'decimal(12,2)', notNull: true },
    category_id: { type: 'uuid', notNull: true, references: 'spending_categories(id)' },
    description: { type: 'text' },
    initiated_by: { type: 'uuid', notNull: true, references: 'users(id)' },
    initiator_role: { type: 'varchar(20)', notNull: true },
    metadata: { type: 'jsonb', notNull: true, default: pgm.func("'{}'::jsonb") },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('transactions', ['wallet_id', { name: 'created_at', sort: 'DESC' }]);

  pgm.createTable('allowance_rules', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    family_id: { type: 'uuid', notNull: true, references: 'families(id)' },
    wallet_id: { type: 'uuid', notNull: true, references: 'wallets(id)' },
    amount: { type: 'decimal(12,2)', notNull: true },
    frequency: { type: 'varchar(20)', notNull: true },
    day_of_week: { type: 'integer' },
    next_payout: { type: 'timestamp', notNull: true },
    debt_deduction_type: { type: 'varchar(20)', notNull: true, default: 'percentage' },
    debt_deduction_value: { type: 'decimal(12,2)', notNull: true, default: 30 },
    active: { type: 'boolean', notNull: true, default: true },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('allowance_rules', 'next_payout', { where: 'active = true' });

  pgm.createTable('loans', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    wallet_id: { type: 'uuid', notNull: true, references: 'wallets(id)' },
    principal: { type: 'decimal(12,2)', notNull: true },
    interest_rate: { type: 'decimal(5,4)', notNull: true },
    outstanding: { type: 'decimal(12,2)', notNull: true },
    status: { type: 'varchar(30)', notNull: true, default: 'pending_approval' },
    requested_by: { type: 'uuid', notNull: true, references: 'users(id)' },
    approved_by: { type: 'uuid', references: 'users(id)' },
    parent_note: { type: 'text' },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') },
    approved_at: { type: 'timestamp' },
    paid_off_at: { type: 'timestamp' },
  });
  pgm.createIndex('loans', ['wallet_id', 'status']);

  pgm.createTable('loan_payments', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    loan_id: { type: 'uuid', notNull: true, references: 'loans(id)' },
    amount: { type: 'decimal(12,2)', notNull: true },
    created_by: { type: 'uuid', notNull: true, references: 'users(id)' },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') },
  });

  pgm.createTable('savings_goals', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    wallet_id: { type: 'uuid', notNull: true, references: 'wallets(id)' },
    name: { type: 'varchar(255)', notNull: true },
    emoji: { type: 'varchar(50)', notNull: true },
    target_amount: { type: 'decimal(12,2)', notNull: true },
    current_amount: { type: 'decimal(12,2)', notNull: true, default: 0 },
    status: { type: 'varchar(20)', notNull: true, default: 'active' },
    celebration_shown: { type: 'boolean', notNull: true, default: false },
    version: { type: 'integer', notNull: true, default: 1 },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') },
    completed_at: { type: 'timestamp' },
  });
  pgm.createIndex('savings_goals', ['wallet_id', 'status']);

  pgm.createTable('lessons', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    family_id: { type: 'uuid', notNull: true, references: 'families(id)' },
    title: { type: 'varchar(255)', notNull: true },
    content: { type: 'text', notNull: true },
    sort_order: { type: 'integer', notNull: true },
    prerequisite_id: { type: 'uuid', references: 'lessons(id)' },
    trigger_event: { type: 'varchar(50)', notNull: true },
    shown: { type: 'boolean', notNull: true, default: false },
    shown_at: { type: 'timestamp' },
  });
  pgm.createIndex('lessons', ['family_id', 'sort_order']);

  pgm.createTable('spending_requests', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    wallet_id: { type: 'uuid', notNull: true, references: 'wallets(id)' },
    child_user_id: { type: 'uuid', notNull: true, references: 'users(id)' },
    description: { type: 'varchar(500)', notNull: true },
    amount: { type: 'decimal(12,2)', notNull: true },
    category_id: { type: 'uuid', notNull: true, references: 'spending_categories(id)' },
    status: { type: 'varchar(20)', notNull: true, default: 'pending' },
    parent_note: { type: 'text' },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') },
    resolved_at: { type: 'timestamp' },
    resolved_by: { type: 'uuid', references: 'users(id)' },
  });

  pgm.createTable('notifications', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    user_id: { type: 'uuid', notNull: true, references: 'users(id)' },
    title: { type: 'varchar(255)', notNull: true },
    body: { type: 'text', notNull: true },
    data: { type: 'jsonb', notNull: true, default: pgm.func("'{}'::jsonb") },
    read: { type: 'boolean', notNull: true, default: false },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') },
  });

  pgm.createTable('refresh_tokens', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    user_id: { type: 'uuid', notNull: true, references: 'users(id)' },
    token: { type: 'varchar(255)', notNull: true, unique: true },
    expires_at: { type: 'timestamp', notNull: true },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') },
  });

  pgm.createTable('magic_links', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    email: { type: 'varchar(255)', notNull: true },
    token: { type: 'varchar(255)', notNull: true, unique: true },
    expires_at: { type: 'timestamp', notNull: true },
    used: { type: 'boolean', notNull: true, default: false },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') },
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('magic_links');
  pgm.dropTable('refresh_tokens');
  pgm.dropTable('notifications');
  pgm.dropTable('spending_requests');
  pgm.dropTable('lessons');
  pgm.dropTable('savings_goals');
  pgm.dropTable('loan_payments');
  pgm.dropTable('loans');
  pgm.dropTable('allowance_rules');
  pgm.dropTable('transactions');
  pgm.dropTable('spending_categories');
  pgm.dropTable('wallets');
  pgm.dropTable('family_invitations');
  pgm.dropTable('family_parents');
  pgm.dropTable('families');
  pgm.dropTable('users');
}
