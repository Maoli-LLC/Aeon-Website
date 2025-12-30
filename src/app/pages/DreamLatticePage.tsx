import { useState } from 'react';
import { Moon, Sparkles } from 'lucide-react';

export function DreamLatticePage() {
  const [formData, setFormData] = useState({ name: '', email: '', dreamDescription: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    
    try {
      const res = await fetch('/api/dream-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      if (res.ok) {
        setSubmitted(true);
        setFormData({ name: '', email: '', dreamDescription: '' });
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
            Sovereign Dream Lattice
          </h1>
          <p className="text-xl text-muted-foreground">
            Free symbolic dream interpretations within 24 hours
          </p>
        </div>
      </section>

      {/* About the Service */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="prose prose-invert prose-lg max-w-none">
            <p className="text-white/90 leading-relaxed mb-6">
              Dreams are the language of the soul, a symbolic tapestry woven from the threads of consciousness.
              The Sovereign Dream Lattice offers <strong className="text-primary">free interpretations</strong> that are
              reflective, not predictive—guiding you to understand the deeper meanings within your dreamscape.
            </p>
            <p className="text-white/90 leading-relaxed mb-6">
              Each interpretation is crafted with care, honoring the sovereignty of your inner world. We do not claim
              to know your truth, but rather to illuminate the symbols that may help you discover it for yourself.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-secondary">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl mb-12 text-center text-primary" style={{ fontFamily: "'Cinzel', serif" }}>
            How It Works
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-card border border-primary/20 rounded-lg p-8 text-center">
              <Moon className="mx-auto mb-4 text-primary" size={48} />
              <h3 className="text-2xl mb-4 text-primary" style={{ fontFamily: "'Cinzel', serif" }}>
                1. Share Your Dream
              </h3>
              <p className="text-muted-foreground">
                Send us your dream through email with as much detail as you remember.
              </p>
            </div>

            <div className="bg-card border border-primary/20 rounded-lg p-8 text-center">
              <Sparkles className="mx-auto mb-4 text-primary" size={48} />
              <h3 className="text-2xl mb-4 text-primary" style={{ fontFamily: "'Cinzel', serif" }}>
                2. Symbolic Analysis
              </h3>
              <p className="text-muted-foreground">
                We explore the symbolic meanings and patterns within your dream.
              </p>
            </div>

            <div className="bg-card border border-primary/20 rounded-lg p-8 text-center">
              <Moon className="mx-auto mb-4 text-primary" size={48} />
              <h3 className="text-2xl mb-4 text-primary" style={{ fontFamily: "'Cinzel', serif" }}>
                3. Receive Insights
              </h3>
              <p className="text-muted-foreground">
                Get your reflective interpretation within 24 hours, free of charge.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Important Note */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-card border border-primary/20 rounded-lg p-8">
            <h3 className="text-2xl mb-4 text-primary text-center" style={{ fontFamily: "'Cinzel', serif" }}>
              Important to Know
            </h3>
            <ul className="space-y-4 text-white/90">
              <li className="flex items-start gap-3">
                <span className="text-primary mt-1">•</span>
                <span>
                  <strong className="text-primary">Interpretations are reflective, not predictive.</strong> We do not
                  claim to foretell the future or make definitive claims about your life.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary mt-1">•</span>
                <span>
                  <strong className="text-primary">24-hour turnaround.</strong> Most interpretations are delivered
                  within one day of receiving your dream.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary mt-1">•</span>
                <span>
                  <strong className="text-primary">Completely free.</strong> This service is offered as a gift to
                  support your journey of self-discovery.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Amplifier Support */}
      <section className="py-20 bg-secondary">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl mb-8 text-primary" style={{ fontFamily: "'Cinzel', serif" }}>
            Optional Amplifier Support
          </h2>
          <p className="text-white/90 mb-8 leading-relaxed">
            If you find value in the interpretation and wish to support the work, you may offer
            <strong className="text-primary"> $133 as an Amplifier</strong>. This is entirely voluntary and does not
            change the nature of the service—it is simply a way to honor the exchange of energy if you feel called to do so.
          </p>
          <div className="bg-card border border-primary/20 rounded-lg p-8 max-w-md mx-auto">
            <p className="text-muted-foreground mb-6">
              Amplifier support is not payment—it is voluntary energy exchange for those who resonate with the work.
            </p>
            <a
              href="https://buy.stripe.com/dRm14mdKP3NK6Oi74C7Vm0i"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-8 py-4 border border-primary text-primary rounded-md hover:bg-primary hover:text-black transition-all"
            >
              Support as Amplifier ($133)
            </a>
          </div>
        </div>
      </section>

      {/* Dream Blog Link */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl mb-8 text-primary" style={{ fontFamily: "'Cinzel', serif" }}>
            Explore Dream Insights
          </h2>
          <p className="text-white/90 mb-8">
            Read about common dream symbols, archetypes, and the language of the subconscious on our Dream Blog.
          </p>
          <a
            href="/blog"
            className="inline-block px-8 py-4 bg-primary text-black rounded-md hover:bg-primary/90 transition-colors"
          >
            Visit Dream Blog
          </a>
        </div>
      </section>

      {/* Dream Submission Form */}
      <section className="py-20 bg-secondary">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl mb-6 text-center text-primary" style={{ fontFamily: "'Cinzel', serif" }}>
            Submit Your Dream
          </h2>
          <p className="text-xl text-muted-foreground mb-8 text-center">
            Share your dream with us and receive your interpretation within 24 hours.
          </p>
          
          {submitted ? (
            <div className="bg-card border border-primary/20 rounded-lg p-8 text-center">
              <h3 className="text-2xl text-primary mb-4" style={{ fontFamily: "'Cinzel', serif" }}>Thank You!</h3>
              <p className="text-white/90">Your dream has been submitted. We will send your interpretation within 24 hours.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-card border border-primary/20 rounded-lg p-8 space-y-6">
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
              <div>
                <label className="block text-primary mb-2">Describe Your Dream</label>
                <textarea
                  value={formData.dreamDescription}
                  onChange={e => setFormData({ ...formData, dreamDescription: e.target.value })}
                  className="w-full px-4 py-3 bg-background border border-primary/20 rounded-md text-white focus:border-primary focus:outline-none h-48"
                  placeholder="Share as much detail as you remember..."
                  required
                />
              </div>
              {error && <p className="text-red-400 text-center">{error}</p>}
              <button
                type="submit"
                disabled={submitting}
                className="w-full px-8 py-4 bg-primary text-black rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Your Dream'}
              </button>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}
