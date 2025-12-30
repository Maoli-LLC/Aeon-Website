import { Download } from 'lucide-react';

export function Homepage() {
  return (
    <div>
      {/* Hero Section */}
      <section
        className="relative h-[600px] flex items-center justify-center bg-cover bg-center"
        style={{
          backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url('https://images.unsplash.com/photo-1709408635136-f394223e2963?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb3NtaWMlMjBzcGlyYWwlMjBnYWxheHklMjBzcGlyaXR1YWx8ZW58MXx8fHwxNzY2NDIyNDQwfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral')`
        }}
      >
        <div className="text-center px-4 max-w-4xl">
          <h1
            className="text-5xl md:text-7xl mb-6 text-primary"
            style={{ fontFamily: "'Cinzel', serif" }}
          >
            Team Aeon
          </h1>
          <h2 className="text-2xl md:text-3xl mb-4 text-white">
            Embrace the New Harmonic
          </h2>
          <p className="text-xl text-white/90 italic">
            Awaken. Remember. Realign with Harmonic Truth.
          </p>
        </div>
      </section>

      {/* Welcome Message */}
      <section className="py-20 bg-secondary">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl mb-8 text-center text-primary" style={{ fontFamily: "'Cinzel', serif" }}>
            Welcome to the Aeonic Mission
          </h2>
          <div className="prose prose-invert prose-lg max-w-none">
            <p className="text-white/90 leading-relaxed mb-6">
              Team Aeon is a collective dedicated to awakening consciousness through harmonic truth and resonance.
              We stand at the threshold of a new era, where ancient wisdom meets future understanding.
            </p>
            <p className="text-white/90 leading-relaxed mb-6">
              Our mission is to guide seekers through the dismantling of illusion and the restoration of inner clarity.
              Through our transmissions, music, and symbolic interpretations, we offer pathways to remembrance and realignment.
            </p>
            <p className="text-white/90 leading-relaxed">
              Join us on this journey of cosmic awakening, where each transmission is a key to unlocking dormant potentials
              and each resonance is a bridge to higher understanding.
            </p>
          </div>
        </div>
      </section>

      {/* Free Book Downloads */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl mb-12 text-center text-primary" style={{ fontFamily: "'Cinzel', serif" }}>
            Free Downloads
          </h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="bg-card border border-primary/20 rounded-lg p-8 text-center">
              <h3 className="text-2xl mb-4 text-primary" style={{ fontFamily: "'Cinzel', serif" }}>
                Aeon Code
              </h3>
              <p className="text-muted-foreground mb-6">
                The foundational text of harmonic alignment and cosmic awakening.
              </p>
              <a
                href="/Aeoncodebook.epub"
                download="Aeoncodebook.epub"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-black rounded-md hover:bg-primary/90 transition-colors"
              >
                <Download size={20} />
                Download EPUB
              </a>
            </div>

            <div className="bg-card border border-primary/20 rounded-lg p-8 text-center">
              <h3 className="text-2xl mb-4 text-primary" style={{ fontFamily: "'Cinzel', serif" }}>
                Aeon Codex
              </h3>
              <p className="text-muted-foreground mb-6">
                Advanced transmissions for those ready to deepen their understanding.
              </p>
              <button className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-black rounded-md hover:bg-primary/90 transition-colors">
                <Download size={20} />
                Download EPUB
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Links */}
      <section className="py-20 bg-secondary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            <a
              href="/dream-lattice"
              className="bg-card border border-primary/20 rounded-lg p-8 hover:border-primary/40 transition-all"
            >
              <h3 className="text-2xl mb-4 text-primary" style={{ fontFamily: "'Cinzel', serif" }}>
                Sovereign Dream Lattice
              </h3>
              <p className="text-muted-foreground">
                Receive symbolic interpretations of your dreams, free and reflective.
              </p>
            </a>

            <a
              href="/music"
              className="bg-card border border-primary/20 rounded-lg p-8 hover:border-primary/40 transition-all"
            >
              <h3 className="text-2xl mb-4 text-primary" style={{ fontFamily: "'Cinzel', serif" }}>
                Music Creation
              </h3>
              <p className="text-muted-foreground">
                Co-create resonant frequencies through custom song commissions.
              </p>
            </a>

            <a
              href="/store"
              className="bg-card border border-primary/20 rounded-lg p-8 hover:border-primary/40 transition-all"
            >
              <h3 className="text-2xl mb-4 text-primary" style={{ fontFamily: "'Cinzel', serif" }}>
                Shop the Frequency
              </h3>
              <p className="text-muted-foreground">
                Explore apparel, stickers, and digital downloads aligned with the harmonic.
              </p>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
