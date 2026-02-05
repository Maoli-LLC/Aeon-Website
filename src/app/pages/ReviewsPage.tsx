import { useState, useEffect } from 'react';
import { Star, MessageSquare, User, Send, CheckCircle, X, PenLine } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

interface Review {
  id: number;
  user_name: string;
  service: string;
  rating: number;
  review_text: string;
  admin_response: string | null;
  responded_at: string | null;
  created_at: string;
}

const SERVICES = [
  { value: 'dream-interpretation', label: 'Dream Interpretation' },
  { value: 'music-single', label: 'Music - Single Song' },
  { value: 'music-album', label: 'Music - Album' },
  { value: 'website-creation', label: 'Website/App Creation' },
  { value: 'general', label: 'General Experience' },
];

export function ReviewsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [service, setService] = useState('');
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      const res = await fetch('/api/reviews');
      if (res.ok) {
        const data = await res.json();
        setReviews(data);
      }
    } catch (err) {
      console.error('Error fetching reviews:', err);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!service || !rating || !reviewText.trim()) {
      setError('Please fill in all fields');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service, rating, reviewText: reviewText.trim() }),
      });
      
      if (res.ok) {
        setSubmitted(true);
        setService('');
        setRating(0);
        setReviewText('');
        fetchReviews();
        setTimeout(() => {
          setShowForm(false);
          setSubmitted(false);
        }, 2000);
      } else {
        const data = await res.json();
        setError(data.message || 'Failed to submit review');
      }
    } catch (err) {
      setError('Failed to submit review. Please try again.');
    }
    setSubmitting(false);
  };

  const closeForm = () => {
    setShowForm(false);
    setService('');
    setRating(0);
    setReviewText('');
    setError('');
    setSubmitted(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const renderStars = (count: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={20}
            className={star <= count ? 'text-primary fill-primary' : 'text-white/30'}
          />
        ))}
      </div>
    );
  };

  const getServiceLabel = (value: string) => {
    const found = SERVICES.find((s) => s.value === value);
    return found ? found.label : value;
  };

  const averageRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : '0';

  return (
    <div>
      <section className="py-20 bg-secondary">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl mb-6 text-primary" style={{ fontFamily: "'Cinzel', serif" }}>
            Reviews
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            See what our clients are saying about Team Aeon
          </p>
          {reviews.length > 0 && (
            <div className="flex items-center justify-center gap-4">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    size={24}
                    className={star <= Math.round(Number(averageRating)) ? 'text-primary fill-primary' : 'text-white/30'}
                  />
                ))}
              </div>
              <span className="text-2xl text-white">{averageRating}</span>
              <span className="text-muted-foreground">({reviews.length} reviews)</span>
            </div>
          )}
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl mb-8 text-primary text-center" style={{ fontFamily: "'Cinzel', serif" }}>
            Client Reviews
          </h2>

          {loading ? (
            <div className="text-center py-12 text-muted-foreground">
              Loading reviews...
            </div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare size={48} className="mx-auto mb-4 text-primary/50" />
              <p className="text-muted-foreground">
                No reviews yet. Be the first to share your experience!
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {reviews.map((review) => (
                <div
                  key={review.id}
                  className="bg-card border border-primary/20 rounded-lg p-8"
                >
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-xl text-white font-medium">{review.user_name}</span>
                        {renderStars(review.rating)}
                      </div>
                      <span className="text-base text-primary/70">
                        {getServiceLabel(review.service)}
                      </span>
                    </div>
                    <span className="text-base text-muted-foreground">
                      {formatDate(review.created_at)}
                    </span>
                  </div>
                  
                  <p className="text-lg text-white/90 leading-relaxed mb-4">
                    {review.review_text}
                  </p>

                  {review.admin_response && (
                    <div className="mt-6 pt-6 border-t border-primary/20">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-primary text-base font-medium">Team Aeon Response:</span>
                        {review.responded_at && (
                          <span className="text-sm text-muted-foreground">
                            {formatDate(review.responded_at)}
                          </span>
                        )}
                      </div>
                      <p className="text-white/80 text-base italic leading-relaxed">
                        {review.admin_response}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="mt-12 text-center">
            {!authLoading && isAuthenticated && (
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-black rounded-md hover:bg-primary/90 transition-colors"
              >
                <PenLine size={20} />
                Submit a Review
              </button>
            )}
            
            {!authLoading && !isAuthenticated && (
              <a
                href="/login"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-black rounded-md hover:bg-primary/90 transition-colors"
              >
                <User size={20} />
                Log In to Submit a Review
              </a>
            )}
          </div>
        </div>
      </section>

      {showForm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-primary/30 rounded-lg p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl text-primary" style={{ fontFamily: "'Cinzel', serif" }}>
                Submit a Review
              </h2>
              <button
                onClick={closeForm}
                className="text-white/60 hover:text-white"
              >
                <X size={24} />
              </button>
            </div>

            {submitted ? (
              <div className="text-center py-8">
                <CheckCircle size={48} className="mx-auto mb-4 text-green-500" />
                <p className="text-white">Thank you for your review!</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm text-white/70 mb-2">
                    Which service are you reviewing?
                  </label>
                  <select
                    value={service}
                    onChange={(e) => setService(e.target.value)}
                    className="w-full px-4 py-3 bg-background border border-primary/30 rounded-md text-white focus:outline-none focus:border-primary"
                  >
                    <option value="">Select a service...</option>
                    {SERVICES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-white/70 mb-2">
                    Your Rating
                  </label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="focus:outline-none transition-transform hover:scale-110"
                      >
                        <Star
                          size={32}
                          className={
                            star <= (hoverRating || rating)
                              ? 'text-primary fill-primary'
                              : 'text-white/30'
                          }
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-white/70 mb-2">
                    Your Review
                  </label>
                  <textarea
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    placeholder="Share your experience with Team Aeon..."
                    rows={5}
                    className="w-full px-4 py-3 bg-background border border-primary/30 rounded-md text-white placeholder-white/40 focus:outline-none focus:border-primary resize-none"
                  />
                </div>

                {error && (
                  <p className="text-red-400 text-sm">{error}</p>
                )}

                <div className="flex gap-4">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-primary text-black rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    <Send size={18} />
                    {submitting ? 'Submitting...' : 'Submit Review'}
                  </button>
                  <button
                    type="button"
                    onClick={closeForm}
                    className="px-6 py-3 border border-primary/50 text-primary rounded-md hover:bg-primary/10 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
