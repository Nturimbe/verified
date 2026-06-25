'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu, X, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

const navLinks = [
  { label: 'Create Link',      href: '/create',          who: 'seller' },
  { label: 'My Transactions',  href: '/my-transactions', who: 'seller' },
  { label: 'Track My Order',   href: '/my-order',        who: 'buyer'  },
  { label: 'How It Works',     href: '/how-it-works',    who: 'both'   },
  { label: 'Dispute Policy',   href: '/dispute-policy',  who: 'both'   },
];

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="bg-brand-darkest sticky top-0 z-50 border-b border-brand-dark">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">

        {/* Logo */}
       <Link href="/" className="flex items-center gap-2">
  {/* Logo image — saved as web/public/images/logo.png */}
  <Image
    src="/images/logo.png"
    alt="Verified"
    width={32}
    height={32}
    className="rounded-md"
    onError={(e) => {
      // Fallback to text if logo not yet saved
      e.currentTarget.style.display = 'none';
    }}
  />
  <span className="font-serif text-xl text-brand-amber font-bold">
    Verified
  </span>
</Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.filter(l => l.who !== 'buyer').map(link => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-green-200 hover:text-brand-amber transition-colors"
            >
              {link.label}
            </Link>
          ))}
          <Button asChild size="sm"
            className="bg-brand-amber hover:bg-amber-500 text-white border-0">
            <Link href="/create">Create Link</Link>
          </Button>
        </nav>

        {/* Mobile hamburger */}
        <button
          className="md:hidden text-green-200 p-2"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden bg-brand-dark border-t border-brand-darkest">
          <nav className="flex flex-col py-3">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="px-4 py-3 text-sm text-green-200
                  hover:bg-brand-darkest hover:text-brand-amber
                  transition-colors border-b border-brand-darkest/50"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}