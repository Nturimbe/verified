'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageTransition } from '@/components/ui/page-transition';
import { BackButton } from '@/components/ui/back-button';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, Phone, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRequestOtp() {
    if (!phone || phone.length < 10) {
      toast.error('Please enter a valid 10-digit phone number.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send code');
      toast.success('Code sent! Check your SMS.');
      setStep('otp');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to send code.');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp() {
    if (!code || code.length !== 6) {
      toast.error('Please enter the 6-digit code.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ phone, code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Incorrect code');
      toast.success('Logged in successfully.');
      router.push('/my-transactions');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Incorrect code.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-background py-10 px-4">
        <div className="max-w-sm mx-auto">
          <BackButton />

          <div className="mb-8 text-center">
            <div className="w-14 h-14 bg-brand-light rounded-full flex items-center
              justify-center mx-auto mb-4">
              <Shield className="w-7 h-7 text-brand-main" />
            </div>
            <h1 className="text-2xl font-serif font-bold text-foreground">
              {step === 'phone' ? 'Log In to Verified' : 'Enter Your Code'}
            </h1>
            <p className="text-sm text-muted-foreground mt-2">
              {step === 'phone'
                ? 'We\'ll send a code to verify it\'s you.'
                : `Code sent to ${phone}`}
            </p>
          </div>

          <Card className="shadow-card border-border">
            <CardContent className="p-6 space-y-4">
              {step === 'phone' ? (
                <>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2
                      w-4 h-4 text-muted-foreground" />
                    <Input
                      type="tel"
                      placeholder="e.g. 0551234567"
                      maxLength={10}
                      value={phone}
                      onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                      onKeyDown={e => e.key === 'Enter' && handleRequestOtp()}
                      className="h-12 pl-10 text-base border-border
                        focus:border-brand-main"
                    />
                  </div>
                  <Button
                    onClick={handleRequestOtp}
                    disabled={loading}
                    className="w-full h-12 bg-brand-main hover:bg-brand-dark
                      text-white font-semibold border-0"
                  >
                    {loading ? (
                      <span className="w-4 h-4 border-2 border-white/40
                        border-t-white rounded-full animate-spin" />
                    ) : (
                      <span className="flex items-center gap-2">
                        Send Code
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    )}
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
                    className="h-12 text-center text-2xl tracking-widest
                      border-border focus:border-brand-main"
                  />
                  <Button
                    onClick={handleVerifyOtp}
                    disabled={loading}
                    className="w-full h-12 bg-brand-main hover:bg-brand-dark
                      text-white font-semibold border-0"
                  >
                    {loading ? (
                      <span className="w-4 h-4 border-2 border-white/40
                        border-t-white rounded-full animate-spin" />
                    ) : (
                      'Verify & Log In'
                    )}
                  </Button>
                  <button
                    onClick={() => setStep('phone')}
                    className="w-full text-center text-sm text-muted-foreground
                      hover:text-brand-main"
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