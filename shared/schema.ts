export * from "./models/auth";

import { pgTable, serial, varchar, text, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { users } from "./models/auth";

// Blog posts for Sahlien Blog and Dream Blog
export const blogPosts = pgTable("blog_posts", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  excerpt: text("excerpt").notNull(), // Used as subject/summary
  content: text("content"),
  imageUrl: varchar("image_url", { length: 500 }),
  category: varchar("category", { length: 50 }).notNull(), // 'sahlien' or 'dream'
  published: boolean("published").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type BlogPost = typeof blogPosts.$inferSelect;
export type InsertBlogPost = typeof blogPosts.$inferInsert;

// Email subscribers
export const emailSubscribers = pgTable("email_subscribers", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  unsubscribeToken: varchar("unsubscribe_token", { length: 64 }),
  marketingOptOut: boolean("marketing_opt_out").default(false),
  subscribedAt: timestamp("subscribed_at").defaultNow(),
});

export type EmailSubscriber = typeof emailSubscribers.$inferSelect;
export type InsertEmailSubscriber = typeof emailSubscribers.$inferInsert;

// Dream interpretation requests
export const dreamRequests = pgTable("dream_requests", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  dreamDescription: text("dream_description").notNull(),
  status: varchar("status", { length: 50 }).default("pending"), // pending, completed, archived
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type DreamRequest = typeof dreamRequests.$inferSelect;
export type InsertDreamRequest = typeof dreamRequests.$inferInsert;

// Music creation requests
export const musicRequests = pgTable("music_requests", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description").notNull(),
  mood: varchar("mood", { length: 255 }),
  purpose: varchar("purpose", { length: 255 }),
  status: varchar("status", { length: 50 }).default("pending"), // pending, in_progress, completed, archived
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type MusicRequest = typeof musicRequests.$inferSelect;
export type InsertMusicRequest = typeof musicRequests.$inferInsert;

// Blog comments
export const blogComments = pgTable("blog_comments", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull().references(() => blogPosts.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").references(() => users.id),
  userName: varchar("user_name", { length: 255 }).notNull(),
  userImage: varchar("user_image", { length: 500 }),
  content: text("content").notNull(),
  status: varchar("status", { length: 50 }).default("published"), // published, hidden
  createdAt: timestamp("created_at").defaultNow(),
});

export type BlogComment = typeof blogComments.$inferSelect;
export type InsertBlogComment = typeof blogComments.$inferInsert;

// Scheduled marketing emails
export const scheduledEmails = pgTable("scheduled_emails", {
  id: serial("id").primaryKey(),
  type: varchar("type", { length: 50 }).notNull(), // 'blog' or 'product'
  postId: integer("post_id"), // For blog type
  title: varchar("title", { length: 255 }), // For product type
  description: text("description"), // For product type
  imageUrl: varchar("image_url", { length: 500 }), // For product type
  linkDestination: varchar("link_destination", { length: 50 }), // 'store' or 'blog'
  linkedPostId: integer("linked_post_id"), // For blog link
  scheduledFor: timestamp("scheduled_for").notNull(),
  status: varchar("status", { length: 50 }).default("pending"), // pending, sent, cancelled
  createdAt: timestamp("created_at").defaultNow(),
});

export type ScheduledEmail = typeof scheduledEmails.$inferSelect;
export type InsertScheduledEmail = typeof scheduledEmails.$inferInsert;

// Website/App creation service requests
export const webAppRequests = pgTable("webapp_requests", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  projectType: varchar("project_type", { length: 50 }).notNull(), // 'website' or 'app'
  description: text("description").notNull(),
  functionality: text("functionality").notNull(),
  colorPreferences: varchar("color_preferences", { length: 500 }),
  exampleSites: text("example_sites"),
  status: varchar("status", { length: 50 }).default("pending"), // pending, responded, quoted, in_progress, completed, archived
  quoteResponse: text("quote_response"),
  stripePaymentLink: varchar("stripe_payment_link", { length: 500 }),
  agreementPdfUrl: varchar("agreement_pdf_url", { length: 500 }),
  initialResponse: text("initial_response"),
  quoteAmount: varchar("quote_amount", { length: 100 }),
  emailHistory: text("email_history"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type WebAppRequest = typeof webAppRequests.$inferSelect;
export type InsertWebAppRequest = typeof webAppRequests.$inferInsert;

// Analytics - Page views and sessions
export const analyticsEvents = pgTable("analytics_events", {
  id: serial("id").primaryKey(),
  sessionId: varchar("session_id", { length: 64 }).notNull(),
  visitorId: varchar("visitor_id", { length: 64 }).notNull(),
  eventType: varchar("event_type", { length: 50 }).notNull(), // page_view, conversion, session_start
  pageUrl: varchar("page_url", { length: 500 }),
  pageTitle: varchar("page_title", { length: 255 }),
  referrer: varchar("referrer", { length: 500 }),
  utmSource: varchar("utm_source", { length: 255 }),
  utmMedium: varchar("utm_medium", { length: 255 }),
  utmCampaign: varchar("utm_campaign", { length: 255 }),
  utmTerm: varchar("utm_term", { length: 255 }),
  utmContent: varchar("utm_content", { length: 255 }),
  deviceType: varchar("device_type", { length: 50 }), // desktop, mobile, tablet
  browser: varchar("browser", { length: 100 }),
  country: varchar("country", { length: 100 }),
  conversionType: varchar("conversion_type", { length: 50 }), // dream_request, music_request, webapp_request, newsletter_signup
  createdAt: timestamp("created_at").defaultNow(),
});

export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
export type InsertAnalyticsEvent = typeof analyticsEvents.$inferInsert;

// Analytics - Daily aggregated metrics for fast queries
export const analyticsDailyMetrics = pgTable("analytics_daily_metrics", {
  id: serial("id").primaryKey(),
  date: timestamp("date").notNull(),
  pageViews: integer("page_views").default(0),
  uniqueVisitors: integer("unique_visitors").default(0),
  sessions: integer("sessions").default(0),
  dreamConversions: integer("dream_conversions").default(0),
  musicConversions: integer("music_conversions").default(0),
  webappConversions: integer("webapp_conversions").default(0),
  newsletterSignups: integer("newsletter_signups").default(0),
  avgSessionDuration: integer("avg_session_duration").default(0), // in seconds
});

export type AnalyticsDailyMetric = typeof analyticsDailyMetrics.$inferSelect;
export type InsertAnalyticsDailyMetric = typeof analyticsDailyMetrics.$inferInsert;

// Billing Clients - track clients like Brett
export const billingClients = pgTable("billing_clients", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type BillingClient = typeof billingClients.$inferSelect;
export type InsertBillingClient = typeof billingClients.$inferInsert;

// Billing Projects - multiple projects per client
export const billingProjects = pgTable("billing_projects", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull().references(() => billingClients.id, { onDelete: 'cascade' }),
  projectName: varchar("project_name", { length: 255 }).notNull(),
  description: text("description"),
  stripePaymentLink: varchar("stripe_payment_link", { length: 500 }),
  stripePaymentLinkId: varchar("stripe_payment_link_id", { length: 100 }),
  stripeProductId: varchar("stripe_product_id", { length: 100 }),
  stripePriceId: varchar("stripe_price_id", { length: 100 }),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 100 }),
  amount: varchar("amount", { length: 100 }),
  paymentStatus: varchar("payment_status", { length: 50 }).default("pending"),
  projectStatus: varchar("project_status", { length: 50 }).default("active"),
  hostingType: varchar("hosting_type", { length: 100 }),
  nextPaymentDue: timestamp("next_payment_due"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type BillingProject = typeof billingProjects.$inferSelect;
export type InsertBillingProject = typeof billingProjects.$inferInsert;

// Billing Attachments - screenshots and files for projects
export const billingAttachments = pgTable("billing_attachments", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => billingProjects.id, { onDelete: 'cascade' }),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileUrl: varchar("file_url", { length: 500 }).notNull(),
  fileType: varchar("file_type", { length: 50 }), // image, pdf, etc.
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type BillingAttachment = typeof billingAttachments.$inferSelect;
export type InsertBillingAttachment = typeof billingAttachments.$inferInsert;

// Billing Line Items - itemized charges for projects
export const billingLineItems = pgTable("billing_line_items", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => billingProjects.id, { onDelete: 'cascade' }),
  description: varchar("description", { length: 500 }).notNull(),
  quantity: integer("quantity").default(1),
  unitPrice: varchar("unit_price", { length: 50 }).notNull(), // e.g., "$25.00"
  totalPrice: varchar("total_price", { length: 50 }).notNull(), // e.g., "$75.00"
  serviceDate: timestamp("service_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type BillingLineItem = typeof billingLineItems.$inferSelect;
export type InsertBillingLineItem = typeof billingLineItems.$inferInsert;

export const billingInvoices = pgTable("billing_invoices", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => billingProjects.id, { onDelete: 'cascade' }),
  clientId: integer("client_id").notNull().references(() => billingClients.id, { onDelete: 'cascade' }),
  amount: varchar("amount", { length: 100 }).notNull(),
  description: text("description"),
  paymentType: varchar("payment_type", { length: 50 }).default("one_time"),
  planInterval: varchar("plan_interval", { length: 20 }),
  planEndDate: timestamp("plan_end_date"),
  paymentStatus: varchar("payment_status", { length: 50 }).default("pending"),
  stripePaymentLink: varchar("stripe_payment_link", { length: 500 }),
  stripePaymentLinkId: varchar("stripe_payment_link_id", { length: 100 }),
  stripeProductId: varchar("stripe_product_id", { length: 100 }),
  stripePriceId: varchar("stripe_price_id", { length: 100 }),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 100 }),
  dueDate: timestamp("due_date"),
  sentAt: timestamp("sent_at").defaultNow(),
  paidAt: timestamp("paid_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type BillingInvoice = typeof billingInvoices.$inferSelect;
export type InsertBillingInvoice = typeof billingInvoices.$inferInsert;

export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  userName: varchar("user_name", { length: 255 }).notNull(),
  userEmail: varchar("user_email", { length: 255 }),
  service: varchar("service", { length: 100 }).notNull(),
  rating: integer("rating").notNull(),
  reviewText: text("review_text").notNull(),
  adminResponse: text("admin_response"),
  respondedAt: timestamp("responded_at"),
  isPublished: boolean("is_published").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export type Review = typeof reviews.$inferSelect;
export type InsertReview = typeof reviews.$inferInsert;
