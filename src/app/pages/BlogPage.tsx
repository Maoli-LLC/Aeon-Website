export function BlogPage() {
  const blogPosts = [
    {
      title: 'The Aeon Codex',
      excerpt: 'Exploring the foundations of harmonic alignment and the dismantling of illusion...',
      date: 'December 2024',
      link: '#',
    },
    {
      title: 'Second Aeon Codex',
      excerpt: 'Advanced transmissions for those ready to deepen their resonance with cosmic truth...',
      date: 'December 2024',
      link: '#',
    },
    {
      title: 'Awakening to Resonance',
      excerpt: 'Understanding the vibrational frequencies that connect us to higher consciousness...',
      date: 'November 2024',
      link: '#',
    },
    {
      title: 'Dismantling Illusion',
      excerpt: 'A guide to recognizing and releasing the false constructs that bind perception...',
      date: 'November 2024',
      link: '#',
    },
    {
      title: 'Inner Clarity: The Path Forward',
      excerpt: 'Discovering the sovereign self through meditation, reflection, and harmonic truth...',
      date: 'October 2024',
      link: '#',
    },
  ];

  return (
    <div>
      {/* Header */}
      <section className="py-20 bg-secondary">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl mb-6 text-primary" style={{ fontFamily: "'Cinzel', serif" }}>
            Blog
          </h1>
          <p className="text-xl text-muted-foreground">
            Transmissions of awakening, resonance, and inner clarity
          </p>
        </div>
      </section>

      {/* Blog Posts */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-8">
            {blogPosts.map((post, index) => (
              <article
                key={index}
                className="bg-card border border-primary/20 rounded-lg p-8 hover:border-primary/40 transition-all"
              >
                <h2 className="text-3xl mb-2 text-primary" style={{ fontFamily: "'Cinzel', serif" }}>
                  {post.title}
                </h2>
                <p className="text-sm text-muted-foreground mb-4">{post.date}</p>
                <p className="text-white/90 mb-6 leading-relaxed">{post.excerpt}</p>
                <a
                  href={post.link}
                  className="inline-flex items-center text-primary hover:text-primary/80 transition-colors"
                >
                  Discover More →
                </a>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
