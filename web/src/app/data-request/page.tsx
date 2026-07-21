'use client';

import { useState } from 'react';
import { PageTransition } from '@/components/ui/page-transition';
import { BackButton } from '@/components/ui/back-button';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

export default function DataRequestPage() {
  const [phone, setPhone]   = useState('');
  const [type, setType]     = useState<'access' | 'delete'>('access');
  const [details, setDetails] = useState('');
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit() {
    if (!phone) { toast.error('Enter your phone number.'); return; }
    // Simple mailto fallback — sends via your existing email service
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/data-requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, type, details })
    });
    if (res.ok) {
      setSubmitted(true);
      toast.success('Request submitted. We will respond within 14 days.');
    } else {
      toast.error('Failed to submit. Please try again.');
    }
  }

  if (submitted) {
    return (
      <PageTransition>
        <div className="min-h-screen flex items-center justify-center px-4">
          <p className="text-center text-muted-foreground">
            Your request has been received. Our team will respond within 14 days
            to the phone number provided.
          </p>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-background py-10 px-4">
        <div className="max-w-md mx-auto">
          <BackButton />
          <h1 className="text-2xl font-serif font-bold mb-2">Data Request</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Request access to or deletion of your personal data, per the
            Ghana Data Protection Act.
          </p>
          <Card><CardContent className="p-6 space-y-4">
            <Input placeholder="Your phone number" value={phone}
              onChange={e => setPhone(e.target.value)} className="h-11" />
            <div className="flex gap-2">
              {(['access', 'delete'] as const).map(t => (
                <button key={t} onClick={() => setType(t)}
                  className={`flex-1 py-2 rounded-lg text-sm border
                    ${type === t ? 'bg-brand-main text-white border-brand-main'
                      : 'border-border'}`}>
                  {t === 'access' ? 'Access My Data' : 'Delete My Data'}
                </button>
              ))}
            </div>
            <Textarea placeholder="Additional details (optional)"
              value={details} onChange={e => setDetails(e.target.value)}
              className="h-24 text-sm" />
            <Button onClick={handleSubmit}
              className="w-full h-11 bg-brand-main text-white border-0">
              Submit Request
            </Button>
          </CardContent></Card>
        </div>
      </div>
    </PageTransition>
  );
}