const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// ── Types ────────────────────────────────────────────────────────────────────

export type TransactionState =
  | 'CREATED'
  | 'FUNDED'
  | 'DISPATCHED'
  | 'CONFIRMED'
  | 'DISPUTED'
  | 'RESOLVED';

export interface LedgerEntry {
  id:            string;
  transactionId: string;
  entryType:     'DEBIT' | 'CREDIT';
  account:       string;
  amount:        number;
  reference:     string | null;
  note:          string | null;
  createdAt:     string;
}

export interface Dispute {
  id:              string;
  transactionId:   string;
  reason:          string;
  reasonCategory:  string;
  evidence:        string | null;
  sellerResponse:  string | null;
  raisedBy:        string;
  status:          'OPEN' | 'RESOLVED';
  decision:        string | null;
  decisionReason:  string | null;
  decidedBy:       string | null;
  approvedBy:      string | null;
  decidedAt:       string | null;
  responseDeadline: string | null;
  createdAt:       string;
  updatedAt:       string;
}

export interface Transaction {
  id:            string;
  itemName:      string;
  amount:        number;
  sellerMomo:    string;
  buyerName:     string | null;
  buyerPhone:    string | null;
  buyerEmail:    string | null;
  deliveryHours: number;
  state:         TransactionState;
  createdAt:     string;
  updatedAt:     string;
  ledgerEntries: LedgerEntry[];
  disputes:      Dispute[];
}

export interface CreateTransactionInput {
  itemName:      string;
  amount:        number;
  sellerMomo:    string;
  deliveryHours: number;
}

export interface CreateTransactionResponse {
  message:    string;
  id:         string;
  state:      TransactionState;
  paymentUrl: string;
}

export interface InitiatePaymentResponse {
  paymentUrl: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || `API error ${res.status}`);
  }

  return data as T;
}

// ── Transaction API ──────────────────────────────────────────────────────────

export const api = {
  // Create a new transaction (seller generates link)
  createTransaction: (input: CreateTransactionInput) =>
    apiFetch<CreateTransactionResponse>('/transactions', {
      method: 'POST',
      body:   JSON.stringify({
        ...input,
        buyerEmail: 'pending@verified.gh',
      }),
    }),

  // Get a single transaction with ledger and disputes
  getTransaction: (id: string) =>
    apiFetch<Transaction>(`/transactions/${id}`),

  // Initiate Paystack payment (buyer clicks Pay)
  initiatePayment: (transactionId: string, contact: string) => {
    const isEmail   = contact.includes('@');
    const buyerEmail = isEmail
      ? contact
      : contact.replace(/\s/g, '').replace(/^\+233/, '0') + '@verified.gh';
    const buyerPhone = !isEmail ? contact.replace(/\s/g, '') : undefined;

    return apiFetch<InitiatePaymentResponse>('/transactions/initiate-payment', {
      method: 'POST',
      body:   JSON.stringify({ transactionId, buyerEmail, buyerPhone }),
    });
  },

  // Move transaction to next state
  updateState: (id: string, newState: TransactionState, extra?: Record<string, string>) =>
    apiFetch<Transaction>(`/transactions/${id}/state`, {
      method: 'PATCH',
      body:   JSON.stringify({ newState, ...extra }),
    }),

  // Get seller transaction history
  getSellerTransactions: (momo: string) =>
    apiFetch<Transaction[]>(`/transactions/seller/${momo}`),

  // Get buyer order history
  getBuyerOrders: (phone: string) =>
    apiFetch<Transaction[]>(`/transactions/buyer/${encodeURIComponent(phone)}`),

  // Raise a dispute
  raiseDispute: (transactionId: string, reason: string, raisedBy: 'BUYER' | 'SELLER') =>
    apiFetch<{ message: string; disputeId: string }>('/disputes', {
      method: 'POST',
      body:   JSON.stringify({
        transactionId,
        reason,
        reasonCategory: raisedBy === 'BUYER' ? 'BUYER_COMPLAINT' : 'SELLER_COMPLAINT',
        raisedBy,
      }),
    }),
};

// ── Admin API (token-gated) ──────────────────────────────────────────────────

export const adminApi = {
  getOverview: (token: string) =>
    apiFetch<{
      totalTransactions: number;
      byState:           Record<string, number>;
      openDisputes:      number;
      totalVolume:       number;
      estimatedFees:     number;
      recentTransactions: Transaction[];
    }>('/admin/api/overview', {
      headers: { 'x-admin-token': token },
    }),

  getTransactions: (token: string, state?: string, page = 1) =>
    apiFetch<{ transactions: Transaction[]; total: number }>(
      `/admin/api/transactions?${state ? `state=${state}&` : ''}page=${page}`,
      { headers: { 'x-admin-token': token } }
    ),

  getDisputes: (token: string, status = 'OPEN') =>
    apiFetch<Dispute[]>(`/admin/api/disputes?status=${status}`, {
      headers: { 'x-admin-token': token },
    }),

  resolveDispute: (
    token: string,
    disputeId: string,
    decision: string,
    decisionReason: string,
    decidedBy: string,
    approvedBy?: string
  ) =>
    apiFetch<{ message: string }>(`/disputes/${disputeId}/resolve`, {
      method:  'POST',
      headers: { 'x-admin-token': token },
      body:    JSON.stringify({ decision, decisionReason, decidedBy, approvedBy }),
    }),

  changeTransactionState: (token: string, id: string, newState: string, reason: string) =>
    apiFetch<{ message: string }>(`/admin/api/transactions/${id}/state`, {
      method:  'PATCH',
      headers: { 'x-admin-token': token },
      body:    JSON.stringify({ newState, reason }),
    }),

  reconcile: (token: string) =>
    apiFetch<{
      totalEntries:      number;
      totalTransactions: number;
      balanced:          number;
      unbalanced:        Array<{ transactionId: string; balance: number }>;
    }>('/admin/api/reconcile', {
      headers: { 'x-admin-token': token },
    }),
};