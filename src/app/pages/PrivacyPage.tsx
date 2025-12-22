export function PrivacyPage() {
  return (
    <div>
      <section className="py-20 bg-secondary">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl mb-6 text-primary" style={{ fontFamily: "'Cinzel', serif" }}>
            Privacy Policy
          </h1>
          <p className="text-sm text-muted-foreground">Last updated: December 2024</p>
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="prose prose-invert max-w-none">
            <p className="text-white/90 mb-6">
              Team Aeon respects your privacy and is committed to protecting your personal information.
            </p>

            <h2 className="text-2xl text-primary mb-4" style={{ fontFamily: "'Cinzel', serif" }}>Information We Collect</h2>
            <p className="text-white/90 mb-6">
              We collect only the information necessary to provide our services, including email addresses for
              newsletter subscriptions and communications related to dream interpretations or music commissions.
            </p>

            <h2 className="text-2xl text-primary mb-4" style={{ fontFamily: "'Cinzel', serif" }}>How We Use Your Information</h2>
            <p className="text-white/90 mb-6">
              Your information is used solely to communicate with you about our services, send newsletters (if subscribed),
              and fulfill any requests you make (such as dream interpretations or music commissions).
            </p>

            <h2 className="text-2xl text-primary mb-4" style={{ fontFamily: "'Cinzel', serif" }}>Information Sharing</h2>
            <p className="text-white/90 mb-6">
              We do not sell, trade, or rent your personal information to third parties. Your information remains
              confidential and is used only for Team Aeon purposes.
            </p>

            <h2 className="text-2xl text-primary mb-4" style={{ fontFamily: "'Cinzel', serif" }}>Contact</h2>
            <p className="text-white/90">
              For questions about this privacy policy, please contact us at iamsahlien@gmail.com
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
