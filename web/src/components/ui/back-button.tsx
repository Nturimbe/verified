'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

interface BackButtonProps {
  label?: string;
  href?: string;
}

export function BackButton({ label = 'Back', href }: BackButtonProps) {
  const router = useRouter();

  function handleBack() {
    if (href) {
      router.push(href);
    } else {
      router.back();
    }
  }

  return (
    <button
      onClick={handleBack}
      className="flex items-center gap-1.5 text-sm text-muted-foreground
        hover:text-foreground transition-colors mb-6 group"
    >
      <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
      {label}
    </button>
  );
}