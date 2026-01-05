import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useUpload } from '@/hooks/use-upload';
import { Calendar } from '@/app/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/app/components/ui/popover';
import { format } from 'date-fns';
import type { BlogPost, DreamRequest, MusicRequest, EmailSubscriber, BlogComment, WebAppRequest } from '@shared/schema';

type AdminTab = 'blogs' | 'dreams' | 'music' | 'webapp' | 'subscribers' | 'marketing' | 'comments' | 'analytics';

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
            <a href="/" className="px-4 py-2 border border-primary text-primary rounded-md hover:bg-primary/10">
              Back to Home
            </a>
            <a href="/api/logout" className="px-4 py-2 border border-primary text-primary rounded-md hover:bg-primary/10">
              Log Out
            </a>
          </div>
        </div>

        <div className="flex gap-4 mb-8 border-b border-primary/20 pb-4 flex-wrap">
          {(['blogs', 'dreams', 'music', 'webapp', 'subscribers', 'marketing', 'comments', 'analytics'] as AdminTab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-md transition-all capitalize ${
                activeTab === tab 
                  ? 'bg-primary text-black' 
                  : 'border border-primary text-primary hover:bg-primary/10'
              }`}
            >
              {tab === 'blogs' ? 'Blog Posts' : tab === 'dreams' ? 'Dream Requests' : tab === 'music' ? 'Music Requests' : tab === 'webapp' ? 'Website/App' : tab === 'subscribers' ? 'Email Subscribers' : tab === 'marketing' ? 'Email Marketing' : tab === 'comments' ? 'Comments' : 'Analytics'}
            </button>
          ))}
        </div>

        {activeTab === 'blogs' && <BlogsSection />}
        {activeTab === 'dreams' && <DreamsSection />}
        {activeTab === 'music' && <MusicSection />}
        {activeTab === 'webapp' && <WebAppSection />}
        {activeTab === 'subscribers' && <SubscribersSection />}
        {activeTab === 'marketing' && <EmailMarketingSection />}
        {activeTab === 'comments' && <CommentsSection />}
        {activeTab === 'analytics' && <AnalyticsSection />}
      </div>
    </div>
  );
}

function BlogsSection() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [formData, setFormData] = useState({ title: '', excerpt: '', content: '', imageUrl: '', category: 'sahlien', published: false });
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'unpublished'>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadFile, isUploading } = useUpload({
    onSuccess: (response) => {
      setFormData(prev => ({ ...prev, imageUrl: response.objectPath }));
    },
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadFile(file);
    }
  };

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
    setFormData({ title: '', excerpt: '', content: '', imageUrl: '', category: 'sahlien', published: false });
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
      imageUrl: post.imageUrl || '',
      category: post.category,
      published: post.published || false,
    });
    setShowForm(true);
  };

  if (loading) return <p className="text-white">Loading...</p>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <h2 className="text-2xl text-primary" style={{ fontFamily: "'Cinzel', serif" }}>Blog Posts</h2>
        <div className="flex items-center gap-4 flex-wrap">
          <input
            type="text"
            placeholder="Search posts..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="px-4 py-2 bg-background border border-primary/20 rounded-md text-white w-64"
          />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as 'all' | 'published' | 'unpublished')}
            className="px-4 py-2 bg-background border border-primary/20 rounded-md text-white"
          >
            <option value="all">All Posts</option>
            <option value="published">Published Only</option>
            <option value="unpublished">Unpublished Only</option>
          </select>
          <button
            onClick={() => { setShowForm(true); setEditingPost(null); setFormData({ title: '', excerpt: '', content: '', imageUrl: '', category: 'sahlien', published: false }); }}
            className="px-4 py-2 bg-primary text-black rounded-md hover:bg-primary/90"
          >
            New Post
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-card border border-primary/20 rounded-lg p-6 mb-6 space-y-4">
          <div>
            <label className="block text-primary mb-2">Image</label>
            <div className="flex items-center gap-4">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="px-4 py-2 border border-primary text-primary rounded-md hover:bg-primary/10 disabled:opacity-50"
              >
                {isUploading ? 'Uploading...' : 'Choose Image'}
              </button>
              {formData.imageUrl && (
                <div className="flex items-center gap-2">
                  <span className="text-green-500 text-sm">Image uploaded</span>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, imageUrl: '' })}
                    className="text-red-500 text-sm hover:underline"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
            {formData.imageUrl && (
              <img 
                src={formData.imageUrl} 
                alt="Preview" 
                className="mt-2 max-h-32 rounded-md border border-primary/20"
              />
            )}
          </div>
          <div>
            <label className="block text-primary mb-2">Title</label>
            <input
              type="text"
              placeholder="Enter post title"
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 bg-background border border-primary/20 rounded-md text-white"
              required
            />
          </div>
          <div>
            <label className="block text-primary mb-2">Subject</label>
            <textarea
              placeholder="Brief summary or subject of the post"
              value={formData.excerpt}
              onChange={e => setFormData({ ...formData, excerpt: e.target.value })}
              className="w-full px-4 py-2 bg-background border border-primary/20 rounded-md text-white h-24"
              required
            />
          </div>
          <div className="flex gap-4 flex-wrap">
            <div>
              <label className="block text-primary mb-2">Blog</label>
              <select
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
                className="px-4 py-2 bg-background border border-primary/20 rounded-md text-white"
              >
                <option value="sahlien">Sahlien Blog</option>
                <option value="dream">Dream Blog</option>
              </select>
            </div>
            <div>
              <label className="block text-primary mb-2">Status</label>
              <select
                value={formData.published ? 'publish' : 'draft'}
                onChange={e => setFormData({ ...formData, published: e.target.value === 'publish' })}
                className="px-4 py-2 bg-background border border-primary/20 rounded-md text-white"
              >
                <option value="draft">Draft</option>
                <option value="publish">Publish</option>
              </select>
            </div>
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
        {posts
          .filter(post => {
            const words = searchQuery.toLowerCase().split(/\s+/).filter(w => w.length > 0);
            const matchesSearch = words.length === 0 || words.some(word =>
              post.title.toLowerCase().includes(word) ||
              post.excerpt.toLowerCase().includes(word) ||
              post.category.toLowerCase().includes(word)
            );
            const matchesStatus = statusFilter === 'all' || 
              (statusFilter === 'published' && post.published) ||
              (statusFilter === 'unpublished' && !post.published);
            return matchesSearch && matchesStatus;
          })
          .map(post => (
          <div key={post.id} className="bg-card border border-primary/20 rounded-lg p-4 flex flex-col sm:flex-row justify-between items-start gap-4">
            <div className="flex-1 min-w-0">
              <h3 className="text-xl text-primary">{post.title}</h3>
              <p className="text-sm text-muted-foreground">{post.category} | {post.published ? 'Published' : 'Draft'}</p>
              <p className="text-white/80 mt-2 line-clamp-2">{post.excerpt}</p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button 
                type="button"
                onClick={(e) => { e.stopPropagation(); startEdit(post); }} 
                className="px-4 py-2 border border-primary text-primary rounded-md hover:bg-primary/10 active:bg-primary/20 min-w-[70px]"
              >
                Edit
              </button>
              <button 
                type="button"
                onClick={(e) => { e.stopPropagation(); handleDelete(post.id); }} 
                className="px-4 py-2 border border-red-500 text-red-500 rounded-md hover:bg-red-500/10 active:bg-red-500/20 min-w-[70px]"
              >
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
  const [selectedRequest, setSelectedRequest] = useState<DreamRequest | null>(null);
  const [interpretation, setInterpretation] = useState('');
  const [sending, setSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

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
    if (selectedRequest?.id === id) {
      setSelectedRequest({ ...selectedRequest, status });
    }
  };

  const sendInterpretation = async () => {
    if (!selectedRequest || !interpretation.trim()) return;
    setSending(true);
    setSendSuccess(false);
    try {
      const res = await fetch(`/api/admin/dream-requests/${selectedRequest.id}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interpretation }),
      });
      if (res.ok) {
        setSendSuccess(true);
        setRequests(requests.map(r => r.id === selectedRequest.id ? { ...r, status: 'completed', notes: interpretation } : r));
        setSelectedRequest({ ...selectedRequest, status: 'completed', notes: interpretation });
      }
    } catch (error) {
      console.error('Error sending email:', error);
    }
    setSending(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500';
      case 'in_progress': return 'bg-blue-500/20 text-blue-400 border-blue-500';
      case 'completed': return 'bg-green-500/20 text-green-400 border-green-500';
      case 'archived': return 'bg-gray-500/20 text-gray-400 border-gray-500';
      default: return 'bg-yellow-500/20 text-yellow-400 border-yellow-500';
    }
  };

  const openRequest = (request: DreamRequest) => {
    setSelectedRequest(request);
    setInterpretation(request.notes || '');
    setSendSuccess(false);
  };

  const deleteRequest = async (id: number) => {
    if (!confirm('Are you sure you want to delete this request?')) return;
    await fetch(`/api/admin/dream-requests/${id}`, { method: 'DELETE' });
    setRequests(requests.filter(r => r.id !== id));
  };

  if (loading) return <p className="text-white">Loading...</p>;

  const filteredRequests = requests.filter(r => {
    const matchesStatus = statusFilter === 'all' || (r.status || 'pending') === statusFilter;
    if (!matchesStatus) return false;
    if (!searchQuery.trim()) return true;
    const words = searchQuery.toLowerCase().split(/\s+/).filter(w => w.length > 0);
    const searchableText = `${r.name} ${r.email} ${r.dreamDescription}`.toLowerCase();
    return words.some(word => searchableText.includes(word));
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <h2 className="text-2xl text-primary" style={{ fontFamily: "'Cinzel', serif" }}>Dream Interpretation Requests</h2>
        <div className="flex gap-4 flex-wrap">
          <input
            type="text"
            placeholder="Search name, email, dream..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="px-4 py-2 bg-background border border-primary/20 rounded-md text-white focus:border-primary focus:outline-none w-64"
          />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-background border border-primary/20 rounded-md text-white"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>
      
      {selectedRequest ? (
        <div className="bg-card border border-primary/20 rounded-lg p-6">
          <div className="flex justify-between items-start mb-6">
            <button 
              onClick={() => setSelectedRequest(null)}
              className="px-4 py-2 border border-primary text-primary rounded-md hover:bg-primary/10"
            >
              Back to List
            </button>
            <div className="flex gap-2">
              {['pending', 'in_progress', 'completed', 'archived'].map(status => (
                <button
                  key={status}
                  onClick={() => updateStatus(selectedRequest.id, status)}
                  className={`px-3 py-1 rounded-md border text-sm capitalize transition-all ${
                    selectedRequest.status === status 
                      ? getStatusColor(status) 
                      : 'border-primary/20 text-muted-foreground hover:border-primary/50'
                  }`}
                >
                  {status.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="text-xl text-primary mb-2" style={{ fontFamily: "'Cinzel', serif" }}>{selectedRequest.name}</h3>
              <p className="text-muted-foreground mb-4">{selectedRequest.email}</p>
              <p className="text-xs text-muted-foreground">
                Submitted: {new Date(selectedRequest.createdAt!).toLocaleString()}
              </p>
            </div>
            <div className={`px-4 py-2 rounded-md border self-start text-center ${getStatusColor(selectedRequest.status || 'pending')}`}>
              Status: {(selectedRequest.status || 'pending').replace('_', ' ')}
            </div>
          </div>
          
          <div className="bg-secondary rounded-lg p-4 mb-6">
            <h4 className="text-primary mb-2 font-semibold">Their Dream:</h4>
            <p className="text-white/90 whitespace-pre-wrap leading-relaxed">{selectedRequest.dreamDescription}</p>
          </div>
          
          <div className="mb-6">
            <label className="block text-primary mb-2 font-semibold">Your Interpretation:</label>
            <textarea
              value={interpretation}
              onChange={e => setInterpretation(e.target.value)}
              className="w-full px-4 py-3 bg-background border border-primary/20 rounded-md text-white focus:border-primary focus:outline-none h-64"
              placeholder="Write your symbolic interpretation here..."
            />
          </div>
          
          {sendSuccess && (
            <div className="bg-green-500/20 border border-green-500 text-green-400 px-4 py-3 rounded-md mb-4 text-center">
              Email sent successfully with interpretation and Amplifier link!
            </div>
          )}
          
          <div className="flex gap-4">
            <button
              onClick={sendInterpretation}
              disabled={sending || !interpretation.trim()}
              className="flex-1 px-6 py-3 bg-primary text-black rounded-md hover:bg-primary/90 disabled:opacity-50 transition-all"
            >
              {sending ? 'Sending...' : 'Send Interpretation & Amplifier Link'}
            </button>
            <button
              onClick={() => updateStatus(selectedRequest.id, 'completed')}
              className="px-6 py-3 border border-green-500 text-green-400 rounded-md hover:bg-green-500/20"
            >
              Mark Complete
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRequests.length === 0 ? (
            <p className="text-white/80">{statusFilter === 'all' ? 'No dream requests yet.' : 'No requests with this status.'}</p>
          ) : filteredRequests.map(request => (
            <div 
              key={request.id} 
              onClick={() => openRequest(request)}
              className="bg-card border border-primary/20 rounded-lg p-4 cursor-pointer hover:border-primary/50 transition-all"
            >
              <div className="flex justify-between items-start mb-2 flex-wrap gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg text-primary">{request.name}</h3>
                  <p className="text-sm text-muted-foreground">{request.email}</p>
                </div>
                <div className="flex gap-2 items-start">
                  <span className={`px-3 py-1 rounded-md border text-sm capitalize ${getStatusColor(request.status || 'pending')}`}>
                    {(request.status || 'pending').replace('_', ' ')}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); deleteRequest(request.id); }}
                    className="px-3 py-1 border border-red-500 text-red-500 rounded-md hover:bg-red-500/10 active:bg-red-500/20 text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <p className="text-white/90 whitespace-pre-wrap line-clamp-3">{request.dreamDescription}</p>
              <p className="text-xs text-muted-foreground mt-2">
                Submitted: {new Date(request.createdAt!).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MusicSection() {
  const [requests, setRequests] = useState<MusicRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<MusicRequest | null>(null);
  const [response, setResponse] = useState('');
  const [sending, setSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

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
    if (selectedRequest?.id === id) {
      setSelectedRequest({ ...selectedRequest, status });
    }
  };

  const sendLyrics = async () => {
    if (!selectedRequest || !response.trim()) return;
    setSending(true);
    setSendSuccess(false);
    try {
      const res = await fetch(`/api/admin/music-requests/${selectedRequest.id}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response }),
      });
      if (res.ok) {
        setSendSuccess(true);
        setRequests(requests.map(r => r.id === selectedRequest.id ? { ...r, status: 'in_progress', notes: response } : r));
        setSelectedRequest({ ...selectedRequest, status: 'in_progress', notes: response });
      }
    } catch (error) {
      console.error('Error sending email:', error);
    }
    setSending(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500';
      case 'in_progress': return 'bg-blue-500/20 text-blue-400 border-blue-500';
      case 'completed': return 'bg-green-500/20 text-green-400 border-green-500';
      case 'archived': return 'bg-gray-500/20 text-gray-400 border-gray-500';
      default: return 'bg-yellow-500/20 text-yellow-400 border-yellow-500';
    }
  };

  const openRequest = (request: MusicRequest) => {
    setSelectedRequest(request);
    setResponse(request.notes || '');
    setSendSuccess(false);
  };

  const deleteRequest = async (id: number) => {
    if (!confirm('Are you sure you want to delete this request?')) return;
    await fetch(`/api/admin/music-requests/${id}`, { method: 'DELETE' });
    setRequests(requests.filter(r => r.id !== id));
  };

  if (loading) return <p className="text-white">Loading...</p>;

  const filteredRequests = requests.filter(r => {
    const matchesStatus = statusFilter === 'all' || (r.status || 'pending') === statusFilter;
    if (!matchesStatus) return false;
    if (!searchQuery.trim()) return true;
    const words = searchQuery.toLowerCase().split(/\s+/).filter(w => w.length > 0);
    const searchableText = `${r.name} ${r.email} ${r.description} ${r.mood || ''} ${r.purpose || ''}`.toLowerCase();
    return words.some(word => searchableText.includes(word));
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <h2 className="text-2xl text-primary" style={{ fontFamily: "'Cinzel', serif" }}>Music Creation Requests</h2>
        <div className="flex gap-4 flex-wrap">
          <input
            type="text"
            placeholder="Search name, email, description..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="px-4 py-2 bg-background border border-primary/20 rounded-md text-white focus:border-primary focus:outline-none w-64"
          />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-background border border-primary/20 rounded-md text-white"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>
      
      {selectedRequest ? (
        <div className="bg-card border border-primary/20 rounded-lg p-6">
          <div className="flex justify-between items-start mb-6 flex-wrap gap-4">
            <button 
              onClick={() => setSelectedRequest(null)}
              className="px-4 py-2 border border-primary text-primary rounded-md hover:bg-primary/10"
            >
              Back to List
            </button>
            <div className="flex gap-2 flex-wrap">
              {['pending', 'in_progress', 'completed', 'archived'].map(status => (
                <button
                  key={status}
                  onClick={() => updateStatus(selectedRequest.id, status)}
                  className={`px-3 py-1 rounded-md border text-sm capitalize transition-all ${
                    selectedRequest.status === status 
                      ? getStatusColor(status) 
                      : 'border-primary/20 text-muted-foreground hover:border-primary/50'
                  }`}
                >
                  {status.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="text-xl text-primary mb-2" style={{ fontFamily: "'Cinzel', serif" }}>{selectedRequest.name}</h3>
              <p className="text-muted-foreground mb-4">{selectedRequest.email}</p>
              <p className="text-xs text-muted-foreground">
                Submitted: {new Date(selectedRequest.createdAt!).toLocaleString()}
              </p>
            </div>
            <div className={`px-4 py-2 rounded-md border self-start text-center ${getStatusColor(selectedRequest.status || 'pending')}`}>
              Status: {(selectedRequest.status || 'pending').replace('_', ' ')}
            </div>
          </div>
          
          <div className="bg-secondary rounded-lg p-4 mb-6">
            <h4 className="text-primary mb-2 font-semibold">Their Vision:</h4>
            <p className="text-white/90 whitespace-pre-wrap leading-relaxed mb-4">{selectedRequest.description}</p>
            {selectedRequest.mood && (
              <p className="text-sm text-muted-foreground">Mood: {selectedRequest.mood}</p>
            )}
            {selectedRequest.purpose && (
              <p className="text-sm text-muted-foreground">Purpose: {selectedRequest.purpose}</p>
            )}
          </div>
          
          <div className="mb-6">
            <label className="block text-primary mb-2 font-semibold">Your Lyrics / Response:</label>
            <textarea
              value={response}
              onChange={e => setResponse(e.target.value)}
              className="w-full px-4 py-3 bg-background border border-primary/20 rounded-md text-white focus:border-primary focus:outline-none h-64"
              placeholder="Write the lyrics or your response here..."
            />
          </div>
          
          {sendSuccess && (
            <div className="bg-green-500/20 border border-green-500 text-green-400 px-4 py-3 rounded-md mb-4 text-center">
              Email sent successfully with lyrics and commission links ($97 & $444)!
            </div>
          )}
          
          <div className="flex gap-4 flex-wrap">
            <button
              onClick={sendLyrics}
              disabled={sending || !response.trim()}
              className="flex-1 px-6 py-3 bg-primary text-black rounded-md hover:bg-primary/90 disabled:opacity-50 transition-all"
            >
              {sending ? 'Sending...' : 'Send Lyrics & Commission Links'}
            </button>
            <button
              onClick={() => updateStatus(selectedRequest.id, 'completed')}
              className="px-6 py-3 border border-green-500 text-green-400 rounded-md hover:bg-green-500/20"
            >
              Mark Complete
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRequests.length === 0 ? (
            <p className="text-white/80">{statusFilter === 'all' ? 'No music requests yet.' : 'No requests with this status.'}</p>
          ) : filteredRequests.map(request => (
            <div 
              key={request.id} 
              onClick={() => openRequest(request)}
              className="bg-card border border-primary/20 rounded-lg p-4 cursor-pointer hover:border-primary/50 transition-all"
            >
              <div className="flex justify-between items-start mb-2 flex-wrap gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg text-primary">{request.name}</h3>
                  <p className="text-sm text-muted-foreground">{request.email}</p>
                </div>
                <div className="flex gap-2 items-start">
                  <span className={`px-3 py-1 rounded-md border text-sm capitalize ${getStatusColor(request.status || 'pending')}`}>
                    {(request.status || 'pending').replace('_', ' ')}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); deleteRequest(request.id); }}
                    className="px-3 py-1 border border-red-500 text-red-500 rounded-md hover:bg-red-500/10 active:bg-red-500/20 text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <p className="text-white/90 whitespace-pre-wrap line-clamp-3">{request.description}</p>
              {request.mood && <p className="text-sm text-muted-foreground mt-2">Mood: {request.mood}</p>}
              <p className="text-xs text-muted-foreground mt-2">
                Submitted: {new Date(request.createdAt!).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SubscribersSection() {
  const [subscribers, setSubscribers] = useState<EmailSubscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetch('/api/admin/subscribers')
      .then(res => res.json())
      .then(data => { setSubscribers(data); setLoading(false); });
  }, []);

  const deleteSubscriber = async (id: number) => {
    if (!confirm('Are you sure you want to remove this subscriber?')) return;
    await fetch(`/api/admin/subscribers/${id}`, { method: 'DELETE' });
    setSubscribers(subscribers.filter(s => s.id !== id));
  };

  if (loading) return <p className="text-white">Loading...</p>;

  const activeSubscribers = subscribers.filter(s => !s.marketingOptOut);
  const optedOutSubscribers = subscribers.filter(s => s.marketingOptOut);

  const filteredSubscribers = subscribers.filter(sub => {
    const words = searchQuery.toLowerCase().split(/\s+/).filter(w => w.length > 0);
    return words.length === 0 || words.some(word =>
      sub.email.toLowerCase().includes(word) ||
      (sub.name && sub.name.toLowerCase().includes(word))
    );
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <h2 className="text-2xl text-primary" style={{ fontFamily: "'Cinzel', serif" }}>
          Email Subscribers ({activeSubscribers.length} active, {optedOutSubscribers.length} unsubscribed)
        </h2>
        <input
          type="text"
          placeholder="Search by email or name..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="px-4 py-2 bg-background border border-primary/20 rounded-md text-white w-64"
        />
      </div>
      <div className="bg-card border border-primary/20 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-secondary">
            <tr>
              <th className="text-left px-4 py-3 text-primary">Email</th>
              <th className="text-left px-4 py-3 text-primary">Name</th>
              <th className="text-left px-4 py-3 text-primary">Status</th>
              <th className="text-left px-4 py-3 text-primary">Subscribed</th>
              <th className="text-left px-4 py-3 text-primary">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredSubscribers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-3 text-white/80 text-center">{searchQuery ? 'No matching subscribers found.' : 'No subscribers yet.'}</td>
              </tr>
            ) : filteredSubscribers.map(sub => (
              <tr key={sub.id} className={`border-t border-primary/10 ${sub.marketingOptOut ? 'opacity-60' : ''}`}>
                <td className="px-4 py-3 text-white">{sub.email}</td>
                <td className="px-4 py-3 text-white">{sub.name || '-'}</td>
                <td className="px-4 py-3">
                  {sub.marketingOptOut ? (
                    <span className="px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded">Unsubscribed</span>
                  ) : (
                    <span className="px-2 py-1 text-xs bg-green-500/20 text-green-400 rounded">Active</span>
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{new Date(sub.subscribedAt!).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => deleteSubscriber(sub.id)}
                    className="px-3 py-1 text-sm border border-red-500 text-red-400 rounded hover:bg-red-500/20"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface ScheduledEmail {
  id: number;
  type: string;
  postId: number | null;
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  linkDestination: string | null;
  linkedPostId: number | null;
  scheduledFor: string;
  status: string;
  createdAt: string;
}

function EmailMarketingSection() {
  const [emailType, setEmailType] = useState<'blog' | 'product'>('blog');
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [selectedPostId, setSelectedPostId] = useState<number | null>(null);
  const [productTitle, setProductTitle] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [productImageUrl, setProductImageUrl] = useState('');
  const [linkDestination, setLinkDestination] = useState<'store' | 'blog'>('store');
  const [selectedBlogForLink, setSelectedBlogForLink] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null);
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [sendMode, setSendMode] = useState<'now' | 'schedule'>('now');
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(undefined);
  const [scheduledTime, setScheduledTime] = useState('09:00');
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [scheduledEmails, setScheduledEmails] = useState<ScheduledEmail[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadFile, isUploading } = useUpload({
    onSuccess: (response) => {
      setProductImageUrl(response.objectPath);
    },
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = () => {
    fetch('/api/admin/blog-posts')
      .then(res => res.json())
      .then(data => setBlogPosts(data.filter((p: BlogPost) => p.published)));
    fetch('/api/admin/subscribers')
      .then(res => res.json())
      .then(data => setSubscriberCount(data.filter((s: any) => !s.marketingOptOut).length));
    fetch('/api/admin/scheduled-emails')
      .then(res => res.json())
      .then(data => setScheduledEmails(data));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadFile(file);
    }
  };

  const sendMarketingEmail = async () => {
    setSending(true);
    setSendResult(null);
    
    try {
      const basePayload = emailType === 'blog' 
        ? { type: 'blog', postId: selectedPostId }
        : { 
            type: 'product', 
            title: productTitle, 
            description: productDescription, 
            imageUrl: productImageUrl,
            linkDestination,
            linkedPostId: linkDestination === 'blog' ? selectedBlogForLink : null
          };
      
      if (sendMode === 'schedule') {
        if (!scheduledDate || !scheduledTime) {
          setSendResult({ success: false, message: 'Please select a date and time for scheduling' });
          setSending(false);
          return;
        }
        
        const [hours, minutes] = scheduledTime.split(':').map(Number);
        const scheduledFor = new Date(scheduledDate);
        scheduledFor.setHours(hours, minutes, 0, 0);
        
        if (scheduledFor <= new Date()) {
          setSendResult({ success: false, message: 'Scheduled time must be in the future' });
          setSending(false);
          return;
        }
        
        const res = await fetch('/api/admin/schedule-marketing-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...basePayload, scheduledFor: scheduledFor.toISOString() }),
        });
        
        const data = await res.json();
        if (res.ok) {
          setSendResult({ success: true, message: `Email scheduled for ${scheduledFor.toLocaleString()}!` });
          setScheduledDate(undefined);
          setScheduledTime('09:00');
          fetchData();
          if (emailType === 'product') {
            setProductTitle('');
            setProductDescription('');
            setProductImageUrl('');
          }
        } else {
          setSendResult({ success: false, message: data.error || 'Failed to schedule email' });
        }
      } else {
        const res = await fetch('/api/admin/send-marketing-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(basePayload),
        });
        
        const data = await res.json();
        if (res.ok) {
          setSendResult({ success: true, message: `Email sent successfully to ${data.sentCount} subscribers!` });
          if (emailType === 'product') {
            setProductTitle('');
            setProductDescription('');
            setProductImageUrl('');
          }
        } else {
          setSendResult({ success: false, message: data.error || 'Failed to send emails' });
        }
      }
    } catch (error) {
      setSendResult({ success: false, message: 'An error occurred' });
    }
    
    setSending(false);
  };

  const cancelScheduledEmail = async (id: number) => {
    if (!confirm('Are you sure you want to cancel this scheduled email?')) return;
    
    try {
      await fetch(`/api/admin/scheduled-emails/${id}`, { method: 'DELETE' });
      setScheduledEmails(scheduledEmails.filter(e => e.id !== id));
    } catch (error) {
      console.error('Failed to cancel scheduled email:', error);
    }
  };

  const canSend = emailType === 'blog' 
    ? selectedPostId !== null 
    : productTitle.trim() && productDescription.trim();

  return (
    <div>
      <h2 className="text-2xl text-primary mb-6" style={{ fontFamily: "'Cinzel', serif" }}>Email Marketing</h2>
      
      <div className="bg-card border border-primary/20 rounded-lg p-6">
        <div className="mb-6">
          <p className="text-muted-foreground mb-4">
            Send emails to <span className="text-primary font-semibold">{subscriberCount}</span> subscribers
          </p>
          
          <div className="flex gap-4 mb-6">
            <button
              onClick={() => setEmailType('blog')}
              className={`px-6 py-3 rounded-md transition-all ${
                emailType === 'blog' ? 'bg-primary text-black' : 'border border-primary text-primary hover:bg-primary/10'
              }`}
            >
              Share Blog Post
            </button>
            <button
              onClick={() => setEmailType('product')}
              className={`px-6 py-3 rounded-md transition-all ${
                emailType === 'product' ? 'bg-primary text-black' : 'border border-primary text-primary hover:bg-primary/10'
              }`}
            >
              New Product Announcement
            </button>
          </div>
        </div>

        {emailType === 'blog' ? (
          <div className="space-y-4">
            <div>
              <label className="block text-primary mb-2">Select Blog Post to Share</label>
              <select
                value={selectedPostId || ''}
                onChange={e => setSelectedPostId(e.target.value ? Number(e.target.value) : null)}
                className="w-full px-4 py-3 bg-background border border-primary/20 rounded-md text-white"
              >
                <option value="">-- Select a published blog post --</option>
                {blogPosts.map(post => (
                  <option key={post.id} value={post.id}>{post.title} ({post.category})</option>
                ))}
              </select>
            </div>
            
            {selectedPostId && (
              <div className="bg-secondary rounded-lg p-4">
                <h4 className="text-primary mb-2">Preview:</h4>
                {(() => {
                  const post = blogPosts.find(p => p.id === selectedPostId);
                  return post ? (
                    <div>
                      <p className="text-white font-semibold">{post.title}</p>
                      <p className="text-muted-foreground text-sm mt-1">{post.excerpt}</p>
                    </div>
                  ) : null;
                })()}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-primary mb-2">Product Image</label>
              <div className="flex items-center gap-4">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="px-4 py-2 border border-primary text-primary rounded-md hover:bg-primary/10 disabled:opacity-50"
                >
                  {isUploading ? 'Uploading...' : 'Choose Image'}
                </button>
                {productImageUrl && (
                  <div className="flex items-center gap-2">
                    <span className="text-green-500 text-sm">Image uploaded</span>
                    <button
                      type="button"
                      onClick={() => setProductImageUrl('')}
                      className="text-red-500 text-sm hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
              {productImageUrl && (
                <img 
                  src={productImageUrl} 
                  alt="Preview" 
                  className="mt-2 max-h-32 rounded-md border border-primary/20"
                />
              )}
            </div>
            
            <div>
              <label className="block text-primary mb-2">Product Title</label>
              <input
                type="text"
                value={productTitle}
                onChange={e => setProductTitle(e.target.value)}
                placeholder="Enter product name"
                className="w-full px-4 py-3 bg-background border border-primary/20 rounded-md text-white"
              />
            </div>
            
            <div>
              <label className="block text-primary mb-2">Product Description</label>
              <textarea
                value={productDescription}
                onChange={e => setProductDescription(e.target.value)}
                placeholder="Describe the product..."
                className="w-full px-4 py-3 bg-background border border-primary/20 rounded-md text-white h-32"
              />
            </div>
            
            <div>
              <label className="block text-primary mb-2">Link Destination</label>
              <select
                value={linkDestination}
                onChange={e => setLinkDestination(e.target.value as 'store' | 'blog')}
                className="w-full px-4 py-3 bg-background border border-primary/20 rounded-md text-white"
              >
                <option value="store">Store Page</option>
                <option value="blog">Blog Post</option>
              </select>
            </div>
            
            {linkDestination === 'blog' && (
              <div>
                <label className="block text-primary mb-2">Select Blog Post to Link</label>
                <select
                  value={selectedBlogForLink || ''}
                  onChange={e => setSelectedBlogForLink(e.target.value ? Number(e.target.value) : null)}
                  className="w-full px-4 py-3 bg-background border border-primary/20 rounded-md text-white"
                >
                  <option value="">-- Select a blog post --</option>
                  {blogPosts.map(post => (
                    <option key={post.id} value={post.id}>{post.title}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}
        
        <div className="mt-8 pt-6 border-t border-primary/20">
          <label className="block text-primary mb-3">When to Send</label>
          <div className="flex gap-4 mb-4">
            <button
              onClick={() => setSendMode('now')}
              className={`px-6 py-3 rounded-md transition-all ${
                sendMode === 'now' ? 'bg-primary text-black' : 'border border-primary text-primary hover:bg-primary/10'
              }`}
            >
              Send Now
            </button>
            <button
              onClick={() => setSendMode('schedule')}
              className={`px-6 py-3 rounded-md transition-all ${
                sendMode === 'schedule' ? 'bg-primary text-black' : 'border border-primary text-primary hover:bg-primary/10'
              }`}
            >
              Schedule for Later
            </button>
          </div>
          
          {sendMode === 'schedule' && (
            <div className="flex gap-4 mt-4">
              <div className="flex-1">
                <label className="block text-muted-foreground text-sm mb-2">Date</label>
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="w-full px-4 py-3 bg-background border border-primary/20 rounded-md text-white text-left flex items-center justify-between hover:border-primary/40"
                    >
                      {scheduledDate ? format(scheduledDate, 'PPP') : 'Pick a date'}
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-card border-primary/20" align="start">
                    <Calendar
                      mode="single"
                      selected={scheduledDate}
                      onSelect={(date) => {
                        setScheduledDate(date);
                        setCalendarOpen(false);
                      }}
                      disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex-1">
                <label className="block text-muted-foreground text-sm mb-2">Time</label>
                <input
                  type="time"
                  value={scheduledTime}
                  onChange={e => setScheduledTime(e.target.value)}
                  className="w-full px-4 py-3 bg-background border border-primary/20 rounded-md text-white"
                />
              </div>
            </div>
          )}
        </div>
        
        {sendResult && (
          <div className={`mt-6 px-4 py-3 rounded-md border ${
            sendResult.success 
              ? 'bg-green-500/20 border-green-500 text-green-400' 
              : 'bg-red-500/20 border-red-500 text-red-400'
          }`}>
            {sendResult.message}
          </div>
        )}
        
        <div className="mt-6">
          <button
            onClick={sendMarketingEmail}
            disabled={sending || !canSend}
            className="w-full px-6 py-4 bg-primary text-black rounded-md hover:bg-primary/90 disabled:opacity-50 transition-all text-lg font-medium"
          >
            {sending 
              ? (sendMode === 'schedule' ? 'Scheduling...' : 'Sending to all subscribers...') 
              : (sendMode === 'schedule' 
                  ? 'Schedule Email' 
                  : `Send Email to ${subscriberCount} Subscribers`
                )
            }
          </button>
        </div>
      </div>
      
      {scheduledEmails.length > 0 && (
        <div className="mt-8 bg-card border border-primary/20 rounded-lg p-6">
          <h3 className="text-xl text-primary mb-4" style={{ fontFamily: "'Cinzel', serif" }}>Scheduled Emails</h3>
          <div className="space-y-3">
            {scheduledEmails.map(email => (
              <div key={email.id} className="flex items-center justify-between bg-secondary rounded-lg p-4">
                <div>
                  <p className="text-white font-medium">
                    {email.type === 'blog' 
                      ? `Blog Post: ${blogPosts.find(p => p.id === email.postId)?.title || `Post #${email.postId}`}` 
                      : `Product: ${email.title}`
                    }
                  </p>
                  <p className="text-muted-foreground text-sm">
                    Scheduled for: {new Date(email.scheduledFor).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => cancelScheduledEmail(email.id)}
                  className="px-4 py-2 border border-red-500 text-red-400 rounded-md hover:bg-red-500/20 text-sm"
                >
                  Cancel
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CommentsSection() {
  const [comments, setComments] = useState<BlogComment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/comments')
      .then(res => res.json())
      .then(data => { setComments(data); setLoading(false); });
  }, []);

  const updateStatus = async (id: number, status: string) => {
    await fetch(`/api/admin/comments/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    setComments(comments.map(c => c.id === id ? { ...c, status } : c));
  };

  const deleteComment = async (id: number) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;
    await fetch(`/api/admin/comments/${id}`, { method: 'DELETE' });
    setComments(comments.filter(c => c.id !== id));
  };

  if (loading) return <p className="text-white">Loading...</p>;

  return (
    <div>
      <h2 className="text-2xl text-primary mb-6" style={{ fontFamily: "'Cinzel', serif" }}>Blog Comments ({comments.length})</h2>
      <div className="space-y-4">
        {comments.length === 0 ? (
          <p className="text-white/80">No comments yet.</p>
        ) : comments.map(comment => (
          <div key={comment.id} className="bg-card border border-primary/20 rounded-lg p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                {comment.userImage ? (
                  <img src={comment.userImage} alt="" className="w-10 h-10 rounded-full" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                    {comment.userName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-primary font-medium">{comment.userName}</p>
                  <p className="text-xs text-muted-foreground">Post ID: {comment.postId}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={comment.status || 'published'}
                  onChange={e => updateStatus(comment.id, e.target.value)}
                  className={`px-3 py-1 rounded text-sm border ${
                    comment.status === 'published' ? 'border-green-500 text-green-400' : 'border-red-500 text-red-400'
                  } bg-background`}
                >
                  <option value="published">Published</option>
                  <option value="hidden">Hidden</option>
                </select>
                <button
                  onClick={() => deleteComment(comment.id)}
                  className="px-3 py-1 text-sm border border-red-500 text-red-400 rounded hover:bg-red-500/20"
                >
                  Delete
                </button>
              </div>
            </div>
            <p className="text-white/90">{comment.content}</p>
            <p className="text-xs text-muted-foreground mt-2">
              {new Date(comment.createdAt!).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function WebAppSection() {
  const [requests, setRequests] = useState<WebAppRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<WebAppRequest | null>(null);
  const [emailType, setEmailType] = useState<'response' | 'quote'>('response');
  const [responseText, setResponseText] = useState('');
  const [quoteAmount, setQuoteAmount] = useState('');
  const [stripePaymentLink, setStripePaymentLink] = useState('');
  const [agreementPdfUrl, setAgreementPdfUrl] = useState('');
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadFile, isUploading } = useUpload({
    onSuccess: (response) => {
      setAgreementPdfUrl(response.objectPath);
    },
  });

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadFile(file);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    const res = await fetch('/api/admin/webapp-requests');
    const data = await res.json();
    setRequests(data);
    setLoading(false);
  };

  const updateStatus = async (id: number, status: string) => {
    await fetch(`/api/admin/webapp-requests/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    fetchRequests();
  };

  const deleteRequest = async (id: number) => {
    if (!confirm('Are you sure you want to delete this request?')) return;
    await fetch(`/api/admin/webapp-requests/${id}`, { method: 'DELETE' });
    setRequests(requests.filter(r => r.id !== id));
  };

  const sendEmail = async () => {
    if (!selectedRequest || !responseText.trim()) return;
    setSending(true);
    try {
      await fetch(`/api/admin/webapp-requests/${selectedRequest.id}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          emailType,
          responseText,
          quoteAmount: emailType === 'quote' ? quoteAmount : undefined,
          stripePaymentLink: emailType === 'quote' ? stripePaymentLink : undefined,
          agreementPdfUrl: emailType === 'quote' ? agreementPdfUrl : undefined,
        }),
      });
      alert(emailType === 'quote' ? 'Quote email sent successfully!' : 'Response email sent successfully!');
      setSelectedRequest(null);
      resetForm();
      fetchRequests();
    } catch (error) {
      alert('Failed to send email');
    }
    setSending(false);
  };

  const resetForm = () => {
    setResponseText('');
    setQuoteAmount('');
    setStripePaymentLink('');
    setAgreementPdfUrl('');
    setEmailType('response');
  };

  const openRequest = (request: WebAppRequest) => {
    setSelectedRequest(request);
    resetForm();
  };

  const filteredRequests = requests.filter(r => {
    const matchesStatus = statusFilter === 'all' || (r.status || 'pending') === statusFilter;
    const words = searchQuery.toLowerCase().split(/\s+/).filter(w => w.length > 0);
    const matchesSearch = words.length === 0 || words.some(word =>
      r.name.toLowerCase().includes(word) ||
      r.email.toLowerCase().includes(word) ||
      r.description.toLowerCase().includes(word) ||
      r.projectType.toLowerCase().includes(word)
    );
    return matchesStatus && matchesSearch;
  });

  if (loading) return <p className="text-white">Loading...</p>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <h2 className="text-2xl text-primary" style={{ fontFamily: "'Cinzel', serif" }}>Website/App Requests ({requests.length})</h2>
        <div className="flex gap-2 flex-wrap">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-background border border-primary/20 rounded-md text-white"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="responded">Responded</option>
            <option value="quoted">Quoted</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </select>
          <input
            type="text"
            placeholder="Search requests..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="px-4 py-2 bg-background border border-primary/20 rounded-md text-white focus:border-primary focus:outline-none w-64"
          />
        </div>
      </div>

      {selectedRequest ? (
        <div className="bg-card border border-primary/20 rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl text-primary" style={{ fontFamily: "'Cinzel', serif" }}>Email {selectedRequest.name}</h3>
            <button
              onClick={() => {
                setSelectedRequest(null);
                resetForm();
              }}
              className="px-4 py-2 border border-primary text-primary rounded-md hover:bg-primary/10"
            >
              Cancel
            </button>
          </div>

          <div className="bg-background/50 rounded p-4 mb-6">
            <p className="text-muted-foreground mb-2"><strong>Project Type:</strong> {selectedRequest.projectType}</p>
            <p className="text-muted-foreground mb-2"><strong>Description:</strong></p>
            <p className="text-white/90 mb-4">{selectedRequest.description}</p>
            <p className="text-muted-foreground mb-2"><strong>Functionality:</strong></p>
            <p className="text-white/90 mb-4">{selectedRequest.functionality}</p>
            {selectedRequest.colorPreferences && (
              <p className="text-muted-foreground"><strong>Color Preferences:</strong> {selectedRequest.colorPreferences}</p>
            )}
            {selectedRequest.exampleSites && (
              <>
                <p className="text-muted-foreground mt-2"><strong>Example Sites:</strong></p>
                <p className="text-white/90">{selectedRequest.exampleSites}</p>
              </>
            )}
          </div>

          {selectedRequest.emailHistory && (() => {
            try {
              const history = JSON.parse(selectedRequest.emailHistory);
              if (history.length === 0) return null;
              return (
                <div className="bg-blue-500/10 border border-blue-500/30 rounded p-4 mb-6">
                  <h4 className="text-blue-400 font-semibold mb-3">Email History ({history.length} sent)</h4>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {history.map((entry: any, idx: number) => (
                      <div key={idx} className="bg-background/50 rounded p-3">
                        <div className="flex justify-between items-center mb-2">
                          <span className={`text-xs px-2 py-1 rounded ${
                            entry.type === 'quote' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'
                          }`}>
                            {entry.type === 'quote' ? 'Quote' : 'Response'}
                            {entry.quoteAmount && ` - ${entry.quoteAmount}`}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(entry.sentAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-white/80 text-sm whitespace-pre-wrap line-clamp-3">{entry.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            } catch {
              return null;
            }
          })()}

          <div className="space-y-4">
            <div>
              <label className="block text-primary mb-2">Email Type</label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setEmailType('response')}
                  className={`px-4 py-2 rounded-md border transition-all ${
                    emailType === 'response' 
                      ? 'bg-primary text-black border-primary' 
                      : 'border-primary/50 text-primary hover:bg-primary/10'
                  }`}
                >
                  Response Only
                </button>
                <button
                  type="button"
                  onClick={() => setEmailType('quote')}
                  className={`px-4 py-2 rounded-md border transition-all ${
                    emailType === 'quote' 
                      ? 'bg-primary text-black border-primary' 
                      : 'border-primary/50 text-primary hover:bg-primary/10'
                  }`}
                >
                  Quote + Agreement
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {emailType === 'response' 
                  ? 'Send a response without a formal quote - good for initial discussions' 
                  : 'Send a quote with price, payment link, and optional agreement PDF'}
              </p>
            </div>

            <div>
              <label className="block text-primary mb-2">
                {emailType === 'response' ? 'Your Response' : 'Quote Details'}
              </label>
              <textarea
                value={responseText}
                onChange={e => setResponseText(e.target.value)}
                placeholder={emailType === 'response' 
                  ? "Write your response here - discuss the project, ask questions, etc..."
                  : "Describe the design concept, scope, timeline, deliverables..."}
                className="w-full px-4 py-3 bg-background border border-primary/20 rounded-md text-white focus:border-primary focus:outline-none h-48"
              />
            </div>

            {emailType === 'quote' && (
              <>
                <div>
                  <label className="block text-primary mb-2">Quote Amount</label>
                  <input
                    type="text"
                    value={quoteAmount}
                    onChange={e => setQuoteAmount(e.target.value)}
                    placeholder="e.g. $2,500 or $500 + $25/month hosting"
                    className="w-full px-4 py-3 bg-background border border-primary/20 rounded-md text-white focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-primary mb-2">Agreement PDF (optional)</label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="file"
                      accept=".pdf"
                      ref={fileInputRef}
                      onChange={handlePdfUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="px-4 py-2 border border-primary/50 text-primary rounded-md hover:bg-primary/10 disabled:opacity-50"
                    >
                      {isUploading ? 'Uploading...' : 'Upload PDF'}
                    </button>
                    {agreementPdfUrl && (
                      <span className="text-green-400 text-sm">PDF uploaded</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Upload a service agreement PDF to attach to the quote email
                  </p>
                </div>

                <div>
                  <label className="block text-primary mb-2">Stripe Payment Link</label>
                  <input
                    type="url"
                    value={stripePaymentLink}
                    onChange={e => setStripePaymentLink(e.target.value)}
                    placeholder="https://buy.stripe.com/..."
                    className="w-full px-4 py-3 bg-background border border-primary/20 rounded-md text-white focus:border-primary focus:outline-none"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Payment = Agreement acceptance. When they pay, they accept the terms.
                  </p>
                </div>
              </>
            )}

            <button
              onClick={sendEmail}
              disabled={sending || !responseText.trim()}
              className="px-6 py-3 bg-primary text-black rounded-md hover:bg-primary/90 disabled:opacity-50"
            >
              {sending ? 'Sending...' : emailType === 'quote' ? 'Send Quote Email' : 'Send Response Email'}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRequests.length === 0 ? (
            <p className="text-white/80">No requests found.</p>
          ) : filteredRequests.map(request => (
            <div key={request.id} className="bg-card border border-primary/20 rounded-lg p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-primary font-medium">{request.name}</p>
                  <p className="text-muted-foreground text-sm">{request.email}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Type: {request.projectType} | {new Date(request.createdAt!).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={request.status || 'pending'}
                    onChange={e => updateStatus(request.id, e.target.value)}
                    className={`px-3 py-1 rounded text-sm border ${
                      request.status === 'completed' ? 'border-green-500 text-green-400' :
                      request.status === 'quoted' ? 'border-blue-500 text-blue-400' :
                      request.status === 'responded' ? 'border-purple-500 text-purple-400' :
                      request.status === 'in_progress' ? 'border-yellow-500 text-yellow-400' :
                      'border-primary text-primary'
                    } bg-background`}
                  >
                    <option value="pending">Pending</option>
                    <option value="responded">Responded</option>
                    <option value="quoted">Quoted</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="archived">Archived</option>
                  </select>
                  <button
                    onClick={() => openRequest(request)}
                    className="px-4 py-2 bg-primary text-black rounded-md hover:bg-primary/90 text-sm"
                  >
                    Email
                  </button>
                  <button
                    onClick={() => deleteRequest(request.id)}
                    className="px-3 py-2 text-sm border border-red-500 text-red-400 rounded hover:bg-red-500/20"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <div className="mb-4">
                <p className="text-muted-foreground text-sm mb-1">Description:</p>
                <p className="text-white/90">{request.description}</p>
              </div>
              <div className="mb-4">
                <p className="text-muted-foreground text-sm mb-1">Functionality:</p>
                <p className="text-white/90">{request.functionality}</p>
              </div>
              {request.colorPreferences && (
                <p className="text-muted-foreground text-sm">Colors: {request.colorPreferences}</p>
              )}
              {request.quoteResponse && (
                <div className="mt-4 p-3 bg-background/50 rounded">
                  <p className="text-muted-foreground text-sm mb-1">Quote Sent:</p>
                  <p className="text-white/80 text-sm whitespace-pre-wrap">{request.quoteResponse}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface AnalyticsSummary {
  pageViews: number;
  uniqueVisitors: number;
  sessions: number;
  conversions: {
    dream: number;
    music: number;
    webapp: number;
    newsletter: number;
    total: number;
  };
}

interface DailyMetric {
  date: string;
  pageViews: number;
  uniqueVisitors: number;
  sessions: number;
  conversions: number;
}

interface TopPage {
  pageUrl: string;
  pageTitle: string;
  views: number;
  uniqueVisitors: number;
}

interface TrafficSource {
  source: string;
  count: number;
}

interface Campaign {
  campaign: string;
  source: string;
  medium: string;
  visits: number;
  conversions: number;
}

interface DeviceData {
  devices: { device: string; count: number }[];
  browsers: { browser: string; count: number }[];
}

function AnalyticsSection() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [dailyData, setDailyData] = useState<DailyMetric[]>([]);
  const [topPages, setTopPages] = useState<TopPage[]>([]);
  const [sources, setSources] = useState<TrafficSource[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [deviceData, setDeviceData] = useState<DeviceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d');

  const fetchAnalytics = async () => {
    setLoading(true);
    const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const endDate = new Date().toISOString();
    const params = `?startDate=${startDate}&endDate=${endDate}`;

    try {
      const [summaryRes, dailyRes, pagesRes, sourcesRes, campaignsRes, devicesRes] = await Promise.all([
        fetch(`/api/admin/analytics/summary${params}`),
        fetch(`/api/admin/analytics/daily${params}`),
        fetch(`/api/admin/analytics/top-pages${params}`),
        fetch(`/api/admin/analytics/sources${params}`),
        fetch(`/api/admin/analytics/campaigns${params}`),
        fetch(`/api/admin/analytics/devices${params}`),
      ]);

      if (summaryRes.ok) setSummary(await summaryRes.json());
      if (dailyRes.ok) setDailyData(await dailyRes.json());
      if (pagesRes.ok) setTopPages(await pagesRes.json());
      if (sourcesRes.ok) setSources(await sourcesRes.json());
      if (campaignsRes.ok) setCampaigns(await campaignsRes.json());
      if (devicesRes.ok) setDeviceData(await devicesRes.json());
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  if (loading) {
    return <div className="text-center py-8 text-white">Loading analytics...</div>;
  }

  const maxPageViews = Math.max(...dailyData.map(d => d.pageViews), 1);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl text-primary" style={{ fontFamily: "'Cinzel', serif" }}>Analytics Dashboard</h2>
        <div className="flex gap-2">
          {(['7d', '30d', '90d'] as const).map(range => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-4 py-2 rounded-md text-sm ${
                dateRange === range
                  ? 'bg-primary text-black'
                  : 'border border-primary text-primary hover:bg-primary/10'
              }`}
            >
              {range === '7d' ? 'Last 7 Days' : range === '30d' ? 'Last 30 Days' : 'Last 90 Days'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border border-primary/20 rounded-lg p-6 text-center">
          <p className="text-3xl font-bold text-primary">{summary?.pageViews || 0}</p>
          <p className="text-muted-foreground">Page Views</p>
        </div>
        <div className="bg-card border border-primary/20 rounded-lg p-6 text-center">
          <p className="text-3xl font-bold text-primary">{summary?.uniqueVisitors || 0}</p>
          <p className="text-muted-foreground">Unique Visitors</p>
        </div>
        <div className="bg-card border border-primary/20 rounded-lg p-6 text-center">
          <p className="text-3xl font-bold text-primary">{summary?.sessions || 0}</p>
          <p className="text-muted-foreground">Sessions</p>
        </div>
        <div className="bg-card border border-primary/20 rounded-lg p-6 text-center">
          <p className="text-3xl font-bold text-primary">{summary?.conversions?.total || 0}</p>
          <p className="text-muted-foreground">Total Conversions</p>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <div className="bg-card border border-green-500/30 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-green-400">{summary?.conversions?.dream || 0}</p>
          <p className="text-muted-foreground text-sm">Dream Requests</p>
        </div>
        <div className="bg-card border border-blue-500/30 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-blue-400">{summary?.conversions?.music || 0}</p>
          <p className="text-muted-foreground text-sm">Music Requests</p>
        </div>
        <div className="bg-card border border-purple-500/30 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-purple-400">{summary?.conversions?.webapp || 0}</p>
          <p className="text-muted-foreground text-sm">Web/App Requests</p>
        </div>
        <div className="bg-card border border-yellow-500/30 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-yellow-400">{summary?.conversions?.newsletter || 0}</p>
          <p className="text-muted-foreground text-sm">Newsletter Signups</p>
        </div>
      </div>

      <div className="bg-card border border-primary/20 rounded-lg p-6">
        <h3 className="text-xl text-primary mb-4" style={{ fontFamily: "'Cinzel', serif" }}>Daily Traffic</h3>
        {dailyData.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No data available for this period</p>
        ) : (
          <div className="space-y-2">
            {dailyData.slice(-14).map(day => (
              <div key={day.date} className="flex items-center gap-4">
                <span className="text-muted-foreground w-24 text-sm">{format(new Date(day.date), 'MMM d')}</span>
                <div className="flex-1 bg-background rounded h-6 overflow-hidden">
                  <div
                    className="h-full bg-primary/60 rounded flex items-center px-2"
                    style={{ width: `${Math.max((day.pageViews / maxPageViews) * 100, 5)}%` }}
                  >
                    <span className="text-xs text-white">{day.pageViews} views</span>
                  </div>
                </div>
                <span className="text-muted-foreground text-sm w-20">{day.uniqueVisitors} visitors</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-card border border-primary/20 rounded-lg p-6">
          <h3 className="text-xl text-primary mb-4" style={{ fontFamily: "'Cinzel', serif" }}>Top Pages</h3>
          {topPages.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No page data yet</p>
          ) : (
            <div className="space-y-3">
              {topPages.map((page, i) => (
                <div key={i} className="flex justify-between items-center py-2 border-b border-primary/10 last:border-0">
                  <div>
                    <p className="text-white text-sm">{page.pageTitle || page.pageUrl}</p>
                    <p className="text-muted-foreground text-xs">{page.pageUrl}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-primary font-semibold">{page.views}</p>
                    <p className="text-muted-foreground text-xs">{page.uniqueVisitors} unique</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-card border border-primary/20 rounded-lg p-6">
          <h3 className="text-xl text-primary mb-4" style={{ fontFamily: "'Cinzel', serif" }}>Traffic Sources</h3>
          {sources.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No source data yet</p>
          ) : (
            <div className="space-y-3">
              {sources.map((source, i) => (
                <div key={i} className="flex justify-between items-center py-2 border-b border-primary/10 last:border-0">
                  <span className="text-white">{source.source}</span>
                  <span className="text-primary font-semibold">{source.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {campaigns.length > 0 && (
        <div className="bg-card border border-primary/20 rounded-lg p-6">
          <h3 className="text-xl text-primary mb-4" style={{ fontFamily: "'Cinzel', serif" }}>Campaign Performance</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-primary/20">
                  <th className="text-left py-3 px-2 text-muted-foreground">Campaign</th>
                  <th className="text-left py-3 px-2 text-muted-foreground">Source</th>
                  <th className="text-left py-3 px-2 text-muted-foreground">Medium</th>
                  <th className="text-right py-3 px-2 text-muted-foreground">Visits</th>
                  <th className="text-right py-3 px-2 text-muted-foreground">Conversions</th>
                  <th className="text-right py-3 px-2 text-muted-foreground">Conv. Rate</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c, i) => (
                  <tr key={i} className="border-b border-primary/10">
                    <td className="py-3 px-2 text-white">{c.campaign}</td>
                    <td className="py-3 px-2 text-muted-foreground">{c.source}</td>
                    <td className="py-3 px-2 text-muted-foreground">{c.medium}</td>
                    <td className="py-3 px-2 text-right text-white">{c.visits}</td>
                    <td className="py-3 px-2 text-right text-primary">{c.conversions}</td>
                    <td className="py-3 px-2 text-right text-green-400">
                      {c.visits > 0 ? ((c.conversions / c.visits) * 100).toFixed(1) : 0}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-card border border-primary/20 rounded-lg p-6">
          <h3 className="text-xl text-primary mb-4" style={{ fontFamily: "'Cinzel', serif" }}>Devices</h3>
          {!deviceData?.devices?.length ? (
            <p className="text-muted-foreground text-center py-4">No device data yet</p>
          ) : (
            <div className="space-y-3">
              {deviceData.devices.map((d, i) => (
                <div key={i} className="flex justify-between items-center py-2 border-b border-primary/10 last:border-0">
                  <span className="text-white capitalize">{d.device}</span>
                  <span className="text-primary font-semibold">{d.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-card border border-primary/20 rounded-lg p-6">
          <h3 className="text-xl text-primary mb-4" style={{ fontFamily: "'Cinzel', serif" }}>Browsers</h3>
          {!deviceData?.browsers?.length ? (
            <p className="text-muted-foreground text-center py-4">No browser data yet</p>
          ) : (
            <div className="space-y-3">
              {deviceData.browsers.map((b, i) => (
                <div key={i} className="flex justify-between items-center py-2 border-b border-primary/10 last:border-0">
                  <span className="text-white">{b.browser}</span>
                  <span className="text-primary font-semibold">{b.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-card border border-primary/20 rounded-lg p-6">
        <h3 className="text-xl text-primary mb-4" style={{ fontFamily: "'Cinzel', serif" }}>UTM Campaign Tracking Guide</h3>
        <p className="text-muted-foreground mb-4">
          Add these parameters to your links to track campaign performance:
        </p>
        <div className="bg-background p-4 rounded-md overflow-x-auto">
          <code className="text-sm text-primary">
            https://www.iamsahlien.com/?utm_source=facebook&utm_medium=social&utm_campaign=summer_launch
          </code>
        </div>
        <div className="grid md:grid-cols-3 gap-4 mt-4">
          <div>
            <p className="text-white font-medium">utm_source</p>
            <p className="text-muted-foreground text-sm">Traffic source (facebook, google, newsletter)</p>
          </div>
          <div>
            <p className="text-white font-medium">utm_medium</p>
            <p className="text-muted-foreground text-sm">Marketing medium (social, email, cpc)</p>
          </div>
          <div>
            <p className="text-white font-medium">utm_campaign</p>
            <p className="text-muted-foreground text-sm">Campaign name (summer_launch, new_album)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
