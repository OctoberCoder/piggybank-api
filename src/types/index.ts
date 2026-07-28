export interface User {
  id: string;
  email: string | null;
  password_hash: string | null;
  name: string;
  pin_hash: string | null;
  avatar_color: string | null;
  is_lightweight: boolean;
  created_at: Date;
}

export interface Family {
  id: string;
  name: string;
  currency: string;
  currency_symbol: string;
  currency_decimals: number;
  annual_interest_rate: number;
  overdraft_limit: number;
  created_by: string;
  deleted_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface FamilyParent {
  id: string;
  family_id: string;
  user_id: string;
  role: 'primary' | 'secondary';
  created_at: Date;
}

export interface FamilyInvitation {
  id: string;
  family_id: string;
  email: string;
  token: string;
  invited_by: string;
  accepted_at: Date | null;
  expires_at: Date;
  created_at: Date;
}

export interface Wallet {
  id: string;
  family_id: string;
  user_id: string;
  balance: number;
  version: number;
  created_at: Date;
  updated_at: Date;
}

export interface Transaction {
  id: string;
  wallet_id: string;
  type: TransactionType;
  amount: number;
  category_id: string;
  description: string | null;
  initiated_by: string;
  initiator_role: 'parent' | 'child' | 'system';
  metadata: Record<string, unknown>;
  created_at: Date;
}

export type TransactionType =
  | 'deposit'
  | 'withdrawal'
  | 'loan_disbursement'
  | 'loan_repayment'
  | 'interest_earned'
  | 'interest_charged'
  | 'allowance'
  | 'goal_deposit'
  | 'goal_withdrawal';

export interface AllowanceRule {
  id: string;
  family_id: string;
  wallet_id: string;
  amount: number;
  frequency: 'weekly' | 'biweekly' | 'monthly';
  day_of_week: number | null;
  next_payout: Date;
  debt_deduction_type: 'percentage' | 'fixed';
  debt_deduction_value: number;
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Loan {
  id: string;
  wallet_id: string;
  principal: number;
  interest_rate: number;
  outstanding: number;
  status: 'pending_approval' | 'active' | 'paid_off' | 'denied';
  requested_by: string;
  approved_by: string | null;
  parent_note: string | null;
  created_at: Date;
  approved_at: Date | null;
  paid_off_at: Date | null;
}

export interface LoanPayment {
  id: string;
  loan_id: string;
  amount: number;
  created_by: string;
  created_at: Date;
}

export interface SavingsGoal {
  id: string;
  wallet_id: string;
  name: string;
  emoji: string;
  target_amount: number;
  current_amount: number;
  status: 'active' | 'completed' | 'cancelled';
  celebration_shown: boolean;
  version: number;
  created_at: Date;
  completed_at: Date | null;
}

export interface Lesson {
  id: string;
  family_id: string;
  title: string;
  content: string;
  sort_order: number;
  prerequisite_id: string | null;
  trigger_event: string;
  shown: boolean;
  shown_at: Date | null;
}

export interface SpendingRequest {
  id: string;
  wallet_id: string;
  child_user_id: string;
  description: string;
  amount: number;
  category_id: string;
  status: 'pending' | 'approved' | 'denied';
  parent_note: string | null;
  created_at: Date;
  resolved_at: Date | null;
  resolved_by: string | null;
}

export interface SpendingCategory {
  id: string;
  family_id: string;
  name: string;
  emoji: string;
  is_system: boolean;
  created_at: Date;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  read: boolean;
  created_at: Date;
}
