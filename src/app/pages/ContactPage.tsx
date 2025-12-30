import { useState } from 'react';
import { Mail } from 'lucide-react';

export function ContactPage() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [subscribeSubmitting, setSubscribeSubmitting] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubscribeSubmitting(true);
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name }),
      });
      if (res.ok) {
        setSubscribed(true);
        setEmail('');
        setName('');
      }
    } catch {}
    setSubscribeSubmitting(false);
  };

  return (
    <div>
      {/* Header */}
      <section className="py-20 bg-secondary">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl mb-6 text-primary" style={{ fontFamily: "'Cinzel', serif" }}>
            Contact
          </h1>
          <p className="text-xl text-muted-foreground">
            Connect with Team Aeon
          </p>
        </div>
      </section>

      {/* Contact Info */}
      <section className="py-20">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-card border border-primary/20 rounded-lg p-12 text-center">
            <Mail className="mx-auto mb-6 text-primary" size={64} />
            <h2 className="text-3xl mb-6 text-primary" style={{ fontFamily: "'Cinzel', serif" }}>
              Get in Touch
            </h2>
            <p className="text-white/90 mb-8 leading-relaxed">
              For inquiries about dream interpretations, music commissions, custom projects, or general questions,
              please reach out via email. We respond to all messages within 24-48 hours.
            </p>
            <a
              href="mailto:iamsahlien@gmail.com"
              className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-black rounded-md hover:bg-primary/90 transition-colors text-lg"
            >
              <Mail size={20} />
              iamsahlien@gmail.com
            </a>
          </div>
        </div>
      </section>

      {/* What to Include */}
      <section className="py-20 bg-secondary">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl mb-12 text-center text-primary" style={{ fontFamily: "'Cinzel', serif" }}>
            What to Include in Your Message
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-card border border-primary/20 rounded-lg p-8">
              <h3 className="text-2xl mb-4 text-primary" style={{ fontFamily: "'Cinzel', serif" }}>
                Dream Interpretations
              </h3>
              <ul className="space-y-2 text-white/90">
                <li>• Detailed description of your dream</li>
                <li>• Any recurring symbols or themes</li>
                <li>• Your emotional state during the dream</li>
                <li>• Any questions you have about specific elements</li>
              </ul>
            </div>

            <div className="bg-card border border-primary/20 rounded-lg p-8">
              <h3 className="text-2xl mb-4 text-primary" style={{ fontFamily: "'Cinzel', serif" }}>
                Music Commissions
              </h3>
              <ul className="space-y-2 text-white/90">
                <li>• Your vision for the song/album</li>
                <li>• Preferred musical style or genre</li>
                <li>• Themes or message you want to convey</li>
                <li>• Timeline and budget expectations</li>
              </ul>
            </div>

            <div className="bg-card border border-primary/20 rounded-lg p-8">
              <h3 className="text-2xl mb-4 text-primary" style={{ fontFamily: "'Cinzel', serif" }}>
                Custom Projects
              </h3>
              <ul className="space-y-2 text-white/90">
                <li>• Description of your project idea</li>
                <li>• Scope and deliverables</li>
                <li>• Budget range and timeline</li>
                <li>• Any specific requirements</li>
              </ul>
            </div>

            <div className="bg-card border border-primary/20 rounded-lg p-8">
              <h3 className="text-2xl mb-4 text-primary" style={{ fontFamily: "'Cinzel', serif" }}>
                General Inquiries
              </h3>
              <ul className="space-y-2 text-white/90">
                <li>• Your name and preferred contact method</li>
                <li>• Subject of your inquiry</li>
                <li>• Any specific questions</li>
                <li>• How you found Team Aeon</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Response Time */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-card border border-primary/20 rounded-lg p-8">
            <h3 className="text-2xl mb-4 text-primary" style={{ fontFamily: "'Cinzel', serif" }}>
              Response Time
            </h3>
            <p className="text-white/90 leading-relaxed max-w-2xl mx-auto">
              We aim to respond to all messages within <strong className="text-primary">24-48 hours</strong>.
              Dream interpretations typically have a 24-hour turnaround. For custom music commissions and
              larger projects, we'll schedule a follow-up conversation to discuss details.
            </p>
          </div>
        </div>
      </section>

      {/* Newsletter Signup */}
      <section className="py-20">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl mb-6 text-center text-primary" style={{ fontFamily: "'Cinzel', serif" }}>
            Stay Connected
          </h2>
          <p className="text-center text-muted-foreground mb-8">
            Subscribe to receive updates on new transmissions, music releases, and insights.
          </p>
          
          {subscribed ? (
            <div className="bg-card border border-primary/20 rounded-lg p-8 text-center">
              <h3 className="text-2xl text-primary mb-4" style={{ fontFamily: "'Cinzel', serif" }}>Welcome!</h3>
              <p className="text-white/90">You have been added to our list. Thank you for connecting.</p>
            </div>
          ) : (
            <form onSubmit={handleSubscribe} className="bg-card border border-primary/20 rounded-lg p-8 space-y-4">
              <div>
                <label className="block text-primary mb-2">Your Name (Optional)</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-background border border-primary/20 rounded-md text-white focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-primary mb-2">Your Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-background border border-primary/20 rounded-md text-white focus:border-primary focus:outline-none"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={subscribeSubmitting}
                className="w-full px-8 py-4 bg-primary text-black rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {subscribeSubmitting ? 'Subscribing...' : 'Subscribe'}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* Privacy Note */}
      <section className="py-20 bg-secondary">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm text-muted-foreground">
            <strong className="text-primary">Privacy Notice:</strong> Your information is handled with respect and confidentiality.
          </p>
        </div>
      </section>
    </div>
  );
}
