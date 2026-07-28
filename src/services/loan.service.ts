import { db, inTransaction } from '../db/client.js';
import { Loan } from '../types/index.js';

export async function createLoan(walletId: string, requestedBy: string, principal: number, interestRate: number): Promise<Loan> {
  const result = await db.query(
    `INSERT INTO loans (wallet_id, principal, interest_rate, outstanding, status, requested_by)
     VALUES ($1, $2, $3, $4, 'pending_approval', $5) RETURNING *`,
    [walletId, principal, interestRate, principal, requestedBy]
  );
  return result.rows[0];
}

export async function approveLoan(loanId: string, approvedBy: string, parentNote?: string): Promise<Loan> {
  return inTransaction(async (client) => {
    const loanResult = await client.query(
      `SELECT * FROM loans WHERE id = $1 AND status = 'pending_approval' FOR UPDATE`,
      [loanId]
    );
    if (loanResult.rows.length === 0) throw new Error('Loan not found or already processed');

    const loan = loanResult.rows[0];

    const result = await client.query(
      `UPDATE loans SET status = 'active', approved_by = $1, approved_at = NOW(),
       parent_note = COALESCE($2, parent_note) WHERE id = $3 RETURNING *`,
      [approvedBy, parentNote, loanId]
    );

    await client.query(
      `UPDATE wallets SET balance = balance + $1, version = version + 1, updated_at = NOW()
       WHERE id = $2`,
      [loan.principal, loan.wallet_id]
    );

    return result.rows[0];
  });
}

export async function denyLoan(loanId: string, parentNote?: string): Promise<Loan> {
  const result = await db.query(
    `UPDATE loans SET status = 'denied', parent_note = COALESCE($1, parent_note)
     WHERE id = $2 AND status = 'pending_approval' RETURNING *`,
    [parentNote, loanId]
  );
  if (result.rows.length === 0) throw new Error('Loan not found or already processed');
  return result.rows[0];
}

export async function getLoans(walletId: string): Promise<Loan[]> {
  const result = await db.query(
    `SELECT * FROM loans WHERE wallet_id = $1 ORDER BY created_at DESC`,
    [walletId]
  );
  return result.rows;
}

export async function getLoan(loanId: string): Promise<Loan | null> {
  const result = await db.query(`SELECT * FROM loans WHERE id = $1`, [loanId]);
  return result.rows[0] || null;
}

export async function makePayment(loanId: string, amount: number, userId: string): Promise<void> {
  return inTransaction(async (client) => {
    const loanResult = await client.query(
      `SELECT * FROM loans WHERE id = $1 AND status = 'active' FOR UPDATE`,
      [loanId]
    );
    if (loanResult.rows.length === 0) throw new Error('Loan not found or not active');

    const loan = loanResult.rows[0];
    const paymentAmount = Math.min(amount, loan.outstanding);

    const walletResult = await client.query(
      `SELECT * FROM wallets WHERE id = $1 FOR UPDATE`,
      [loan.wallet_id]
    );
    const wallet = walletResult.rows[0];
    if (wallet.balance < paymentAmount) throw new Error('INSUFFICIENT_FUNDS');

    await client.query(
      `UPDATE wallets SET balance = balance - $1, version = version + 1, updated_at = NOW()
       WHERE id = $2`,
      [paymentAmount, loan.wallet_id]
    );

    const newOutstanding = loan.outstanding - paymentAmount;
    const newStatus = newOutstanding <= 0 ? 'paid_off' : 'active';

    await client.query(
      `UPDATE loans SET outstanding = $1, status = $2${newStatus === 'paid_off' ? ', paid_off_at = NOW()' : ''}
       WHERE id = $3`,
      [newOutstanding, newStatus, loanId]
    );

    await client.query(
      `INSERT INTO loan_payments (loan_id, amount, created_by) VALUES ($1, $2, $3)`,
      [loanId, paymentAmount, userId]
    );
  });
}
