'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageTransition } from '@/components/ui/page-transition';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Link2, Copy, Share2, CheckCircle,
  Shield, Clock, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { BackButton } from '@/components/ui/back-button';

const NETWORKS: Record<string, string> = {
  '024': 'MTN MoMo', '054': 'MTN MoMo',
  '055': 'MTN MoMo', '059': 'MTN MoMo',
  '020': 'Vodafone Cash', '050': 'Vodafone Cash',
  '027': 'AirtelTigo', '057': 'AirtelTigo',
  '026': 'AirtelTigo', '056': 'AirtelTigo',
  '028': 'AirtelTigo', '023': 'AirtelTigo',
};

const MOMO_REGEX = /^0(24|54|55|59|20|50|27|57|26|56|28|23)\d{7}$/;

export default function CreatePage() {
  const [form, setForm] = useState({
    itemName:      '',
    amount:        '',
    sellerMomo:    '',
    deliveryHours: '48',
  });
  const [loading,   setLoading]   = useState(false);
  const [link,      setLink]      = useState('');
  const [momoHint,  setMomoHint]  = useState('');
  const [momoValid, setMomoValid] = useState<boolean | null>(null);
  const [copied, setCopied] = useState(false);

  const PAYSTACK_FEE = 0.019;
  const VERIFIED_FEE = 0.011;
  const TOTAL_FEE    = PAYSTACK_FEE + VERIFIED_FEE; // 3%

  const fee        = form.amount ? parseFloat((parseFloat(form.amount) * TOTAL_FEE).toFixed(2)) : 0;
  const sellerGets = form.amount ? parseFloat((parseFloat(form.amount) - fee).toFixed(2)) : 0;

  function handleMomo(val: string) {
    const raw = val.replace(/\D/g, '').slice(0, 10);
    setForm(f => ({ ...f, sellerMomo: raw }));
    if (raw.length >= 3) {
      const net = NETWORKS[raw.slice(0, 3)];
      if (raw.length === 10) {
        if (MOMO_REGEX.test(raw)) {
          setMomoHint(net + ' — valid');
          setMomoValid(true);
        } else {
          setMomoHint('Invalid Ghana MoMo number');
          setMomoValid(false);
        }
      } else {
        setMomoHint(net ? net + ' detected' : 'Unrecognised prefix');
        setMomoValid(null);
      }
    } else {
      setMomoHint('');
      setMomoValid(null);
    }
  }

  async function handleGenerate() {
    if (!form.itemName.trim()) {
      toast.error('Please enter what you are selling.');
      return;
    }
    if (!form.amount || parseFloat(form.amount) < 1) {
      toast.error('Please enter a valid price.');
      return;
    }
    if (!MOMO_REGEX.test(form.sellerMomo)) {
      toast.error('Please enter a valid 10-digit Ghana MoMo number.');
      return;
    }

    setLoading(true);
    try {
      const data = await api.createTransaction({
        itemName:      form.itemName.trim(),
        amount:        parseFloat(form.amount),
        sellerMomo:    form.sellerMomo,
        deliveryHours: parseInt(form.deliveryHours),
      });
      const fullLink = `${window.location.origin}/pay/${data.id}`;
      setLink(fullLink);
      toast.success('Payment link generated successfully.');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to generate link.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
  await navigator.clipboard.writeText(link);
  setCopied(true);
  toast.success('Link copied to clipboard.');
  setTimeout(() => setCopied(false), 3000);
}

  async function handleShare() {
  const text = `Pay securely for *${form.itemName}* (GHS ${parseFloat(form.amount).toLocaleString()}) via Verified escrow:\n${link}`;
  try {
    if (navigator.share) {
      await navigator.share({
        title: `Pay for ${form.itemName}`,
        text,
        url: link,
      });
    } else {
      await navigator.clipboard.writeText(link);
      toast.success('Link copied — paste it to share.');
    }
  } catch (err) {
    if (err instanceof Error && err.name !== 'AbortError') {
      window.open(
        'https://wa.me/?text=' + encodeURIComponent(text),
        '_blank'
      );
    }
  }
}

  return (
    <PageTransition>
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-5xl mx-auto">

        {/* Page header */}
        <div className="mb-8">
          <BackButton />
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
            Seller Portal
          </p>
          <h1 className="text-3xl font-serif font-bold text-foreground">
            Create a Secure Payment Link
          </h1>
        </div>

        <div className="grid lg:grid-cols-5 gap-6">

          {/* ── Form ── */}
          <div className="lg:col-span-3">
            <Card className="shadow-card border-border">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-semibold
                  text-foreground flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-brand-main" />
                  Transaction Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">

                {/* Item name */}
                <div className="space-y-1.5">
                  <Label htmlFor="itemName"
                    className="text-xs font-semibold uppercase
                    tracking-wide text-muted-foreground">
                    What are you selling?
                  </Label>
                  <Input
                    id="itemName"
                    placeholder="e.g. iPhone 15 Pro, Nike Sneakers"
                    maxLength={120}
                    value={form.itemName}
                    onChange={e => setForm(f => ({
                      ...f, itemName: e.target.value
                    }))}
                    className="h-12 text-base border-border
                      focus:border-brand-main focus:ring-brand-main"
                  />
                </div>

                {/* Price */}
                <div className="space-y-1.5">
                  <Label htmlFor="amount"
                    className="text-xs font-semibold uppercase
                    tracking-wide text-muted-foreground">
                    Price (GHS)
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2
                      text-xs font-bold text-brand-main bg-brand-light
                      px-2 py-1 rounded-md">
                      GHS
                    </span>
                    <Input
                      id="amount"
                      type="number"
                      min="1"
                      max="50000"
                      placeholder="0.00"
                      value={form.amount}
                      onChange={e => setForm(f => ({
                        ...f, amount: e.target.value
                      }))}
                      className="h-12 pl-16 text-base border-border
                        focus:border-brand-main"
                    />
                  </div>
                </div>

                {/* MoMo */}
                <div className="space-y-1.5">
                  <Label htmlFor="momo"
                    className="text-xs font-semibold uppercase
                    tracking-wide text-muted-foreground">
                    Your MoMo Number
                  </Label>
                  <Input
                    id="momo"
                    type="tel"
                    placeholder="e.g. 0551234567"
                    value={form.sellerMomo}
                    onChange={e => handleMomo(e.target.value)}
                    className={`h-12 text-base border-border
                      focus:border-brand-main
                      ${momoValid === true
                        ? 'border-green-500 focus:border-green-500'
                        : momoValid === false
                          ? 'border-red-400 focus:border-red-400'
                          : ''
                      }`}
                  />
                  {momoHint && (
                    <p className={`text-xs flex items-center gap-1
                      ${momoValid === true  ? 'text-green-600' :
                        momoValid === false ? 'text-red-500'   :
                        'text-muted-foreground'}`}>
                      {momoValid === true && (
                        <CheckCircle className="w-3 h-3" />
                      )}
                      {momoValid === false && (
                        <AlertCircle className="w-3 h-3" />
                      )}
                      {momoHint}
                    </p>
                  )}
                </div>

                {/* Delivery window */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase
                    tracking-wide text-muted-foreground">
                    Delivery Window
                  </Label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { val: '24', label: '24 hrs' },
                      { val: '48', label: '48 hrs' },
                      { val: '72', label: '72 hrs' },
                      { val: '168', label: '7 days' },
                    ].map(opt => (
                      <button
                        key={opt.val}
                        type="button"
                        onClick={() => setForm(f => ({
                          ...f, deliveryHours: opt.val
                        }))}
                        className={`h-10 rounded-lg text-sm font-medium
                          border transition-colors
                          ${form.deliveryHours === opt.val
                            ? 'bg-brand-main text-white border-brand-main'
                            : 'bg-background text-foreground border-border hover:border-brand-main'
                          }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={handleGenerate}
                  disabled={loading}
                  className="w-full h-12 bg-brand-main hover:bg-brand-dark
                    text-white font-semibold text-base border-0"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/40
                        border-t-white rounded-full animate-spin" />
                      Securing transaction...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Link2 className="w-4 h-4" />
                      Generate Payment Link
                    </span>
                  )}
                </Button>

                {/* Trust line */}
                <div className="flex items-start gap-2 text-xs
                  text-muted-foreground bg-muted rounded-lg p-3">
                  <Shield className="w-3.5 h-3.5 text-brand-main
                    flex-shrink-0 mt-0.5" />
                  <span>
                    Funds are held securely in escrow and released to you
                    only after the buyer confirms delivery.
                    Secured via Paystack Ghana.
                  </span>
                </div>

                {/* Generated link */}
{link && (
  <div className="border border-brand-amber/40
    bg-brand-amber-light rounded-xl p-4 space-y-3">
    <p className="text-xs font-semibold uppercase
      tracking-wide text-muted-foreground">
      Your secure payment link
    </p>
    <div className="bg-white rounded-lg px-3 py-2.5
      text-sm text-brand-dark font-mono break-all
      border border-border">
      {link}
    </div>
    <div className="flex gap-2">
      <Button
        onClick={handleCopy}
        variant="outline"
        className="flex-1 h-11 text-sm rounded-xl border-brand-main
          text-brand-main hover:bg-brand-amber hover:text-white
          hover:border-brand-amber transition-all duration-200"
      >
        <Copy className="w-3.5 h-3.5 mr-1.5" />
        Copy Link
      </Button>
    </div>
    <div className="grid grid-cols-2 gap-2">
      <a
        href={`https://wa.me/?text=${encodeURIComponent(
          `Pay securely for *${form.itemName}* (GHS ${parseFloat(form.amount || '0').toLocaleString()}) via Verified escrow:\n${link}`
        )}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 h-10
          rounded-xl bg-[#25D366] hover:bg-[#1fbe5a] text-white
          text-sm font-medium transition-colors"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
          <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.532 5.86L.072 23.927l6.256-1.439A11.942 11.942 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.003-1.371l-.36-.214-3.713.854.88-3.614-.234-.372A9.818 9.818 0 1112 21.818z"/>
        </svg>
        WhatsApp
      </a>

      <a
        href={`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(
          `Pay securely for ${form.itemName} (GHS ${parseFloat(form.amount || '0').toLocaleString()}) via Verified escrow`
        )}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 h-10
          rounded-xl bg-[#2AABEE] hover:bg-[#1a9bd5] text-white
          text-sm font-medium transition-colors"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.247l-1.97 9.289c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L6.12 14.26l-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.696.325z"/>
        </svg>
        Telegram
      </a>
    </div>
    <p className="copy-confirm text-center text-xs text-brand-main"
      style={{display: copied ? 'block' : 'none'}}>
      ✓ Copied to clipboard
    </p>
  </div>
)}

              </CardContent>
            </Card>
          </div>

          {/* ── Live summary ── */}
          <div className="lg:col-span-2">
            <Card className="shadow-card border-border sticky top-24">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-semibold
                  text-foreground">
                  Transaction Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!form.itemName && !form.amount ? (
                  <div className="text-center py-10 text-muted-foreground">
                    <Link2 className="w-8 h-8 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">
                      Fill in the form to see your transaction summary.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {form.itemName && (
                      <div>
                        <p className="text-xs text-muted-foreground
                          uppercase tracking-wide mb-1">Item</p>
                        <p className="font-semibold text-foreground">
                          {form.itemName || '—'}
                        </p>
                      </div>
                    )}

                    {form.sellerMomo && (
                      <div>
                        <p className="text-xs text-muted-foreground
                          uppercase tracking-wide mb-1">Seller</p>
                        <p className="font-medium text-foreground
                          font-mono text-sm">
                          {form.sellerMomo.slice(0, 3)}****
                          {form.sellerMomo.slice(-4)}
                        </p>
                      </div>
                    )}

                    {form.deliveryHours && (
                      <div className="flex items-center gap-2
                        text-muted-foreground text-sm">
                        <Clock className="w-3.5 h-3.5" />
                        Delivery within {
                          form.deliveryHours === '168'
                            ? '7 days'
                            : form.deliveryHours + ' hours'
                        }
                      </div>
                    )}

                    {form.amount && parseFloat(form.amount) > 0 && (
                      <>
                        <Separator />
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">
                              Buyer pays
                            </span>
                            <span className="font-medium">
                              GHS {parseFloat(form.amount).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">
                             Platform fee (3% incl. Paystack)
                            </span>
                            <span className="text-muted-foreground">
                              − GHS {fee.toLocaleString()}
                            </span>
                          </div>
                          <Separator />
                          <div className="flex justify-between">
                            <span className="font-semibold text-foreground">
                              You receive
                            </span>
                            <span className="font-bold text-xl
                              text-brand-main font-serif">
                              GHS {sellerGets.toLocaleString()}
                            </span>
                          </div>
                        </div>
                        <div className="bg-brand-light rounded-lg p-3
                          text-xs text-brand-dark">
                          Funds auto-release after{' '}
                          {form.deliveryHours === '168'
                            ? '7 days'
                            : form.deliveryHours + ' hours'
                          }{' '}
                          if buyer does not confirm or dispute.
                        </div>
                      </>
                    )}
                  </div>
                )}

                <Separator className="my-4" />
                <div className="flex items-center gap-2 text-xs
                  text-muted-foreground">
                  <Shield className="w-3.5 h-3.5 text-brand-main" />
                  Payments secured via Paystack Ghana
                </div>
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </div>
  </PageTransition>
  );
}