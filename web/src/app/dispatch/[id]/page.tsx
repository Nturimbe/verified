'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, Transaction } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
  Package, Clock, Shield, CheckCircle,
  AlertCircle, AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import { PageTransition } from '@/components/ui/page-transition';
import { BackButton } from '@/components/ui/back-button';

export default function DispatchPage() {
  const { id } = useParams<{ id: string }>();
  const [tx,            setTx]           = useState<Transaction | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [dispatching,   setDispatching]   = useState(false);
  const [dispatched,    setDispatched]    = useState(false);
  const [showDispute,   setShowDispute]   = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputing,     setDisputing]     = useState(false);
  const [disputed,      setDisputed]      = useState(false);

  useEffect(() => {
    api.getTransaction(id)
      .then(setTx)
      .catch(() => toast.error('Transaction not found.'))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleDispatch() {
    setDispatching(true);
    try {
      await api.updateState(id, 'DISPATCHED');
      setDispatched(true);
      toast.success('Dispatch confirmed. Buyer has been notified.');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to confirm dispatch.';
      toast.error(message);
    } finally {
      setDispatching(false);
    }
  }

  async function handleDispute() {
    if (!disputeReason.trim()) {
      toast.error('Please describe the problem.');
      return;
    }
    setDisputing(true);
    try {
      await api.raiseDispute(id, disputeReason.trim(), 'SELLER');
      setDisputed(true);
      toast.success('Dispute raised. Funds are frozen.');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to raise dispute.';
      toast.error(message);
    } finally {
      setDisputing(false);
    }
  }

  if (loading) {
  return (
    <PageTransition>
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-main/30
          border-t-brand-main rounded-full animate-spin" />
      </div>
    </PageTransition>
  );
}

if (!tx) {
  return (
    <PageTransition>
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Transaction Not Found</h2>
        </div>
      </div>
    </PageTransition>
  );
}

  if (disputed || tx.state === 'DISPUTED') {
    return (
      <PageTransition>
      <div className="min-h-screen bg-background flex items-center
        justify-center px-4">
        <Card className="max-w-md w-full shadow-card">
          <CardContent className="p-8 text-center">
            <div className="w-14 h-14 bg-red-50 rounded-full flex items-center
              justify-center mx-auto mb-4">
              <AlertTriangle className="w-7 h-7 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">
              Dispute In Progress
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              A dispute has been raised on this transaction. Funds are frozen.
              The Verified team will contact both parties within 48 hours.
            </p>
          </CardContent>
        </Card>
      </div>
      </PageTransition>
    );
  }

  if (tx.state === 'CONFIRMED' || tx.state === 'RESOLVED') {
    return (
      <PageTransition>
      <div className="min-h-screen bg-background flex items-center
        justify-center px-4">
        <Card className="max-w-md w-full shadow-card">
          <CardContent className="p-8 text-center">
            <div className="w-14 h-14 bg-green-50 rounded-full flex items-center
              justify-center mx-auto mb-4">
              <CheckCircle className="w-7 h-7 text-brand-main" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">
              Transaction Complete
            </h2>
            <p className="text-muted-foreground text-sm">
              Buyer confirmed receipt. Your funds have been released to
              your MoMo.
            </p>
          </CardContent>
        </Card>
      </div>
      </PageTransition>
    );
  }

  if (tx.state !== 'FUNDED' && !dispatched && tx.state !== 'DISPATCHED') {
    return (
      <PageTransition>
      <div className="min-h-screen bg-background flex items-center
        justify-center px-4">
        <Card className="max-w-md w-full shadow-card">
          <CardContent className="p-8 text-center">
            <div className="w-14 h-14 bg-muted rounded-full flex items-center
              justify-center mx-auto mb-4">
              <Clock className="w-7 h-7 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">
              Not Ready
            </h2>
            <p className="text-muted-foreground text-sm">
              This transaction is not yet funded. Current status: {tx.state}
            </p>
          </CardContent>
        </Card>
      </div>
      </PageTransition>
    );
  }

  const isDispatched = dispatched || tx.state === 'DISPATCHED';

  return (
    <PageTransition>
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-md mx-auto space-y-4">

        <div className="mb-6">
          <BackButton />
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
            Seller Dispatch
           </p>
          <h1 className="text-2xl font-serif font-bold text-foreground"></h1>
        </div>

        <Card className="shadow-card border-border">
          <CardContent className="p-6 space-y-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase
                tracking-wide mb-1">Item</p>
              <p className="font-bold text-lg text-foreground">
                {tx.itemName}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase
                tracking-wide mb-1">Amount in Escrow</p>
              <p className="font-serif text-3xl font-bold text-brand-main">
                GHS {tx.amount.toLocaleString()}
              </p>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase
                  tracking-wide mb-1">Buyer</p>
                <p className="font-medium text-sm text-foreground">
                  {tx.buyerName || 'Buyer'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase
                  tracking-wide mb-1">Delivery</p>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                  <p className="font-medium text-sm">
                    {tx.deliveryHours === 168
                      ? '7 days' : `${tx.deliveryHours} hrs`}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {!isDispatched ? (
          <>
            <div className="bg-brand-light border border-brand-main/20
              rounded-xl p-4">
              <div className="flex gap-2">
                <Shield className="w-4 h-4 text-brand-main flex-shrink-0 mt-0.5" />
                <p className="text-sm text-brand-dark">
                  Once you confirm dispatch, your buyer receives an SMS
                  with a confirmation link. Funds are released to your
                  MoMo only after they confirm receipt.
                </p>
              </div>
            </div>

            <Button
              onClick={handleDispatch}
              disabled={dispatching}
              className="w-full h-12 bg-brand-main hover:bg-brand-dark
                text-white font-semibold text-base border-0"
            >
              {dispatching ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/40
                    border-t-white rounded-full animate-spin" />
                  Confirming...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  I Have Dispatched This Item
                </span>
              )}
            </Button>

            {!showDispute ? (
              <p className="text-center text-sm text-muted-foreground">
                Problem before dispatching?{' '}
                <button
                  onClick={() => setShowDispute(true)}
                  className="text-red-500 font-medium hover:underline"
                >
                  Raise a dispute
                </button>
              </p>
            ) : (
              <Card className="border-red-200">
                <CardContent className="p-4 space-y-3">
                  <p className="text-sm font-semibold text-foreground">
                    Describe the problem
                  </p>
                  <Textarea
                    placeholder="e.g. Buyer asked to cancel, suspicious request..."
                    value={disputeReason}
                    onChange={e => setDisputeReason(e.target.value)}
                    className="resize-none h-20 text-sm"
                  />
                  <Button
                    onClick={handleDispute}
                    disabled={disputing}
                    className="w-full h-10 bg-red-500 hover:bg-red-600
                      text-white border-0 text-sm"
                  >
                    {disputing ? 'Submitting...' : 'Submit Dispute'}
                  </Button>
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          <>
            <Card className="border-brand-main/30 bg-brand-light">
              <CardContent className="p-5">
                <div className="flex gap-3">
                  <CheckCircle className="w-5 h-5 text-brand-main
                    flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-brand-dark mb-1">
                      Dispatch Confirmed
                    </p>
                    <p className="text-sm text-brand-dark/80">
                      Your buyer has been notified. Funds will be
                      released to your MoMo once they confirm receipt.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {!showDispute ? (
              <p className="text-center text-sm text-muted-foreground">
                Item returned or buyer unresponsive?{' '}
                <button
                  onClick={() => setShowDispute(true)}
                  className="text-red-500 font-medium hover:underline"
                >
                  Raise a problem
                </button>
              </p>
            ) : !disputed ? (
              <Card className="border-red-200">
                <CardContent className="p-4 space-y-3">
                  <p className="text-sm font-semibold text-foreground">
                    Describe the problem
                  </p>
                  <Textarea
                    placeholder="e.g. Item returned, buyer unresponsive after 72 hours..."
                    value={disputeReason}
                    onChange={e => setDisputeReason(e.target.value)}
                    className="resize-none h-20 text-sm"
                  />
                  <Button
                    onClick={handleDispute}
                    disabled={disputing}
                    className="w-full h-10 bg-red-500 hover:bg-red-600
                      text-white border-0 text-sm"
                  >
                    {disputing ? 'Submitting...' : 'Submit Dispute'}
                  </Button>
                </CardContent>
              </Card>
            ) : null}
          </>
        )}

      </div>
    </div>
    </PageTransition>
  );
}