export default function DisputePolicyPage() {
  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <p className="text-xs text-muted-foreground uppercase tracking-widest
          mb-2">Legal</p>
        <h1 className="text-3xl font-serif font-bold text-foreground mb-2">
          Dispute Policy
        </h1>
        <p className="text-sm text-muted-foreground mb-10">
          Last updated: June 2026
        </p>

        <div className="space-y-8">
          <div>
            <h2 className="font-semibold text-foreground mb-3">
              How to Raise a Dispute
            </h2>
            <div className="space-y-2">
              <div className="bg-brand-light border-l-4 border-brand-main
                rounded-r-xl p-4">
                <p className="text-sm font-medium text-brand-dark mb-0.5">
                  Buyer
                </p>
                <p className="text-sm text-muted-foreground">
                  On your confirmation page, tap There is a problem
                  instead of confirming receipt.
                </p>
              </div>
              <div className="bg-brand-light border-l-4 border-brand-amber
                rounded-r-xl p-4">
                <p className="text-sm font-medium text-brand-dark mb-0.5">
                  Seller
                </p>
                <p className="text-sm text-muted-foreground">
                  On your dispatch page, tap Raise a Problem if the item
                  was returned or the buyer is unresponsive.
                </p>
              </div>
            </div>
          </div>

          {[
            {
              title: 'What Happens When a Dispute Is Raised',
              body: 'Funds are frozen immediately. Neither party can withdraw or release the funds. Both parties receive an SMS notification. The Verified team is alerted automatically.',
            },
            {
              title: 'Response Window',
              body: 'The party who did not raise the dispute has 48 hours to submit their response and evidence. If no response is received within 48 hours, the dispute defaults in favour of the party who raised it.',
            },
            {
              title: 'Evidence We Accept',
              body: 'Photos of the item received, waybills or dispatch confirmations, screenshots of the original product listing, and written descriptions of what was agreed.',
            },
            {
              title: 'Resolution Timeline',
              body: 'Verified aims to resolve all disputes within 48 hours of receiving both submissions. Complex cases may take up to 5 working days.',
            },
            {
              title: 'Decisions',
              body: 'All decisions are made by the Verified team and are final. Decisions are permanently logged with a reason and the name of the admin who decided. Transactions above GHS 500 require sign-off from two members of the Verified team.',
            },
            {
              title: 'Auto-Release',
              body: 'If a buyer does not confirm receipt and does not raise a dispute within the delivery window, funds are automatically released to the seller.',
            },
          ].map(s => (
            <div key={s.title}>
              <h2 className="font-semibold text-foreground mb-2">
                {s.title}
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {s.body}
              </p>
            </div>
          ))}

          <div>
            <h2 className="font-semibold text-foreground mb-3">Outcomes</h2>
            <div className="space-y-2">
              <div className="bg-green-50 border border-green-200
                rounded-xl p-4">
                <p className="text-sm font-medium text-brand-main mb-0.5">
                  Release to Seller
                </p>
                <p className="text-sm text-muted-foreground">
                  Funds are released to the seller's MoMo.
                </p>
              </div>
              <div className="bg-amber-50 border border-amber-200
                rounded-xl p-4">
                <p className="text-sm font-medium text-amber-700 mb-0.5">
                  Refund to Buyer
                </p>
                <p className="text-sm text-muted-foreground">
                  Funds are returned to the buyer. Note: Paystack's
                  processing fee (1.95%) is non-refundable and will be
                  deducted from the refund amount.
                </p>
              </div>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            Dispute queries: disputes@verified.gh
          </p>
        </div>
      </div>
    </div>
  );
}