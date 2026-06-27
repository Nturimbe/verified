import Link from 'next/link';
import Image from 'next/image';
import { PageTransition } from '@/components/ui/page-transition';
import { Button } from '@/components/ui/button';
import {
  Shield, Zap, MessageCircle, Users,
  ArrowRight, TrendingUp, AlertTriangle
} from 'lucide-react';

export default function HomePage() {
  return (
    <PageTransition>
    <div>

      {/* ── Hero with video background ─────────────────────────────── */}
      <section className="relative min-h-[90vh] flex items-center
        justify-center overflow-hidden bg-brand-darkest">

        {/* Video background — save as web/public/images/hero-video.mp4 */}
        <video
          autoPlay muted loop playsInline
          poster="/images/hero-poster.jpg"
          className="absolute inset-0 w-full h-full object-cover opacity-20"
        >
          <source src="/images/hero-video.mp4" type="video/mp4" />
        </video>

        {/* Dark overlay */}
        <div className="absolute inset-0 bg-gradient-to-b
          from-brand-darkest/60 via-brand-darkest/40 to-brand-darkest/80" />

        {/* Content */}
        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 bg-brand-amber/15
            border border-brand-amber/30 rounded-full px-4 py-1.5 mb-8">
            <Shield className="w-3.5 h-3.5 text-brand-amber" />
            <span className="text-brand-amber text-xs font-semibold
              tracking-widest uppercase">
              Ghana's Escrow Platform
            </span>
          </div>

          <h1 className="text-5xl md:text-7xl font-serif font-bold
            text-white leading-tight mb-6">
            Trade online.<br />
            <span className="text-brand-amber">Fear nothing.</span>
          </h1>

          <p className="text-xl text-green-200 max-w-2xl mx-auto mb-10
            leading-relaxed">
            Verified holds your payment securely until you confirm your
            item arrived. No more scams. No more anxiety.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg"
              className="bg-brand-amber hover:bg-amber-500 text-white
              font-bold text-base px-10 h-14 border-0 shadow-lg">
              <Link href="/create">
                Create a Payment Link
                <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline"
              className="border-white/30 text-white hover:bg-white/10
              bg-transparent font-semibold text-base px-10 h-14">
              <Link href="/how-it-works">How It Works</Link>
            </Button>
          </div>

          {/* Trust badges */}
          <div className="flex items-center justify-center gap-6 mt-12
            flex-wrap">
            <div className="flex items-center gap-2 text-green-300 text-sm">
              <Shield className="w-4 h-4 text-brand-amber" />
              Secured by Paystack Ghana
            </div>
            <div className="w-px h-4 bg-green-700 hidden sm:block" />
            <div className="flex items-center gap-2 text-green-300 text-sm">
              <Zap className="w-4 h-4 text-brand-amber" />
              Instant MoMo release
            </div>
            <div className="w-px h-4 bg-green-700 hidden sm:block" />
            <div className="flex items-center gap-2 text-green-300 text-sm">
              <Users className="w-4 h-4 text-brand-amber" />
              Dispute protection
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ──────────────────────────────────────────────────── */}
      <section className="bg-brand-darkest border-t border-green-900">
        <div className="max-w-4xl mx-auto px-4 py-10">
          <p className="text-center text-xs text-green-600 uppercase
            tracking-widest mb-6 font-medium">
            Why Verified exists — Ghana online fraud 2025–2026
          </p>
          <div className="grid grid-cols-3 gap-px bg-green-900/40
            rounded-2xl overflow-hidden">
            {[
              { icon: AlertTriangle, num: '720',
                label: 'Fraud cases', sub: 'Q1 2026' },
              { icon: TrendingUp, num: '+113%',
                label: 'Rise in fraud', sub: 'year on year' },
              { icon: AlertTriangle, num: 'GH¢190M',
                label: 'Lost to scams', sub: 'in 9 months' },
            ].map(stat => (
              <div key={stat.num}
                className="bg-brand-dark py-8 px-4 text-center">
                <stat.icon className="w-5 h-5 text-brand-amber mx-auto mb-3" />
                <div className="text-3xl font-serif font-bold
                  text-brand-amber">{stat.num}</div>
                <div className="text-xs text-green-400 mt-1 leading-tight">
                  {stat.label}<br />
                  <span className="text-green-600">{stat.sub}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────────── */}
      <section className="py-20 px-4 bg-background">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-4xl font-serif font-bold text-center
            text-foreground mb-3">
            How Verified Works
          </h2>
          <p className="text-center text-muted-foreground mb-12 text-lg">
            Four steps. Zero risk.
          </p>
          <div className="space-y-4">
            {[
              {
                n: '01',
                title: 'Seller Creates a Link',
                desc: 'Enter item name, price, and MoMo number. Get a secure payment link in seconds. Share it anywhere.',
                accent: false,
              },
              {
                n: '02',
                title: 'Buyer Pays Securely',
                desc: 'Buyer pays via Mobile Money. Funds go to Verified — not the seller — and are held in escrow.',
                accent: false,
              },
              {
                n: '03',
                title: 'Seller Dispatches',
                desc: 'Seller receives an SMS confirming payment is secured. They dispatch knowing their money is protected.',
                accent: false,
              },
              {
                n: '04',
                title: 'Buyer Confirms — Seller Gets Paid',
                desc: 'Buyer confirms receipt. Funds released instantly to seller MoMo. Transaction complete.',
                accent: true,
              },
            ].map(step => (
              <div key={step.n}
                className={`flex gap-5 rounded-2xl p-6 border
                  transition-shadow hover:shadow-card
                  ${step.accent
                    ? 'bg-brand-light border-brand-amber/30'
                    : 'bg-card border-border'
                  }`}>
                <div className={`w-12 h-12 rounded-xl flex items-center
                  justify-center font-serif font-bold text-lg flex-shrink-0
                  ${step.accent
                    ? 'bg-brand-amber text-white'
                    : 'bg-brand-main text-white'
                  }`}>
                  {step.n}
                </div>
                <div className="pt-1">
                  <h3 className="font-semibold text-foreground text-base mb-1">
                    {step.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Button asChild size="lg"
              className="bg-brand-main hover:bg-brand-dark text-white
              border-0 px-10">
              <Link href="/how-it-works">
                Read the full guide
                <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── Why Verified ───────────────────────────────────────────── */}
      <section className="py-20 px-4 bg-brand-dark">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-4xl font-serif font-bold text-center
            text-white mb-3">
            Why Verified
          </h2>
          <p className="text-center text-green-400 mb-12 text-lg">
            Built for how Ghanaians actually trade.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              {
                icon: MessageCircle,
                title: 'Works on WhatsApp',
                desc: 'No app to download. No account to create. Just a link you paste into your existing chat.',
              },
              {
                icon: Shield,
                title: 'Funds Are Protected',
                desc: 'Money is held by Verified until you confirm delivery. Neither side can cheat the system.',
              },
              {
                icon: Zap,
                title: 'Instant MoMo Payment',
                desc: 'Pay with MTN MoMo, Vodafone Cash, or AirtelTigo Money. Funds released in seconds.',
              },
              {
                icon: Users,
                title: 'Dispute Protection',
                desc: 'Something went wrong? Raise a dispute. Funds freeze. Our team resolves it fairly within 48 hours.',
              },
            ].map(item => (
              <div key={item.title}
                className="bg-white/6 rounded-2xl p-6 border
                  border-white/10 hover:bg-white/10 transition-colors">
                <div className="w-10 h-10 bg-brand-amber/15 rounded-xl
                  flex items-center justify-center mb-4">
                  <item.icon className="w-5 h-5 text-brand-amber" />
                </div>
                <h3 className="font-semibold text-white mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-green-300 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Paystack trust badge ───────────────────────────────────── */}
      <section className="py-10 px-4 bg-brand-darkest border-t
        border-green-900">
        <div className="max-w-xl mx-auto text-center">
          <p className="text-xs text-green-600 uppercase tracking-widest
            mb-4 font-medium">
            Payments secured by
          </p>
          {/* Save Paystack logo as web/public/images/paystack-badge.png */}
          {/* Download from: paystack.com/assets or search "Paystack logo PNG" */}
          <div className="flex items-center justify-center gap-3">
            <Image
              src="/images/paystack-badge.png"
              alt="Secured by Paystack"
              width={140}
              height={40}
              className="opacity-70 hover:opacity-100 transition-opacity"
            />
          </div>
          <p className="text-xs text-green-700 mt-4">
            All payments processed through Paystack Ghana.
            Funds held in licensed escrow.
          </p>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────────── */}
      <section className="py-20 px-4 text-center bg-background">
        <h2 className="text-4xl font-serif font-bold text-foreground mb-3">
          Ready to trade safely?
        </h2>
        <p className="text-muted-foreground mb-10 text-lg max-w-md mx-auto">
          Join sellers across Accra already protecting their transactions
          with Verified.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild size="lg"
            className="bg-brand-main hover:bg-brand-dark text-white
            font-bold px-10 h-12 border-0">
            <Link href="/create">
              Create Your First Link
              <ArrowRight className="ml-2 w-4 h-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline"
            className="border-brand-main text-brand-main
            hover:bg-brand-light font-semibold px-10 h-12">
            <Link href="/my-order">Track My Order</Link>
          </Button>
        </div>
      </section>

    </div>
    </PageTransition>
  );
}