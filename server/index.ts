import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";
import { db } from "./db";
import { blogPosts, emailSubscribers, dreamRequests, musicRequests, blogComments, scheduledEmails, webAppRequests } from "@shared/schema";
import { eq, desc, and, lte } from "drizzle-orm";
import { sendEmail } from "./gmail";

const app = express();
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
        email,
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
      const unsubscribeToken = crypto.randomBytes(32).toString('hex');
      const [subscriber] = await db.insert(emailSubscribers).values({
        email,
        name,
        unsubscribeToken,
      }).onConflictDoNothing().returning();
      res.json({ success: true });
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
              
              ${post.imageUrl ? `<img src="${post.imageUrl}" alt="${post.title}" style="width: 100%; max-height: 300px; object-fit: cover; border-radius: 8px; margin-bottom: 20px;">` : ''}
              
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
              
              ${imageUrl ? `<img src="${imageUrl}" alt="${title}" style="width: 100%; max-height: 400px; object-fit: contain; border-radius: 8px; margin-bottom: 20px;">` : ''}
              
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

      const amplifierLink = "https://buy.stripe.com/dRm14mdKP3NK6Oi74C7Vm0i";
      
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

      const singleSongLink = "https://buy.stripe.com/14AaEWayD2JGgoSfB87Vm0j";
      const fullAlbumLink = "https://buy.stripe.com/aFa5kC2278408WqagO7Vm0l";
      
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
      const { quoteResponse, stripePaymentLink } = req.body;
      
      const [request] = await db.select().from(webAppRequests).where(eq(webAppRequests.id, id));
      if (!request) {
        return res.status(404).json({ message: "Request not found" });
      }

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
            <h3 style="color: #d4af37; margin-top: 0;">My Response & Quote:</h3>
            <p style="line-height: 1.8; white-space: pre-wrap;">${quoteResponse}</p>
          </div>
          
          ${stripePaymentLink ? `
          <div style="background-color: #2a2a2a; padding: 25px; text-align: center; margin: 30px 0; border-radius: 8px;">
            <h3 style="color: #d4af37; margin-top: 0;">Ready to Proceed?</h3>
            <p style="font-size: 14px; color: #999; margin-bottom: 20px;">Click below to secure your project</p>
            <a href="${stripePaymentLink}" style="display: inline-block; padding: 15px 30px; background-color: #d4af37; color: #000; text-decoration: none; border-radius: 4px; font-size: 16px; font-weight: bold;">Proceed to Payment</a>
          </div>
          ` : ''}
          
          <div style="background-color: #2a2a2a; padding: 20px; margin: 25px 0; border-radius: 4px;">
            <p style="font-size: 14px; color: #ccc; margin: 0 0 10px 0;"><strong style="color: #d4af37;">Hosting:</strong> $25/month for reliable hosting and maintenance</p>
            <p style="font-size: 14px; color: #999; margin: 0;">Additional upgrades and feature additions can be commissioned separately as your project evolves.</p>
          </div>
          
          <p style="font-size: 16px; line-height: 1.8;">If you have any questions or would like to discuss the project further, simply reply to this email.</p>
          
          <p style="font-size: 16px; line-height: 1.8;">In harmonic resonance,<br><strong style="color: #d4af37;">Team Aeon</strong></p>
          
          <hr style="border: none; border-top: 1px solid #333; margin: 30px 0;">
          <p style="font-size: 12px; color: #666; text-align: center;">This email was sent from Team Aeon Website & App Creation Services.</p>
        </div>
      `;
      
      await sendEmail(
        request.email,
        "Your Website/App Project Quote - Team Aeon",
        htmlBody
      );
      
      // Update status to quoted after sending
      await db.update(webAppRequests)
        .set({ status: 'quoted', quoteResponse, stripePaymentLink, updatedAt: new Date() })
        .where(eq(webAppRequests.id, id));
      
      res.json({ success: true, message: "Quote email sent successfully" });
    } catch (error) {
      console.error("Error sending webapp quote email:", error);
      res.status(500).json({ message: "Failed to send email" });
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
                  ${post.imageUrl ? `<img src="${post.imageUrl}" alt="${post.title}" style="width: 100%; max-height: 300px; object-fit: cover; border-radius: 8px; margin-bottom: 20px;">` : ''}
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
                  ${scheduled.imageUrl ? `<img src="${scheduled.imageUrl}" alt="${scheduled.title}" style="width: 100%; max-height: 400px; object-fit: contain; border-radius: 8px; margin-bottom: 20px;">` : ''}
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
                await sendEmail(subscriber.email, subject, htmlBody);
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
    const PORT = 3001;
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Backend server running on port ${PORT}`);
    });
  }
}

main().catch(console.error);
