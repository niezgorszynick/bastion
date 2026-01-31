# Bastion

**Bastion** is a work-in-progress **map builder and management tool** inspired by the **D&D 2024 Bastion system**.  
It aims to make Bastion creation, upgrades, and turn resolution visual, interactive, and easier to track.

> ⚠️ Early development. APIs, data models, and UI are subject to change.

---

## What is this?

The D&D 2024 Bastion rules introduce structured base-building, but running them at the table still involves a lot of manual tracking.

Bastion explores a digital approach:
- Visual, tile-based Bastion maps
- Facility placement and upgrades
- Bastion turn mechanics
- Multi-user support with roles (DM / players)

---

## Current Status

This project is under active development.

### Implemented / In Progress
- Tile-based map grid
- Basic building placement
- Placeholder tileset for rapid iteration

### Planned
- All facilities from the 2024 Bastion rules
- Building upgrades
- Multiple tile types
- Context menu for buildings
- Bastion turn mechanics
- Authentication and user roles

---

## Tech Stack

- **Next.js** (App Router)
- **React**
- **Supabase** (Auth + Database)
- **Tailwind CSS**
- **Vercel** (deployment)

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm / pnpm / yarn
- Supabase account
- Vercel account (assuming deploying beyond localhost)

### Setup
```bash
git clone https://github.com/niezgorszynick/bastion.git
cd bastion
npm install
npm run dev

App runs at:
http://localhost:3000

Environment Variables

Create .env.local in the project root:

NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key


More variables may be introduced as features expand.

Project Structure (High-Level)
/app            # Next.js routes (App Router)
/components     # Reusable UI components
/lib            # Supabase client and shared utilities
/public/assets  # Tilesets and static assets


Structure is expected to evolve.

Contributing

Contributions are welcome, but please note:

The project is still finding its shape

Breaking changes are likely

There may not always be issues or documentation ready

If you want to help:

Open an issue to discuss ideas or bugs

Keep PRs small and focused

Prefer clarity over abstraction


Deployment

The app is intended to be deployed on Vercel with Supabase handling backend services.
Make sure all environment variables are configured in your deployment environment.


License

License not yet specified.
This may be clarified before the first stable release.