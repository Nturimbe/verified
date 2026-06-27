'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const navLinks = [
  { label: 'How It Works',    href: '/how-it-works' },
  { label: 'My Transactions', href: '/my-transactions' },
  { label: 'Track My Order',  href: '/my-order' },
];

export function Header() {
  const [open]    = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const pathname  = usePathname();

  return (
    <header className="bg-brand-darkest sticky top-0 z-50
      border-b border-brand-dark shadow-sm">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center
        justify-between">

        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/images/logo.png"
            alt="Verified"
            width={32}
            height={32}
            className="rounded-lg"
          />
          <span className="font-serif text-xl text-brand-amber font-bold
            tracking-tight">
            Verified
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-2 rounded-lg text-sm transition-colors
                ${pathname === link.href
                  ? 'text-brand-amber bg-white/8'
                  : 'text-green-300 hover:text-brand-amber hover:bg-white/5'
                }`}
            >
              {link.label}
            </Link>
          ))}
          <div className="w-px h-5 bg-green-800 mx-2" />
          <Button asChild size="sm"
            className="bg-brand-amber hover:bg-amber-500 text-white
            border-0 font-semibold h-9">
            <Link href="/create">Create Link</Link>
          </Button>
        </nav>

        {/* Mobile hamburger */}
        <button
          className="md:hidden text-green-200 p-2 rounded-lg
            hover:bg-white/10 transition-colors"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle menu"
        >
          {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {isOpen && (
        <div className="md:hidden bg-brand-dark border-t border-brand-darkest">
          <nav className="flex flex-col py-2 px-2">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className={`px-4 py-3 rounded-lg text-sm transition-colors
                  ${pathname === link.href
                    ? 'text-brand-amber bg-white/8'
                    : 'text-green-200 hover:text-brand-amber hover:bg-white/5'
                  }`}
              >
                {link.label}
              </Link>
            ))}
            <div className="px-4 py-2">
              <Button asChild
                className="w-full bg-brand-amber hover:bg-amber-500
                  text-white border-0 font-semibold">
                <Link href="/create" onClick={() => setIsOpen(false)}>
                  Create Link
                </Link>
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}