import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';

interface BlogPost {
  id: number;
  title: string;
  excerpt: string;
  content: string | null;
  imageUrl: string | null;
  category: string;
  published: boolean;
  createdAt: string;
}

interface Comment {
  id: number;
  postId: number;
  userId: string | null;
  userName: string;
  userImage: string | null;
  content: string;
  status: string;
  createdAt: string;
}

export function BlogPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'sahlien' | 'dream'>('sahlien');
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [initialPostLoaded, setInitialPostLoaded] = useState(false);

  const filteredPosts = posts.filter(post => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      post.title.toLowerCase().includes(query) ||
      post.excerpt.toLowerCase().includes(query) ||
      (post.content && post.content.toLowerCase().includes(query))
    );
  });

  useEffect(() => {
    fetch(`/api/blog-posts?category=${activeTab}`)
      .then(res => res.json())
      .then(data => {
        setPosts(data);
        setLoading(false);
        
        // Check for post parameter in URL and auto-open that post
        const postId = searchParams.get('post');
        if (postId && !initialPostLoaded) {
          const targetPost = data.find((p: BlogPost) => p.id === parseInt(postId));
          if (targetPost) {
            viewPost(targetPost);
            setInitialPostLoaded(true);
            // Clear the URL parameter after loading
            setSearchParams({});
          } else {
            // Post not in current category, try fetching from the other category
            const otherCategory = activeTab === 'sahlien' ? 'dream' : 'sahlien';
            fetch(`/api/blog-posts?category=${otherCategory}`)
              .then(res => res.json())
              .then(otherData => {
                const foundPost = otherData.find((p: BlogPost) => p.id === parseInt(postId));
                if (foundPost) {
                  setActiveTab(otherCategory);
                  setPosts(otherData);
                  viewPost(foundPost);
                  setInitialPostLoaded(true);
                  setSearchParams({});
                }
              });
          }
        }
      })
      .catch(() => setLoading(false));
  }, [activeTab]);

  const viewPost = async (post: BlogPost) => {
    setSelectedPost(post);
    setCommentsLoading(true);
    try {
      const res = await fetch(`/api/blog-posts/${post.id}/comments`);
      const data = await res.json();
      setComments(data);
    } catch {
      setComments([]);
    }
    setCommentsLoading(false);
  };

  const goBack = () => {
    setSelectedPost(null);
    setComments([]);
    setNewComment('');
  };

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !selectedPost) return;
    
    setSubmittingComment(true);
    try {
      const res = await fetch(`/api/blog-posts/${selectedPost.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content: newComment }),
      });
      if (res.ok) {
        const comment = await res.json();
        setComments([comment, ...comments]);
        setNewComment('');
      }
    } catch {}
    setSubmittingComment(false);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatContent = (content: string) => {
    const paragraphs = content.split(/\n\n+/);
    
    return paragraphs.map((paragraph, index) => {
      const trimmed = paragraph.trim();
      if (!trimmed) return null;
      
      const isHeading = (
        (trimmed.length < 80 && trimmed.endsWith(':')) ||
        (trimmed.length < 60 && trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed))
      );
      
      const isList = trimmed.split('\n').every(line => 
        /^[\-\*\•\d+\.\)]\s/.test(line.trim()) || line.trim() === ''
      );
      
      if (isHeading) {
        return (
          <h3 
            key={index} 
            className="text-xl text-primary mt-8 mb-4 font-semibold"
            style={{ fontFamily: "'Cinzel', serif" }}
          >
            {trimmed.replace(/:$/, '')}
          </h3>
        );
      }
      
      if (isList) {
        const items = trimmed.split('\n').filter(line => line.trim());
        return (
          <ul key={index} className="list-disc list-inside space-y-2 my-4 text-white/80">
            {items.map((item, i) => (
              <li key={i}>{item.replace(/^[\-\*\•\d+\.\)]\s*/, '')}</li>
            ))}
          </ul>
        );
      }
      
      const lines = trimmed.split('\n');
      return (
        <p key={index} className="text-white/80 leading-relaxed text-lg mb-6">
          {lines.map((line, i) => (
            <span key={i}>
              {line}
              {i < lines.length - 1 && <br />}
            </span>
          ))}
        </p>
      );
    });
  };

  if (selectedPost) {
    return (
      <div>
        <section className="py-12 bg-secondary">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <button
              onClick={goBack}
              className="text-primary hover:text-primary/80 mb-6 flex items-center gap-2"
            >
              ← Back to Blog
            </button>
            <h1 className="text-4xl mb-4 text-primary" style={{ fontFamily: "'Cinzel', serif" }}>
              {selectedPost.title}
            </h1>
            <p className="text-muted-foreground">{formatDate(selectedPost.createdAt)}</p>
          </div>
        </section>

        <section className="py-12">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="prose prose-invert max-w-none mb-12">
              <p className="text-white/90 leading-relaxed text-lg italic border-l-4 border-primary/40 pl-4 mb-8">
                {selectedPost.excerpt}
              </p>
              {selectedPost.content && (
                <div className="mt-8">
                  {formatContent(selectedPost.content)}
                </div>
              )}
            </div>

            <div className="border-t border-primary/20 pt-12">
              <h2 className="text-2xl mb-8 text-primary" style={{ fontFamily: "'Cinzel', serif" }}>
                Comments ({comments.length})
              </h2>

              {user ? (
                <form onSubmit={submitComment} className="mb-8">
                  <div className="flex gap-4">
                    {user.profileImageUrl && (
                      <img 
                        src={user.profileImageUrl} 
                        alt="" 
                        className="w-10 h-10 rounded-full"
                      />
                    )}
                    <div className="flex-1">
                      <textarea
                        value={newComment}
                        onChange={e => setNewComment(e.target.value)}
                        placeholder="Share your thoughts..."
                        className="w-full px-4 py-3 bg-background border border-primary/20 rounded-md text-white focus:border-primary focus:outline-none resize-none"
                        rows={3}
                      />
                      <button
                        type="submit"
                        disabled={submittingComment || !newComment.trim()}
                        className="mt-2 px-6 py-2 bg-primary text-black rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
                      >
                        {submittingComment ? 'Posting...' : 'Post Comment'}
                      </button>
                    </div>
                  </div>
                </form>
              ) : (
                <div className="mb-8 bg-card border border-primary/20 rounded-lg p-6 text-center">
                  <p className="text-muted-foreground mb-4">Sign in to join the conversation</p>
                  <a
                    href="/api/login"
                    className="inline-block px-6 py-2 bg-primary text-black rounded-md hover:bg-primary/90 transition-colors"
                  >
                    Sign In with Google
                  </a>
                </div>
              )}

              {commentsLoading ? (
                <p className="text-muted-foreground">Loading comments...</p>
              ) : comments.length === 0 ? (
                <p className="text-muted-foreground">No comments yet. Be the first to share your thoughts!</p>
              ) : (
                <div className="space-y-6">
                  {comments.map(comment => (
                    <div key={comment.id} className="bg-card border border-primary/20 rounded-lg p-6">
                      <div className="flex items-start gap-4">
                        {comment.userImage ? (
                          <img src={comment.userImage} alt="" className="w-10 h-10 rounded-full" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                            {comment.userName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-primary font-medium">{comment.userName}</span>
                            <span className="text-muted-foreground text-sm">
                              {formatDate(comment.createdAt)}
                            </span>
                          </div>
                          <p className="text-white/90">{comment.content}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div>
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

      <section className="py-8 border-b border-primary/20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center gap-4 mb-6">
            <button
              onClick={() => { setActiveTab('sahlien'); setLoading(true); setSearchQuery(''); }}
              className={`px-6 py-3 rounded-md text-lg transition-all ${
                activeTab === 'sahlien'
                  ? 'bg-primary text-black'
                  : 'border border-primary text-primary hover:bg-primary/10'
              }`}
              style={{ fontFamily: "'Cinzel', serif" }}
            >
              Sahlien Blog
            </button>
            <button
              onClick={() => { setActiveTab('dream'); setLoading(true); setSearchQuery(''); }}
              className={`px-6 py-3 rounded-md text-lg transition-all ${
                activeTab === 'dream'
                  ? 'bg-primary text-black'
                  : 'border border-primary text-primary hover:bg-primary/10'
              }`}
              style={{ fontFamily: "'Cinzel', serif" }}
            >
              Dream Blog
            </button>
          </div>
          <div className="max-w-md mx-auto">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search posts by keyword..."
                className="w-full px-4 py-3 pl-12 bg-background border border-primary/20 rounded-md text-white focus:border-primary focus:outline-none"
              />
              <svg
                className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <p className="text-center text-muted-foreground">Loading posts...</p>
          ) : filteredPosts.length === 0 ? (
            <div className="text-center">
              {searchQuery ? (
                <>
                  <p className="text-muted-foreground mb-4">No posts found for "{searchQuery}"</p>
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-primary hover:text-primary/80"
                  >
                    Clear search
                  </button>
                </>
              ) : (
                <>
                  <p className="text-muted-foreground mb-4">No posts yet in this category.</p>
                  <p className="text-sm text-muted-foreground">Check back soon for new transmissions.</p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-8">
              {searchQuery && (
                <p className="text-muted-foreground text-center mb-4">
                  Found {filteredPosts.length} post{filteredPosts.length !== 1 ? 's' : ''} matching "{searchQuery}"
                </p>
              )}
              {filteredPosts.map(post => (
                <article
                  key={post.id}
                  className="bg-card border border-primary/20 rounded-lg p-8 hover:border-primary/40 transition-all cursor-pointer"
                  onClick={() => viewPost(post)}
                >
                  <h2 className="text-3xl mb-2 text-primary" style={{ fontFamily: "'Cinzel', serif" }}>
                    {post.title}
                  </h2>
                  <p className="text-sm text-muted-foreground mb-4">{formatDate(post.createdAt)}</p>
                  <p className="text-white/90 mb-6 leading-relaxed">{post.excerpt}</p>
                  <span className="inline-flex items-center text-primary hover:text-primary/80 transition-colors">
                    Read More →
                  </span>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
