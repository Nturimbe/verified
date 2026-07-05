'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api, Transaction } from '@/lib/api';
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

export default function MyTransactionsPage() {
  const [momo, setMomo] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('my_transactions_momo') || '';
    }
    return '';
  });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [searched,     setSearched]     = useState(false);

  useEffect(() => {
    if (momo && momo.length === 10) {
      handleSearch(momo);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSearch(momoOverride?: string) {
  const searchMomo = momoOverride || momo;
  if (!searchMomo || searchMomo.length < 10) {
    toast.error('Please enter your 10-digit MoMo number.');
    return;
  }
  setLoading(true);
  try {
    const data = await api.getSellerTransactions(searchMomo);
    setTransactions(data);
    setSearched(true);
    sessionStorage.setItem('my_transactions_momo', searchMomo);
  } catch {
    toast.error('Could not load transactions.');
  } finally {
    setLoading(false);
  }
}

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

        <Card className="shadow-card border-border mb-6">
          <CardContent className="p-5 space-y-3">
            <Label className="text-xs font-semibold uppercase
              tracking-wide text-muted-foreground">
              Your MoMo Number
            </Label>
            <div className="flex gap-2">
              <Input
                type="tel"
                placeholder="e.g. 0551234567"
                maxLength={10}
                value={momo}
                onChange={e => setMomo(e.target.value.replace(/\D/g, ''))}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                className="h-11 text-base border-border
                  focus:border-brand-main flex-1"
              />
              <Button
                onClick={() => handleSearch()}
                disabled={loading}
                className="h-11 px-5 bg-brand-main hover:bg-brand-dark
                  text-white border-0"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-white/40
                    border-t-white rounded-full animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
        {searched && transactions.length === 10 && (
          <p className="text-center text-xs text-muted-foreground mt-4">
            Showing your 10 most recent transactions.
            Seller accounts with full history are coming soon.
          </p>
        )}

        {searched && transactions.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">
              No transactions found for this MoMo number.
            </p>
          </div>
        )}

        <div className="space-y-3">
          {transactions.map(tx => (
            <Card key={tx.id}
              className="shadow-card border-border hover:shadow-card-hover
                transition-shadow">
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
                    <Badge className={`text-xs mt-1 border
                      ${STATE_COLORS[tx.state]}`}>
                      {tx.state}
                    </Badge>
                  </div>
                </div>

                {(tx.state === 'FUNDED' || tx.state === 'DISPATCHED') && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <Link
                      href={`/dispatch/${tx.id}`}
                      className="flex items-center gap-1 text-xs
                        font-medium text-brand-main hover:underline"
                    >
                      {tx.state === 'FUNDED'
                        ? 'Go to dispatch page'
                        : 'View dispatch page'}
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