# Team Aeon Website

## Overview
This is a React + TypeScript website built with Vite and Tailwind CSS v4. It's a Team Aeon branded website featuring multiple pages including Homepage, Blog, Store, Contact, Music Creation, Dream Lattice, and Website/App Creation Services sections.

## Features
- **Dual Blog System**: Sahlien Blog and Dream Blog with keyword search
- **Sovereign Dream Lattice**: Free dream interpretation service
- **Music Creation**: Commission songs ($97) or albums ($444) with free lyrics
- **Website/App Creation**: Free design concepts, then commission full build with custom Stripe payment links
- **Admin Dashboard**: Content management with search, email functionality, and status tracking
- **Email Marketing**: Newsletter system with scheduling capabilities
- **Custom Login**: Gold "TA" branded login page with Replit OAuth
- **Analytics Dashboard**: Visitor tracking, page views, conversion tracking, UTM campaign attribution, device/browser stats
- **Billing Management**: 
  - **Quick Invoice**: One-click invoice creation - enter email, project, amount, due date, payment link, and description, then hit send. Creates client and project automatically.
  - **Dashboard Overview**: Summary cards showing total clients, projects, pending, overdue, and paid counts
  - **Outstanding Bills Table**: Quick view of all pending/overdue invoices with one-click status updates
  - **All Projects Table**: Projects shown with their individual invoices nested inside
  - **All Invoices Table**: Complete view of all invoices across all clients
  - **CSV Export**: Export billing data for accountants with one click
  - Import clients from email subscribers with one click
  - Track multiple projects per client with detailed status tracking
  - **Multiple invoices per project**: Each project can have many invoices, each with its own amount, payment link, status, and due date
  - Itemized line items for each project (description, quantity, unit price, total)
  - Attach screenshots/documents to projects
  - **Auto-Generated Stripe Payment Links**: Click "Generate Link" to auto-create a Stripe payment link for any invoice
  - **Stripe Webhook Integration**: Payments are automatically marked as "paid" when customers complete checkout
  - **Multiple Invoices**: Send multiple invoices to the same client in one session; after sending, prompts to send another
  - **Subscription Cancellation**: Cancel monthly subscriptions directly from dashboard; cancels in Stripe and updates status
  - Payment status tracking (pending/paid/overdue/cancelled) with color coding
  - Send payment reminder emails directly from the dashboard
- **Stripe Integration**: Using live production keys (STRIPE_LIVE_PUBLISHABLE_KEY, STRIPE_LIVE_SECRET_KEY)
  - Auto-creates products and prices in Stripe for each invoice
  - Generates payment links (one-time), monthly subscriptions, or payment plans (weekly/monthly with auto-end date)
  - Payment plans use Stripe's `cancel_at` to auto-cancel subscriptions on the specified end date
  - Monthly subscriptions can optionally have an end date for auto-cancellation
  - Webhook handler updates payment status when checkout completes and captures subscription IDs
  - Handles subscription.deleted webhook to auto-cancel in database
- **Reviews System**: Customer reviews with star ratings
  - Users can submit reviews after logging in (select service, 1-5 stars, written review)
  - Public reviews page shows all published reviews with average rating
  - Admin can respond to reviews, hide/show reviews, and delete reviews
  - Services: Dream Interpretation, Music (Single/Album), Website/App Creation, General Experience

## Tech Stack
- **Frontend Framework**: React 18 with TypeScript
- **Build Tool**: Vite 6.3.5
- **Styling**: Tailwind CSS v4 with custom theming
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Routing**: React Router DOM v7
- **Database**: Supabase PostgreSQL (migrated from Replit PostgreSQL for cost savings)
- **ORM**: Drizzle ORM
- **Email**: Gmail SMTP with App Password (nodemailer) - preferred over OAuth for simplicity and reliability

## User Preferences
- **Database**: ONLY use Supabase (SUPABASE_DATABASE_URL). NEVER use Replit database (DATABASE_URL, PGHOST, etc.). This is enforced in server/db.ts.
- **Email Integration**: Always use Gmail SMTP with App Password (not OAuth). Each app gets its own App Password for independence.
- **Admin Access**: Only iamsahlien@gmail.com should see admin dashboard
- **Search Logic**: Multi-word searches use OR logic (find posts containing ANY search word)

## Project Structure
```
src/
├── app/
│   ├── components/
│   │   ├── figma/          # Figma-related components
│   │   └── ui/             # shadcn/ui components
│   ├── pages/              # Page components
│   └── App.tsx             # Main app with routing
├── styles/
│   ├── fonts.css           # Font definitions
│   ├── index.css           # Base styles
│   ├── tailwind.css        # Tailwind imports
│   └── theme.css           # Theme variables
└── main.tsx                # Entry point
```

## Development
- Run `npm run dev` to start the development server on port 5000
- The server is configured to accept all hosts for Replit's proxy

## Build
- Run `npm build` to create a production build in the `dist` folder
