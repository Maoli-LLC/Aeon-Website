import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useUpload } from '@/hooks/use-upload';
import type { BlogPost, DreamRequest, MusicRequest, EmailSubscriber, BlogComment } from '@shared/schema';

type AdminTab = 'blogs' | 'dreams' | 'music' | 'subscribers' | 'comments';

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
          {(['blogs', 'dreams', 'music', 'subscribers', 'comments'] as AdminTab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-md transition-all capitalize ${
                activeTab === tab 
                  ? 'bg-primary text-black' 
                  : 'border border-primary text-primary hover:bg-primary/10'
              }`}
            >
              {tab === 'blogs' ? 'Blog Posts' : tab === 'dreams' ? 'Dream Requests' : tab === 'music' ? 'Music Requests' : tab === 'subscribers' ? 'Email Subscribers' : 'Comments'}
            </button>
          ))}
        </div>

        {activeTab === 'blogs' && <BlogsSection />}
        {activeTab === 'dreams' && <DreamsSection />}
        {activeTab === 'music' && <MusicSection />}
        {activeTab === 'subscribers' && <SubscribersSection />}
        {activeTab === 'comments' && <CommentsSection />}
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
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl text-primary" style={{ fontFamily: "'Cinzel', serif" }}>Blog Posts</h2>
        <button
          onClick={() => { setShowForm(true); setEditingPost(null); setFormData({ title: '', excerpt: '', content: '', imageUrl: '', category: 'sahlien', published: false }); }}
          className="px-4 py-2 bg-primary text-black rounded-md hover:bg-primary/90"
        >
          New Post
        </button>
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
  const [selectedRequest, setSelectedRequest] = useState<DreamRequest | null>(null);
  const [interpretation, setInterpretation] = useState('');
  const [sending, setSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);

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

  if (loading) return <p className="text-white">Loading...</p>;

  return (
    <div>
      <h2 className="text-2xl text-primary mb-6" style={{ fontFamily: "'Cinzel', serif" }}>Dream Interpretation Requests</h2>
      
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
          {requests.length === 0 ? (
            <p className="text-white/80">No dream requests yet.</p>
          ) : requests.map(request => (
            <div 
              key={request.id} 
              onClick={() => openRequest(request)}
              className="bg-card border border-primary/20 rounded-lg p-4 cursor-pointer hover:border-primary/50 transition-all"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="text-lg text-primary">{request.name}</h3>
                  <p className="text-sm text-muted-foreground">{request.email}</p>
                </div>
                <span className={`px-3 py-1 rounded-md border text-sm capitalize ${getStatusColor(request.status || 'pending')}`}>
                  {(request.status || 'pending').replace('_', ' ')}
                </span>
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
