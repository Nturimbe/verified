import { PageTransition } from "@/components/ui/page-transition";

export default function TermsPage() {
  const sections = [
    {
      title: '1. What Verified Does',
      body: 'Verified is a transaction escrow service. When a buyer pays through Verified, funds are held securely until the buyer confirms receipt of the item or service. Only then are funds released to the seller.',
    },
    {
      title: '2. Who Can Use Verified',
      body: 'Verified is available to any person in Ghana with a valid Mobile Money account. By using Verified you confirm you are at least 18 years old and that the transaction is for a lawful purpose.',
    },
    {
      title: '3. Fees',
      body: 'Verified charges a platform fee of 2% on each successfully completed transaction. This fee is deducted before funds are released to the seller. There are no fees for disputed transactions that result in a refund to the buyer.',
    },
    {
      title: '4. Escrow and Fund Holding',
      body: "When a buyer pays, funds are held in escrow by Verified through our licensed payment partner Paystack Ghana. Funds are released to the seller only after the buyer confirms receipt, or after the automatic release window has elapsed without a dispute.",
    },
    {
      title: '5. Disputes',
      body: 'Either party may raise a dispute before funds are released. Verified will review all disputes within 48 hours. Decisions are final and logged permanently.',
    },
    {
      title: '6. Prohibited Transactions',
      body: 'Verified may not be used for illegal goods or services, financial fraud, or any transaction that violates Ghanaian law.',
    },
    {
      title: '7. Limitation of Liability',
      body: 'Verified is a neutral intermediary. Our maximum liability in any dispute is the transaction amount held in escrow.',
    },
    {
      title: '8. Contact',
      body: 'For questions or complaints, contact us at support@verified.gh',
    },
  ];

  return (
    <PageTransition>
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <p className="text-xs text-muted-foreground uppercase tracking-widest
          mb-2">Legal</p>
        <h1 className="text-3xl font-serif font-bold text-foreground mb-2">
          Terms of Service
        </h1>
        <p className="text-sm text-muted-foreground mb-10">
          Last updated: June 2026
        </p>
        <div className="space-y-8">
          {sections.map(s => (
            <div key={s.title}>
              <h2 className="font-semibold text-foreground mb-2">{s.title}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {s.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
    </PageTransition>
  );
}