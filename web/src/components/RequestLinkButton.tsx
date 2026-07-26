'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { MessageCircle, X } from 'lucide-react';

export function RequestLinkButton() {
  const [open, setOpen] = useState(false);
  const [itemName, setItemName] = useState('');
  const [sellerContact, setSellerContact] = useState('');

  function buildMessage() {
    const item = itemName || 'the item we discussed';
    return `Hi! Could you create a secure payment link for ${item} using Verified? ` +
      `It protects both of us — funds are only released once I confirm I received the item. ` +
      `You can create a free link here: ${window.location.origin}/create`;
  }

  function handleSend() {
    const text = encodeURIComponent(buildMessage());
    if (sellerContact) {
      window.open(`https://wa.me/${sellerContact.replace(/\D/g, '')}?text=${text}`, '_blank');
    } else {
      window.open(`https://wa.me/?text=${text}`, '_blank');
    }
    setOpen(false);
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} variant="outline"
        className="border-brand-main text-brand-main hover:bg-brand-light">
        <MessageCircle className="w-4 h-4 mr-2" />
        Ask Seller to Use Verified
      </Button>

      {open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center
          justify-center" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm p-5 space-y-3"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="font-semibold">Request a Verified Link</p>
              <button onClick={() => setOpen(false)}><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-muted-foreground">
              Send your seller a message explaining Verified and asking them
              to create a secure payment link.
            </p>
            <Input placeholder="Item name (optional)" value={itemName}
              onChange={e => setItemName(e.target.value)} className="h-10 text-sm" />
            <Input placeholder="Seller's WhatsApp number (optional)" value={sellerContact}
              onChange={e => setSellerContact(e.target.value)} className="h-10 text-sm" />
            <Button onClick={handleSend}
              className="w-full h-10 bg-[#25D366] text-white border-0">
              Send via WhatsApp
            </Button>
          </div>
        </div>
      )}
    </>
  );
}