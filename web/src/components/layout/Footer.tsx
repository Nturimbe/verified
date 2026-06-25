import Link from 'next/link';
import { CheckCircle } from 'lucide-react';

const links = [
  { label: 'Terms',          href: '/terms' },
  { label: 'Privacy',        href: '/privacy' },
  { label: 'Dispute Policy', href: '/dispute-policy' },
  { label: 'How It Works',   href: '/how-it-works' },
];

export function Footer() {
  return (
    <footer className="bg-brand-darkest border-t border-brand-dark mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-center
          justify-between gap-4">

          <div className="flex items-center gap-2">
            <CheckCircle className="text-brand-amber w-5 h-5" />
            <span className="font-serif text-brand-amber font-bold">Verified</span>
          </div>

          <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            {links.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className="text-xs text-green-400 hover:text-brand-amber transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <p className="text-xs text-green-600">
            © {new Date().getFullYear()} Verified Group
          </p>
        </div>

        <p className="text-center text-xs text-green-700 mt-4">
          Payments secured via Paystack Ghana · SSL encrypted
        </p>
      </div>
    </footer>
  );
}