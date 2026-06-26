export default function PrivacyPage() {
  const sections = [
    {
      title: '1. What We Collect',
      body: 'When you use Verified we collect: your name, phone number, email address, Mobile Money number (partially masked in all displays), transaction details including item name and amount, and device information for security purposes.',
    },
    {
      title: '2. How We Use Your Data',
      body: 'Your data is used solely to process transactions, send SMS notifications, resolve disputes, and comply with Ghanaian financial regulations. We do not sell your data to third parties.',
    },
    {
      title: '3. Data Storage',
      body: 'Transaction data is stored securely on encrypted cloud infrastructure. Mobile Money numbers are masked in all user-facing displays. We retain transaction records for a minimum of 7 years as required by Ghanaian financial law.',
    },
    {
      title: '4. SMS Notifications',
      body: 'By providing your phone number you consent to receive SMS notifications about your transaction status.',
    },
    {
      title: '5. Third Parties',
      body: "We share minimal data with Paystack Ghana for payment processing, and Africa's Talking for SMS delivery. Both are bound by their own privacy policies and Ghanaian data protection requirements.",
    },
    {
      title: '6. Your Rights',
      body: 'Under the Ghana Data Protection Act 2012, you have the right to access, correct, or request deletion of your personal data. Contact us at privacy@verified.gh',
    },
  ];

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <p className="text-xs text-muted-foreground uppercase tracking-widest
          mb-2">Legal</p>
        <h1 className="text-3xl font-serif font-bold text-foreground mb-2">
          Privacy Policy
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
  );
}