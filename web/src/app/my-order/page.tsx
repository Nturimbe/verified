'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api, Transaction } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ShoppingBag, ArrowRight, Search,
  CheckCircle, Clock, Package, AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';

const STATE_ICONS: Record<string, React.ElementType> = {
  CREATED:    Clock,
  FUNDED:     Clock,
  DISPATCHED: Package,
  CONFIRMED:  CheckCircle,
  RESOLVED:   CheckCircle,
  DISPUTED:   AlertTriangle,
};

const STATE_LABELS: Record<string, string> = {
  CREATED:    'Awaiting payment',
  FUNDED:     'Paid — awaiting dispatch',
  DISPATCHED: 'On the way',
  CONFIRMED:  'Completed',
  RESOLVED:   'Resolved',
  DISPUTED:   'Dispute in progress',
};

const STATE_COLORS: Record<string, string> = {
  CREATED:    'bg-muted text-muted-foreground',
  FUNDED:     'bg-amber-50 text-amber-700 border-amber-200',
  DISPATCHED: 'bg-blue-50 text-blue-700 border-blue-200',
  CONFIRMED:  'bg-green-50 text-brand-main border-green-200',
  RESOLVED:   'bg-muted text-muted-foreground',
  DISPUTED:   'bg-red-50 text-red-600 border-red-200',
};

export default function MyOrderPage() {
  const [phone,  setPhone]  = useState('');
  const [orders, setOrders] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function handleSearch() {
    if (!phone || phone.length < 10) {
      toast.error('Please enter your phone number.');
      return;
    }
    setLoading(true);
    try {
      const data = await api.getBuyerOrders(phone);
      setOrders(data);
      setSearched(true);
    } catch {
      toast.error('Could not load orders.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-2xl mx-auto">

        <div className="mb-8">
          <p className="text-xs text-muted-foreground uppercase
            tracking-wide mb-1">Buyer Portal</p>
          <h1 className="text-3xl font-serif font-bold text-foreground">
            Track My Orders
          </h1>
        </div>

        <Card className="shadow-card border-border mb-6">
          <CardContent className="p-5 space-y-3">
            <Label className="text-xs font-semibold uppercase
              tracking-wide text-muted-foreground">
              Your WhatsApp or Phone Number
            </Label>
            <div className="flex gap-2">
              <Input
                type="tel"
                placeholder="e.g. 0241234567"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                className="h-11 text-base border-border
                  focus:border-brand-main flex-1"
              />
              <Button
                onClick={handleSearch}
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

        {searched && orders.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <ShoppingBag className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No orders found for this number.</p>
          </div>
        )}

        <div className="space-y-3">
          {orders.map(order => {
            const Icon = STATE_ICONS[order.state] || Clock;
            return (
              <Card key={order.id}
                className="shadow-card border-border hover:shadow-card-hover
                  transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate">
                        {order.itemName}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(order.createdAt).toLocaleDateString('en-GH', {
                          day: 'numeric', month: 'short', year: 'numeric'
                        })}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-brand-main">
                        GHS {order.amount.toLocaleString()}
                      </p>
                      <Badge className={`text-xs mt-1 border flex items-center
                        gap-1 ${STATE_COLORS[order.state]}`}>
                        <Icon className="w-3 h-3" />
                        {STATE_LABELS[order.state]}
                      </Badge>
                    </div>
                  </div>

                  {order.state === 'DISPATCHED' && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <Link
                        href={`/confirm/${order.id}`}
                        className="flex items-center gap-1 text-xs
                          font-medium text-brand-main hover:underline"
                      >
                        Confirm receipt
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

      </div>
    </div>
  );
}