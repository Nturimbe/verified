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
  const { headers: customHeaders, ...restOptions } = options;

  const res = await fetch(`${API_URL}${path}`, {
    ...restOptions,
    headers: {
      'Content-Type': 'application/json',
      ...customHeaders,
    },
  });

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const text = await res.text();
    console.error('Non-JSON response from API:', API_URL + path, text.slice(0, 200));
    throw new Error(`Server returned an unexpected response (${res.status}). Check API_URL configuration.`);
  }

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

    submitDisputeResponse: (disputeId: string, response: string) =>
  apiFetch<{ message: string }>(`/disputes/${disputeId}/response`, {
    method: 'POST',
    body: JSON.stringify({ response }),
  }),

  getSellerStats: (momo: string) =>
    apiFetch<{
      totalTransactions: number;
      completionRate: number;
      disputeRate: number;
      memberSince: string | null;
    }>(`/transactions/seller-stats/${momo}`),

  getNotifications: (phone: string) =>
    apiFetch<Array<{
      id: string; title: string; message: string;
      type: string; read: boolean; link: string | null; createdAt: string;
    }>>(`/notifications/${phone}`),

  markNotificationRead: (id: string) =>
    apiFetch<{ message: string }>(`/notifications/${id}/read`, { method: 'PATCH' }),

  getReceiptUrl: (transactionId: string) =>
    `${API_URL}/receipts/${transactionId}`,
};
  


// ── Admin API (token-gated) ──────────────────────────────────────────────────
export const adminApi = {
  getOverview: () =>
    apiFetch<{
      totalTransactions: number;
      byState:           Record<string, number>;
      openDisputes:      number;
      totalVolume:       number;
      estimatedFees:     number;
      recentTransactions: Transaction[];
    }>('/admin/api/overview', {
      credentials: 'include',
    } as RequestInit),

  getTransactions: (state?: string, page = 1) =>
    apiFetch<{ transactions: Transaction[]; total: number }>(
      `/admin/api/transactions?${state ? `state=${state}&` : ''}page=${page}`,
      { credentials: 'include' } as RequestInit
    ),

  getDisputes: (status = 'OPEN') =>
    apiFetch<Dispute[]>(`/admin/api/disputes?status=${status}`, {
      credentials: 'include',
    } as RequestInit),

  resolveDispute: (
    disputeId: string,
    decision: string,
    decisionReason: string,
    decidedBy: string,
    approvedBy?: string,
    partialAmount?: number
  ) =>
    apiFetch<{ message: string }>(`/disputes/${disputeId}/resolve`, {
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify({ decision, decisionReason, decidedBy, approvedBy, partialAmount }),
    } as RequestInit),

  changeTransactionState: (id: string, newState: string, reason: string) =>
    apiFetch<{ message: string }>(`/admin/api/transactions/${id}/state`, {
      method: 'PATCH',
      credentials: 'include',
      body: JSON.stringify({ newState, reason }),
    } as RequestInit),

  reconcile: () =>
    apiFetch<{
      totalEntries:      number;
      totalTransactions: number;
      balanced:          number;
      unbalanced:        Array<{ transactionId: string; balance: number }>;
    }>('/admin/api/reconcile', {
      credentials: 'include',
    } as RequestInit),
};

// ── Auth API (session-based) ──────────────────────────────────────────────

export const authApi = {
  requestOtp: (phone: string) =>
    apiFetch<{ message: string }>('/auth/request-otp', {
      method: 'POST',
      body: JSON.stringify({ phone }),
      credentials: 'include',
    } as RequestInit),

  verifyOtp: (phone: string, code: string) =>
    apiFetch<{ message: string; phone: string }>('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ phone, code }),
      credentials: 'include',
    } as RequestInit),

  me: () =>
    apiFetch<{ phone: string }>('/auth/me', {
      credentials: 'include',
    } as RequestInit),

  logout: () =>
    apiFetch<{ message: string }>('/auth/logout', {
      method: 'POST',
      credentials: 'include',
    } as RequestInit),

    getSellerStats: (momo: string) =>
  apiFetch<{
    totalTransactions: number;
    completionRate: number;
    disputeRate: number;
    memberSince: string | null;
  }>(`/transactions/seller-stats/${momo}`),
};


