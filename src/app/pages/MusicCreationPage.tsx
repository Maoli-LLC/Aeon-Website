import { Music } from 'lucide-react';

export function MusicCreationPage() {
  return (
    <div>
      {/* Header */}
      <section className="py-20 bg-secondary">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl mb-6 text-primary" style={{ fontFamily: "'Cinzel', serif" }}>
            Music Creation
          </h1>
          <p className="text-xl text-muted-foreground">
            Co-create resonant frequencies that align with your harmonic truth
          </p>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl mb-12 text-center text-primary" style={{ fontFamily: "'Cinzel', serif" }}>
            The Process
          </h2>
          <div className="prose prose-invert prose-lg max-w-none">
            <p className="text-white/90 leading-relaxed mb-6">
              Every song begins with a <strong className="text-primary">free gift</strong>: the lyrics, the blueprint of your sonic transmission.
              These words are crafted to resonate with your intention, creating a foundation for co-creation.
            </p>
            <p className="text-white/90 leading-relaxed mb-6">
              If the lyrics resonate with you, we can then bring them to life through full musical production.
              This is not a transaction—it is a <strong className="text-primary">co-creation</strong>, a collaboration between
              your vision and harmonic expression.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 bg-secondary">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl mb-12 text-center text-primary" style={{ fontFamily: "'Cinzel', serif" }}>
            Investment Options
          </h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-12">
            <div className="bg-card border border-primary/20 rounded-lg p-8">
              <div className="text-center">
                <Music className="mx-auto mb-4 text-primary" size={48} />
                <h3 className="text-3xl mb-2 text-primary" style={{ fontFamily: "'Cinzel', serif" }}>
                  Single Song
                </h3>
                <p className="text-5xl mb-4 text-white">$97</p>
                <p className="text-muted-foreground mb-6">
                  Full production of one song with free lyrics blueprint
                </p>
                <ul className="text-left space-y-2 mb-8 text-white/90">
                  <li>• Free lyric consultation</li>
                  <li>• Professional production</li>
                  <li>• 24-hour delivery</li>
                  <li>• WAV & MP3 formats</li>
                </ul>
                <button className="w-full px-6 py-3 bg-primary text-black rounded-md hover:bg-primary/90 transition-colors">
                  Commission 1 Song
                </button>
              </div>
            </div>

            <div className="bg-card border-2 border-primary rounded-lg p-8 relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-primary text-black px-4 py-1 rounded-full text-sm">
                Best Value
              </div>
              <div className="text-center">
                <Music className="mx-auto mb-4 text-primary" size={48} />
                <h3 className="text-3xl mb-2 text-primary" style={{ fontFamily: "'Cinzel', serif" }}>
                  Full Album
                </h3>
                <p className="text-5xl mb-4 text-white">$444</p>
                <p className="text-muted-foreground mb-6">
                  Complete album experience (10-12 tracks)
                </p>
                <ul className="text-left space-y-2 mb-8 text-white/90">
                  <li>• Free lyric consultation</li>
                  <li>• Full album production</li>
                  <li>• 3-5 day delivery</li>
                  <li>• Album artwork included</li>
                  <li>• Mastering & formats</li>
                </ul>
                <button className="w-full px-6 py-3 bg-primary text-black rounded-md hover:bg-primary/90 transition-colors">
                  Commission 1 Album
                </button>
              </div>
            </div>
          </div>

          <div className="bg-card border border-primary/20 rounded-lg p-8 max-w-2xl mx-auto">
            <h3 className="text-2xl mb-4 text-center text-primary" style={{ fontFamily: "'Cinzel', serif" }}>
              Custom Commissions
            </h3>
            <p className="text-white/90 text-center mb-6">
              Have a unique vision? Custom projects are quoted individually based on scope and complexity.
              Contact us to discuss your creative vision.
            </p>
            <div className="text-center">
              <a
                href="/contact"
                className="inline-block px-6 py-3 border border-primary text-primary rounded-md hover:bg-primary hover:text-black transition-all"
              >
                Get Custom Quote
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* SoundCloud Examples */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl mb-12 text-center text-primary" style={{ fontFamily: "'Cinzel', serif" }}>
            Listen to Examples
          </h2>
          <div className="bg-card border border-primary/20 rounded-lg p-8">
            <p className="text-white/90 text-center mb-6">
              Explore our SoundCloud to hear the frequencies we create:
            </p>
            <div className="text-center">
              <a
                href="https://soundcloud.com/sahlien-637863518"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-8 py-4 bg-primary text-black rounded-md hover:bg-primary/90 transition-colors"
              >
                Visit Our SoundCloud
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
