import express from "express";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";
import { db } from "./db";
import { blogPosts, emailSubscribers, dreamRequests, musicRequests, blogComments } from "@shared/schema";
import { eq, desc } from "drizzle-orm";

const app = express();
app.use(express.json());

const OWNER_EMAIL = process.env.OWNER_EMAIL || "";

async function main() {
  await setupAuth(app);
  registerAuthRoutes(app);
  registerObjectStorageRoutes(app);

  // Middleware to check if user is owner
  const isOwner: express.RequestHandler = async (req: any, res, next) => {
    if (!req.user?.claims?.email) {
      return res.status(403).json({ message: "Forbidden" });
    }
    if (req.user.claims.email !== OWNER_EMAIL) {
      return res.status(403).json({ message: "Forbidden - Owner access only" });
    }
    next();
  };

  // Public API routes

  // Submit dream interpretation request
  app.post("/api/dream-requests", async (req, res) => {
    try {
      const { email, name, dreamDescription } = req.body;
      if (!email || !name || !dreamDescription) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      const [request] = await db.insert(dreamRequests).values({
        email,
        name,
        dreamDescription,
      }).returning();
      res.json({ success: true, id: request.id });
    } catch (error) {
      console.error("Error creating dream request:", error);
      res.status(500).json({ message: "Failed to submit request" });
    }
  });

  // Submit music creation request
  app.post("/api/music-requests", async (req, res) => {
    try {
      const { email, name, description, mood, purpose } = req.body;
      if (!email || !name || !description) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      const [request] = await db.insert(musicRequests).values({
        email,
        name,
        description,
        mood,
        purpose,
      }).returning();
      res.json({ success: true, id: request.id });
    } catch (error) {
      console.error("Error creating music request:", error);
      res.status(500).json({ message: "Failed to submit request" });
    }
  });

  // Subscribe to email list
  app.post("/api/subscribe", async (req, res) => {
    try {
      const { email, name } = req.body;
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      const [subscriber] = await db.insert(emailSubscribers).values({
        email,
        name,
      }).onConflictDoNothing().returning();
      res.json({ success: true });
    } catch (error) {
      console.error("Error subscribing:", error);
      res.status(500).json({ message: "Failed to subscribe" });
    }
  });

  // Get published blog posts (public)
  app.get("/api/blog-posts", async (req, res) => {
    try {
      const category = req.query.category as string | undefined;
      let posts;
      if (category) {
        posts = await db.select().from(blogPosts)
          .where(eq(blogPosts.category, category))
          .orderBy(desc(blogPosts.createdAt));
      } else {
        posts = await db.select().from(blogPosts)
          .orderBy(desc(blogPosts.createdAt));
      }
      res.json(posts.filter(p => p.published));
    } catch (error) {
      console.error("Error fetching blog posts:", error);
      res.status(500).json({ message: "Failed to fetch posts" });
    }
  });

  // Get comments for a blog post (public)
  app.get("/api/blog-posts/:id/comments", async (req, res) => {
    try {
      const postId = parseInt(req.params.id);
      const comments = await db.select().from(blogComments)
        .where(eq(blogComments.postId, postId))
        .orderBy(desc(blogComments.createdAt));
      res.json(comments.filter(c => c.status === "published"));
    } catch (error) {
      console.error("Error fetching comments:", error);
      res.status(500).json({ message: "Failed to fetch comments" });
    }
  });

  // Post a comment (authenticated users only)
  app.post("/api/blog-posts/:id/comments", isAuthenticated, async (req: any, res) => {
    try {
      const postId = parseInt(req.params.id);
      const { content } = req.body;
      if (!content || content.trim().length === 0) {
        return res.status(400).json({ message: "Comment content is required" });
      }
      const user = req.user;
      const userName = user.claims?.firstName && user.claims?.lastName 
        ? `${user.claims.firstName} ${user.claims.lastName}`.trim()
        : user.claims?.email?.split('@')[0] || 'Anonymous';
      
      const [comment] = await db.insert(blogComments).values({
        postId,
        userId: user.claims?.sub,
        userName,
        userImage: user.claims?.picture,
        content: content.trim(),
      }).returning();
      res.json(comment);
    } catch (error) {
      console.error("Error creating comment:", error);
      res.status(500).json({ message: "Failed to post comment" });
    }
  });

  // Admin API routes (protected)

  // Check if current user is owner
  app.get("/api/admin/check", isAuthenticated, isOwner, async (req, res) => {
    res.json({ isOwner: true });
  });

  // Get all blog posts (admin)
  app.get("/api/admin/blog-posts", isAuthenticated, isOwner, async (req, res) => {
    try {
      const posts = await db.select().from(blogPosts).orderBy(desc(blogPosts.createdAt));
      res.json(posts);
    } catch (error) {
      console.error("Error fetching blog posts:", error);
      res.status(500).json({ message: "Failed to fetch posts" });
    }
  });

  // Create blog post
  app.post("/api/admin/blog-posts", isAuthenticated, isOwner, async (req, res) => {
    try {
      const { title, excerpt, content, category, published } = req.body;
      const [post] = await db.insert(blogPosts).values({
        title,
        excerpt,
        content,
        category,
        published: published ?? false,
      }).returning();
      res.json(post);
    } catch (error) {
      console.error("Error creating blog post:", error);
      res.status(500).json({ message: "Failed to create post" });
    }
  });

  // Update blog post
  app.put("/api/admin/blog-posts/:id", isAuthenticated, isOwner, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { title, excerpt, content, category, published } = req.body;
      const [post] = await db.update(blogPosts)
        .set({ title, excerpt, content, category, published, updatedAt: new Date() })
        .where(eq(blogPosts.id, id))
        .returning();
      res.json(post);
    } catch (error) {
      console.error("Error updating blog post:", error);
      res.status(500).json({ message: "Failed to update post" });
    }
  });

  // Delete blog post
  app.delete("/api/admin/blog-posts/:id", isAuthenticated, isOwner, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await db.delete(blogPosts).where(eq(blogPosts.id, id));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting blog post:", error);
      res.status(500).json({ message: "Failed to delete post" });
    }
  });

  // Get all email subscribers
  app.get("/api/admin/subscribers", isAuthenticated, isOwner, async (req, res) => {
    try {
      const subscribers = await db.select().from(emailSubscribers).orderBy(desc(emailSubscribers.subscribedAt));
      res.json(subscribers);
    } catch (error) {
      console.error("Error fetching subscribers:", error);
      res.status(500).json({ message: "Failed to fetch subscribers" });
    }
  });

  // Get all dream requests
  app.get("/api/admin/dream-requests", isAuthenticated, isOwner, async (req, res) => {
    try {
      const requests = await db.select().from(dreamRequests).orderBy(desc(dreamRequests.createdAt));
      res.json(requests);
    } catch (error) {
      console.error("Error fetching dream requests:", error);
      res.status(500).json({ message: "Failed to fetch requests" });
    }
  });

  // Update dream request status
  app.put("/api/admin/dream-requests/:id", isAuthenticated, isOwner, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status, notes } = req.body;
      const [request] = await db.update(dreamRequests)
        .set({ status, notes, updatedAt: new Date() })
        .where(eq(dreamRequests.id, id))
        .returning();
      res.json(request);
    } catch (error) {
      console.error("Error updating dream request:", error);
      res.status(500).json({ message: "Failed to update request" });
    }
  });

  // Get all music requests
  app.get("/api/admin/music-requests", isAuthenticated, isOwner, async (req, res) => {
    try {
      const requests = await db.select().from(musicRequests).orderBy(desc(musicRequests.createdAt));
      res.json(requests);
    } catch (error) {
      console.error("Error fetching music requests:", error);
      res.status(500).json({ message: "Failed to fetch requests" });
    }
  });

  // Update music request status
  app.put("/api/admin/music-requests/:id", isAuthenticated, isOwner, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status, notes } = req.body;
      const [request] = await db.update(musicRequests)
        .set({ status, notes, updatedAt: new Date() })
        .where(eq(musicRequests.id, id))
        .returning();
      res.json(request);
    } catch (error) {
      console.error("Error updating music request:", error);
      res.status(500).json({ message: "Failed to update request" });
    }
  });

  // Get all comments (admin)
  app.get("/api/admin/comments", isAuthenticated, isOwner, async (req, res) => {
    try {
      const comments = await db.select().from(blogComments).orderBy(desc(blogComments.createdAt));
      res.json(comments);
    } catch (error) {
      console.error("Error fetching comments:", error);
      res.status(500).json({ message: "Failed to fetch comments" });
    }
  });

  // Update comment status (admin)
  app.put("/api/admin/comments/:id", isAuthenticated, isOwner, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      const [comment] = await db.update(blogComments)
        .set({ status })
        .where(eq(blogComments.id, id))
        .returning();
      res.json(comment);
    } catch (error) {
      console.error("Error updating comment:", error);
      res.status(500).json({ message: "Failed to update comment" });
    }
  });

  // Delete comment (admin)
  app.delete("/api/admin/comments/:id", isAuthenticated, isOwner, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await db.delete(blogComments).where(eq(blogComments.id, id));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting comment:", error);
      res.status(500).json({ message: "Failed to delete comment" });
    }
  });

  const PORT = 3001;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Backend server running on port ${PORT}`);
  });
}

main().catch(console.error);
