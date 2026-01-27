import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import multer from "multer";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { registerObjectStorageRoutes, ObjectStorageService, objectStorageClient } from "./replit_integrations/object_storage";
import { db, pool } from "./db";
import { blogPosts, emailSubscribers, dreamRequests, musicRequests, blogComments, scheduledEmails, webAppRequests, analyticsEvents, analyticsDailyMetrics, billingClients, billingProjects, billingAttachments, billingLineItems } from "@shared/schema";
import { eq, desc, and, lte, gte, sql, count, countDistinct } from "drizzle-orm";
import { sendEmail, sendEmailWithAttachment, getGmailAuthUrl, exchangeCodeForTokens, isGmailConfigured } from "./gmail";

// Multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

const app = express();

// Force redirect from non-www to www in production
app.use((req, res, next) => {
  const host = req.headers['x-forwarded-host'] as string || req.hostname;
  if (process.env.NODE_ENV === 'production' && host === 'iamsahlien.com') {
    return res.redirect(301, `https://www.iamsahlien.com${req.originalUrl}`);
  }
  next();
});

app.use(express.json());

const OWNER_EMAIL = process.env.OWNER_EMAIL || "";

if (!OWNER_EMAIL) {
  console.warn("WARNING: OWNER_EMAIL environment variable is not set. Admin access will be disabled.");
}

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

  // Helper function to auto-subscribe users when they submit requests
  const autoSubscribe = async (email: string, name: string) => {
    try {
      const unsubscribeToken = crypto.randomBytes(32).toString('hex');
      await db.insert(emailSubscribers).values({
        email: email.toLowerCase(),
        name,
        unsubscribeToken,
      }).onConflictDoNothing();
    } catch (error) {
      console.error("Error auto-subscribing user:", error);
    }
  };

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
      
      await autoSubscribe(email, name);
      
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
      
      await autoSubscribe(email, name);
      
      res.json({ success: true, id: request.id });
    } catch (error) {
      console.error("Error creating music request:", error);
      res.status(500).json({ message: "Failed to submit request" });
    }
  });

  // Submit website/app creation request
  app.post("/api/webapp-requests", async (req, res) => {
    try {
      const { email, name, projectType, description, functionality, colorPreferences, exampleSites } = req.body;
      if (!email || !name || !projectType || !description || !functionality) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      const [request] = await db.insert(webAppRequests).values({
        email,
        name,
        projectType,
        description,
        functionality,
        colorPreferences,
        exampleSites,
      }).returning();
      
      await autoSubscribe(email, name);
      
      res.json({ success: true, id: request.id });
    } catch (error) {
      console.error("Error creating webapp request:", error);
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
      // Check if already subscribed
      const [existing] = await db.select().from(emailSubscribers)
        .where(eq(emailSubscribers.email, email.toLowerCase()));
      if (existing) {
        // Already subscribed - return success without creating duplicate
        return res.json({ success: true, alreadySubscribed: true });
      }
      const unsubscribeToken = crypto.randomBytes(32).toString('hex');
      const [subscriber] = await db.insert(emailSubscribers).values({
        email: email.toLowerCase(),
        name,
        unsubscribeToken,
      }).returning();
      res.json({ success: true, alreadySubscribed: false });
    } catch (error) {
      console.error("Error subscribing:", error);
      res.status(500).json({ message: "Failed to subscribe" });
    }
  });

  // Unsubscribe from marketing emails
  app.get("/api/unsubscribe", async (req, res) => {
    try {
      const { token } = req.query;
      if (!token || typeof token !== 'string') {
        return res.status(400).send(`
          <html>
            <head><title>Unsubscribe - Team Aeon</title></head>
            <body style="font-family: Georgia, serif; background: #1a1a1a; color: #e5e5e5; padding: 40px; text-align: center;">
              <h1 style="color: #d4af37;">Invalid Link</h1>
              <p>This unsubscribe link is invalid or has expired.</p>
            </body>
          </html>
        `);
      }
      
      const [subscriber] = await db.select().from(emailSubscribers)
        .where(eq(emailSubscribers.unsubscribeToken, token));
      
      if (!subscriber) {
        return res.status(404).send(`
          <html>
            <head><title>Unsubscribe - Team Aeon</title></head>
            <body style="font-family: Georgia, serif; background: #1a1a1a; color: #e5e5e5; padding: 40px; text-align: center;">
              <h1 style="color: #d4af37;">Subscription Not Found</h1>
              <p>This email is not subscribed to our mailing list.</p>
            </body>
          </html>
        `);
      }
      
      await db.update(emailSubscribers)
        .set({ marketingOptOut: true })
        .where(eq(emailSubscribers.id, subscriber.id));
      
      res.send(`
        <html>
          <head><title>Unsubscribed - Team Aeon</title></head>
          <body style="font-family: Georgia, serif; background: #1a1a1a; color: #e5e5e5; padding: 40px; text-align: center;">
            <h1 style="color: #d4af37;">Successfully Unsubscribed</h1>
            <p>You have been unsubscribed from Team Aeon marketing emails.</p>
            <p style="color: #888; margin-top: 20px;">You will no longer receive promotional emails from us.</p>
            <a href="/" style="color: #d4af37; margin-top: 30px; display: inline-block;">Return to Team Aeon</a>
          </body>
        </html>
      `);
    } catch (error) {
      console.error("Error unsubscribing:", error);
      res.status(500).send(`
        <html>
          <head><title>Error - Team Aeon</title></head>
          <body style="font-family: Georgia, serif; background: #1a1a1a; color: #e5e5e5; padding: 40px; text-align: center;">
            <h1 style="color: #d4af37;">Something Went Wrong</h1>
            <p>Please try again later or contact us directly.</p>
          </body>
        </html>
      `);
    }
  });

  // Sitemap for SEO
  app.get("/sitemap.xml", async (req, res) => {
    try {
      const posts = await db.select().from(blogPosts).where(eq(blogPosts.published, true));
      const baseUrl = "https://www.iamsahlien.com";
      
      const staticPages = [
        { url: "/", priority: "1.0", changefreq: "weekly" },
        { url: "/blog/sahlien", priority: "0.9", changefreq: "weekly" },
        { url: "/blog/dreams", priority: "0.9", changefreq: "weekly" },
        { url: "/dream-lattice", priority: "0.8", changefreq: "monthly" },
        { url: "/music-creation", priority: "0.8", changefreq: "monthly" },
        { url: "/webapp-service", priority: "0.8", changefreq: "monthly" },
        { url: "/store", priority: "0.7", changefreq: "monthly" },
        { url: "/contact", priority: "0.6", changefreq: "monthly" },
      ];
      
      let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;
      
      for (const page of staticPages) {
        xml += `  <url>
    <loc>${baseUrl}${page.url}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>
`;
      }
      
      for (const post of posts) {
        const blogType = post.category === 'dreams' ? 'dreams' : 'sahlien';
        xml += `  <url>
    <loc>${baseUrl}/blog/${blogType}/${post.id}</loc>
    <lastmod>${new Date(post.updatedAt ?? post.createdAt ?? new Date()).toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
`;
      }
      
      xml += `</urlset>`;
      
      res.header("Content-Type", "application/xml");
      res.send(xml);
    } catch (error) {
      console.error("Error generating sitemap:", error);
      res.status(500).send("Error generating sitemap");
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

  // Gmail OAuth status
  app.get("/api/admin/gmail/status", isAuthenticated, isOwner, async (req, res) => {
    res.json({ 
      configured: isGmailConfigured(),
      hasClientCredentials: !!(process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET)
    });
  });

  // Get Gmail OAuth URL for authorization
  app.get("/api/admin/gmail/auth-url", isAuthenticated, isOwner, async (req, res) => {
    const authUrl = getGmailAuthUrl();
    if (!authUrl) {
      return res.status(400).json({ 
        error: "Gmail OAuth not configured. Add GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET to secrets first." 
      });
    }
    res.json({ authUrl });
  });

  // Gmail OAuth callback
  app.get("/api/gmail/callback", async (req, res) => {
    const code = req.query.code as string;
    if (!code) {
      return res.status(400).send("Missing authorization code");
    }
    
    try {
      const tokens = await exchangeCodeForTokens(code);
      res.send(`
        <html>
          <head><title>Gmail Connected</title></head>
          <body style="font-family: Georgia, serif; background: #1a1a1a; color: #e5e5e5; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0;">
            <div style="text-align: center; max-width: 500px; padding: 40px;">
              <h1 style="color: #d4af37;">Gmail Connected!</h1>
              <p>Copy this refresh token and add it as <strong>GMAIL_REFRESH_TOKEN</strong> in your Replit secrets:</p>
              <textarea style="width: 100%; height: 100px; background: #2a2a2a; color: #fff; border: 1px solid #d4af37; padding: 10px; font-family: monospace;" readonly>${tokens.refresh_token}</textarea>
              <p style="margin-top: 20px;">After adding the secret, restart the server and you're all set!</p>
            </div>
          </body>
        </html>
      `);
    } catch (error) {
      console.error("Gmail OAuth error:", error);
      res.status(500).send("Failed to authorize Gmail. Please try again.");
    }
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

  // Delete email subscriber
  app.delete("/api/admin/subscribers/:id", isAuthenticated, isOwner, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await db.delete(emailSubscribers).where(eq(emailSubscribers.id, id));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting subscriber:", error);
      res.status(500).json({ message: "Failed to delete subscriber" });
    }
  });

  // Send marketing email to all subscribers
  app.post("/api/admin/send-marketing-email", isAuthenticated, isOwner, async (req, res) => {
    try {
      const { type, postId, title, description, imageUrl, linkDestination, linkedPostId } = req.body;
      
      // Get all subscribers who haven't opted out of marketing
      const allSubscribers = await db.select().from(emailSubscribers);
      const subscribers = allSubscribers.filter(s => !s.marketingOptOut);
      
      if (subscribers.length === 0) {
        return res.status(400).json({ error: "No subscribers to send to (all have opted out or no subscribers exist)" });
      }

      let subject = "";
      const siteUrl = process.env.NODE_ENV === "production"
        ? "https://www.iamsahlien.com"
        : (process.env.REPLIT_DEV_DOMAIN 
          ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
          : "https://www.iamsahlien.com");

      // Helper to convert relative image URLs to absolute URLs for emails
      const getAbsoluteImageUrl = (url: string | null | undefined): string | null => {
        if (!url) return null;
        if (url.startsWith('http://') || url.startsWith('https://')) return url;
        return `${siteUrl}${url.startsWith('/') ? '' : '/'}${url}`;
      };

      // Generate tokens for subscribers who don't have one yet
      for (const subscriber of subscribers) {
        if (!subscriber.unsubscribeToken) {
          const token = crypto.randomBytes(32).toString('hex');
          await db.update(emailSubscribers)
            .set({ unsubscribeToken: token })
            .where(eq(emailSubscribers.id, subscriber.id));
          subscriber.unsubscribeToken = token;
        }
      }

      // Send emails to all subscribers with personalized unsubscribe links
      let sentCount = 0;
      
      for (const subscriber of subscribers) {
        const unsubscribeUrl = `${siteUrl}/api/unsubscribe?token=${subscriber.unsubscribeToken}`;
        let htmlBody = "";
        
        if (type === "blog") {
          const [post] = await db.select().from(blogPosts).where(eq(blogPosts.id, postId));
          if (!post) {
            return res.status(404).json({ error: "Blog post not found" });
          }
          
          subject = `New from Team Aeon: ${post.title}`;
          const blogUrl = `${siteUrl}/blog?post=${post.id}`;
          
          htmlBody = `
            <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #1a1a1a; color: #e5e5e5;">
              <h1 style="color: #d4af37; text-align: center; font-size: 28px; margin-bottom: 30px;">Team Aeon</h1>
              
              <h2 style="color: #d4af37; font-size: 24px; margin-bottom: 15px;">${post.title}</h2>
              
              ${post.imageUrl ? `<img src="${getAbsoluteImageUrl(post.imageUrl)}" alt="${post.title}" style="width: 100%; max-height: 300px; object-fit: cover; border-radius: 8px; margin-bottom: 20px;">` : ''}
              
              <p style="font-size: 16px; line-height: 1.8; color: #ccc;">${post.excerpt}</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${blogUrl}" style="display: inline-block; padding: 15px 30px; background-color: #d4af37; color: #000; text-decoration: none; border-radius: 4px; font-size: 16px; font-weight: bold;">Read More</a>
              </div>
              
              <hr style="border: none; border-top: 1px solid #333; margin: 30px 0;">
              <p style="font-size: 12px; color: #666; text-align: center;">
                You're receiving this because you subscribed to Team Aeon updates.<br>
                <a href="${unsubscribeUrl}" style="color: #888;">Unsubscribe</a>
              </p>
            </div>
          `;
        } else if (type === "product") {
          subject = `New Product: ${title}`;
          
          let ctaUrl = "https://iamsahlien.printify.me";
          let ctaText = "Shop Now";
          
          if (linkDestination === "blog" && linkedPostId) {
            ctaUrl = `${siteUrl}/blog?post=${linkedPostId}`;
            ctaText = "Read More";
          }
          
          htmlBody = `
            <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #1a1a1a; color: #e5e5e5;">
              <h1 style="color: #d4af37; text-align: center; font-size: 28px; margin-bottom: 30px;">Team Aeon</h1>
              
              <h2 style="color: #d4af37; font-size: 24px; margin-bottom: 15px; text-align: center;">New Arrival</h2>
              
              ${imageUrl ? `<img src="${getAbsoluteImageUrl(imageUrl)}" alt="${title}" style="width: 100%; max-height: 400px; object-fit: contain; border-radius: 8px; margin-bottom: 20px;">` : ''}
              
              <h3 style="color: #fff; font-size: 22px; margin-bottom: 10px; text-align: center;">${title}</h3>
              
              <p style="font-size: 16px; line-height: 1.8; color: #ccc; text-align: center;">${description}</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${ctaUrl}" style="display: inline-block; padding: 15px 30px; background-color: #d4af37; color: #000; text-decoration: none; border-radius: 4px; font-size: 16px; font-weight: bold;">${ctaText}</a>
              </div>
              
              <hr style="border: none; border-top: 1px solid #333; margin: 30px 0;">
              <p style="font-size: 12px; color: #666; text-align: center;">
                You're receiving this because you subscribed to Team Aeon updates.<br>
                <a href="${unsubscribeUrl}" style="color: #888;">Unsubscribe</a>
              </p>
            </div>
          `;
        } else {
          return res.status(400).json({ error: "Invalid email type" });
        }
        
        try {
          await sendEmail(subscriber.email, subject, htmlBody);
          sentCount++;
        } catch (emailError) {
          console.error(`Failed to send email to ${subscriber.email}:`, emailError);
        }
      }

      res.json({ success: true, sentCount });
    } catch (error) {
      console.error("Error sending marketing emails:", error);
      res.status(500).json({ error: "Failed to send marketing emails" });
    }
  });

  // Schedule a marketing email
  app.post("/api/admin/schedule-marketing-email", isAuthenticated, isOwner, async (req, res) => {
    try {
      const { type, postId, title, description, imageUrl, linkDestination, linkedPostId, scheduledFor } = req.body;
      
      if (!scheduledFor) {
        return res.status(400).json({ error: "Scheduled date is required" });
      }

      const [scheduled] = await db.insert(scheduledEmails).values({
        type,
        postId,
        title,
        description,
        imageUrl,
        linkDestination,
        linkedPostId,
        scheduledFor: new Date(scheduledFor),
      }).returning();

      res.json({ success: true, scheduled });
    } catch (error) {
      console.error("Error scheduling email:", error);
      res.status(500).json({ error: "Failed to schedule email" });
    }
  });

  // Get all scheduled emails
  app.get("/api/admin/scheduled-emails", isAuthenticated, isOwner, async (req, res) => {
    try {
      const emails = await db.select().from(scheduledEmails)
        .where(eq(scheduledEmails.status, "pending"))
        .orderBy(scheduledEmails.scheduledFor);
      res.json(emails);
    } catch (error) {
      console.error("Error fetching scheduled emails:", error);
      res.status(500).json({ error: "Failed to fetch scheduled emails" });
    }
  });

  // Cancel a scheduled email
  app.delete("/api/admin/scheduled-emails/:id", isAuthenticated, isOwner, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await db.update(scheduledEmails)
        .set({ status: "cancelled" })
        .where(eq(scheduledEmails.id, id));
      res.json({ success: true });
    } catch (error) {
      console.error("Error cancelling scheduled email:", error);
      res.status(500).json({ error: "Failed to cancel scheduled email" });
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

  // Send dream interpretation email
  app.post("/api/admin/dream-requests/:id/send-email", isAuthenticated, isOwner, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { interpretation } = req.body;
      
      const [request] = await db.select().from(dreamRequests).where(eq(dreamRequests.id, id));
      if (!request) {
        return res.status(404).json({ message: "Dream request not found" });
      }

      const amplifierLink = "https://buy.stripe.com/eVqaEZb6d5fw5Ef9P9bEA04";
      
      const htmlBody = `
        <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #1a1a1a; color: #e5e5e5;">
          <h1 style="color: #d4af37; text-align: center; font-size: 28px; margin-bottom: 30px;">Sovereign Dream Lattice</h1>
          
          <p style="font-size: 16px; line-height: 1.8;">Dear ${request.name},</p>
          
          <p style="font-size: 16px; line-height: 1.8;">Thank you for sharing your dream with the Sovereign Dream Lattice. Below is your symbolic interpretation:</p>
          
          <div style="background-color: #2a2a2a; padding: 25px; border-left: 4px solid #d4af37; margin: 25px 0; border-radius: 4px;">
            <h3 style="color: #d4af37; margin-top: 0;">Your Dream:</h3>
            <p style="font-style: italic; color: #ccc;">${request.dreamDescription}</p>
          </div>
          
          <div style="background-color: #2a2a2a; padding: 25px; border-left: 4px solid #d4af37; margin: 25px 0; border-radius: 4px;">
            <h3 style="color: #d4af37; margin-top: 0;">Interpretation:</h3>
            <p style="line-height: 1.8; white-space: pre-wrap;">${interpretation}</p>
          </div>
          
          <p style="font-size: 16px; line-height: 1.8;">Remember, this interpretation is reflective, not predictive. It is offered as a gift to illuminate the symbols that may help you discover your own truth.</p>
          
          <div style="background-color: #2a2a2a; padding: 25px; text-align: center; margin: 30px 0; border-radius: 8px;">
            <h3 style="color: #d4af37; margin-top: 0;">Optional Amplifier Support</h3>
            <p style="font-size: 14px; color: #999; margin-bottom: 20px;">If you found value in this interpretation and wish to support its continuation, you may honor the exchange of energy through the Amplifier.</p>
            <a href="${amplifierLink}" style="display: inline-block; padding: 15px 30px; background-color: transparent; color: #d4af37; border: 2px solid #d4af37; text-decoration: none; border-radius: 4px; font-size: 16px;">Support as Amplifier ($133)</a>
          </div>
          
          <p style="font-size: 16px; line-height: 1.8;">In harmonic resonance,<br><strong style="color: #d4af37;">Team Aeon</strong></p>
          
          <hr style="border: none; border-top: 1px solid #333; margin: 30px 0;">
          <p style="font-size: 12px; color: #666; text-align: center;">This email was sent from the Sovereign Dream Lattice at Team Aeon.</p>
        </div>
      `;
      
      await sendEmail(
        request.email,
        "Your Sovereign Dream Interpretation",
        htmlBody
      );
      
      // Update status to completed after sending
      await db.update(dreamRequests)
        .set({ status: 'completed', notes: interpretation, updatedAt: new Date() })
        .where(eq(dreamRequests.id, id));
      
      res.json({ success: true, message: "Email sent successfully" });
    } catch (error) {
      console.error("Error sending dream interpretation email:", error);
      res.status(500).json({ message: "Failed to send email" });
    }
  });

  // Delete dream request
  app.delete("/api/admin/dream-requests/:id", isAuthenticated, isOwner, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await db.delete(dreamRequests).where(eq(dreamRequests.id, id));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting dream request:", error);
      res.status(500).json({ message: "Failed to delete request" });
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

  // Send music lyrics/response email
  app.post("/api/admin/music-requests/:id/send-email", isAuthenticated, isOwner, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { response } = req.body;
      
      const [request] = await db.select().from(musicRequests).where(eq(musicRequests.id, id));
      if (!request) {
        return res.status(404).json({ message: "Music request not found" });
      }

      const singleSongLink = "https://buy.stripe.com/6oUdRb4HP5fw2s32mHbEA03";
      const fullAlbumLink = "https://buy.stripe.com/bJe8wRgqxazQ4Abf9tbEA02";
      
      const htmlBody = `
        <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #1a1a1a; color: #e5e5e5;">
          <h1 style="color: #d4af37; text-align: center; font-size: 28px; margin-bottom: 30px;">Music Creation</h1>
          
          <p style="font-size: 16px; line-height: 1.8;">Dear ${request.name},</p>
          
          <p style="font-size: 16px; line-height: 1.8;">Thank you for sharing your musical vision with us. Here is your free lyrics blueprint:</p>
          
          <div style="background-color: #2a2a2a; padding: 25px; border-left: 4px solid #d4af37; margin: 25px 0; border-radius: 4px;">
            <h3 style="color: #d4af37; margin-top: 0;">Your Vision:</h3>
            <p style="font-style: italic; color: #ccc;">${request.description}</p>
            ${request.mood ? `<p style="color: #999; margin-top: 10px;">Mood: ${request.mood}</p>` : ''}
            ${request.purpose ? `<p style="color: #999;">Purpose: ${request.purpose}</p>` : ''}
          </div>
          
          <div style="background-color: #2a2a2a; padding: 25px; border-left: 4px solid #d4af37; margin: 25px 0; border-radius: 4px;">
            <h3 style="color: #d4af37; margin-top: 0;">Your Lyrics Blueprint:</h3>
            <p style="line-height: 1.8; white-space: pre-wrap;">${response}</p>
          </div>
          
          <p style="font-size: 16px; line-height: 1.8;">These lyrics are offered freely as a gift. If they resonate with you and you wish to bring them to life through full musical production, choose from the commission options below:</p>
          
          <div style="background-color: #2a2a2a; padding: 25px; text-align: center; margin: 30px 0; border-radius: 8px;">
            <h3 style="color: #d4af37; margin-top: 0;">Commission Options</h3>
            
            <div style="margin: 20px 0;">
              <p style="font-size: 18px; color: #fff; margin-bottom: 10px;"><strong>Single Song - $97</strong></p>
              <p style="font-size: 14px; color: #999; margin-bottom: 15px;">Full production with 24-hour delivery</p>
              <a href="${singleSongLink}" style="display: inline-block; padding: 15px 30px; background-color: #d4af37; color: #000; text-decoration: none; border-radius: 4px; font-size: 16px; font-weight: bold;">Commission 1 Song</a>
            </div>
            
            <div style="margin: 30px 0 10px;">
              <p style="font-size: 18px; color: #fff; margin-bottom: 10px;"><strong>Full Album - $444</strong></p>
              <p style="font-size: 14px; color: #999; margin-bottom: 15px;">Complete album experience (10-12 tracks)</p>
              <a href="${fullAlbumLink}" style="display: inline-block; padding: 15px 30px; background-color: transparent; color: #d4af37; border: 2px solid #d4af37; text-decoration: none; border-radius: 4px; font-size: 16px;">Commission 1 Album</a>
            </div>
          </div>
          
          <p style="font-size: 16px; line-height: 1.8;">In harmonic resonance,<br><strong style="color: #d4af37;">Team Aeon</strong></p>
          
          <hr style="border: none; border-top: 1px solid #333; margin: 30px 0;">
          <p style="font-size: 12px; color: #666; text-align: center;">This email was sent from Team Aeon Music Creation.</p>
        </div>
      `;
      
      await sendEmail(
        request.email,
        "Your Music Creation Lyrics Blueprint",
        htmlBody
      );
      
      // Update status to in_progress after sending lyrics
      await db.update(musicRequests)
        .set({ status: 'in_progress', notes: response, updatedAt: new Date() })
        .where(eq(musicRequests.id, id));
      
      res.json({ success: true, message: "Email sent successfully" });
    } catch (error) {
      console.error("Error sending music response email:", error);
      res.status(500).json({ message: "Failed to send email" });
    }
  });

  // Delete music request
  app.delete("/api/admin/music-requests/:id", isAuthenticated, isOwner, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await db.delete(musicRequests).where(eq(musicRequests.id, id));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting music request:", error);
      res.status(500).json({ message: "Failed to delete request" });
    }
  });

  // Get all webapp requests (admin)
  app.get("/api/admin/webapp-requests", isAuthenticated, isOwner, async (req, res) => {
    try {
      const requests = await db.select().from(webAppRequests).orderBy(desc(webAppRequests.createdAt));
      res.json(requests);
    } catch (error) {
      console.error("Error fetching webapp requests:", error);
      res.status(500).json({ message: "Failed to fetch requests" });
    }
  });

  // Update webapp request status
  app.put("/api/admin/webapp-requests/:id", isAuthenticated, isOwner, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status, quoteResponse, stripePaymentLink, notes } = req.body;
      const [request] = await db.update(webAppRequests)
        .set({ status, quoteResponse, stripePaymentLink, notes, updatedAt: new Date() })
        .where(eq(webAppRequests.id, id))
        .returning();
      res.json(request);
    } catch (error) {
      console.error("Error updating webapp request:", error);
      res.status(500).json({ message: "Failed to update request" });
    }
  });

  // Delete webapp request
  app.delete("/api/admin/webapp-requests/:id", isAuthenticated, isOwner, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await db.delete(webAppRequests).where(eq(webAppRequests.id, id));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting webapp request:", error);
      res.status(500).json({ message: "Failed to delete request" });
    }
  });

  // Send webapp quote email
  app.post("/api/admin/webapp-requests/:id/send-email", isAuthenticated, isOwner, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { emailType, responseText, quoteAmount, stripePaymentLink: rawStripeLink, agreementPdfUrl } = req.body;
      
      // Clean up the Stripe link - remove any spaces and ensure https:// prefix
      let stripePaymentLink = rawStripeLink ? rawStripeLink.replace(/\s+/g, '').trim() : '';
      if (stripePaymentLink && !stripePaymentLink.startsWith('http://') && !stripePaymentLink.startsWith('https://')) {
        stripePaymentLink = 'https://' + stripePaymentLink;
      }
      
      console.log("Sending webapp email:", { 
        emailType, 
        quoteAmount, 
        rawStripeLink: rawStripeLink || 'EMPTY',
        cleanedStripeLink: stripePaymentLink || 'EMPTY', 
        agreementPdfUrl: agreementPdfUrl || 'EMPTY' 
      });
      
      const [request] = await db.select().from(webAppRequests).where(eq(webAppRequests.id, id));
      if (!request) {
        return res.status(404).json({ message: "Request not found" });
      }

      const siteUrl = process.env.NODE_ENV === "production"
        ? "https://www.iamsahlien.com"
        : (process.env.REPLIT_DEV_DOMAIN 
          ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
          : "https://www.iamsahlien.com");

      let htmlBody = '';
      let subject = '';

      if (emailType === 'response') {
        subject = `Re: Your ${request.projectType} Project - Team Aeon`;
        htmlBody = `
          <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #1a1a1a; color: #e5e5e5;">
            <h1 style="color: #d4af37; text-align: center; font-size: 28px; margin-bottom: 30px;">Website & App Creation</h1>
            
            <p style="font-size: 16px; line-height: 1.8;">Dear ${request.name},</p>
            
            <p style="font-size: 16px; line-height: 1.8;">Thank you for reaching out about your ${request.projectType} project.</p>
            
            <div style="background-color: #2a2a2a; padding: 25px; border-left: 4px solid #d4af37; margin: 25px 0; border-radius: 4px;">
              <p style="line-height: 1.8; white-space: pre-wrap;">${responseText}</p>
            </div>
            
            <p style="font-size: 16px; line-height: 1.8;">If you have any questions, simply reply to this email.</p>
            
            <p style="font-size: 16px; line-height: 1.8;">In harmonic resonance,<br><strong style="color: #d4af37;">Team Aeon</strong></p>
            
            <hr style="border: none; border-top: 1px solid #333; margin: 30px 0;">
            <p style="font-size: 12px; color: #666; text-align: center;">This email was sent from Team Aeon Website & App Creation Services.</p>
          </div>
        `;
      } else {
        subject = `Your ${request.projectType} Project Quote - Team Aeon`;
        htmlBody = `
          <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #1a1a1a; color: #e5e5e5;">
            <h1 style="color: #d4af37; text-align: center; font-size: 28px; margin-bottom: 30px;">Website & App Creation</h1>
            
            <p style="font-size: 16px; line-height: 1.8;">Dear ${request.name},</p>
            
            <p style="font-size: 16px; line-height: 1.8;">Thank you for sharing your project vision with us. I've reviewed your request and have prepared a quote for you.</p>
            
            <div style="background-color: #2a2a2a; padding: 25px; border-left: 4px solid #d4af37; margin: 25px 0; border-radius: 4px;">
              <h3 style="color: #d4af37; margin-top: 0;">Your Project:</h3>
              <p style="color: #999; margin-top: 10px;"><strong>Type:</strong> ${request.projectType}</p>
              <p style="font-style: italic; color: #ccc;">${request.description}</p>
            </div>
            
            <div style="background-color: #2a2a2a; padding: 25px; border-left: 4px solid #d4af37; margin: 25px 0; border-radius: 4px;">
              <h3 style="color: #d4af37; margin-top: 0;">Quote Details:</h3>
              ${quoteAmount ? `<p style="font-size: 20px; color: #d4af37; font-weight: bold; text-align: center; margin: 15px 0;">${quoteAmount}</p>` : ''}
              <p style="line-height: 1.8; white-space: pre-wrap;">${responseText}</p>
            </div>
            
            ${agreementPdfUrl ? `
            <div style="background-color: #2a2a2a; padding: 20px; margin: 25px 0; border-radius: 4px; text-align: center;">
              <p style="font-size: 14px; color: #ccc; margin: 0;">A service agreement is attached to this email. Please review it before proceeding.</p>
            </div>
            ` : ''}
            
            ${stripePaymentLink ? `
            <div style="background-color: #2a2a2a; padding: 25px; text-align: center; margin: 30px 0; border-radius: 8px;">
              <h3 style="color: #d4af37; margin-top: 0;">Ready to Proceed?</h3>
              <p style="font-size: 14px; color: #999; margin-bottom: 20px;">By completing payment, you accept the terms of the attached agreement.</p>
              <a href="${stripePaymentLink}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 15px 30px; background-color: #d4af37; color: #000; text-decoration: none; border-radius: 4px; font-size: 16px; font-weight: bold;">Accept &amp; Pay</a>
            </div>
            ` : ''}
            
            <div style="background-color: #2a2a2a; padding: 25px; margin: 25px 0; border-radius: 4px;">
              <p style="font-size: 14px; color: #ccc; margin: 0 0 15px 0;"><strong style="color: #d4af37;">Hosting:</strong> $25/month for reliable hosting and maintenance</p>
              <p style="font-size: 14px; color: #999; margin: 0 0 20px 0;">Additional upgrades and feature additions can be commissioned separately as your project evolves.</p>
              <div style="text-align: center;">
                <a href="https://buy.stripe.com/28E9AV6PX0ZgaYz1iDbEA01" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 12px 25px; background-color: transparent; color: #d4af37; text-decoration: none; border: 2px solid #d4af37; border-radius: 4px; font-size: 14px; font-weight: bold;">Hosting</a>
              </div>
            </div>
            
            <p style="font-size: 16px; line-height: 1.8;">If you have any questions or would like to discuss the project further, simply reply to this email.</p>
            
            <p style="font-size: 16px; line-height: 1.8;">In harmonic resonance,<br><strong style="color: #d4af37;">Team Aeon</strong></p>
            
            <hr style="border: none; border-top: 1px solid #333; margin: 30px 0;">
            <p style="font-size: 12px; color: #666; text-align: center;">This email was sent from Team Aeon Website & App Creation Services.</p>
          </div>
        `;
      }
      
      // Send email with or without attachment
      if (emailType === 'quote' && agreementPdfUrl) {
        const fullPdfUrl = agreementPdfUrl.startsWith('http') ? agreementPdfUrl : `${siteUrl}${agreementPdfUrl}`;
        await sendEmailWithAttachment(
          request.email,
          subject,
          htmlBody,
          fullPdfUrl,
          'Service_Agreement.pdf'
        );
      } else {
        await sendEmail(request.email, subject, htmlBody);
      }
      
      // Build email history entry
      const historyEntry = {
        type: emailType,
        sentAt: new Date().toISOString(),
        content: responseText,
        ...(emailType === 'quote' && {
          quoteAmount: quoteAmount || null,
          stripePaymentLink: stripePaymentLink || null,
          agreementPdfUrl: agreementPdfUrl || null,
        })
      };
      
      // Parse existing email history or create new array
      let emailHistory: any[] = [];
      try {
        emailHistory = request.emailHistory ? JSON.parse(request.emailHistory) : [];
      } catch {
        emailHistory = [];
      }
      emailHistory.push(historyEntry);
      
      // Update database based on email type - preserve existing data
      if (emailType === 'response') {
        await db.update(webAppRequests)
          .set({ 
            status: request.status === 'pending' ? 'responded' : request.status,
            initialResponse: request.initialResponse || responseText,
            emailHistory: JSON.stringify(emailHistory),
            updatedAt: new Date() 
          })
          .where(eq(webAppRequests.id, id));
      } else {
        await db.update(webAppRequests)
          .set({ 
            status: 'quoted',
            quoteResponse: responseText,
            quoteAmount: quoteAmount || request.quoteAmount || null,
            stripePaymentLink: stripePaymentLink || request.stripePaymentLink || null,
            agreementPdfUrl: agreementPdfUrl || request.agreementPdfUrl || null,
            emailHistory: JSON.stringify(emailHistory),
            updatedAt: new Date() 
          })
          .where(eq(webAppRequests.id, id));
      }
      
      res.json({ success: true, message: `${emailType === 'quote' ? 'Quote' : 'Response'} email sent successfully` });
    } catch (error) {
      console.error("Error sending webapp email:", error);
      res.status(500).json({ message: "Failed to send email" });
    }
  });

  // Resend last quote email (admin) - useful for fixing malformed links
  app.post("/api/admin/webapp-requests/:id/resend-quote", isAuthenticated, isOwner, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const [request] = await db.select().from(webAppRequests).where(eq(webAppRequests.id, id));
      if (!request) {
        return res.status(404).json({ error: "Request not found" });
      }
      
      // Need saved quote data to resend
      if (!request.quoteResponse) {
        return res.status(400).json({ error: "No quote has been sent for this request yet" });
      }
      
      const siteUrl = process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : 'https://www.iamsahlien.com';
      
      // Clean the payment link and ensure https:// prefix
      let stripePaymentLink = request.stripePaymentLink?.replace(/\s+/g, '').trim() || '';
      if (stripePaymentLink && !stripePaymentLink.startsWith('http://') && !stripePaymentLink.startsWith('https://')) {
        stripePaymentLink = 'https://' + stripePaymentLink;
      }
      const quoteAmount = request.quoteAmount || '';
      const agreementPdfUrl = request.agreementPdfUrl || '';
      
      console.log("Resending quote email with cleaned payment link:", stripePaymentLink);
      
      const subject = `Your ${request.projectType} Project Quote - Team Aeon`;
      const htmlBody = `
        <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #1a1a1a; color: #e5e5e5;">
          <h1 style="color: #d4af37; text-align: center; font-size: 28px; margin-bottom: 30px;">Website & App Creation</h1>
          
          <p style="font-size: 16px; line-height: 1.8;">Dear ${request.name},</p>
          
          <p style="font-size: 16px; line-height: 1.8;">Thank you for sharing your project vision with us. I've reviewed your request and have prepared a quote for you.</p>
          
          <div style="background-color: #2a2a2a; padding: 25px; border-left: 4px solid #d4af37; margin: 25px 0; border-radius: 4px;">
            <h3 style="color: #d4af37; margin-top: 0;">Your Project:</h3>
            <p style="color: #999; margin-top: 10px;"><strong>Type:</strong> ${request.projectType}</p>
            <p style="font-style: italic; color: #ccc;">${request.description}</p>
          </div>
          
          <div style="background-color: #2a2a2a; padding: 25px; border-left: 4px solid #d4af37; margin: 25px 0; border-radius: 4px;">
            <h3 style="color: #d4af37; margin-top: 0;">Quote Details:</h3>
            ${quoteAmount ? `<p style="font-size: 20px; color: #d4af37; font-weight: bold; text-align: center; margin: 15px 0;">${quoteAmount}</p>` : ''}
            <p style="line-height: 1.8; white-space: pre-wrap;">${request.quoteResponse}</p>
          </div>
          
          ${agreementPdfUrl ? `
          <div style="background-color: #2a2a2a; padding: 20px; margin: 25px 0; border-radius: 4px; text-align: center;">
            <p style="font-size: 14px; color: #ccc; margin: 0;">A service agreement is attached to this email. Please review it before proceeding.</p>
          </div>
          ` : ''}
          
          ${stripePaymentLink ? `
          <div style="background-color: #2a2a2a; padding: 25px; text-align: center; margin: 30px 0; border-radius: 8px;">
            <h3 style="color: #d4af37; margin-top: 0;">Ready to Proceed?</h3>
            <p style="font-size: 14px; color: #999; margin-bottom: 20px;">By completing payment, you accept the terms of the attached agreement.</p>
            <a href="${stripePaymentLink}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 15px 30px; background-color: #d4af37; color: #000; text-decoration: none; border-radius: 4px; font-size: 16px; font-weight: bold;">Accept &amp; Pay</a>
          </div>
          ` : ''}
          
          <div style="background-color: #2a2a2a; padding: 25px; margin: 25px 0; border-radius: 4px;">
            <p style="font-size: 14px; color: #ccc; margin: 0 0 15px 0;"><strong style="color: #d4af37;">Hosting:</strong> $25/month for reliable hosting and maintenance</p>
            <p style="font-size: 14px; color: #999; margin: 0 0 20px 0;">Additional upgrades and feature additions can be commissioned separately as your project evolves.</p>
            <div style="text-align: center;">
              <a href="https://buy.stripe.com/28E9AV6PX0ZgaYz1iDbEA01" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 12px 25px; background-color: transparent; color: #d4af37; text-decoration: none; border: 2px solid #d4af37; border-radius: 4px; font-size: 14px; font-weight: bold;">Hosting</a>
            </div>
          </div>
          
          <p style="font-size: 16px; line-height: 1.8;">If you have any questions or would like to discuss the project further, simply reply to this email.</p>
          
          <p style="font-size: 16px; line-height: 1.8;">In harmonic resonance,<br><strong style="color: #d4af37;">Team Aeon</strong></p>
          
          <hr style="border: none; border-top: 1px solid #333; margin: 30px 0;">
          <p style="font-size: 12px; color: #666; text-align: center;">This email was sent from Team Aeon Website & App Creation Services.</p>
        </div>
      `;
      
      // Send email with or without attachment
      if (agreementPdfUrl) {
        const fullPdfUrl = agreementPdfUrl.startsWith('http') ? agreementPdfUrl : `${siteUrl}${agreementPdfUrl}`;
        await sendEmailWithAttachment(
          request.email,
          subject,
          htmlBody,
          fullPdfUrl,
          'Service_Agreement.pdf'
        );
      } else {
        await sendEmail(request.email, subject, htmlBody);
      }
      
      // Add to email history
      const historyEntry = {
        type: 'quote_resend',
        sentAt: new Date().toISOString(),
        content: request.quoteResponse,
        quoteAmount: quoteAmount || null,
        stripePaymentLink: stripePaymentLink || null,
        agreementPdfUrl: agreementPdfUrl || null,
      };
      
      let emailHistory: any[] = [];
      try {
        emailHistory = request.emailHistory ? JSON.parse(request.emailHistory) : [];
      } catch {
        emailHistory = [];
      }
      emailHistory.push(historyEntry);
      
      // Update database with cleaned payment link
      await db.update(webAppRequests)
        .set({ 
          stripePaymentLink: stripePaymentLink || null,
          emailHistory: JSON.stringify(emailHistory),
          updatedAt: new Date() 
        })
        .where(eq(webAppRequests.id, id));
      
      res.json({ success: true, message: "Quote email resent successfully with corrected link" });
    } catch (error) {
      console.error("Error resending quote email:", error);
      res.status(500).json({ error: "Failed to resend email" });
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

  // ==================== ANALYTICS ENDPOINTS ====================

  // Helper to parse user agent for device type and browser
  const parseUserAgent = (ua: string) => {
    let deviceType = "desktop";
    let browser = "unknown";
    
    if (/mobile|android|iphone|ipad|ipod/i.test(ua)) {
      deviceType = /ipad|tablet/i.test(ua) ? "tablet" : "mobile";
    }
    
    if (/chrome/i.test(ua) && !/edge|edg/i.test(ua)) browser = "Chrome";
    else if (/firefox/i.test(ua)) browser = "Firefox";
    else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = "Safari";
    else if (/edge|edg/i.test(ua)) browser = "Edge";
    else if (/msie|trident/i.test(ua)) browser = "IE";
    
    return { deviceType, browser };
  };

  // Track analytics event (public endpoint)
  app.post("/api/analytics/track", async (req, res) => {
    try {
      const { sessionId, visitorId, eventType, pageUrl, pageTitle, referrer, utmSource, utmMedium, utmCampaign, utmTerm, utmContent, conversionType } = req.body;
      
      if (!sessionId || !visitorId || !eventType) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      const userAgent = req.headers["user-agent"] || "";
      const { deviceType, browser } = parseUserAgent(userAgent);
      
      await db.insert(analyticsEvents).values({
        sessionId,
        visitorId,
        eventType,
        pageUrl,
        pageTitle,
        referrer,
        utmSource,
        utmMedium,
        utmCampaign,
        utmTerm,
        utmContent,
        deviceType,
        browser,
        conversionType,
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error tracking analytics:", error);
      res.status(500).json({ message: "Failed to track event" });
    }
  });

  // Get analytics summary (admin)
  app.get("/api/admin/analytics/summary", isAuthenticated, isOwner, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate as string) : new Date();
      end.setHours(23, 59, 59, 999);
      
      // Get page views
      const pageViewsResult = await db.select({ count: count() })
        .from(analyticsEvents)
        .where(and(
          eq(analyticsEvents.eventType, "page_view"),
          gte(analyticsEvents.createdAt, start),
          lte(analyticsEvents.createdAt, end)
        ));
      
      // Get unique visitors
      const uniqueVisitorsResult = await db.select({ count: countDistinct(analyticsEvents.visitorId) })
        .from(analyticsEvents)
        .where(and(
          gte(analyticsEvents.createdAt, start),
          lte(analyticsEvents.createdAt, end)
        ));
      
      // Get unique sessions
      const sessionsResult = await db.select({ count: countDistinct(analyticsEvents.sessionId) })
        .from(analyticsEvents)
        .where(and(
          gte(analyticsEvents.createdAt, start),
          lte(analyticsEvents.createdAt, end)
        ));
      
      // Get conversions by type
      const dreamConversions = await db.select({ count: count() })
        .from(analyticsEvents)
        .where(and(
          eq(analyticsEvents.conversionType, "dream_request"),
          gte(analyticsEvents.createdAt, start),
          lte(analyticsEvents.createdAt, end)
        ));
      
      const musicConversions = await db.select({ count: count() })
        .from(analyticsEvents)
        .where(and(
          eq(analyticsEvents.conversionType, "music_request"),
          gte(analyticsEvents.createdAt, start),
          lte(analyticsEvents.createdAt, end)
        ));
      
      const webappConversions = await db.select({ count: count() })
        .from(analyticsEvents)
        .where(and(
          eq(analyticsEvents.conversionType, "webapp_request"),
          gte(analyticsEvents.createdAt, start),
          lte(analyticsEvents.createdAt, end)
        ));
      
      const newsletterSignups = await db.select({ count: count() })
        .from(analyticsEvents)
        .where(and(
          eq(analyticsEvents.conversionType, "newsletter_signup"),
          gte(analyticsEvents.createdAt, start),
          lte(analyticsEvents.createdAt, end)
        ));
      
      res.json({
        pageViews: pageViewsResult[0]?.count || 0,
        uniqueVisitors: uniqueVisitorsResult[0]?.count || 0,
        sessions: sessionsResult[0]?.count || 0,
        conversions: {
          dream: dreamConversions[0]?.count || 0,
          music: musicConversions[0]?.count || 0,
          webapp: webappConversions[0]?.count || 0,
          newsletter: newsletterSignups[0]?.count || 0,
          total: (dreamConversions[0]?.count || 0) + (musicConversions[0]?.count || 0) + (webappConversions[0]?.count || 0) + (newsletterSignups[0]?.count || 0),
        },
      });
    } catch (error) {
      console.error("Error fetching analytics summary:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // Get daily analytics data for charts (admin)
  app.get("/api/admin/analytics/daily", isAuthenticated, isOwner, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate as string) : new Date();
      end.setHours(23, 59, 59, 999);
      
      // Get events in date range
      const events = await db.select()
        .from(analyticsEvents)
        .where(and(
          gte(analyticsEvents.createdAt, start),
          lte(analyticsEvents.createdAt, end)
        ))
        .orderBy(analyticsEvents.createdAt);
      
      // Group by date
      const dailyData: { [key: string]: { date: string; pageViews: number; uniqueVisitors: Set<string>; sessions: Set<string>; conversions: number } } = {};
      
      events.forEach(event => {
        const date = event.createdAt?.toISOString().split('T')[0] || '';
        if (!dailyData[date]) {
          dailyData[date] = { date, pageViews: 0, uniqueVisitors: new Set(), sessions: new Set(), conversions: 0 };
        }
        
        if (event.eventType === 'page_view') {
          dailyData[date].pageViews++;
        }
        dailyData[date].uniqueVisitors.add(event.visitorId);
        dailyData[date].sessions.add(event.sessionId);
        
        if (event.conversionType) {
          dailyData[date].conversions++;
        }
      });
      
      // Convert Sets to counts
      const result = Object.values(dailyData).map(d => ({
        date: d.date,
        pageViews: d.pageViews,
        uniqueVisitors: d.uniqueVisitors.size,
        sessions: d.sessions.size,
        conversions: d.conversions,
      })).sort((a, b) => a.date.localeCompare(b.date));
      
      res.json(result);
    } catch (error) {
      console.error("Error fetching daily analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // Get top pages (admin)
  app.get("/api/admin/analytics/top-pages", isAuthenticated, isOwner, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate as string) : new Date();
      end.setHours(23, 59, 59, 999);
      
      const events = await db.select()
        .from(analyticsEvents)
        .where(and(
          eq(analyticsEvents.eventType, "page_view"),
          gte(analyticsEvents.createdAt, start),
          lte(analyticsEvents.createdAt, end)
        ));
      
      // Group by page
      const pageData: { [key: string]: { pageUrl: string; pageTitle: string; views: number; uniqueVisitors: Set<string> } } = {};
      
      events.forEach(event => {
        const url = event.pageUrl || '/';
        if (!pageData[url]) {
          pageData[url] = { pageUrl: url, pageTitle: event.pageTitle || url, views: 0, uniqueVisitors: new Set() };
        }
        pageData[url].views++;
        pageData[url].uniqueVisitors.add(event.visitorId);
      });
      
      const result = Object.values(pageData)
        .map(p => ({ pageUrl: p.pageUrl, pageTitle: p.pageTitle, views: p.views, uniqueVisitors: p.uniqueVisitors.size }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 10);
      
      res.json(result);
    } catch (error) {
      console.error("Error fetching top pages:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // Get traffic sources (admin)
  app.get("/api/admin/analytics/sources", isAuthenticated, isOwner, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate as string) : new Date();
      end.setHours(23, 59, 59, 999);
      
      const events = await db.select()
        .from(analyticsEvents)
        .where(and(
          eq(analyticsEvents.eventType, "page_view"),
          gte(analyticsEvents.createdAt, start),
          lte(analyticsEvents.createdAt, end)
        ));
      
      // Group by referrer
      const referrerData: { [key: string]: number } = {};
      
      events.forEach(event => {
        let source = "Direct";
        if (event.utmSource) {
          source = event.utmSource;
        } else if (event.referrer) {
          try {
            const url = new URL(event.referrer);
            source = url.hostname;
          } catch {
            source = event.referrer;
          }
        }
        referrerData[source] = (referrerData[source] || 0) + 1;
      });
      
      const result = Object.entries(referrerData)
        .map(([source, count]) => ({ source, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
      
      res.json(result);
    } catch (error) {
      console.error("Error fetching traffic sources:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // Get campaign performance (admin)
  app.get("/api/admin/analytics/campaigns", isAuthenticated, isOwner, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate as string) : new Date();
      end.setHours(23, 59, 59, 999);
      
      const events = await db.select()
        .from(analyticsEvents)
        .where(and(
          gte(analyticsEvents.createdAt, start),
          lte(analyticsEvents.createdAt, end)
        ));
      
      // Group by campaign
      const campaignData: { [key: string]: { campaign: string; source: string; medium: string; visits: number; conversions: number } } = {};
      
      events.forEach(event => {
        if (event.utmCampaign) {
          const key = `${event.utmCampaign}|${event.utmSource || 'unknown'}|${event.utmMedium || 'unknown'}`;
          if (!campaignData[key]) {
            campaignData[key] = {
              campaign: event.utmCampaign,
              source: event.utmSource || 'unknown',
              medium: event.utmMedium || 'unknown',
              visits: 0,
              conversions: 0,
            };
          }
          if (event.eventType === 'page_view') {
            campaignData[key].visits++;
          }
          if (event.conversionType) {
            campaignData[key].conversions++;
          }
        }
      });
      
      const result = Object.values(campaignData)
        .sort((a, b) => b.visits - a.visits)
        .slice(0, 20);
      
      res.json(result);
    } catch (error) {
      console.error("Error fetching campaign data:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // Get device breakdown (admin)
  app.get("/api/admin/analytics/devices", isAuthenticated, isOwner, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate as string) : new Date();
      end.setHours(23, 59, 59, 999);
      
      const events = await db.select()
        .from(analyticsEvents)
        .where(and(
          eq(analyticsEvents.eventType, "page_view"),
          gte(analyticsEvents.createdAt, start),
          lte(analyticsEvents.createdAt, end)
        ));
      
      const deviceData: { [key: string]: number } = {};
      const browserData: { [key: string]: number } = {};
      
      events.forEach(event => {
        const device = event.deviceType || 'unknown';
        const browser = event.browser || 'unknown';
        deviceData[device] = (deviceData[device] || 0) + 1;
        browserData[browser] = (browserData[browser] || 0) + 1;
      });
      
      res.json({
        devices: Object.entries(deviceData).map(([device, count]) => ({ device, count })).sort((a, b) => b.count - a.count),
        browsers: Object.entries(browserData).map(([browser, count]) => ({ browser, count })).sort((a, b) => b.count - a.count),
      });
    } catch (error) {
      console.error("Error fetching device data:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // ==================== END ANALYTICS ENDPOINTS ====================

  // Background job to process scheduled emails (runs every minute)
  async function processScheduledEmails() {
    try {
      const now = new Date();
      const pendingEmails = await db.select().from(scheduledEmails)
        .where(and(
          eq(scheduledEmails.status, "pending"),
          lte(scheduledEmails.scheduledFor, now)
        ));

      for (const scheduled of pendingEmails) {
        try {
          // Get subscribers who haven't opted out
          const allSubscribers = await db.select().from(emailSubscribers);
          const subscribers = allSubscribers.filter(s => !s.marketingOptOut);
          
          if (subscribers.length === 0) {
            console.log(`No subscribers for scheduled email ${scheduled.id}`);
            await db.update(scheduledEmails)
              .set({ status: "sent" })
              .where(eq(scheduledEmails.id, scheduled.id));
            continue;
          }

          const siteUrl = process.env.NODE_ENV === "production"
            ? "https://www.iamsahlien.com"
            : (process.env.REPLIT_DEV_DOMAIN 
              ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
              : "https://www.iamsahlien.com");

          // Helper to convert relative image URLs to absolute URLs for emails
          const getAbsoluteImageUrl = (url: string | null | undefined): string | null => {
            if (!url) return null;
            if (url.startsWith('http://') || url.startsWith('https://')) return url;
            return `${siteUrl}${url.startsWith('/') ? '' : '/'}${url}`;
          };

          // Generate tokens for subscribers who don't have one
          for (const subscriber of subscribers) {
            if (!subscriber.unsubscribeToken) {
              const token = crypto.randomBytes(32).toString('hex');
              await db.update(emailSubscribers)
                .set({ unsubscribeToken: token })
                .where(eq(emailSubscribers.id, subscriber.id));
              subscriber.unsubscribeToken = token;
            }
          }

          let subject = "";
          let sentCount = 0;

          for (const subscriber of subscribers) {
            const unsubscribeUrl = `${siteUrl}/api/unsubscribe?token=${subscriber.unsubscribeToken}`;
            let htmlBody = "";

            if (scheduled.type === "blog" && scheduled.postId) {
              const [post] = await db.select().from(blogPosts).where(eq(blogPosts.id, scheduled.postId));
              if (!post) continue;
              
              subject = `New from Team Aeon: ${post.title}`;
              const blogUrl = `${siteUrl}/blog?post=${post.id}`;
              
              htmlBody = `
                <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #1a1a1a; color: #e5e5e5;">
                  <h1 style="color: #d4af37; text-align: center; font-size: 28px; margin-bottom: 30px;">Team Aeon</h1>
                  <h2 style="color: #d4af37; font-size: 24px; margin-bottom: 15px;">${post.title}</h2>
                  ${post.imageUrl ? `<img src="${getAbsoluteImageUrl(post.imageUrl)}" alt="${post.title}" style="width: 100%; max-height: 300px; object-fit: cover; border-radius: 8px; margin-bottom: 20px;">` : ''}
                  <p style="font-size: 16px; line-height: 1.8; color: #ccc;">${post.excerpt}</p>
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${blogUrl}" style="display: inline-block; padding: 15px 30px; background-color: #d4af37; color: #000; text-decoration: none; border-radius: 4px; font-size: 16px; font-weight: bold;">Read More</a>
                  </div>
                  <hr style="border: none; border-top: 1px solid #333; margin: 30px 0;">
                  <p style="font-size: 12px; color: #666; text-align: center;">
                    You're receiving this because you subscribed to Team Aeon updates.<br>
                    <a href="${unsubscribeUrl}" style="color: #888;">Unsubscribe</a>
                  </p>
                </div>
              `;
            } else if (scheduled.type === "product") {
              subject = `New Product: ${scheduled.title}`;
              
              let ctaUrl = "https://iamsahlien.printify.me";
              let ctaText = "Shop Now";
              
              if (scheduled.linkDestination === "blog" && scheduled.linkedPostId) {
                ctaUrl = `${siteUrl}/blog?post=${scheduled.linkedPostId}`;
                ctaText = "Read More";
              }
              
              htmlBody = `
                <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #1a1a1a; color: #e5e5e5;">
                  <h1 style="color: #d4af37; text-align: center; font-size: 28px; margin-bottom: 30px;">Team Aeon</h1>
                  <h2 style="color: #d4af37; font-size: 24px; margin-bottom: 15px; text-align: center;">New Arrival</h2>
                  ${scheduled.imageUrl ? `<img src="${getAbsoluteImageUrl(scheduled.imageUrl)}" alt="${scheduled.title}" style="width: 100%; max-height: 400px; object-fit: contain; border-radius: 8px; margin-bottom: 20px;">` : ''}
                  <h3 style="color: #fff; font-size: 22px; margin-bottom: 10px; text-align: center;">${scheduled.title}</h3>
                  <p style="font-size: 16px; line-height: 1.8; color: #ccc; text-align: center;">${scheduled.description}</p>
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${ctaUrl}" style="display: inline-block; padding: 15px 30px; background-color: #d4af37; color: #000; text-decoration: none; border-radius: 4px; font-size: 16px; font-weight: bold;">${ctaText}</a>
                  </div>
                  <hr style="border: none; border-top: 1px solid #333; margin: 30px 0;">
                  <p style="font-size: 12px; color: #666; text-align: center;">
                    You're receiving this because you subscribed to Team Aeon updates.<br>
                    <a href="${unsubscribeUrl}" style="color: #888;">Unsubscribe</a>
                  </p>
                </div>
              `;
            }

            if (htmlBody) {
              try {
                console.log(`Sending scheduled email to ${subscriber.email}...`);
                await sendEmail(subscriber.email, subject, htmlBody);
                console.log(`Successfully sent to ${subscriber.email}`);
                sentCount++;
              } catch (emailError) {
                console.error(`Failed to send scheduled email to ${subscriber.email}:`, emailError);
              }
            }
          }

          // Mark as sent
          await db.update(scheduledEmails)
            .set({ status: "sent" })
            .where(eq(scheduledEmails.id, scheduled.id));
          
          console.log(`Sent scheduled email ${scheduled.id} to ${sentCount} subscribers`);
        } catch (error) {
          console.error(`Error processing scheduled email ${scheduled.id}:`, error);
        }
      }
    } catch (error) {
      console.error("Error in scheduled email processor:", error);
    }
  }

  // ===== BILLING MANAGEMENT APIs =====

  // Get all billing clients with their projects
  app.get("/api/admin/billing/clients", isAuthenticated, isOwner, async (req, res) => {
    try {
      const clients = await db.select().from(billingClients).orderBy(desc(billingClients.createdAt));
      const projects = await db.select().from(billingProjects).orderBy(desc(billingProjects.createdAt));
      const attachments = await db.select().from(billingAttachments).orderBy(desc(billingAttachments.createdAt));
      
      // Combine data
      const clientsWithProjects = clients.map(client => ({
        ...client,
        projects: projects
          .filter(p => p.clientId === client.id)
          .map(project => ({
            ...project,
            attachments: attachments.filter(a => a.projectId === project.id)
          }))
      }));
      
      res.json(clientsWithProjects);
    } catch (error) {
      console.error("Error fetching billing clients:", error);
      res.status(500).json({ message: "Failed to fetch billing clients" });
    }
  });

  // Create billing client
  app.post("/api/admin/billing/clients", isAuthenticated, isOwner, async (req, res) => {
    try {
      const { name, email, notes } = req.body;
      if (!name || !email) {
        return res.status(400).json({ message: "Name and email are required" });
      }
      const [client] = await db.insert(billingClients).values({
        name,
        email: email.toLowerCase(),
        notes,
      }).returning();
      res.json(client);
    } catch (error) {
      console.error("Error creating billing client:", error);
      res.status(500).json({ message: "Failed to create billing client" });
    }
  });

  // Update billing client
  app.put("/api/admin/billing/clients/:id", isAuthenticated, isOwner, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { name, email, notes } = req.body;
      const [updated] = await db.update(billingClients)
        .set({ name, email: email?.toLowerCase(), notes, updatedAt: new Date() })
        .where(eq(billingClients.id, id))
        .returning();
      res.json(updated);
    } catch (error) {
      console.error("Error updating billing client:", error);
      res.status(500).json({ message: "Failed to update billing client" });
    }
  });

  // Delete billing client (cascades to projects and attachments)
  app.delete("/api/admin/billing/clients/:id", isAuthenticated, isOwner, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await db.delete(billingClients).where(eq(billingClients.id, id));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting billing client:", error);
      res.status(500).json({ message: "Failed to delete billing client" });
    }
  });

  // Create billing project
  app.post("/api/admin/billing/projects", isAuthenticated, isOwner, async (req, res) => {
    try {
      const { clientId, projectName, description, stripePaymentLink, amount, hostingType, nextPaymentDue, notes } = req.body;
      if (!clientId || !projectName) {
        return res.status(400).json({ message: "Client ID and project name are required" });
      }
      const [project] = await db.insert(billingProjects).values({
        clientId,
        projectName,
        description,
        stripePaymentLink,
        amount,
        hostingType,
        nextPaymentDue: nextPaymentDue ? new Date(nextPaymentDue) : null,
        notes,
      }).returning();
      res.json(project);
    } catch (error) {
      console.error("Error creating billing project:", error);
      res.status(500).json({ message: "Failed to create billing project" });
    }
  });

  // Update billing project (partial update - only updates provided fields)
  app.put("/api/admin/billing/projects/:id", isAuthenticated, isOwner, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { projectName, description, stripePaymentLink, amount, paymentStatus, projectStatus, hostingType, nextPaymentDue, notes } = req.body;
      
      // Build partial update object - only include fields that were actually provided
      const updateData: Record<string, any> = { updatedAt: new Date() };
      if (projectName !== undefined) updateData.projectName = projectName;
      if (description !== undefined) updateData.description = description;
      if (stripePaymentLink !== undefined) updateData.stripePaymentLink = stripePaymentLink;
      if (amount !== undefined) updateData.amount = amount;
      if (paymentStatus !== undefined) updateData.paymentStatus = paymentStatus;
      if (projectStatus !== undefined) updateData.projectStatus = projectStatus;
      if (hostingType !== undefined) updateData.hostingType = hostingType;
      if (nextPaymentDue !== undefined) updateData.nextPaymentDue = nextPaymentDue ? new Date(nextPaymentDue) : null;
      if (notes !== undefined) updateData.notes = notes;
      
      const [updated] = await db.update(billingProjects)
        .set(updateData)
        .where(eq(billingProjects.id, id))
        .returning();
      res.json(updated);
    } catch (error) {
      console.error("Error updating billing project:", error);
      res.status(500).json({ message: "Failed to update billing project" });
    }
  });

  // Delete billing project
  app.delete("/api/admin/billing/projects/:id", isAuthenticated, isOwner, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await db.delete(billingProjects).where(eq(billingProjects.id, id));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting billing project:", error);
      res.status(500).json({ message: "Failed to delete billing project" });
    }
  });

  // Add billing attachment (screenshot/file)
  app.post("/api/admin/billing/attachments", isAuthenticated, isOwner, async (req, res) => {
    try {
      const { projectId, fileName, fileUrl, fileType, description } = req.body;
      if (!projectId || !fileName || !fileUrl) {
        return res.status(400).json({ message: "Project ID, file name, and file URL are required" });
      }
      const [attachment] = await db.insert(billingAttachments).values({
        projectId,
        fileName,
        fileUrl,
        fileType,
        description,
      }).returning();
      res.json(attachment);
    } catch (error) {
      console.error("Error creating billing attachment:", error);
      res.status(500).json({ message: "Failed to create billing attachment" });
    }
  });

  // Delete billing attachment
  app.delete("/api/admin/billing/attachments/:id", isAuthenticated, isOwner, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await db.delete(billingAttachments).where(eq(billingAttachments.id, id));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting billing attachment:", error);
      res.status(500).json({ message: "Failed to delete billing attachment" });
    }
  });

  // Send Stripe payment link email to client
  app.post("/api/admin/billing/send-payment-link", isAuthenticated, isOwner, async (req, res) => {
    try {
      const { clientEmail, clientName, projectName, stripePaymentLink, amount } = req.body;
      if (!clientEmail || !projectName || !stripePaymentLink) {
        return res.status(400).json({ message: "Client email, project name, and Stripe link are required" });
      }

      const htmlBody = `
        <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #1a1a1a; color: #e5e5e5;">
          <h1 style="color: #d4af37; text-align: center; font-size: 28px; margin-bottom: 30px;">Team Aeon</h1>
          <h2 style="color: #fff; font-size: 22px; margin-bottom: 20px;">Payment Request</h2>
          <p style="font-size: 16px; line-height: 1.8; color: #ccc;">Hello ${clientName || 'there'},</p>
          <p style="font-size: 16px; line-height: 1.8; color: #ccc;">Your payment for <strong style="color: #d4af37;">${projectName}</strong> is ready.</p>
          ${amount ? `<p style="font-size: 18px; color: #d4af37; font-weight: bold; text-align: center; margin: 20px 0;">Amount: ${amount}</p>` : ''}
          <div style="text-align: center; margin: 30px 0;">
            <a href="${stripePaymentLink}" style="display: inline-block; padding: 15px 40px; background-color: #d4af37; color: #000; text-decoration: none; border-radius: 4px; font-size: 18px; font-weight: bold;">Pay Now</a>
          </div>
          <p style="font-size: 14px; line-height: 1.6; color: #888; text-align: center;">If you have any questions, please reply to this email.</p>
          <hr style="border: none; border-top: 1px solid #333; margin: 30px 0;">
          <p style="font-size: 12px; color: #666; text-align: center;">Team Aeon - Creating Digital Magic</p>
        </div>
      `;

      await sendEmail(clientEmail, `Payment Request: ${projectName}`, htmlBody);
      res.json({ success: true });
    } catch (error) {
      console.error("Error sending payment link email:", error);
      res.status(500).json({ message: "Failed to send payment link email" });
    }
  });

  // Import subscribers as billing clients
  app.post("/api/admin/billing/import-subscribers", isAuthenticated, isOwner, async (req, res) => {
    try {
      const subscribers = await db.select().from(emailSubscribers);
      const existingClients = await db.select().from(billingClients);
      const existingEmails = new Set(existingClients.map(c => c.email.toLowerCase()));
      
      let imported = 0;
      for (const sub of subscribers) {
        if (!existingEmails.has(sub.email.toLowerCase())) {
          await db.insert(billingClients).values({
            email: sub.email,
            name: sub.name || sub.email.split('@')[0],
            notes: `Imported from subscribers on ${new Date().toLocaleDateString()}`,
          });
          imported++;
        }
      }
      
      res.json({ success: true, imported, skipped: subscribers.length - imported });
    } catch (error) {
      console.error("Error importing subscribers:", error);
      res.status(500).json({ message: "Failed to import subscribers" });
    }
  });

  // Line Items CRUD
  app.get("/api/admin/billing/projects/:projectId/line-items", isAuthenticated, isOwner, async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const items = await db.select().from(billingLineItems)
        .where(eq(billingLineItems.projectId, projectId))
        .orderBy(billingLineItems.createdAt);
      res.json(items);
    } catch (error) {
      console.error("Error fetching line items:", error);
      res.status(500).json({ message: "Failed to fetch line items" });
    }
  });

  app.post("/api/admin/billing/line-items", isAuthenticated, isOwner, async (req, res) => {
    try {
      const { projectId, description, quantity, unitPrice, totalPrice, serviceDate, notes } = req.body;
      if (!projectId || !description || !unitPrice || !totalPrice) {
        return res.status(400).json({ message: "Project ID, description, unit price, and total price are required" });
      }
      const [item] = await db.insert(billingLineItems).values({
        projectId,
        description,
        quantity: quantity || 1,
        unitPrice,
        totalPrice,
        serviceDate: serviceDate ? new Date(serviceDate) : null,
        notes,
      }).returning();
      res.json(item);
    } catch (error) {
      console.error("Error creating line item:", error);
      res.status(500).json({ message: "Failed to create line item" });
    }
  });

  app.delete("/api/admin/billing/line-items/:id", isAuthenticated, isOwner, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await db.delete(billingLineItems).where(eq(billingLineItems.id, id));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting line item:", error);
      res.status(500).json({ message: "Failed to delete line item" });
    }
  });

  // Send itemized bill email with attachments
  app.post("/api/admin/billing/send-itemized-bill", isAuthenticated, isOwner, async (req, res) => {
    try {
      const { clientEmail, clientName, projectName, lineItems, attachments, totalAmount, paymentLink, notes } = req.body;
      if (!clientEmail || !projectName || !lineItems || lineItems.length === 0) {
        return res.status(400).json({ message: "Client email, project name, and line items are required" });
      }

      const lineItemsHtml = lineItems.map((item: any) => `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #333; color: #ccc;">${item.description}</td>
          <td style="padding: 10px; border-bottom: 1px solid #333; color: #ccc; text-align: center;">${item.quantity || 1}</td>
          <td style="padding: 10px; border-bottom: 1px solid #333; color: #ccc; text-align: right;">${item.unitPrice}</td>
          <td style="padding: 10px; border-bottom: 1px solid #333; color: #d4af37; text-align: right; font-weight: bold;">${item.totalPrice}</td>
        </tr>
      `).join('');

      const attachmentsHtml = attachments && attachments.length > 0 ? `
        <div style="margin-top: 30px;">
          <h3 style="color: #d4af37; font-size: 18px; margin-bottom: 15px;">Attached Documents</h3>
          <ul style="list-style: none; padding: 0;">
            ${attachments.map((att: any) => `
              <li style="margin-bottom: 10px;">
                <a href="${att.fileUrl}" style="color: #d4af37; text-decoration: underline;">${att.fileName}</a>
                ${att.description ? `<span style="color: #888; margin-left: 10px;">- ${att.description}</span>` : ''}
              </li>
            `).join('')}
          </ul>
        </div>
      ` : '';

      const htmlBody = `
        <div style="font-family: Georgia, serif; max-width: 700px; margin: 0 auto; padding: 20px; background-color: #1a1a1a; color: #e5e5e5;">
          <h1 style="color: #d4af37; text-align: center; font-size: 28px; margin-bottom: 30px;">Team Aeon</h1>
          <h2 style="color: #fff; font-size: 22px; margin-bottom: 10px;">Itemized Bill</h2>
          <p style="color: #888; margin-bottom: 20px;">Project: <strong style="color: #d4af37;">${projectName}</strong></p>
          
          <p style="font-size: 16px; line-height: 1.8; color: #ccc;">Hello ${clientName || 'there'},</p>
          <p style="font-size: 16px; line-height: 1.8; color: #ccc;">Please find your itemized bill below:</p>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background-color: #222;">
            <thead>
              <tr style="background-color: #2a2a2a;">
                <th style="padding: 12px; text-align: left; color: #d4af37; border-bottom: 2px solid #d4af37;">Description</th>
                <th style="padding: 12px; text-align: center; color: #d4af37; border-bottom: 2px solid #d4af37;">Qty</th>
                <th style="padding: 12px; text-align: right; color: #d4af37; border-bottom: 2px solid #d4af37;">Unit Price</th>
                <th style="padding: 12px; text-align: right; color: #d4af37; border-bottom: 2px solid #d4af37;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${lineItemsHtml}
            </tbody>
            <tfoot>
              <tr style="background-color: #2a2a2a;">
                <td colspan="3" style="padding: 15px; text-align: right; color: #fff; font-size: 18px; font-weight: bold;">Grand Total:</td>
                <td style="padding: 15px; text-align: right; color: #d4af37; font-size: 20px; font-weight: bold;">${totalAmount}</td>
              </tr>
            </tfoot>
          </table>
          
          ${notes ? `<p style="font-size: 14px; line-height: 1.6; color: #888; background-color: #222; padding: 15px; border-radius: 4px; margin: 20px 0;"><strong>Notes:</strong> ${notes}</p>` : ''}
          
          ${attachmentsHtml}
          
          ${paymentLink ? `
            <div style="text-align: center; margin: 30px 0;">
              <a href="${paymentLink}" style="display: inline-block; padding: 15px 40px; background-color: #d4af37; color: #000; text-decoration: none; border-radius: 4px; font-size: 18px; font-weight: bold;">Pay Now</a>
            </div>
          ` : ''}
          
          <p style="font-size: 14px; line-height: 1.6; color: #888; text-align: center;">If you have any questions, please reply to this email.</p>
          <hr style="border: none; border-top: 1px solid #333; margin: 30px 0;">
          <p style="font-size: 12px; color: #666; text-align: center;">Team Aeon - Creating Digital Magic</p>
        </div>
      `;

      await sendEmail(clientEmail, `Itemized Bill: ${projectName}`, htmlBody);
      res.json({ success: true });
    } catch (error) {
      console.error("Error sending itemized bill:", error);
      res.status(500).json({ message: "Failed to send itemized bill" });
    }
  });

  // Quick Invoice - creates client/project and sends email all in one go
  app.post("/api/admin/billing/quick-invoice", isAuthenticated, isOwner, async (req: any, res) => {
    try {
      const { clientId: existingClientId, clientEmail, clientName, projectId: existingProjectId, projectName, amount, dueDate, paymentLink, description, screenshotUrls } = req.body;
      
      if (!clientEmail || !amount) {
        return res.status(400).json({ message: "Email and amount are required" });
      }

      // Use existing client or create new one
      let clientId: number;
      if (existingClientId) {
        clientId = existingClientId;
      } else {
        // Find by email or create new
        let client = await db.select().from(billingClients).where(eq(billingClients.email, clientEmail)).limit(1);
        if (client.length === 0) {
          const newClient = await db.insert(billingClients).values({
            name: clientName || clientEmail.split('@')[0],
            email: clientEmail,
            notes: '',
          }).returning();
          clientId = newClient[0].id;
        } else {
          clientId = client[0].id;
        }
      }

      // Use existing project or create new one
      let projectId: number;
      let finalProjectName = projectName;
      
      if (existingProjectId) {
        projectId = existingProjectId;
        // Update project with new amount/payment link if provided
        await db.update(billingProjects).set({
          amount: amount,
          stripePaymentLink: paymentLink || undefined,
          nextPaymentDue: dueDate ? new Date(dueDate) : undefined,
        }).where(eq(billingProjects.id, existingProjectId));
        
        // Get project name for email
        const proj = await db.select().from(billingProjects).where(eq(billingProjects.id, existingProjectId)).limit(1);
        if (proj.length > 0) finalProjectName = proj[0].projectName;
      } else {
        // Create new project
        if (!projectName) {
          return res.status(400).json({ message: "Project name is required for new projects" });
        }
        const newProject = await db.insert(billingProjects).values({
          clientId,
          projectName,
          description: description || '',
          stripePaymentLink: paymentLink || '',
          amount: amount,
          hostingType: 'one-time',
          nextPaymentDue: dueDate ? new Date(dueDate) : null,
          paymentStatus: 'pending',
          notes: '',
        }).returning();
        projectId = newProject[0].id;
      }

      // Save screenshot attachments
      if (screenshotUrls && screenshotUrls.length > 0) {
        for (const url of screenshotUrls) {
          await db.insert(billingAttachments).values({
            projectId,
            fileName: url.split('/').pop() || 'screenshot',
            fileUrl: url,
            fileType: 'image',
            description: 'Invoice attachment',
          });
        }
      }

      // Format due date
      const formattedDueDate = dueDate ? new Date(dueDate).toLocaleDateString('en-US', { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
      }) : '';
      
      // Build screenshots HTML
      const screenshotsHtml = screenshotUrls && screenshotUrls.length > 0 ? `
        <div style="margin: 25px 0;">
          <p style="color: #888; font-size: 14px; margin-bottom: 10px;">Attached Screenshots:</p>
          ${screenshotUrls.map((url: string) => `
            <div style="margin-bottom: 15px;">
              <img src="${url}" alt="Project screenshot" style="max-width: 100%; border-radius: 8px; border: 1px solid #333;">
            </div>
          `).join('')}
        </div>
      ` : '';

      // Send the invoice email
      const htmlBody = `
        <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #1a1a1a; color: #e5e5e5;">
          <h1 style="color: #d4af37; text-align: center; font-size: 28px; margin-bottom: 30px;">Team Aeon</h1>
          
          <div style="background-color: #222; border: 1px solid #d4af37; border-radius: 8px; padding: 25px; margin-bottom: 25px;">
            <h2 style="color: #fff; font-size: 22px; margin: 0 0 15px 0;">Invoice</h2>
            <p style="color: #888; margin: 0 0 10px 0;">Project: <strong style="color: #d4af37;">${finalProjectName}</strong></p>
            
            <div style="background-color: #1a1a1a; padding: 20px; border-radius: 4px; margin: 20px 0;">
              <p style="color: #888; margin: 0 0 5px 0; font-size: 14px;">Amount Due:</p>
              <p style="color: #d4af37; font-size: 36px; font-weight: bold; margin: 0;">${amount}</p>
            </div>
            
            ${formattedDueDate ? `
              <p style="color: #ccc; margin: 15px 0;">
                <strong>Due Date:</strong> ${formattedDueDate}
              </p>
            ` : ''}
            
            ${description ? `
              <div style="background-color: #1a1a1a; padding: 15px; border-radius: 4px; margin: 15px 0;">
                <p style="color: #888; font-size: 14px; margin: 0 0 5px 0;">Details:</p>
                <p style="color: #ccc; margin: 0; line-height: 1.6;">${description}</p>
              </div>
            ` : ''}
          </div>
          
          ${screenshotsHtml}
          
          ${paymentLink ? `
            <div style="text-align: center; margin: 30px 0;">
              <a href="${paymentLink}" style="display: inline-block; padding: 18px 50px; background-color: #d4af37; color: #000; text-decoration: none; border-radius: 4px; font-size: 18px; font-weight: bold;">Pay Now</a>
            </div>
          ` : ''}
          
          <p style="font-size: 14px; line-height: 1.6; color: #888; text-align: center; margin-top: 30px;">
            If you have any questions, simply reply to this email.
          </p>
          
          <hr style="border: none; border-top: 1px solid #333; margin: 30px 0;">
          <p style="font-size: 12px; color: #666; text-align: center;">Team Aeon - Creating Digital Magic</p>
        </div>
      `;

      await sendEmail(clientEmail, `Invoice: ${finalProjectName} - ${amount}`, htmlBody);
      
      res.json({ success: true, projectId, clientId });
    } catch (error) {
      console.error("Error sending quick invoice:", error);
      res.status(500).json({ message: "Failed to send invoice" });
    }
  });

  // Run the scheduler every minute
  setInterval(processScheduledEmails, 60000);
  // Also run once on startup after a short delay
  setTimeout(processScheduledEmails, 5000);

  // Production: Serve static files and handle client-side routing
  if (process.env.NODE_ENV === "production") {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const distPath = path.join(__dirname, "..", "dist");
    
    app.use(express.static(distPath));
    
    // Handle client-side routing - serve index.html for all non-API routes
    app.use((req, res, next) => {
      if (!req.path.startsWith("/api") && req.method === "GET") {
        res.sendFile(path.join(distPath, "index.html"));
      } else {
        next();
      }
    });

    const PORT = 5000;
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Production server running on port ${PORT}`);
    });
  } else {
    // Initialize billing tables if they don't exist
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS billing_clients (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) NOT NULL UNIQUE,
          name VARCHAR(255),
          notes TEXT,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS billing_projects (
          id SERIAL PRIMARY KEY,
          client_id INTEGER NOT NULL REFERENCES billing_clients(id) ON DELETE CASCADE,
          project_name VARCHAR(255) NOT NULL,
          description TEXT,
          stripe_payment_link VARCHAR(500),
          amount VARCHAR(100),
          payment_status VARCHAR(50) DEFAULT 'pending',
          project_status VARCHAR(50) DEFAULT 'active',
          hosting_type VARCHAR(100),
          next_payment_due TIMESTAMP,
          notes TEXT,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS billing_attachments (
          id SERIAL PRIMARY KEY,
          project_id INTEGER NOT NULL REFERENCES billing_projects(id) ON DELETE CASCADE,
          file_name VARCHAR(255) NOT NULL,
          file_url VARCHAR(500) NOT NULL,
          file_type VARCHAR(50),
          description TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        );
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS billing_line_items (
          id SERIAL PRIMARY KEY,
          project_id INTEGER NOT NULL REFERENCES billing_projects(id) ON DELETE CASCADE,
          description VARCHAR(500) NOT NULL,
          quantity INTEGER DEFAULT 1,
          unit_price VARCHAR(50) NOT NULL,
          total_price VARCHAR(50) NOT NULL,
          service_date TIMESTAMP,
          notes TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        );
      `);
      console.log('Billing tables created successfully');
    } catch (err) {
      console.log('Billing tables error:', (err as Error).message);
    }

    const PORT = 3001;
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Backend server running on port ${PORT}`);
    });
  }
}

main().catch(console.error);
