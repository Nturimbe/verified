'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api, authApi, Transaction } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, ArrowRight, Search } from 'lucide-react';
import { toast } from 'sonner';
import { PageTransition } from '@/components/ui/page-transition';
import { BackButton } from '@/components/ui/back-button';

const STATE_COLORS: Record<string, string> = {
  CREATED:    'bg-muted text-muted-foreground',
  FUNDED:     'bg-amber-50 text-amber-700 border-amber-200',
  DISPATCHED: 'bg-blue-50 text-blue-700 border-blue-200',
  CONFIRMED:  'bg-green-50 text-brand-main border-green-200',
  DISPUTED:   'bg-red-50 text-red-600 border-red-200',
  RESOLVED:   'bg-muted text-muted-foreground',
};

type Stage = 'checking' | 'enterPhone' | 'enterOtp' | 'loaded';

function MyTransactionsContent() {
  const searchParams = useSearchParams();
  const urlMomo = searchParams.get('momo') || '';

  const [stage, setStage]       = useState<Stage>('checking');
  const [momo, setMomo]         = useState(urlMomo);
  const [code, setCode]         = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading]   = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);

  // On load: check for an existing session first
  useEffect(() => {
    async function init() {
      try {
        const session = await authApi.me();
        if (session.phone) {
          setMomo(session.phone);
          await fetchTransactions(session.phone);
          setStage('loaded');
          return;
        }
      } catch {
        // no valid session — fall through
      }
      setStage('enterPhone');
    }
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchTransactions(searchMomo: string) {
    setLoading(true);
    try {
      const data = await api.getSellerTransactions(searchMomo);
      setTransactions(data);
    } catch {
      toast.error('Could not load transactions.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSendOtp() {
    if (!momo || momo.length < 10) {
      toast.error('Please enter your 10-digit MoMo number.');
      return;
    }
    setSendingOtp(true);
    try {
      await authApi.requestOtp(momo);
      toast.success('Code sent! Check your SMS.');
      setStage('enterOtp');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to send code.');
    } finally {
      setSendingOtp(false);
    }
  }

  async function handleVerifyOtp() {
    if (!code || code.length !== 6) {
      toast.error('Please enter the 6-digit code.');
      return;
    }
    setSendingOtp(true);
    try {
      await authApi.verifyOtp(momo, code);
      await fetchTransactions(momo);
      setStage('loaded');
      toast.success('Verified successfully.');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Incorrect code.');
    } finally {
      setSendingOtp(false);
    }
  }

  if (stage === 'checking') {
    return (
      <PageTransition>
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-brand-main/30 border-t-brand-main rounded-full animate-spin" />
        </div>
      </PageTransition>
    );
  }

  if (stage === 'enterPhone' || stage === 'enterOtp') {
    return (
      <PageTransition>
        <div className="min-h-screen bg-background py-10 px-4">
          <div className="max-w-sm mx-auto">
            <BackButton />
            <div className="mb-8">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                Seller Portal
              </p>
              <h1 className="text-3xl font-serif font-bold text-foreground">
                My Transactions
              </h1>
              <p className="text-sm text-muted-foreground mt-2">
                {stage === 'enterPhone'
                  ? 'Enter your MoMo number to view your transactions.'
                  : `Code sent to ${momo}`}
              </p>
            </div>

            <Card className="shadow-card border-border">
              <CardContent className="p-6 space-y-4">
                {stage === 'enterPhone' ? (
                  <>
                    <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Your MoMo Number
                    </Label>
                    <Input
                      type="tel"
                      placeholder="e.g. 0551234567"
                      maxLength={10}
                      value={momo}
                      onChange={e => setMomo(e.target.value.replace(/\D/g, ''))}
                      onKeyDown={e => e.key === 'Enter' && handleSendOtp()}
                      className="h-12 text-base border-border focus:border-brand-main"
                    />
                    <Button
                      onClick={handleSendOtp}
                      disabled={sendingOtp}
                      className="w-full h-12 bg-brand-main hover:bg-brand-dark text-white font-semibold border-0"
                    >
                      {sendingOtp ? 'Sending...' : 'Send Verification Code'}
                    </Button>
                  </>
                ) : (
                  <>
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="6-digit code"
                      maxLength={6}
                      value={code}
                      onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                      onKeyDown={e => e.key === 'Enter' && handleVerifyOtp()}
                      className="h-12 text-center text-2xl tracking-widest border-border focus:border-brand-main"
                    />
                    <Button
                      onClick={handleVerifyOtp}
                      disabled={sendingOtp}
                      className="w-full h-12 bg-brand-main hover:bg-brand-dark text-white font-semibold border-0"
                    >
                      {sendingOtp ? 'Verifying...' : 'Verify & View Transactions'}
                    </Button>
                    <button
                      onClick={() => setStage('enterPhone')}
                      className="w-full text-center text-sm text-muted-foreground hover:text-brand-main"
                    >
                      Use a different number
                    </button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </PageTransition>
    );
  }

  // stage === 'loaded' — show the transaction list (original content)
  return (
    <PageTransition>
      <div className="min-h-screen bg-background py-10 px-4">
        <div className="max-w-2xl mx-auto">

          <div className="mb-8">
            <BackButton />
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
              Seller Portal
            </p>
            <h1 className="text-3xl font-serif font-bold text-foreground">
              My Transactions
            </h1>
          </div>

          {loading && (
            <div className="text-center py-16">
              <div className="w-8 h-8 border-2 border-brand-main/30 border-t-brand-main rounded-full animate-spin mx-auto" />
            </div>
          )}

          {!loading && transactions.length === 10 && (
            <p className="text-center text-xs text-muted-foreground mb-4">
              Showing your 10 most recent transactions.
              Seller accounts with full history are coming soon.
            </p>
          )}

          {!loading && transactions.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No transactions found for this MoMo number.</p>
            </div>
          )}

          <div className="space-y-3">
            {transactions.map(tx => (
              <Card key={tx.id} className="shadow-card border-border hover:shadow-card-hover transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate">
                        {tx.itemName}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(tx.createdAt).toLocaleDateString('en-GH', {
                          day: 'numeric', month: 'short', year: 'numeric'
                        })}
                        {tx.buyerName && ` · ${tx.buyerName}`}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-brand-main">
                        GHS {tx.amount.toLocaleString()}
                      </p>
                      <Badge className={`text-xs mt-1 border ${STATE_COLORS[tx.state]}`}>
                        {tx.state}
                      </Badge>
                    </div>
                  </div>

                  {(tx.state === 'FUNDED' || tx.state === 'DISPATCHED') && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <Link
                        href={`/dispatch/${tx.id}`}
                        className="flex items-center gap-1 text-xs font-medium text-brand-main hover:underline"
                      >
                        {tx.state === 'FUNDED' ? 'Go to dispatch page' : 'View dispatch page'}
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

        </div>
      </div>
    </PageTransition>
  );
}

export default function MyTransactionsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-main/30 border-t-brand-main rounded-full animate-spin" />
      </div>
    }>
      <MyTransactionsContent />
    </Suspense>
  );
}