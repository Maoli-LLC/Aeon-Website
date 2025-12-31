import { useState, useEffect } from 'react';
import { Code, Smartphone, Palette, Layers } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { trackEvent } from '../hooks/useAnalytics';

export function WebAppServicePage() {
  const { user, isAuthenticated } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    projectType: 'website',
    description: '',
    functionality: '',
    colorPreferences: '',
    exampleSites: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isAuthenticated && user) {
      const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ');
      setFormData(prev => ({
        ...prev,
        name: prev.name || fullName || '',
        email: prev.email || user.email || '',
      }));
    }
  }, [isAuthenticated, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    
    try {
      const res = await fetch('/api/webapp-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      if (res.ok) {
        setSubmitted(true);
        setFormData({
          name: '',
          email: '',
          projectType: 'website',
          description: '',
          functionality: '',
          colorPreferences: '',
          exampleSites: '',
        });
        trackEvent('conversion', 'webapp_request');
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
      <section className="py-20 bg-secondary">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl mb-6 text-primary" style={{ fontFamily: "'Cinzel', serif" }}>
            Website & App Creation
          </h1>
          <p className="text-xl text-muted-foreground">
            Transform your vision into a digital reality
          </p>
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl mb-12 text-center text-primary" style={{ fontFamily: "'Cinzel', serif" }}>
            How It Works
          </h2>
          <div className="prose prose-invert prose-lg max-w-none">
            <p className="text-white/90 leading-relaxed mb-6">
              Your digital presence is an extension of your creative vision. I offer a unique approach to website and app creation:
            </p>
            <p className="text-white/90 leading-relaxed mb-6">
              <strong className="text-primary">The design is always free.</strong> I'll create a custom design concept based on your vision, 
              allowing you to see exactly what your website or app could look like before committing.
            </p>
            <p className="text-white/90 leading-relaxed mb-6">
              If the design resonates with you, you can commission me to build the full working website or app. 
              Each project is <strong className="text-primary">crafted with intention</strong> to authentically represent your vision.
            </p>
          </div>
        </div>
      </section>

      <section className="py-20 bg-secondary">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl mb-12 text-center text-primary" style={{ fontFamily: "'Cinzel', serif" }}>
            What I Create
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-8">
            <div className="bg-card border border-primary/20 rounded-lg p-6 text-center">
              <Code className="mx-auto mb-4 text-primary" size={48} />
              <h3 className="text-xl text-primary mb-2" style={{ fontFamily: "'Cinzel', serif" }}>Websites</h3>
              <p className="text-muted-foreground">Personal sites, portfolios, landing pages</p>
            </div>
            <div className="bg-card border border-primary/20 rounded-lg p-6 text-center">
              <Smartphone className="mx-auto mb-4 text-primary" size={48} />
              <h3 className="text-xl text-primary mb-2" style={{ fontFamily: "'Cinzel', serif" }}>Mobile Apps</h3>
              <p className="text-muted-foreground">iOS & Android apps for your business</p>
            </div>
            <div className="bg-card border border-primary/20 rounded-lg p-6 text-center">
              <Layers className="mx-auto mb-4 text-primary" size={48} />
              <h3 className="text-xl text-primary mb-2" style={{ fontFamily: "'Cinzel', serif" }}>Web Apps</h3>
              <p className="text-muted-foreground">Interactive applications, dashboards, tools</p>
            </div>
            <div className="bg-card border border-primary/20 rounded-lg p-6 text-center">
              <Palette className="mx-auto mb-4 text-primary" size={48} />
              <h3 className="text-xl text-primary mb-2" style={{ fontFamily: "'Cinzel', serif" }}>Custom Design</h3>
              <p className="text-muted-foreground">Unique aesthetics tailored to your vision</p>
            </div>
            <div className="bg-card border border-primary/20 rounded-lg p-6 text-center">
              <Code className="mx-auto mb-4 text-primary" size={48} />
              <h3 className="text-xl text-primary mb-2" style={{ fontFamily: "'Cinzel', serif" }}>Full Stack</h3>
              <p className="text-muted-foreground">Frontend, backend, databases, APIs</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl mb-6 text-center text-primary" style={{ fontFamily: "'Cinzel', serif" }}>
            Request a Free Design
          </h2>
          <p className="text-xl text-muted-foreground mb-8 text-center">
            Share your vision and I'll create a free design concept with a quote for the full build.
          </p>
          
          {submitted ? (
            <div className="bg-card border border-primary/20 rounded-lg p-8 text-center">
              <h3 className="text-2xl text-primary mb-4" style={{ fontFamily: "'Cinzel', serif" }}>Thank You!</h3>
              <p className="text-white/90">Your request has been submitted. I will review your project details and respond with a design concept and quote within 48-72 hours.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-card border border-primary/20 rounded-lg p-8 space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-primary mb-2">Your Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 bg-background border border-primary/20 rounded-md text-white focus:border-primary focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-primary mb-2">Your Email *</label>
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
                <label className="block text-primary mb-2">Project Type *</label>
                <select
                  value={formData.projectType}
                  onChange={e => setFormData({ ...formData, projectType: e.target.value })}
                  className="w-full px-4 py-3 bg-background border border-primary/20 rounded-md text-white focus:border-primary focus:outline-none"
                >
                  <option value="website">Website</option>
                  <option value="app">Mobile Application</option>
                  <option value="both">Both Website & Mobile App</option>
                </select>
              </div>

              <div>
                <label className="block text-primary mb-2">Describe Your Project *</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3 bg-background border border-primary/20 rounded-md text-white focus:border-primary focus:outline-none h-32"
                  placeholder="Tell me about your project, its purpose, and who it's for..."
                  required
                />
              </div>

              <div>
                <label className="block text-primary mb-2">Desired Functionality *</label>
                <textarea
                  value={formData.functionality}
                  onChange={e => setFormData({ ...formData, functionality: e.target.value })}
                  className="w-full px-4 py-3 bg-background border border-primary/20 rounded-md text-white focus:border-primary focus:outline-none h-32"
                  placeholder="What features do you need? User accounts, payment processing, contact forms, galleries, etc..."
                  required
                />
              </div>

              <div>
                <label className="block text-primary mb-2">Color Preferences (Optional)</label>
                <input
                  type="text"
                  value={formData.colorPreferences}
                  onChange={e => setFormData({ ...formData, colorPreferences: e.target.value })}
                  className="w-full px-4 py-3 bg-background border border-primary/20 rounded-md text-white focus:border-primary focus:outline-none"
                  placeholder="e.g., Dark theme with gold accents, Minimalist white, Vibrant colors"
                />
              </div>

              <div>
                <label className="block text-primary mb-2">Example Sites/Apps You Like (Optional)</label>
                <textarea
                  value={formData.exampleSites}
                  onChange={e => setFormData({ ...formData, exampleSites: e.target.value })}
                  className="w-full px-4 py-3 bg-background border border-primary/20 rounded-md text-white focus:border-primary focus:outline-none h-24"
                  placeholder="Share links to websites or apps whose design you admire and what you like about them..."
                />
              </div>

              {error && <p className="text-red-400 text-center">{error}</p>}
              <button
                type="submit"
                disabled={submitting}
                className="w-full px-8 py-4 bg-primary text-black rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit for Free Design & Quote'}
              </button>
            </form>
          )}
        </div>
      </section>

      <section className="py-20 bg-secondary">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl mb-8 text-primary" style={{ fontFamily: "'Cinzel', serif" }}>
            The Promise
          </h2>
          <div className="prose prose-invert prose-lg max-w-none">
            <p className="text-white/90 leading-relaxed mb-6">
              Every project is created with <strong className="text-primary">intention and authenticity</strong>, 
              designed to reflect your unique vision and serve your audience.
            </p>
            <p className="text-white/90 leading-relaxed">
              Your commission ensures a product that truly represents you and your creative purpose.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
