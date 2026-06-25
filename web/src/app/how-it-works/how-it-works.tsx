'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Link2, CreditCard, Package, CheckCircle,
  ShieldAlert, Clock, ArrowRight
} from 'lucide-react';

const sellerSteps = [
  {
    icon: Link2,
    n: '01',
    title: 'Create Your Link',
    desc: 'Go to the Create page. Enter your item name, price, and MoMo number. Click Generate. You get a secure payment link instantly.',
  },
  {
    icon: CreditCard,
    n: '02',
    title: 'Share on WhatsApp',
    desc: 'Copy the link and paste it into your WhatsApp, Facebook, or Instagram chat with your buyer.',
  },
  {
    icon: Package,
    n: '03',
    title: 'Buyer Pays — You Dispatch',
    desc: 'Your buyer pays. You receive an SMS confirming the funds are secured. Dispatch the item safely.',
  },
  {
    icon: CheckCircle,
    n: '04',
    title: 'Buyer Confirms — You Get Paid',
    desc: 'Once the buyer confirms receipt, funds are released to your MoMo instantly.',
    accent: true,
  },
];

const buyerSteps = [
  {
    icon: Link2,
    n: '01',
    title: 'Open the Payment Link',
    desc: 'The seller sends you a Verified payment link. Open it to see the item details, price, and escrow guarantee.',
  },
  {
    icon: CreditCard,
    n: '02',
    title: 'Pay via MoMo',
    desc: 'Enter your email or WhatsApp number and tap Pay. You are redirected to a secure Paystack checkout.',
  },
  {
    icon: Package,
    n: '03',
    title: 'Receive Your Item',
    desc: 'When the seller dispatches, you get an SMS with a confirmation link. Check your item carefully.',
  },
  {
    icon: CheckCircle,
    n: '04',
    title: 'Confirm and Release',
    desc: 'Happy with your item? Confirm receipt. Funds are released to the seller. If there is a problem, raise a dispute.',
    accent: true,
  },
];

const faqs = [
  {
    q: 'Does Verified work on WhatsApp?',
    a: 'Yes. The payment link works in any chat app — WhatsApp, Telegram, Facebook Messenger, Instagram DM. No app download needed.',
  },
  {
    q: 'What MoMo networks are supported?',
    a: 'MTN Mobile Money, Vodafone Cash, and AirtelTigo Money. Card payments are also accepted.',
  },
  {
    q: 'How much does Verified charge?',
    a: 'A 2% platform fee on successfully completed transactions only. No fee for refunded or disputed transactions.',
  },
  {
    q: 'How long does it take to receive payment?',
    a: 'Funds are released to the seller\'s MoMo instantly after the buyer confirms receipt.',
  },
  {
    q: 'What if the buyer does not respond?',
    a: 'If the buyer neither confirms nor raises a dispute within the delivery window, funds auto-release to the seller.',
  },
  {
    q: 'Is my money safe if something goes wrong?',
    a: 'Yes. If you raise a dispute before confirming, your funds freeze immediately. The Verified team reviews evidence from both sides and decides within 48 hours.',
  },
];

export default function HowItWorksPage() {
  const [role, setRole] = useState<'seller' | 'buyer'>('seller');
  const steps = role === 'seller' ? sellerSteps : buyerSteps;

  return (
    <div className="min-h-screen bg-background">

      {/* Header */}
      <section className="bg-brand-dark py-16 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-xs text-green-400 uppercase tracking-widest
            font-medium mb-3">
            Platform Guide
          </p>
          <h1 className="text-4xl font-serif font-bold text-white mb-4">
            How Verified Works
          </h1>
          <p className="text-green-300 text-lg">
            Safe trading in four simple steps.
          </p>
        </div>
      </section>

      {/* Role tabs */}
      <div className="sticky top-16 z-10 bg-background border-b
        border-border px-4">
        <div className="max-w-2xl mx-auto flex">
          {(['seller', 'buyer'] as const).map(r => (
            <button
              key={r}
              onClick={() => setRole(r)}
              className={`flex-1 py-4 text-sm font-semibold capitalize
                border-b-2 transition-colors
                ${role === r
                  ? 'border-brand-main text-brand-main'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
            >
              I am a {r}
            </button>
          ))}
        </div>
      </div>

      {/* Steps */}
      <section className="py-12 px-4">
        <div className="max-w-2xl mx-auto space-y-4">
          {steps.map(step => (
            <Card key={step.n}
              className={`shadow-card border
                ${step.accent
                  ? 'border-brand-amber/30 bg-brand-amber-light'
                  : 'border-border'
                }`}>
              <CardContent className="flex gap-5 p-6">
                <div className={`w-12 h-12 rounded-xl flex items-center
                  justify-center flex-shrink-0
                  ${step.accent
                    ? 'bg-brand-amber text-white'
                    : 'bg-brand-main text-white'
                  }`}>
                  <step.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground
                    uppercase tracking-wide mb-1">
                    Step {step.n}
                  </p>
                  <h3 className="font-semibold text-foreground mb-1">
                    {step.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tip box */}
        <div className="max-w-2xl mx-auto mt-6">
          <div className="bg-brand-light border border-brand-main/20
            rounded-xl p-4 flex gap-3">
            {role === 'seller' ? (
              <>
                <Clock className="w-4 h-4 text-brand-main flex-shrink-0 mt-0.5" />
                <p className="text-sm text-brand-dark">
                  <strong>What if the buyer does not confirm?</strong>{' '}
                  If the buyer does not confirm or raise a dispute within
                  your delivery window, funds are auto-released to you.
                  You are always protected.
                </p>
              </>
            ) : (
              <>
                <ShieldAlert className="w-4 h-4 text-brand-main flex-shrink-0 mt-0.5" />
                <p className="text-sm text-brand-dark">
                  <strong>Is my money safe?</strong>{' '}
                  Yes. If you raise a dispute before confirming, your funds
                  freeze immediately. Our team reviews evidence and decides
                  fairly within 48 hours.
                </p>
              </>
            )}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-12 px-4 bg-muted">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-serif font-bold text-foreground mb-8">
            Common Questions
          </h2>
          <div className="space-y-4">
            {faqs.map(faq => (
              <div key={faq.q}
                className="bg-card rounded-xl p-5 border border-border">
                <p className="font-semibold text-foreground text-sm mb-2">
                  {faq.q}
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 text-center bg-brand-dark">
        <h2 className="text-2xl font-serif font-bold text-white mb-3">
          Ready to get started?
        </h2>
        <p className="text-green-300 mb-8 text-sm">
          Create your first secure payment link in under a minute.
        </p>
        <Button asChild
          className="bg-brand-amber hover:bg-amber-500 text-white
          border-0 px-10 h-12 font-semibold">
          <Link href="/create">
            Create a Link
            <ArrowRight className="ml-2 w-4 h-4" />
          </Link>
        </Button>
      </section>

    </div>
  );
}