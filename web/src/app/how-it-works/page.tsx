'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { PageTransition } from '@/components/ui/page-transition';
import { BackButton } from '@/components/ui/back-button';
import { Button } from '@/components/ui/button';
import {
  Link2, CreditCard, Package, CheckCircle,
  ShieldAlert, Clock, ArrowRight, ArrowDown,
  Shield, Smartphone
} from 'lucide-react';

const sellerSteps = [
  {
    icon: Link2,
    n: '01',
    title: 'Create a Secure Link',
    desc: 'Enter item name, price, and your MoMo number. Get a payment link in seconds.',
    color: 'bg-brand-main',
    detail: 'No account needed. No app to download. Just fill the form and share.',
  },
  {
    icon: Smartphone,
    n: '02',
    title: 'Share with Your Buyer',
    desc: 'Paste the link into WhatsApp, Instagram, or any chat. Your buyer opens it and pays.',
    color: 'bg-brand-main',
    detail: 'Works on any device. The buyer pays via MTN MoMo, Vodafone Cash, or AirtelTigo.',
  },
  {
    icon: Package,
    n: '03',
    title: 'Dispatch with Confidence',
    desc: 'You get an SMS when funds are secured in escrow. Dispatch knowing your money is protected.',
    color: 'bg-brand-main',
    detail: 'Funds are held by Verified — not released until the buyer confirms receipt.',
  },
  {
    icon: CheckCircle,
    n: '04',
    title: 'Get Paid Instantly',
    desc: 'Buyer confirms receipt. Funds hit your MoMo immediately.',
    color: 'bg-brand-amber',
    detail: 'If the buyer does not respond within your delivery window, funds auto-release to you.',
  },
];

const buyerSteps = [
  {
    icon: Link2,
    n: '01',
    title: 'Open the Payment Link',
    desc: 'The seller sends you a Verified link. Open it to see item details and the escrow guarantee.',
    color: 'bg-brand-main',
    detail: 'Every link is unique to one transaction. You can verify the item before paying.',
  },
  {
    icon: CreditCard,
    n: '02',
    title: 'Pay via MoMo',
    desc: 'Enter your phone or email and pay. Funds go to Verified escrow — not the seller yet.',
    color: 'bg-brand-main',
    detail: 'Secured via Paystack Ghana. Your money is protected from the moment you pay.',
  },
  {
    icon: Package,
    n: '03',
    title: 'Receive Your Item',
    desc: 'Seller dispatches. You get an SMS with a confirmation link when it is on the way.',
    color: 'bg-brand-main',
    detail: 'Inspect the item carefully before confirming. Take your time.',
  },
  {
    icon: CheckCircle,
    n: '04',
    title: 'Confirm and Close',
    desc: 'Happy? Confirm receipt. Funds go to the seller. Transaction done.',
    color: 'bg-brand-amber',
    detail: 'If something is wrong, raise a dispute instead. Funds freeze until we resolve it.',
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
    a: 'A flat 2% platform fee on successfully completed transactions only. No fee on refunds or disputes.',
  },
  {
    q: 'How long does it take to receive payment?',
    a: 'Funds are released to the seller MoMo instantly after the buyer confirms receipt.',
  },
  {
    q: 'What if the buyer does not respond?',
    a: 'If the buyer neither confirms nor raises a dispute within the delivery window, funds auto-release to the seller.',
  },
  {
    q: 'Is my money safe if something goes wrong?',
    a: 'Yes. Raising a dispute freezes funds immediately. The Verified team reviews evidence from both sides and decides within 48 hours.',
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.15,
    },
  },
};

const stepVariants = {
  hidden:  { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

const connectorVariants = {
  hidden:  { scaleY: 0, originY: 0 },
  visible: { scaleY: 1, transition: { duration: 0.3, ease: 'easeOut' } },
};

export default function HowItWorksPage() {
  const [role,     setRole]     = useState<'seller' | 'buyer'>('seller');
  const [expanded, setExpanded] = useState<number | null>(null);
  const steps = role === 'seller' ? sellerSteps : buyerSteps;

  return (
    <PageTransition>
      <div className="min-h-screen bg-background">

        {/* Header */}
        <section className="bg-brand-dark py-14 px-4">
          <div className="max-w-2xl mx-auto">
            <BackButton />
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

        {/* Role toggle */}
        <div className="sticky top-16 z-10 bg-background border-b border-border">
          <div className="max-w-2xl mx-auto px-4 flex">
            {(['seller', 'buyer'] as const).map(r => (
              <button
                key={r}
                onClick={() => { setRole(r); setExpanded(null); }}
                className={`flex-1 py-4 text-sm font-semibold capitalize
                  border-b-2 transition-colors relative
                  ${role === r
                    ? 'border-brand-main text-brand-main'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
              >
                I am a {r}
                {role === r && (
                  <motion.div
                    layoutId="tab-indicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-main"
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Process flow */}
        <section className="py-12 px-4">
          <div className="max-w-lg mx-auto">
            <motion.div
              key={role}
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="relative"
            >
              {steps.map((step, index) => (
                <motion.div key={step.n} variants={stepVariants}>

                  {/* Step card */}
                  <div
                    className={`relative flex gap-4 cursor-pointer
                      group`}
                    onClick={() => setExpanded(expanded === index ? null : index)}
                  >
                    {/* Left column — icon + connector */}
                    <div className="flex flex-col items-center flex-shrink-0">
                      <div className={`w-12 h-12 rounded-2xl flex items-center
                        justify-center text-white shadow-md z-10 relative
                        transition-transform group-hover:scale-105
                        ${step.color}`}>
                        <step.icon className="w-5 h-5" />
                      </div>

                      {/* Connector line */}
                      {index < steps.length - 1 && (
                        <motion.div
                          variants={connectorVariants}
                          className="w-0.5 flex-1 my-1 min-h-8"
                          style={{
                            background: index === steps.length - 2
                              ? 'linear-gradient(to bottom, #2E7D52, #E8A020)'
                              : 'linear-gradient(to bottom, #2E7D52, #2E7D52)'
                          }}
                        />
                      )}
                    </div>

                    {/* Right column — content */}
                    <div className={`flex-1 pb-8 ${index === steps.length - 1 ? 'pb-0' : ''}`}>
                      <div className={`rounded-2xl border p-5 transition-all
                        duration-200
                        ${expanded === index
                          ? step.color === 'bg-brand-amber'
                            ? 'border-brand-amber/40 bg-brand-amber-light shadow-card'
                            : 'border-brand-main/30 bg-brand-light shadow-card'
                          : 'border-border bg-card hover:border-brand-main/30 hover:shadow-card'
                        }`}>

                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <span className="text-xs font-bold text-muted-foreground
                              uppercase tracking-wider">
                              Step {step.n}
                            </span>
                            <h3 className="font-bold text-foreground mt-0.5 text-base">
                              {step.title}
                            </h3>
                            <p className="text-sm text-muted-foreground
                              leading-relaxed mt-1">
                              {step.desc}
                            </p>
                          </div>
                          <div className={`w-6 h-6 rounded-full border-2 flex
                            items-center justify-center flex-shrink-0 mt-0.5
                            transition-colors
                            ${expanded === index
                              ? 'border-brand-main bg-brand-main'
                              : 'border-border'
                            }`}>
                            {expanded === index && (
                              <CheckCircle className="w-3.5 h-3.5 text-white" />
                            )}
                          </div>
                        </div>

                        {/* Expanded detail */}
                        {expanded === index && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="mt-3 pt-3 border-t border-border"
                          >
                            <p className="text-sm text-brand-dark
                              leading-relaxed font-medium">
                              {step.detail}
                            </p>
                          </motion.div>
                        )}
                      </div>
                    </div>
                  </div>

                </motion.div>
              ))}
            </motion.div>

            {/* Tap hint */}
            <p className="text-center text-xs text-muted-foreground mt-6">
              Tap any step to learn more
            </p>
          </div>
        </section>

        {/* Tip box */}
        <section className="px-4 pb-10">
          <div className="max-w-lg mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-brand-light border border-brand-main/20
                rounded-2xl p-5 flex gap-3"
            >
              {role === 'seller' ? (
                <>
                  <Clock className="w-5 h-5 text-brand-main flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-brand-dark text-sm mb-1">
                      Auto-release protection
                    </p>
                    <p className="text-sm text-brand-dark/80 leading-relaxed">
                      If the buyer does not confirm or raise a dispute within
                      your delivery window, funds are automatically released
                      to your MoMo. You are always protected.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <ShieldAlert className="w-5 h-5 text-brand-main flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-brand-dark text-sm mb-1">
                      Your money is always safe
                    </p>
                    <p className="text-sm text-brand-dark/80 leading-relaxed">
                      Raise a dispute before confirming and your funds freeze
                      immediately. Our team reviews evidence and decides
                      fairly within 48 hours.
                    </p>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        </section>

        {/* Trust strip */}
        <section className="bg-brand-darkest py-8 px-4">
          <div className="max-w-lg mx-auto">
            <div className="grid grid-cols-3 gap-4">
              {[
                { icon: Shield,       label: 'Escrow Protected' },
                { icon: Smartphone,  label: 'MoMo Payments' },
                { icon: Clock,       label: '48hr Disputes' },
              ].map(item => (
                <div key={item.label} className="text-center">
                  <div className="w-10 h-10 bg-brand-dark rounded-xl
                    flex items-center justify-center mx-auto mb-2">
                    <item.icon className="w-5 h-5 text-brand-amber" />
                  </div>
                  <p className="text-xs text-green-400 font-medium">
                    {item.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-14 px-4 bg-muted">
          <div className="max-w-lg mx-auto">
            <h2 className="text-2xl font-serif font-bold text-foreground mb-8">
              Common Questions
            </h2>
            <div className="space-y-3">
              {faqs.map((faq, i) => (
                <motion.div
                  key={faq.q}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-card rounded-xl border border-border overflow-hidden"
                >
                  <button
                    onClick={() => setExpanded(expanded === i + 10 ? null : i + 10)}
                    className="w-full text-left px-5 py-4 flex items-center
                      justify-between gap-3"
                  >
                    <span className="font-semibold text-foreground text-sm">
                      {faq.q}
                    </span>
                    <ArrowDown className={`w-4 h-4 text-muted-foreground
                      flex-shrink-0 transition-transform duration-200
                      ${expanded === i + 10 ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {expanded === i + 10 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      transition={{ duration: 0.2 }}
                      className="px-5 pb-4 border-t border-border"
                    >
                      <p className="text-sm text-muted-foreground
                        leading-relaxed pt-3">
                        {faq.a}
                      </p>
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 px-4 text-center bg-brand-dark">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
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
          </motion.div>
        </section>

      </div>
    </PageTransition>
  );
}