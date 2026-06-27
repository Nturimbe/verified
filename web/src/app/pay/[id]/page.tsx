'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, Transaction } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Shield, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { PageTransition } from '@/components/ui/page-transition';

const STATE_MESSAGES: Record<string, string> = {
  FUNDED:     'Payment already secured for this transaction.',
  DISPATCHED: 'This item has been dispatched. Check your SMS for the confirmation link.',
  CONFIRMED:  'This transaction is complete.',
  RESOLVED:   'This transaction is complete.',
  DISPUTED:   'This transaction is under review.',
};

export default function PayPage() {
  const { id } = useParams<{ id: string }>();
  const [tx,       setTx]      = useState<Transaction | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [contact,  setContact]  = useState('');
  const [hint,     setHint]     = useState('');
  const [paying,   setPaying]   = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    api.getTransaction(id)
      .then(setTx)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  function handleContact(val: string) {
    setContact(val);
    const isEmail = val.includes('@');
    const isPhone = /^[0+][0-9]{8,14}$/.test(val.replace(/\s/g, ''));
    if (!val) { setHint(''); return; }
    if (isEmail) setHint('Email detected — receipt will be sent here');
    else if (isPhone) setHint('Phone detected — confirmation via SMS');
    else setHint('Enter a valid email or phone number');
  }

  async function handlePay() {
    if (!contact) { toast.error('Please enter your email or phone number.'); return; }
    const isEmail = contact.includes('@');
    const isPhone = /^[0+][0-9]{8,14}$/.test(contact.replace(/\s/g, ''));
    if (!isEmail && !isPhone) {
      toast.error('Please enter a valid email or phone number.');
      return;
    }
    setPaying(true);
    try {
      const data = await api.initiatePayment(id, contact);
      window.location.href = data.paymentUrl;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Could not initiate payment.';
      toast.error(message);
      setPaying(false);
    }
  }

  // Loading
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

// Not found
if (notFound || !tx) {
  return (
    <PageTransition>
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">
            Link Not Found
          </h2>
          <p className="text-muted-foreground text-sm">
            This payment link is invalid or has expired.
          </p>
        </div>
      </div>
    </PageTransition>
  );
}

// Main render
  const alreadyPaid = tx.state !== 'CREATED';
  const maskedMomo  = tx.sellerMomo.slice(0, 3) + '****' + tx.sellerMomo.slice(-4);


  return (
    <PageTransition>
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-md mx-auto">

        <Card className="shadow-card border-border">
          <CardContent className="p-6 space-y-5">

            <div>
              <p className="text-xs text-muted-foreground uppercase
                tracking-wide mb-1">Item</p>
              <p className="font-bold text-lg text-foreground">
                {tx.itemName}
              </p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground uppercase
                tracking-wide mb-1">Amount</p>
              <p className="font-serif text-4xl font-bold text-brand-main">
                GHS {tx.amount.toLocaleString()}
              </p>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase
                  tracking-wide mb-1">Seller</p>
                <p className="font-medium text-foreground font-mono text-sm">
                  {maskedMomo}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase
                  tracking-wide mb-1">Delivery</p>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                  <p className="font-medium text-foreground text-sm">
                    {tx.deliveryHours === 168 ? '7 days' : `${tx.deliveryHours} hrs`}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-brand-light border border-brand-main/20
              rounded-xl p-4">
              <div className="flex gap-2">
                <Shield className="w-4 h-4 text-brand-main flex-shrink-0 mt-0.5" />
                <p className="text-sm text-brand-dark leading-relaxed">
                  <strong>Your money is protected.</strong> Verified holds
                  your payment securely. The seller only receives funds
                  after you confirm delivery. If something goes wrong,
                  we step in.
                </p>
              </div>
            </div>

            {alreadyPaid ? (
              <div className="bg-muted rounded-xl p-4 flex gap-2
                items-center">
                <CheckCircle className="w-4 h-4 text-brand-main
                  flex-shrink-0" />
                <p className="text-sm text-muted-foreground">
                  {STATE_MESSAGES[tx.state] || 'Already processed.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase
                    tracking-wide text-muted-foreground">
                    Your Email or WhatsApp Number
                  </Label>
                  <Input
                    placeholder="e.g. ama@gmail.com or 0241234567"
                    value={contact}
                    onChange={e => handleContact(e.target.value)}
                    className="h-12 text-base border-border
                      focus:border-brand-main"
                  />
                  {hint && (
                    <p className="text-xs text-muted-foreground">{hint}</p>
                  )}
                </div>

                <Button
                  onClick={handlePay}
                  disabled={paying}
                  className="w-full h-12 bg-brand-amber hover:bg-amber-500
                    text-white font-bold text-base border-0"
                >
                  {paying ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/40
                        border-t-white rounded-full animate-spin" />
                      Initialising payment...
                    </span>
                  ) : (
                    `Pay GHS ${tx.amount.toLocaleString()} Securely`
                  )}
                </Button>
              </div>
            )}

          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Transaction ID: {tx.id.split('-')[0]}... ·
          Protected by Verified Escrow
        </p>
      </div>
    </div>
    </PageTransition>
  );
}