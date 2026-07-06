'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, Transaction } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
  Package, CheckCircle, AlertCircle,
  Clock, AlertTriangle, Shield
} from 'lucide-react';
import { toast } from 'sonner';
import { PageTransition } from '@/components/ui/page-transition';
import { BackButton } from '@/components/ui/back-button';

export default function ConfirmPage() {
  const { id } = useParams<{ id: string }>();
  const [tx,            setTx]           = useState<Transaction | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [confirming,    setConfirming]    = useState(false);
  const [confirmed,     setConfirmed]     = useState(false);
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

  async function handleConfirm() {
    setConfirming(true);
    try {
      await api.updateState(id, 'CONFIRMED');
      await api.updateState(id, 'RESOLVED');
      setConfirmed(true);
      toast.success('Receipt confirmed. Payment released to seller.');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to confirm.';
      toast.error(message);
    } finally {
      setConfirming(false);
    }
  }

  async function handleDispute() {
    if (!disputeReason.trim()) {
      toast.error('Please describe the problem.');
      return;
    }
    setDisputing(true);
    try {
      await api.raiseDispute(id, disputeReason.trim(), 'BUYER');
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

  const resolvedDispute = tx.disputes?.find(d => d.status === 'RESOLVED');

  if (confirmed || tx.state === 'CONFIRMED' || tx.state === 'RESOLVED') {
    const icon    = resolvedDispute?.decision === 'REFUND_TO_BUYER'
      ? '💰' : null;
    const heading = resolvedDispute?.decision === 'REFUND_TO_BUYER'
      ? 'Refund Approved'
      : resolvedDispute?.decision === 'RELEASE_TO_SELLER'
        ? 'Dispute Resolved'
        : 'Transaction Complete';
    const message = resolvedDispute?.decision === 'REFUND_TO_BUYER'
      ? 'The Verified team resolved this dispute in your favour. Your refund is being processed.'
      : resolvedDispute?.decision === 'RELEASE_TO_SELLER'
        ? 'The Verified team reviewed this dispute and released payment to the seller.'
        : 'You confirmed receipt. Funds have been released to the seller.';

    return (
      <PageTransition>
      <div className="min-h-screen bg-background flex items-center
        justify-center px-4">
        <Card className="max-w-md w-full shadow-card">
          <CardContent className="p-8 text-center">
            <div className="w-14 h-14 bg-green-50 rounded-full flex
              items-center justify-center mx-auto mb-4">
              {icon ? (
                <span className="text-2xl">{icon}</span>
              ) : (
                <CheckCircle className="w-7 h-7 text-brand-main" />
              )}
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">
              {heading}
            </h2>
            <p className="text-muted-foreground text-sm">{message}</p>
          </CardContent>
        </Card>
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
              Your payment is frozen. The Verified team will contact
              both parties within 48 hours to resolve this.
            </p>
          </CardContent>
        </Card>
      </div>
      </PageTransition>
    );
  }

  if (tx.state !== 'DISPATCHED') {
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
              Not Yet Dispatched
            </h2>
            <p className="text-muted-foreground text-sm">
              The seller has not yet marked this item as dispatched.
              You will receive an SMS when it is on the way.
            </p>
          </CardContent>
        </Card>
      </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-md mx-auto space-y-4">

        <div className="mb-6">
          <BackButton />
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
          Delivery Confirmation
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
                tracking-wide mb-1">Amount Paid</p>
              <p className="font-serif text-3xl font-bold text-brand-main">
                GHS {tx.amount.toLocaleString()}
              </p>
            </div>
            <Separator />
            <div className="flex items-start gap-2">
              <Package className="w-4 h-4 text-brand-amber flex-shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground">
                Item has been dispatched. Only confirm if you have
                received it and it matches what was advertised.
              </p>
            </div>
          </CardContent>
        </Card>

        <Button
  onClick={handleConfirm}
  disabled={confirming}
  className="w-full h-14 bg-brand-main hover:bg-brand-dark
    text-white font-semibold text-base border-0 rounded-2xl
    transition-all duration-200 shadow-md hover:shadow-lg"
>
  {confirming ? (
    <span className="flex items-center gap-2">
      <span className="w-4 h-4 border-2 border-white/40
        border-t-white rounded-full animate-spin" />
      Confirming...
    </span>
  ) : (
    <span className="flex items-center gap-2">
      <CheckCircle className="w-5 h-5" />
      Yes, I Received It — Release Payment
    </span>
  )}
</Button>

{!showDispute ? (
  <Button
    onClick={() => setShowDispute(true)}
    variant="outline"
    className="w-full h-14 border-2 border-red-300 text-red-500
      hover:bg-red-500 hover:text-white hover:border-red-500
      font-semibold rounded-2xl transition-all duration-200"
  >
    <AlertCircle className="w-5 h-5 mr-2" />
    There Is a Problem
  </Button>
) 
         : !disputed ? (
          <Card className="border-red-200">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start gap-2">
                <Shield className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground">
                  Describe the problem. Funds will freeze immediately
                  until the Verified team resolves it.
                </p>
              </div>
              <Textarea
                placeholder="e.g. Item not received, item different from description, item damaged..."
                value={disputeReason}
                onChange={e => setDisputeReason(e.target.value)}
                className="resize-none h-24 text-sm"
              />
              <div className="flex gap-2">
                <Button
                  onClick={() => setShowDispute(false)}
                  variant="outline"
                  className="flex-1 h-10 text-sm"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDispute}
                  disabled={disputing}
                  className="flex-1 h-10 bg-red-500 hover:bg-red-600
                    text-white border-0 text-sm"
                >
                  {disputing ? 'Submitting...' : 'Submit Dispute'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

      </div>
    </div>
    </PageTransition>
  );
}