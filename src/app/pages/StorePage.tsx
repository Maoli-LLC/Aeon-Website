import { ExternalLink } from 'lucide-react';

export function StorePage() {
  const categories = [
    {
      name: 'T-Shirts',
      description: 'Wear the frequency with custom designed apparel',
    },
    {
      name: 'Stickers',
      description: 'Symbolic designs to amplify your space',
    },
    {
      name: 'Accessories',
      description: 'Harmonically aligned items for daily use',
    },
    {
      name: 'Digital Downloads',
      description: 'Wallpapers, prints, and digital art',
    },
  ];

  return (
    <div>
      {/* Header */}
      <section className="py-20 bg-secondary">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl mb-6 text-primary" style={{ fontFamily: "'Cinzel', serif" }}>
            Shop the Frequency
          </h1>
          <p className="text-xl text-muted-foreground">
            Explore apparel, stickers, and digital downloads aligned with the harmonic
          </p>
        </div>
      </section>

      {/* Categories */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl mb-12 text-center text-primary" style={{ fontFamily: "'Cinzel', serif" }}>
            Browse Categories
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {categories.map((category, index) => (
              <div
                key={index}
                className="bg-card border border-primary/20 rounded-lg p-6 text-center hover:border-primary/40 transition-all"
              >
                <h3 className="text-xl mb-2 text-primary" style={{ fontFamily: "'Cinzel', serif" }}>
                  {category.name}
                </h3>
                <p className="text-sm text-muted-foreground">{category.description}</p>
              </div>
            ))}
          </div>

          {/* Visit Store CTA */}
          <div className="bg-card border-2 border-primary/20 rounded-lg p-12 text-center">
            <h2 className="text-3xl mb-6 text-primary" style={{ fontFamily: "'Cinzel', serif" }}>
              Visit Our Printify Store
            </h2>
            <p className="text-white/90 mb-8 max-w-2xl mx-auto leading-relaxed">
              Our complete collection of t-shirts, stickers, accessories, and digital downloads is available
              through our Printify storefront. Browse the full catalog and find items that resonate with your frequency.
            </p>
            <a
              href="https://iamsahlien.printify.me"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-black rounded-md hover:bg-primary/90 transition-colors"
            >
              <ExternalLink size={20} />
              Shop Now on Printify
            </a>
          </div>
        </div>
      </section>

      {/* Info Section */}
      <section className="py-20 bg-secondary">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl mb-12 text-center text-primary" style={{ fontFamily: "'Cinzel', serif" }}>
            Why Shop with Us
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-4xl mb-4">✨</div>
              <h3 className="text-xl mb-2 text-primary">
                Unique Designs
              </h3>
              <p className="text-muted-foreground">
                Every piece features original artwork aligned with cosmic and spiritual themes
              </p>
            </div>

            <div className="text-center">
              <div className="text-4xl mb-4">🌟</div>
              <h3 className="text-xl mb-2 text-primary">
                Quality Products
              </h3>
              <p className="text-muted-foreground">
                Premium materials and printing ensure lasting quality and comfort
              </p>
            </div>

            <div className="text-center">
              <div className="text-4xl mb-4">🔮</div>
              <h3 className="text-xl mb-2 text-primary">
                Conscious Creation
              </h3>
              <p className="text-muted-foreground">
                Each design carries intentional symbolism to amplify your resonance
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Items Note */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-card border border-primary/20 rounded-lg p-8">
            <h3 className="text-2xl mb-4 text-primary" style={{ fontFamily: "'Cinzel', serif" }}>
              New Designs Weekly
            </h3>
            <p className="text-white/90 leading-relaxed">
              We regularly add new designs and products to the store. Subscribe to our newsletter to be notified
              when new items drop and receive exclusive access to limited edition releases.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
