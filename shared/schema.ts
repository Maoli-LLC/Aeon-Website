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
