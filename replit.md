# Team Aeon Website

## Overview
This is a React + TypeScript website built with Vite and Tailwind CSS v4. It's a Team Aeon branded website featuring multiple pages including Homepage, Blog, Store, Contact, Music Creation, and Dream Lattice sections.

## Tech Stack
- **Frontend Framework**: React 18 with TypeScript
- **Build Tool**: Vite 6.3.5
- **Styling**: Tailwind CSS v4 with custom theming
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Routing**: React Router DOM v7

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
