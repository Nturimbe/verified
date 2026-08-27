'use client';

import { useState } from 'react';
import { adminApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
  LayoutDashboard, Receipt, AlertTriangle,
  Scale, Eye, EyeOff, LogOut,
  TrendingUp, DollarSign, CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';

type Tab = 'overview' | 'transactions' | 'disputes' | 'ledger';

type TxRecord = {
  id: string;
  itemName: string;
  sellerMomo: string;
  buyerPhone?: string;
  buyerName?: string;
  amount: number;
  state: string;
  createdAt: string;
  disputes?: unknown[];
};

type DisputeRecord = {
  id: string;
  raisedBy: string;
  reason: string;
  sellerResponse?: string;
  status: string;
  decision?: string;
  decidedBy?: string;
  createdAt: string;
  transaction: TxRecord;
  auditLogs?: AuditLog[];
};

type AuditLog = {
  id: string;
  action: string;
  performedBy: string;
  note?: string;
  createdAt: string;
};

type OverviewData = {
  totalTransactions: number;
  openDisputes: number;
  totalVolume: number;
  estimatedFees: number;
  byState: Record<string, number>;
  recentTransactions: TxRecord[];
};

type ReconcileData = {
  totalEntries: number;
  totalTransactions: number;
  balanced: number;
  unbalanced: { transactionId: string; balance: number }[];
};

const STATE_COLORS: Record<string, string> = {
  CREATED:    'bg-muted text-muted-foreground',
  FUNDED:     'bg-amber-50 text-amber-700 border-amber-200',
  DISPATCHED: 'bg-blue-50 text-blue-700 border-blue-200',
  CONFIRMED:  'bg-green-50 text-brand-main border-green-200',
  DISPUTED:   'bg-red-50 text-red-600 border-red-200',
  RESOLVED:   'bg-muted text-muted-foreground',
};

export default function AdminPage() {
  const [token,    setToken]    = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [adminName, setAdminName] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [logging,  setLogging]  = useState(false);
  const [tab,      setTab]      = useState<Tab>('overview');

  const [overview,     setOverview]     = useState<OverviewData | null>(null);
  const [transactions, setTransactions] = useState<TxRecord[]>([]);
  const [disputes,     setDisputes]     = useState<DisputeRecord[]>([]);
  const [reconcile,    setReconcile]    = useState<ReconcileData | null>(null);
  const [txFilter,     setTxFilter]     = useState('');
  const [dispFilter,   setDispFilter]   = useState('OPEN');
  
  async function handleLogin() {
    if (!email || !password) { toast.error('Enter email and password.'); return; }
    setLogging(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');

      setToken('session');
      setAdminName(data.name);
      const overviewData = await adminApi.getOverview();
      setOverview(overviewData as unknown as OverviewData);
      toast.success(`Welcome, ${data.name}.`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Incorrect credentials.');
    } finally {
      setLogging(false);
    }
  }

  async function switchTab(t: Tab) {
    setTab(t);
    try {
      if (t === 'transactions') {
        const data = await adminApi.getTransactions(txFilter || undefined);
        setTransactions(
          ((data as unknown as { transactions: TxRecord[] }).transactions) || []
        );
      }
      if (t === 'disputes') {
        const data = await adminApi.getDisputes(dispFilter);
        setDisputes(data as unknown as DisputeRecord[]);
      }
      if (t === 'ledger') {
        const data = await adminApi.reconcile(token);
        setReconcile(data as unknown as ReconcileData);
      }
    } catch {
      toast.error('Failed to load data.');
    }
  }

  async function filterTx(state: string) {
    setTxFilter(state);
    try {
      const data = await adminApi.getTransactions( state || undefined);
      setTransactions(
        ((data as unknown as { transactions: TxRecord[] }).transactions) || []
      );
    } catch {
      toast.error('Failed to filter.');
    }
  }

  async function filterDisputes(status: string) {
    setDispFilter(status);
    try {
      const data = await adminApi.getDisputes(status);
      setDisputes(data as unknown as DisputeRecord[]);
    } catch {
      toast.error('Failed to filter.');
    }
  }

    if (!token) {
    return (
      <div className="min-h-screen bg-brand-darkest flex items-center
        justify-center px-4">
        <Card className="w-full max-w-sm shadow-2xl border-green-900">
          <CardContent className="p-8 space-y-5">
            <div className="text-center">
              <p className="font-serif text-2xl text-brand-amber font-bold mb-1">
                Verified
              </p>
              <p className="text-sm text-muted-foreground">Admin Access</p>
            </div>
            <Input
              type="email"
              placeholder="Admin email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              className="h-12 text-base"
            />
            <div className="relative">
              <Input
                type={showPw ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                className="h-12 pr-10 text-base"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2
                  text-muted-foreground hover:text-foreground"
              >
                {showPw
                  ? <EyeOff className="w-4 h-4" />
                  : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <Button
              onClick={handleLogin}
              disabled={logging}
              className="w-full h-11 bg-brand-main hover:bg-brand-dark
                text-white border-0 font-semibold"
            >
              {logging ? 'Signing in...' : 'Sign In'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tabs = [
    { key: 'overview',     label: 'Overview',     icon: LayoutDashboard },
    { key: 'transactions', label: 'Transactions',  icon: Receipt },
    { key: 'disputes',     label: 'Disputes',      icon: AlertTriangle },
    { key: 'ledger',       label: 'Ledger',        icon: Scale },
  ] as const;

  return (
    <div className="min-h-screen bg-background">

      <div className="bg-brand-darkest border-b border-green-900 px-4 py-3
        flex items-center justify-between">
               <div className="flex items-center gap-3">
          <p className="font-serif text-brand-amber font-bold">Verified</p>
          <span className="text-xs text-green-600">Admin — {adminName}</span>
        </div>
               <button
          onClick={async () => {
            await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/auth/logout`, {
              method: 'POST', credentials: 'include'
            });
            setToken(''); setPassword(''); setEmail('');
          }}
          className="flex items-center gap-1.5 text-xs text-green-400
            hover:text-brand-amber transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign out
        </button> 
      </div>

      <div className="border-b border-border bg-background sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 flex overflow-x-auto">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => switchTab(t.key)}
              className={`flex items-center gap-2 px-4 py-4 text-sm
                font-medium border-b-2 transition-colors whitespace-nowrap
                ${tab === t.key
                  ? 'border-brand-main text-brand-main'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">

        {/* Overview */}
        {tab === 'overview' && overview && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                {
                  label: 'Total Transactions',
                  value: String(overview.totalTransactions ?? 0),
                  icon: Receipt,
                  alert: false,
                },
                {
                  label: 'Open Disputes',
                  value: String(overview.openDisputes ?? 0),
                  icon: AlertTriangle,
                  alert: (overview.openDisputes ?? 0) > 0,
                },
                {
                  label: 'Total Volume',
                  value: `GHS ${Number(overview.totalVolume ?? 0).toLocaleString()}`,
                  icon: TrendingUp,
                  alert: false,
                },
                {
                  label: 'Est. Fees',
                  value: `GHS ${Number(overview.estimatedFees ?? 0).toLocaleString()}`,
                  icon: DollarSign,
                  alert: false,
                },
              ].map(stat => (
                <Card key={stat.label} className="shadow-card border-border">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-muted-foreground uppercase
                        tracking-wide">{stat.label}</p>
                      <stat.icon className={`w-4 h-4
                        ${stat.alert ? 'text-red-400' : 'text-muted-foreground'}`} />
                    </div>
                    <p className={`text-2xl font-serif font-bold
                      ${stat.alert ? 'text-red-500' : 'text-foreground'}`}>
                      {stat.value}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="shadow-card border-border">
              <CardHeader>
                <CardTitle className="text-sm font-semibold">
                  Transaction States
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(overview.byState || {}).map(([state, count]) => (
                    <div key={state}
                      className="flex items-center justify-between py-2
                        border-b border-border last:border-0">
                      <Badge className={`text-xs border ${STATE_COLORS[state] ?? ''}`}>
                        {state}
                      </Badge>
                      <span className="font-semibold text-foreground">
                        {count}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-card border-border">
              <CardHeader>
                <CardTitle className="text-sm font-semibold">
                  Recent Transactions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(overview.recentTransactions || []).map(tx => (
                    <div key={tx.id}
                      className="flex items-center justify-between
                        py-2 border-b border-border last:border-0">
                      <div>
                        <p className="font-medium text-sm text-foreground">
                          {tx.itemName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {tx.sellerMomo} ·{' '}
                          {new Date(tx.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-brand-main text-sm">
                          GHS {tx.amount.toLocaleString()}
                        </p>
                        <Badge className={`text-xs border
                          ${STATE_COLORS[tx.state] ?? ''}`}>
                          {tx.state}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Transactions */}
        {tab === 'transactions' && (
          <div className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              {['', 'CREATED', 'FUNDED', 'DISPATCHED', 'DISPUTED', 'RESOLVED'].map(s => (
                <button key={s}
                  onClick={() => filterTx(s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium
                    border transition-colors
                    ${txFilter === s
                      ? 'bg-brand-main text-white border-brand-main'
                      : 'bg-background text-foreground border-border hover:border-brand-main'
                    }`}>
                  {s || 'All'}
                </button>
              ))}
            </div>
            <div className="space-y-3">
              {transactions.map(tx => (
                <AdminTransactionCard key={tx.id} tx={tx} token={''} />
              ))}
              {transactions.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Receipt className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No transactions found.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Disputes */}
        {tab === 'disputes' && (
          <div className="space-y-4">
            <div className="flex gap-2">
              {['OPEN', 'RESOLVED', 'ALL'].map(s => (
                <button key={s}
                  onClick={() => filterDisputes(s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium
                    border transition-colors
                    ${dispFilter === s
                      ? 'bg-brand-main text-white border-brand-main'
                      : 'bg-background text-foreground border-border hover:border-brand-main'
                    }`}>
                  {s}
                </button>
              ))}
            </div>
            <div className="space-y-4">
              {disputes.map(d => (
                <AdminDisputeCard key={d.id} dispute={d} token={''} />
              ))}
              {disputes.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No disputes found.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Ledger */}
        {tab === 'ledger' && reconcile && (
          <Card className="shadow-card border-border">
            <CardHeader>
              <CardTitle className="text-sm font-semibold">
                Ledger Reconciliation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: 'Total entries',        value: reconcile.totalEntries,        ok: false, bad: false },
                { label: 'Transactions tracked', value: reconcile.totalTransactions,   ok: false, bad: false },
                { label: 'Balanced',             value: reconcile.balanced,            ok: true,  bad: false },
                { label: 'Unbalanced',           value: reconcile.unbalanced.length,   ok: false,
                  bad: reconcile.unbalanced.length > 0 },
              ].map(row => (
                <div key={row.label}
                  className="flex justify-between items-center py-2
                    border-b border-border last:border-0">
                  <span className="text-sm text-muted-foreground">
                    {row.label}
                  </span>
                  <span className={`font-semibold text-sm
                    ${row.ok  ? 'text-brand-main' :
                      row.bad ? 'text-red-500'    : 'text-foreground'}`}>
                    {String(row.value)}
                  </span>
                </div>
              ))}

              {reconcile.unbalanced.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-2">
                  <p className="text-xs font-semibold text-red-600 mb-2">
                    Unbalanced Transactions
                  </p>
                  {reconcile.unbalanced.map(u => (
                    <p key={u.transactionId} className="text-xs text-red-500">
                      {u.transactionId.split('-')[0]}... balance: {u.balance}
                    </p>
                  ))}
                </div>
              )}

              {reconcile.unbalanced.length === 0 && (
                <div className="flex items-center gap-2 text-brand-main text-sm pt-2">
                  <CheckCircle className="w-4 h-4" />
                  All ledger entries are balanced.
                </div>
              )}
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  );
}

function AdminTransactionCard({ tx }: { tx: TxRecord; token: string }) {
  const [newState, setNewState] = useState('');
  const [reason,   setReason]   = useState('');
  const [saving,   setSaving]   = useState(false);

  async function handleStateChange() {
    if (!newState || !reason.trim()) {
      toast.error('Select a state and provide a reason.');
      return;
    }
    setSaving(true);
    try {
      await adminApi.changeTransactionState( tx.id, newState, reason);
      toast.success(`State updated to ${newState}`);
      setNewState('');
      setReason('');
    } catch {
      toast.error('Failed to update state.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="shadow-card border-border">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold text-foreground">{tx.itemName}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Seller: {tx.sellerMomo} ·
              Buyer: {tx.buyerPhone || 'No phone'} ·
              {new Date(tx.createdAt).toLocaleString()}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="font-bold text-brand-main">
              GHS {tx.amount.toLocaleString()}
            </p>
            <Badge className={`text-xs border mt-1 ${STATE_COLORS[tx.state] ?? ''}`}>
              {tx.state}
            </Badge>
          </div>
        </div>

        {(tx.disputes?.length ?? 0) > 0 && (
          <p className="text-xs text-red-500 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            {tx.disputes!.length} dispute(s)
          </p>
        )}

        <Separator />

        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase
            tracking-wide">Admin State Override</p>
          <div className="flex gap-2 flex-wrap">
            {['FUNDED','DISPATCHED','CONFIRMED','DISPUTED','RESOLVED'].map(s => (
              <button key={s}
                onClick={() => setNewState(s)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium
                  border transition-colors
                  ${newState === s
                    ? 'bg-brand-main text-white border-brand-main'
                    : 'bg-background border-border hover:border-brand-main'
                  }`}>
                {s}
              </button>
            ))}
          </div>
          <Input
            placeholder="Reason (required — permanently logged)"
            value={reason}
            onChange={e => setReason(e.target.value)}
            className="h-9 text-sm border-border"
          />
          <Button
            onClick={handleStateChange}
            disabled={saving || !newState || !reason}
            size="sm"
            className="bg-brand-dark hover:bg-brand-darkest text-white border-0"
          >
            {saving ? 'Applying...' : 'Apply Change'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function AdminDisputeCard({ dispute }: { dispute: DisputeRecord; token: string }) {
  const [decision,   setDecision]   = useState('');
  const [reason,     setReason]     = useState('');
  const [decidedBy,  setDecidedBy]  = useState('');
  const [approvedBy, setApprovedBy] = useState('');
  const [saving,     setSaving]     = useState(false);
  const [resolved,   setResolved]   = useState(false);
  const [partialAmount, setPartialAmount] = useState('');

  const tx        = dispute.transaction;
  const needsDual = tx.amount >= 500;

  async function handleResolve() {
    if (!decision || !reason.trim() || !decidedBy.trim()) {
      toast.error('Fill in all required fields.');
      return;
    }
    if (decision === 'PARTIAL_SPLIT' && (!partialAmount || parseFloat(partialAmount) <= 0)) {
      toast.error('Enter a valid split amount.');
      return;
    }
    if (needsDual && !approvedBy.trim()) {
      toast.error('Dual approval required for GHS 500+.');
      return;
    }
    if (needsDual && approvedBy === decidedBy) {
      toast.error('Approving admin must be different from deciding admin.');
      return;
    }
    setSaving(true);
    try {
      await adminApi.resolveDispute(
        dispute.id, decision, reason, decidedBy,
        approvedBy || undefined,
        decision === 'PARTIAL_SPLIT' ? parseFloat(partialAmount) : undefined
      );
      setResolved(true);
      toast.success('Dispute resolved.');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to resolve.');
    } finally {
      setSaving(false);
    }
  }

  const isResolved = resolved || dispute.status === 'RESOLVED';

  return (
    <Card className={`shadow-card border-l-4
      ${isResolved ? 'border-l-brand-main opacity-70' : 'border-l-red-400'}`}>
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold text-foreground">{tx.itemName}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              ID: {dispute.id.split('-')[0]} ·
              Raised: {new Date(dispute.createdAt).toLocaleString()} ·
              By: {dispute.raisedBy}
              {needsDual && (
                <span className="text-amber-600 ml-2">· Dual approval required</span>
              )}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="font-bold text-brand-main">
              GHS {tx.amount.toLocaleString()}
            </p>
            <Badge className={`text-xs border mt-1
              ${isResolved
                ? 'bg-green-50 text-brand-main border-green-200'
                : 'bg-red-50 text-red-600 border-red-200'
              }`}>
              {isResolved ? 'RESOLVED' : 'OPEN'}
            </Badge>
          </div>
        </div>

        <div className="bg-red-50 rounded-lg p-3">
          <p className="text-xs font-medium text-muted-foreground mb-1">
            {dispute.raisedBy === 'SELLER' ? 'Seller' : 'Buyer'} reason
          </p>
          <p className="text-sm text-foreground">{dispute.reason}</p>
        </div>

        {dispute.sellerResponse && dispute.raisedBy !== 'SELLER' && (
          <div className="bg-green-50 rounded-lg p-3">
            <p className="text-xs font-medium text-muted-foreground mb-1">
              Seller response
            </p>
            <p className="text-sm text-foreground">{dispute.sellerResponse}</p>
          </div>
        )}

        {(dispute.auditLogs?.length ?? 0) > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground
              uppercase tracking-wide mb-2">Audit Trail</p>
            <div className="space-y-1">
              {dispute.auditLogs!.map(log => (
                <p key={log.id} className="text-xs text-muted-foreground">
                  [{new Date(log.createdAt).toLocaleString()}]{' '}
                  <strong>{log.action}</strong> by {log.performedBy}
                  {log.note ? ` — ${log.note}` : ''}
                </p>
              ))}
            </div>
          </div>
        )}

        {!isResolved && (
          <>
            <Separator />
            <div className="space-y-3">
              <div className="flex gap-2">
                {['RELEASE_TO_SELLER', 'PARTIAL_SPLIT', 'REFUND_TO_BUYER'].map(d => (
                  <button key={d}
                    onClick={() => setDecision(d)}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors
                      ${decision === d
                        ? 'bg-brand-main text-white border-brand-main'
                        : 'bg-background border-border hover:border-brand-main'
                      }`}>
                    {d === 'RELEASE_TO_SELLER' ? 'Release'
                      : d === 'PARTIAL_SPLIT' ? 'Split'
                      : 'Refund'}
                  </button>
                ))}
              </div>

              {decision === 'PARTIAL_SPLIT' && (
                <Input
                  type="number"
                  placeholder={`Amount to seller (max GHS ${tx.amount})`}
                  value={partialAmount}
                  onChange={e => setPartialAmount(e.target.value)}
                  className="h-9 text-sm"
                />
              )}

              <Textarea
                placeholder="Decision reason (required — permanently logged)"
                value={reason}
                onChange={e => setReason(e.target.value)}
                className="resize-none h-16 text-sm"
              />
              <Input
                placeholder="Your admin name"
                value={decidedBy}
                onChange={e => setDecidedBy(e.target.value)}
                className="h-9 text-sm"
              />
              <Input
                placeholder={needsDual
                  ? 'Second admin name (required)'
                  : 'Second admin name (optional)'}
                value={approvedBy}
                onChange={e => setApprovedBy(e.target.value)}
                className="h-9 text-sm"
              />
              <Button
                onClick={handleResolve}
                disabled={saving}
                className="w-full h-10 bg-brand-darkest hover:bg-brand-dark
                  text-white border-0 text-sm font-semibold"
              >
                {saving ? 'Submitting...' : 'Submit Decision'}
              </Button>
            </div>
          </>
        )}

        {isResolved && (
          <div className="flex items-center gap-2 text-brand-main text-sm">
            <CheckCircle className="w-4 h-4" />
            Resolved: {dispute.decision ?? ''} by {dispute.decidedBy ?? ''}
          </div>
        )}
      </CardContent>
    </Card>
  );
}