import { useState } from 'react';
import { Music } from 'lucide-react';

export function MusicCreationPage() {
  const [formData, setFormData] = useState({ name: '', email: '', description: '', mood: '', purpose: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    
    try {
      const res = await fetch('/api/music-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      if (res.ok) {
        setSubmitted(true);
        setFormData({ name: '', email: '', description: '', mood: '', purpose: '' });
      } else {
        setError('Failed to submit. Please try again.');
      }
    } catch {
      setError('Failed to submit. Please try again.');
    }
    setSubmitting(false);
  };

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
              <strong className="text-primary">Lyrics are always free.</strong> If the lyrics resonate with you and you wish to bring them to life 
              through full musical production, you can commission the song creation. This is not a transaction—it is a 
              <strong className="text-primary"> co-creation</strong>, a collaboration between your vision and harmonic expression.
            </p>
          </div>
        </div>
      </section>

      {/* Music Request Form */}
      <section className="py-20 bg-secondary">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl mb-6 text-center text-primary" style={{ fontFamily: "'Cinzel', serif" }}>
            Request a Commission
          </h2>
          <p className="text-xl text-muted-foreground mb-4 text-center">
            Share your vision and we'll begin the co-creation process.
          </p>
          <p className="text-white/80 mb-8 text-center">
            Start with free lyrics tailored to your vision. If you love them, you can commission the full song production.
          </p>
          
          {submitted ? (
            <div className="bg-card border border-primary/20 rounded-lg p-8 text-center">
              <h3 className="text-2xl text-primary mb-4" style={{ fontFamily: "'Cinzel', serif" }}>Thank You!</h3>
              <p className="text-white/90">Your request has been submitted. We will reach out within 24-48 hours with your free lyrics.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-card border border-primary/20 rounded-lg p-8 space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-primary mb-2">Your Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 bg-background border border-primary/20 rounded-md text-white focus:border-primary focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-primary mb-2">Your Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 bg-background border border-primary/20 rounded-md text-white focus:border-primary focus:outline-none"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-primary mb-2">Describe Your Vision</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3 bg-background border border-primary/20 rounded-md text-white focus:border-primary focus:outline-none h-32"
                  placeholder="What kind of song or album are you envisioning?"
                  required
                />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-primary mb-2">Mood/Feeling (Optional)</label>
                  <input
                    type="text"
                    value={formData.mood}
                    onChange={e => setFormData({ ...formData, mood: e.target.value })}
                    className="w-full px-4 py-3 bg-background border border-primary/20 rounded-md text-white focus:border-primary focus:outline-none"
                    placeholder="e.g., Uplifting, Meditative, Powerful"
                  />
                </div>
                <div>
                  <label className="block text-primary mb-2">Purpose (Optional)</label>
                  <input
                    type="text"
                    value={formData.purpose}
                    onChange={e => setFormData({ ...formData, purpose: e.target.value })}
                    className="w-full px-4 py-3 bg-background border border-primary/20 rounded-md text-white focus:border-primary focus:outline-none"
                    placeholder="e.g., Personal healing, Event, Gift"
                  />
                </div>
              </div>
              {error && <p className="text-red-400 text-center">{error}</p>}
              <button
                type="submit"
                disabled={submitting}
                className="w-full px-8 py-4 bg-primary text-black rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* Commission Options */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl mb-8 text-center text-primary" style={{ fontFamily: "'Cinzel', serif" }}>
            Commission Options
          </h2>
          <p className="text-white/80 mb-12 text-center max-w-2xl mx-auto">
            After receiving your free lyrics, choose from the options below to commission the full song creation.
          </p>
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
                <a 
                  href="https://buy.stripe.com/14AaEWayD2JGgoSfB87Vm0j"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full px-6 py-3 bg-primary text-black rounded-md hover:bg-primary/90 transition-colors text-center"
                >
                  Commission 1 Song
                </a>
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
                <a 
                  href="https://buy.stripe.com/aFa5kC2278408WqagO7Vm0l"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full px-6 py-3 bg-primary text-black rounded-md hover:bg-primary/90 transition-colors text-center"
                >
                  Commission 1 Album
                </a>
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
      <section className="py-20 bg-secondary">
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
