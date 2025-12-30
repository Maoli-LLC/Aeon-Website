import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import type { BlogPost, DreamRequest, MusicRequest, EmailSubscriber } from '@shared/schema';

type AdminTab = 'blogs' | 'dreams' | 'music' | 'subscribers';

export function AdminPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [isOwner, setIsOwner] = useState(false);
  const [checkingOwner, setCheckingOwner] = useState(true);
  const [activeTab, setActiveTab] = useState<AdminTab>('blogs');

  useEffect(() => {
    if (isAuthenticated) {
      fetch('/api/admin/check')
        .then(res => {
          if (res.ok) {
            setIsOwner(true);
          }
          setCheckingOwner(false);
        })
        .catch(() => setCheckingOwner(false));
    } else if (!isLoading) {
      setCheckingOwner(false);
    }
  }, [isAuthenticated, isLoading]);

  if (isLoading || checkingOwner) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-white">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <h1 className="text-3xl text-primary" style={{ fontFamily: "'Cinzel', serif" }}>Admin Dashboard</h1>
        <p className="text-white/80">Please log in to access the admin dashboard.</p>
        <a href="/api/login" className="px-6 py-3 bg-primary text-black rounded-md hover:bg-primary/90">
          Log In
        </a>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <h1 className="text-3xl text-primary" style={{ fontFamily: "'Cinzel', serif" }}>Access Denied</h1>
        <p className="text-white/80">You do not have permission to access this dashboard.</p>
        <a href="/" className="px-6 py-3 border border-primary text-primary rounded-md hover:bg-primary/10">
          Return Home
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl text-primary" style={{ fontFamily: "'Cinzel', serif" }}>Admin Dashboard</h1>
          <div className="flex items-center gap-4">
            <span className="text-white/80">Welcome, {user?.firstName || user?.email}</span>
            <a href="/api/logout" className="px-4 py-2 border border-primary text-primary rounded-md hover:bg-primary/10">
              Log Out
            </a>
          </div>
        </div>

        <div className="flex gap-4 mb-8 border-b border-primary/20 pb-4">
          {(['blogs', 'dreams', 'music', 'subscribers'] as AdminTab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-md transition-all capitalize ${
                activeTab === tab 
                  ? 'bg-primary text-black' 
                  : 'border border-primary text-primary hover:bg-primary/10'
              }`}
            >
              {tab === 'blogs' ? 'Blog Posts' : tab === 'dreams' ? 'Dream Requests' : tab === 'music' ? 'Music Requests' : 'Email Subscribers'}
            </button>
          ))}
        </div>

        {activeTab === 'blogs' && <BlogsSection />}
        {activeTab === 'dreams' && <DreamsSection />}
        {activeTab === 'music' && <MusicSection />}
        {activeTab === 'subscribers' && <SubscribersSection />}
      </div>
    </div>
  );
}

function BlogsSection() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [formData, setFormData] = useState({ title: '', excerpt: '', content: '', category: 'sahlien', published: false });

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    const res = await fetch('/api/admin/blog-posts');
    const data = await res.json();
    setPosts(data);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editingPost ? 'PUT' : 'POST';
    const url = editingPost ? `/api/admin/blog-posts/${editingPost.id}` : '/api/admin/blog-posts';
    
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });
    
    setShowForm(false);
    setEditingPost(null);
    setFormData({ title: '', excerpt: '', content: '', category: 'sahlien', published: false });
    fetchPosts();
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this post?')) {
      await fetch(`/api/admin/blog-posts/${id}`, { method: 'DELETE' });
      fetchPosts();
    }
  };

  const startEdit = (post: BlogPost) => {
    setEditingPost(post);
    setFormData({
      title: post.title,
      excerpt: post.excerpt,
      content: post.content || '',
      category: post.category,
      published: post.published || false,
    });
    setShowForm(true);
  };

  if (loading) return <p className="text-white">Loading...</p>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl text-primary" style={{ fontFamily: "'Cinzel', serif" }}>Blog Posts</h2>
        <button
          onClick={() => { setShowForm(true); setEditingPost(null); setFormData({ title: '', excerpt: '', content: '', category: 'sahlien', published: false }); }}
          className="px-4 py-2 bg-primary text-black rounded-md hover:bg-primary/90"
        >
          New Post
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-card border border-primary/20 rounded-lg p-6 mb-6 space-y-4">
          <input
            type="text"
            placeholder="Title"
            value={formData.title}
            onChange={e => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-4 py-2 bg-background border border-primary/20 rounded-md text-white"
            required
          />
          <textarea
            placeholder="Excerpt"
            value={formData.excerpt}
            onChange={e => setFormData({ ...formData, excerpt: e.target.value })}
            className="w-full px-4 py-2 bg-background border border-primary/20 rounded-md text-white h-24"
            required
          />
          <textarea
            placeholder="Content (optional)"
            value={formData.content}
            onChange={e => setFormData({ ...formData, content: e.target.value })}
            className="w-full px-4 py-2 bg-background border border-primary/20 rounded-md text-white h-48"
          />
          <div className="flex gap-4">
            <select
              value={formData.category}
              onChange={e => setFormData({ ...formData, category: e.target.value })}
              className="px-4 py-2 bg-background border border-primary/20 rounded-md text-white"
            >
              <option value="sahlien">Sahlien Blog</option>
              <option value="dream">Dream Blog</option>
            </select>
            <label className="flex items-center gap-2 text-white">
              <input
                type="checkbox"
                checked={formData.published}
                onChange={e => setFormData({ ...formData, published: e.target.checked })}
              />
              Published
            </label>
          </div>
          <div className="flex gap-4">
            <button type="submit" className="px-4 py-2 bg-primary text-black rounded-md hover:bg-primary/90">
              {editingPost ? 'Update' : 'Create'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-primary text-primary rounded-md hover:bg-primary/10">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {posts.map(post => (
          <div key={post.id} className="bg-card border border-primary/20 rounded-lg p-4 flex justify-between items-start">
            <div>
              <h3 className="text-xl text-primary">{post.title}</h3>
              <p className="text-sm text-muted-foreground">{post.category} | {post.published ? 'Published' : 'Draft'}</p>
              <p className="text-white/80 mt-2">{post.excerpt}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => startEdit(post)} className="px-3 py-1 border border-primary text-primary rounded-md hover:bg-primary/10">
                Edit
              </button>
              <button onClick={() => handleDelete(post.id)} className="px-3 py-1 border border-red-500 text-red-500 rounded-md hover:bg-red-500/10">
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DreamsSection() {
  const [requests, setRequests] = useState<DreamRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/dream-requests')
      .then(res => res.json())
      .then(data => { setRequests(data); setLoading(false); });
  }, []);

  const updateStatus = async (id: number, status: string) => {
    await fetch(`/api/admin/dream-requests/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    setRequests(requests.map(r => r.id === id ? { ...r, status } : r));
  };

  if (loading) return <p className="text-white">Loading...</p>;

  return (
    <div>
      <h2 className="text-2xl text-primary mb-6" style={{ fontFamily: "'Cinzel', serif" }}>Dream Interpretation Requests</h2>
      <div className="space-y-4">
        {requests.length === 0 ? (
          <p className="text-white/80">No dream requests yet.</p>
        ) : requests.map(request => (
          <div key={request.id} className="bg-card border border-primary/20 rounded-lg p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="text-lg text-primary">{request.name}</h3>
                <p className="text-sm text-muted-foreground">{request.email}</p>
              </div>
              <select
                value={request.status || 'pending'}
                onChange={e => updateStatus(request.id, e.target.value)}
                className="px-3 py-1 bg-background border border-primary/20 rounded-md text-white text-sm"
              >
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <p className="text-white/90 whitespace-pre-wrap">{request.dreamDescription}</p>
            <p className="text-xs text-muted-foreground mt-2">
              Submitted: {new Date(request.createdAt!).toLocaleDateString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function MusicSection() {
  const [requests, setRequests] = useState<MusicRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/music-requests')
      .then(res => res.json())
      .then(data => { setRequests(data); setLoading(false); });
  }, []);

  const updateStatus = async (id: number, status: string) => {
    await fetch(`/api/admin/music-requests/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    setRequests(requests.map(r => r.id === id ? { ...r, status } : r));
  };

  if (loading) return <p className="text-white">Loading...</p>;

  return (
    <div>
      <h2 className="text-2xl text-primary mb-6" style={{ fontFamily: "'Cinzel', serif" }}>Music Creation Requests</h2>
      <div className="space-y-4">
        {requests.length === 0 ? (
          <p className="text-white/80">No music requests yet.</p>
        ) : requests.map(request => (
          <div key={request.id} className="bg-card border border-primary/20 rounded-lg p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="text-lg text-primary">{request.name}</h3>
                <p className="text-sm text-muted-foreground">{request.email}</p>
              </div>
              <select
                value={request.status || 'pending'}
                onChange={e => updateStatus(request.id, e.target.value)}
                className="px-3 py-1 bg-background border border-primary/20 rounded-md text-white text-sm"
              >
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <p className="text-white/90 whitespace-pre-wrap">{request.description}</p>
            {request.mood && <p className="text-sm text-muted-foreground mt-2">Mood: {request.mood}</p>}
            {request.purpose && <p className="text-sm text-muted-foreground">Purpose: {request.purpose}</p>}
            <p className="text-xs text-muted-foreground mt-2">
              Submitted: {new Date(request.createdAt!).toLocaleDateString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function SubscribersSection() {
  const [subscribers, setSubscribers] = useState<EmailSubscriber[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/subscribers')
      .then(res => res.json())
      .then(data => { setSubscribers(data); setLoading(false); });
  }, []);

  if (loading) return <p className="text-white">Loading...</p>;

  return (
    <div>
      <h2 className="text-2xl text-primary mb-6" style={{ fontFamily: "'Cinzel', serif" }}>Email Subscribers ({subscribers.length})</h2>
      <div className="bg-card border border-primary/20 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-secondary">
            <tr>
              <th className="text-left px-4 py-3 text-primary">Email</th>
              <th className="text-left px-4 py-3 text-primary">Name</th>
              <th className="text-left px-4 py-3 text-primary">Subscribed</th>
            </tr>
          </thead>
          <tbody>
            {subscribers.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-3 text-white/80 text-center">No subscribers yet.</td>
              </tr>
            ) : subscribers.map(sub => (
              <tr key={sub.id} className="border-t border-primary/10">
                <td className="px-4 py-3 text-white">{sub.email}</td>
                <td className="px-4 py-3 text-white">{sub.name || '-'}</td>
                <td className="px-4 py-3 text-muted-foreground">{new Date(sub.subscribedAt!).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
