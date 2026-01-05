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

## Tech Stack
- **Frontend Framework**: React 18 with TypeScript
- **Build Tool**: Vite 6.3.5
- **Styling**: Tailwind CSS v4 with custom theming
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Routing**: React Router DOM v7
- **Email**: Gmail SMTP with App Password (nodemailer) - preferred over OAuth for simplicity and reliability

## User Preferences
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
