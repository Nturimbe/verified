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
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [logging,  setLogging]  = useState(false);
  const [tab,      setTab]      = useState<Tab>('overview');

  // Data states
  const [overview,      setOverview]      = useState<Record<string, unknown> | null>(null);
  const [transactions,  setTransactions]  = useState<unknown[]>([]);
  const [disputes,      setDisputes]      = useState<unknown[]>([]);
  const [reconcile,     setReconcile]     = useState<Record<string, unknown> | null>(null);
  const [txFilter,      setTxFilter]      = useState('');
  const [dispFilter,    setDispFilter]    = useState('OPEN');

  async function handleLogin() {
    if (!password) { toast.error('Enter the admin password.'); return; }
    setLogging(true);
    try {
      const data = await adminApi.getOverview(password);
      setToken(password);
      setOverview(data as Record<string, unknown>);
      toast.success('Logged in.');
    } catch {
      toast.error('Incorrect password.');
    } finally {
      setLogging(false);
    }
  }

  async function switchTab(t: Tab) {
    setTab(t);
    try {
      if (t === 'transactions') {
        const data = await adminApi.getTransactions(token, txFilter || undefined);
        setTransactions((data as { transactions: unknown[] }).transactions || []);
      }
      if (t === 'disputes') {
        const data = await adminApi.getDisputes(token, dispFilter);
        setDisputes(data as unknown[]);
      }
      if (t === 'ledger') {
        const data = await adminApi.reconcile(token);
        setReconcile(data as Record<string, unknown>);
      }
    } catch {
      toast.error('Failed to load data.');
    }
  }

  async function filterTx(state: string) {
    setTxFilter(state);
    try {
      const data = await adminApi.getTransactions(token, state || undefined);
      setTransactions((data as { transactions: unknown[] }).transactions || []);
    } catch {
      toast.error('Failed to filter.');
    }
  }

  async function filterDisputes(status: string) {
    setDispFilter(status);
    try {
      const data = await adminApi.getDisputes(token, status);
      setDisputes(data as unknown[]);
    } catch {
      toast.error('Failed to filter.');
    }
  }

  // Login screen
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
            <div className="space-y-1.5">
              <div className="relative">
                <Input
                  type={showPw ? 'text' : 'password'}
                  placeholder="Enter admin password"
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
                    : <Eye className="w-4 h-4" />
                  }
                </button>
              </div>
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

  const ov = overview as Record<string, unknown>;

  const tabs = [
    { key: 'overview',      label: 'Overview',      icon: LayoutDashboard },
    { key: 'transactions',  label: 'Transactions',   icon: Receipt },
    { key: 'disputes',      label: 'Disputes',       icon: AlertTriangle },
    { key: 'ledger',        label: 'Ledger',         icon: Scale },
  ] as const;

  return (
    <div className="min-h-screen bg-background">

      {/* Admin topbar */}
      <div className="bg-brand-darkest border-b border-green-900 px-4 py-3
        flex items-center justify-between">
        <div className="flex items-center gap-3">
          <p className="font-serif text-brand-amber font-bold">Verified</p>
          <span className="text-xs text-green-600">Admin</span>
        </div>
        <button
          onClick={() => { setToken(''); setPassword(''); }}
          className="flex items-center gap-1.5 text-xs text-green-400
            hover:text-brand-amber transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign out
        </button>
      </div>

      {/* Tab nav */}
      <div className="border-b border-border bg-background sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 flex overflow-x-auto">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => switchTab(t.key as Tab)}
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

        {/* Overview tab */}
        {tab === 'overview' && ov && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                {
                  label: 'Total Transactions',
                  value: String(ov.totalTransactions ?? 0),
                  icon: Receipt,
                },
                {
                  label: 'Open Disputes',
                  value: String(ov.openDisputes ?? 0),
                  icon: AlertTriangle,
                  alert: Number(ov.openDisputes) > 0,
                },
                {
                  label: 'Total Volume',
                  value: `GHS ${Number(ov.totalVolume ?? 0).toLocaleString()}`,
                  icon: TrendingUp,
                },
                {
                  label: 'Est. Fees',
                  value: `GHS ${Number(ov.estimatedFees ?? 0).toLocaleString()}`,
                  icon: DollarSign,
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
                  {Object.entries(
                    (ov.byState as Record<string, number>) || {}
                  ).map(([state, count]) => (
                    <div key={state}
                      className="flex items-center justify-between py-2
                        border-b border-border last:border-0">
                      <Badge className={`text-xs border ${STATE_COLORS[state]}`}>
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
                  {((ov.recentTransactions as unknown[]) || [])
                    .map((tx: unknown) => {
                      const t = tx as Record<string, unknown>;
                      return (
                        <div key={t.id as string}
                          className="flex items-center justify-between
                            py-2 border-b border-border last:border-0">
                          <div>
                            <p className="font-medium text-sm text-foreground">
                              {t.itemName as string}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {t.sellerMomo as string} ·{' '}
                              {new Date(t.createdAt as string)
                                .toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-brand-main text-sm">
                              GHS {Number(t.amount).toLocaleString()}
                            </p>
                            <Badge className={`text-xs border
                              ${STATE_COLORS[t.state as string]}`}>
                              {t.state as string}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Transactions tab */}
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
              {(transactions as Record<string, unknown>[]).map(tx => (
                <AdminTransactionCard key={tx.id as string} tx={tx} token={token} />
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

        {/* Disputes tab */}
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
              {(disputes as Record<string, unknown>[]).map(d => (
                <AdminDisputeCard key={d.id as string} dispute={d} token={token} />
              ))}
              {disputes.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No disputes found. All clear.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Ledger tab */}
        {tab === 'ledger' && reconcile && (
          <Card className="shadow-card border-border">
            <CardHeader>
              <CardTitle className="text-sm font-semibold">
                Ledger Reconciliation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: 'Total entries',        value: reconcile.totalEntries },
                { label: 'Transactions tracked', value: reconcile.totalTransactions },
                { label: 'Balanced',             value: reconcile.balanced,     ok: true },
                {
                  label: 'Unbalanced',
                  value: reconcile.unbalanced
                    ? (reconcile.unbalanced as unknown[]).length : 0,
                  bad: reconcile.unbalanced
                    ? (reconcile.unbalanced as unknown[]).length > 0 : false,
                },
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

              {reconcile.unbalanced &&
               (reconcile.unbalanced as unknown[]).length > 0 && (
                <div className="bg-red-50 border border-red-200
                  rounded-lg p-4 mt-2">
                  <p className="text-xs font-semibold text-red-600 mb-2">
                    Unbalanced Transactions
                  </p>
                  {(reconcile.unbalanced as Record<string, unknown>[]).map(u => (
                    <p key={u.transactionId as string}
                      className="text-xs text-red-500">
                      {(u.transactionId as string).split('-')[0]}...
                      balance: {String(u.balance)}
                    </p>
                  ))}
                </div>
              )}

              {reconcile.unbalanced &&
               (reconcile.unbalanced as unknown[]).length === 0 && (
                <div className="flex items-center gap-2 text-brand-main
                  text-sm pt-2">
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

function AdminTransactionCard({
  tx, token
}: {
  tx: Record<string, unknown>;
  token: string;
}) {
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
      await adminApi.changeTransactionState(token, tx.id as string, newState, reason);
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
            <p className="font-semibold text-foreground">
              {tx.itemName as string}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Seller: {tx.sellerMomo as string} ·
              Buyer: {(tx.buyerPhone as string) || 'No phone'} ·
              {new Date(tx.createdAt as string).toLocaleString()}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="font-bold text-brand-main">
              GHS {Number(tx.amount).toLocaleString()}
            </p>
            <Badge className={`text-xs border mt-1
              ${STATE_COLORS[tx.state as string]}`}>
              {tx.state as string}
            </Badge>
          </div>
        </div>

        {(tx.disputes as unknown[])?.length > 0 && (
          <p className="text-xs text-red-500 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            {(tx.disputes as unknown[]).length} dispute(s)
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

function AdminDisputeCard({
  dispute, token
}: {
  dispute: Record<string, unknown>;
  token: string;
}) {
  const [decision,  setDecision]  = useState('');
  const [reason,    setReason]    = useState('');
  const [decidedBy, setDecidedBy] = useState('');
  const [approvedBy,setApprovedBy]= useState('');
  const [saving,    setSaving]    = useState(false);
  const [resolved,  setResolved]  = useState(false);

  const tx       = dispute.transaction as Record<string, unknown>;
  const needsDual = Number(tx?.amount) >= 500;

  async function handleResolve() {
    if (!decision || !reason.trim() || !decidedBy.trim()) {
      toast.error('Fill in all required fields.');
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
        token, dispute.id as string,
        decision, reason, decidedBy, approvedBy || undefined
      );
      setResolved(true);
      toast.success('Dispute resolved.');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to resolve.';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className={`shadow-card border-l-4
      ${resolved || dispute.status === 'RESOLVED'
        ? 'border-l-brand-main opacity-70'
        : 'border-l-red-400'
      }`}>
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold text-foreground">
              {tx?.itemName as string}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              ID: {(dispute.id as string).split('-')[0]} ·
              Raised: {new Date(dispute.createdAt as string).toLocaleString()} ·
              By: {dispute.raisedBy as string}
              {needsDual && (
                <span className="text-amber-600 ml-2">
                  · Dual approval required
                </span>
              )}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="font-bold text-brand-main">
              GHS {Number(tx?.amount).toLocaleString()}
            </p>
            <Badge className={`text-xs border mt-1
              ${resolved || dispute.status === 'RESOLVED'
                ? 'bg-green-50 text-brand-main border-green-200'
                : 'bg-red-50 text-red-600 border-red-200'
              }`}>
              {resolved || dispute.status === 'RESOLVED' ? 'RESOLVED' : 'OPEN'}
            </Badge>
          </div>
        </div>

        <div className="bg-red-50 rounded-lg p-3">
          <p className="text-xs font-medium text-muted-foreground mb-1">
            {dispute.raisedBy === 'SELLER' ? 'Seller' : 'Buyer'} reason
          </p>
          <p className="text-sm text-foreground">{dispute.reason as string}</p>
        </div>

        {dispute.sellerResponse && dispute.raisedBy !== 'SELLER' && (
          <div className="bg-green-50 rounded-lg p-3">
            <p className="text-xs font-medium text-muted-foreground mb-1">
              Seller response
            </p>
            <p className="text-sm text-foreground">
              {dispute.sellerResponse as string}
            </p>
          </div>
        )}

        {(dispute.auditLogs as unknown[])?.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground
              uppercase tracking-wide mb-2">Audit Trail</p>
            <div className="space-y-1">
              {(dispute.auditLogs as Record<string, unknown>[]).map(log => (
                <p key={log.id as string}
                  className="text-xs text-muted-foreground">
                  [{new Date(log.createdAt as string).toLocaleString()}]{' '}
                  <strong>{log.action as string}</strong>{' '}
                  by {log.performedBy as string}
                  {log.note && ` — ${log.note}`}
                </p>
              ))}
            </div>
          </div>
        )}

        {!resolved && dispute.status === 'OPEN' && (
          <>
            <Separator />
            <div className="space-y-3">
              <div className="flex gap-2">
                {['RELEASE_TO_SELLER', 'REFUND_TO_BUYER'].map(d => (
                  <button key={d}
                    onClick={() => setDecision(d)}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium
                      border transition-colors
                      ${decision === d
                        ? 'bg-brand-main text-white border-brand-main'
                        : 'bg-background border-border hover:border-brand-main'
                      }`}>
                    {d === 'RELEASE_TO_SELLER'
                      ? 'Release to Seller'
                      : 'Refund to Buyer'}
                  </button>
                ))}
              </div>
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

        {(resolved || dispute.status === 'RESOLVED') && (
          <div className="flex items-center gap-2 text-brand-main text-sm">
            <CheckCircle className="w-4 h-4" />
            Resolved: {dispute.decision as string} by {dispute.decidedBy as string}
          </div>
        )}
      </CardContent>
    </Card>
  );
}