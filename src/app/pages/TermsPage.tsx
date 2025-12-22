export function TermsPage() {
  return (
    <div>
      <section className="py-20 bg-secondary">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl mb-6 text-primary" style={{ fontFamily: "'Cinzel', serif" }}>
            Terms of Use
          </h1>
          <p className="text-sm text-muted-foreground">Last updated: December 2024</p>
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="prose prose-invert max-w-none">
            <h2 className="text-2xl text-primary mb-4" style={{ fontFamily: "'Cinzel', serif" }}>Acceptance of Terms</h2>
            <p className="text-white/90 mb-6">
              By accessing and using Team Aeon's website and services, you accept and agree to be bound by these Terms of Use.
            </p>

            <h2 className="text-2xl text-primary mb-4" style={{ fontFamily: "'Cinzel', serif" }}>Services Provided</h2>
            <p className="text-white/90 mb-6">
              Team Aeon offers dream interpretations, music creation services, merchandise, and educational content.
              Dream interpretations are provided as reflective guidance and are not predictive or definitive.
            </p>

            <h2 className="text-2xl text-primary mb-4" style={{ fontFamily: "'Cinzel', serif" }}>Intellectual Property</h2>
            <p className="text-white/90 mb-6">
              All content on this website, including text, graphics, logos, music, and images, is the property of
              Team Aeon and is protected by copyright laws. Unauthorized use is prohibited.
            </p>

            <h2 className="text-2xl text-primary mb-4" style={{ fontFamily: "'Cinzel', serif" }}>Disclaimer</h2>
            <p className="text-white/90 mb-6">
              Dream interpretations and spiritual guidance are offered for reflective purposes only. Team Aeon does
              not claim to provide medical, psychological, or therapeutic services. Always consult qualified professionals
              for such needs.
            </p>

            <h2 className="text-2xl text-primary mb-4" style={{ fontFamily: "'Cinzel', serif" }}>Limitation of Liability</h2>
            <p className="text-white/90 mb-6">
              Team Aeon is not liable for any decisions made based on interpretations or content provided through
              our services. Use of our services is at your own discretion and risk.
            </p>

            <h2 className="text-2xl text-primary mb-4" style={{ fontFamily: "'Cinzel', serif" }}>Changes to Terms</h2>
            <p className="text-white/90 mb-6">
              We reserve the right to modify these terms at any time. Continued use of our services constitutes
              acceptance of any changes.
            </p>

            <h2 className="text-2xl text-primary mb-4" style={{ fontFamily: "'Cinzel', serif" }}>Contact</h2>
            <p className="text-white/90">
              For questions about these terms, please contact us at iamsahlien@gmail.com
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
