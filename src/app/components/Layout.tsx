import { Link, Outlet } from 'react-router-dom';
import { Menu, X, User, LogOut } from 'lucide-react';
import { useState, FormEvent } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';

export function Layout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [subscribeEmail, setSubscribeEmail] = useState('');
  const [subscribing, setSubscribing] = useState(false);
  const { user, isAuthenticated, isLoading } = useAuth();

  const handleSubscribe = async (e: FormEvent) => {
    e.preventDefault();
    if (!subscribeEmail.trim()) {
      toast.error('Please enter your email');
      return;
    }
    setSubscribing(true);
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: subscribeEmail }),
      });
      if (res.ok) {
        toast.success('Welcome to Team Aeon!');
        setSubscribeEmail('');
      } else {
        toast.error('Failed to subscribe. Please try again.');
      }
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSubscribing(false);
    }
  };

  const navigationLinks = [
    { name: 'Home', path: '/' },
    { name: 'Sovereign Dream Lattice', path: '/dream-lattice' },
    { name: 'Music Creation', path: '/music' },
    { name: 'Store', path: '/store' },
    { name: 'Blog', path: '/blog' },
    { name: 'Contact', path: '/contact' },
  ];

  return (
    <div className="min-h-screen bg-black text-white" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
      {/* Navigation */}
      <nav className="border-b border-primary/20 bg-black/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Link to="/" className="flex items-center">
              <span className="text-2xl text-primary" style={{ fontFamily: "'Cinzel', serif" }}>
                Team Aeon
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              {navigationLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className="text-white/80 hover:text-primary transition-colors"
                >
                  {link.name}
                </Link>
              ))}
              
              {/* Auth Button */}
              {!isLoading && (
                isAuthenticated ? (
                  <div className="flex items-center gap-4">
                    <Link
                      to="/admin"
                      className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors"
                    >
                      <User size={18} />
                      <span>{user?.firstName || 'Dashboard'}</span>
                    </Link>
                    <a
                      href="/api/logout"
                      className="flex items-center gap-1 text-white/60 hover:text-white transition-colors text-sm"
                    >
                      <LogOut size={16} />
                    </a>
                  </div>
                ) : (
                  <a
                    href="/api/login"
                    className="px-4 py-2 bg-primary text-black rounded-md hover:bg-primary/90 transition-colors text-sm font-medium"
                  >
                    Sign In
                  </a>
                )
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-white"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-primary/20">
              <div className="flex flex-col space-y-4">
                {navigationLinks.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    className="text-white/80 hover:text-primary transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {link.name}
                  </Link>
                ))}
                
                {/* Mobile Auth */}
                {!isLoading && (
                  isAuthenticated ? (
                    <>
                      <Link
                        to="/admin"
                        className="flex items-center gap-2 text-primary"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <User size={18} />
                        <span>{user?.firstName || 'Dashboard'}</span>
                      </Link>
                      <a
                        href="/api/logout"
                        className="flex items-center gap-2 text-white/60"
                      >
                        <LogOut size={18} />
                        <span>Sign Out</span>
                      </a>
                    </>
                  ) : (
                    <a
                      href="/api/login"
                      className="inline-block px-4 py-2 bg-primary text-black rounded-md text-center"
                    >
                      Sign In
                    </a>
                  )
                )}
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main>
        <Outlet />
      </main>

      {/* Newsletter Signup */}
      <section className="bg-secondary border-t border-primary/20 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center">
            <h3 className="text-3xl mb-4 text-primary" style={{ fontFamily: "'Cinzel', serif" }}>
              Join Team Aeon
            </h3>
            <p className="text-muted-foreground mb-6">
              Get codex entries, drops, and transmissions directly to your inbox
            </p>
            <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
              <input
                type="email"
                placeholder="Enter your email"
                value={subscribeEmail}
                onChange={(e) => setSubscribeEmail(e.target.value)}
                className="flex-1 px-4 py-3 bg-input-background border border-primary/20 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-white placeholder:text-muted-foreground"
                required
              />
              <button
                type="submit"
                disabled={subscribing}
                className="px-6 py-3 bg-primary text-black rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {subscribing ? 'Subscribing...' : 'Subscribe'}
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black border-t border-primary/20 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <h4 className="text-xl mb-4 text-primary" style={{ fontFamily: "'Cinzel', serif" }}>
                Team Aeon
              </h4>
              <p className="text-muted-foreground">
                Embrace the New Harmonic
              </p>
            </div>

            <div>
              <h4 className="mb-4 text-primary">Quick Links</h4>
              <ul className="space-y-2">
                <li><Link to="/blog" className="text-muted-foreground hover:text-primary transition-colors">Blog</Link></li>
                <li><Link to="/music" className="text-muted-foreground hover:text-primary transition-colors">Music</Link></li>
                <li><Link to="/store" className="text-muted-foreground hover:text-primary transition-colors">Store</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="mb-4 text-primary">Services</h4>
              <ul className="space-y-2">
                <li><Link to="/dream-lattice" className="text-muted-foreground hover:text-primary transition-colors">Dream Interpretation</Link></li>
                <li><Link to="/music" className="text-muted-foreground hover:text-primary transition-colors">Music Creation</Link></li>
                <li><Link to="/contact" className="text-muted-foreground hover:text-primary transition-colors">Contact</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-primary/20 pt-8 flex flex-col sm:flex-row justify-between items-center text-muted-foreground text-sm">
            <p>&copy; 2024 Team Aeon. All rights reserved.</p>
            <div className="flex space-x-4 mt-4 sm:mt-0">
              <Link to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
              <Link to="/terms" className="hover:text-primary transition-colors">Terms of Use</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
