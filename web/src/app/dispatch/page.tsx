'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { PageTransition } from '@/components/ui/page-transition';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, ArrowRight, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Transaction } from '@/lib/api';
import { BackButton } from '@/components/ui/back-button';

export default function MyOrderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlPhone = searchParams.get('phone') || '';

  const [phone, setPhone] = useState(urlPhone);
  const [orders, setOrders] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (urlPhone && urlPhone.length >= 10) {
      setPhone(urlPhone);
      fetchOrders(urlPhone);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlPhone]);

  async function fetchOrders(searchPhone: string) {
    setLoading(true);
    try {
      const data = await api.getBuyerOrders(searchPhone);
      setOrders(data);
      setSearched(true);
    } catch {
      toast.error('Could not load orders.');
    } finally {
      setLoading(false);
    }
  }

  function handleSearch() {
    if (!phone || phone.length < 10) {
      toast.error('Please enter your phone number.');
      return;
    }
    router.push(`/my-order?phone=${encodeURIComponent(phone)}`);
  }

  // ... rest stays the same

  const STATE_COLORS: Record<string, string> = {
    CREATED:    'bg-muted text-muted-foreground',
    FUNDED:     'bg-amber-50 text-amber-700 border-amber-200',
    DISPATCHED: 'bg-blue-50 text-blue-700 border-blue-200',
    CONFIRMED:  'bg-green-50 text-brand-main border-green-200',
    DISPUTED:   'bg-red-50 text-red-600 border-red-200',
    RESOLVED:   'bg-muted text-muted-foreground',
  };

  const actionable = orders.filter(tx => tx.state === 'FUNDED' || tx.state === 'DISPATCHED');
  const others = orders.filter(tx => tx.state !== 'FUNDED' && tx.state !== 'DISPATCHED');

  return (
    <PageTransition>
      <div className="min-h-screen bg-background py-10 px-4">
        <div className="max-w-xl mx-auto">

          <div className="mb-8">
            <BackButton />
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
              Seller Portal
            </p>
            <h1 className="text-3xl font-serif font-bold text-foreground">
              Dispatch a Transaction
            </h1>
            <p className="text-muted-foreground text-sm mt-2">
              Enter your MoMo number to see transactions ready for dispatch.
            </p>
          </div>

          <Card className="shadow-card border-border mb-6">
            <CardContent className="p-5 space-y-3">
              <div className="flex gap-2">
                <Input
                  type="tel"
                  placeholder="Your MoMo number e.g. 0551234567"
                  maxLength={10}
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  className="h-11 text-base border-border focus:border-brand-main flex-1"
                />
                <Button
                  onClick={() => handleSearch()}
                  disabled={loading}
                  className="h-11 px-5 bg-brand-main hover:bg-brand-dark text-white border-0"
                >
                  {loading
                    ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    : <Search className="w-4 h-4" />
                  }
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Actionable transactions — FUNDED or DISPATCHED */}
          {searched && actionable.length > 0 && (
            <div className="mb-6">
              <p className="text-xs font-semibold uppercase tracking-wide
                text-brand-main mb-3">
                Needs Action ({actionable.length})
              </p>
              <div className="space-y-3">
                {actionable.map(tx => (
                  <Card key={tx.id}
                    className="shadow-card border-brand-main/20 hover:shadow-card-hover transition-shadow cursor-pointer"
                    onClick={() => router.push(`/dispatch/${tx.id}`)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-3">
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
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <div className="text-right">
                            <p className="font-bold text-brand-main">
                              GHS {tx.amount.toLocaleString()}
                            </p>
                            <Badge className={`text-xs mt-1 border ${STATE_COLORS[tx.state]}`}>
                              {tx.state}
                            </Badge>
                          </div>
                          <ArrowRight className="w-4 h-4 text-brand-main" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* No actionable transactions */}
          {searched && actionable.length === 0 && (
            <div className="text-center py-10 text-muted-foreground mb-6">
              <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">No transactions need action.</p>
              <p className="text-xs mt-1">
                All your transactions are either completed or awaiting payment.
              </p>
            </div>
          )}

          {/* Other transactions */}
          {searched && others.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide
                text-muted-foreground mb-3">
                Other Transactions ({others.length})
              </p>
              <div className="space-y-2">
                {others.map(tx => (
                  <Card key={tx.id} className="shadow-card border-border opacity-60">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground text-sm truncate">
                            {tx.itemName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(tx.createdAt).toLocaleDateString('en-GH', {
                              day: 'numeric', month: 'short'
                            })}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-semibold text-sm text-foreground">
                            GHS {tx.amount.toLocaleString()}
                          </p>
                          <Badge className={`text-xs mt-1 border ${STATE_COLORS[tx.state]}`}>
                            {tx.state}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </PageTransition>
  );
}