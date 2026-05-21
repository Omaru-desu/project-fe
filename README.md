# Omarine

This is the frontend of the project built using Next.js. It handles the user interface for uploading, annotating, and reviewing underwater ecological imagery.

## Table of Contents

- [Live Implementation](#live-implementation)
- [Tech Stack](#tech-stack)
- [Setup](#setup)

## Live Implementation
URL: [project-fe-sand.vercel.app](https://project-fe-sand.vercel.app/)

## Tech Stack

| Library | Purpose | Source |
|--------|--------|---------|
| Next.js | React framework | https://nextjs.org |
| React | UI library | https://react.dev |
| Supabase JS | Auth & database client | https://github.com/supabase/supabase-js |
| Supabase SSR | Server-side auth helpers | https://github.com/supabase/ssr |
| jose | JWT session handling | https://github.com/panva/jose |
| Lucide React | Icon library | https://lucide.dev |
| Tailwind CSS | Utility-first CSS framework | https://tailwindcss.com |
| TypeScript | Type safety | https://www.typescriptlang.org |
| axios | HTTP client | https://axios-http.com |

## Setup

### 1. Clone Repository
```
git clone <repo-url>
```

### 2. Install Dependencies
```
npm install
```

### 3. Configure Environment
Create a .env.local file in the root directory:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_API_URL=your_backend_api_url
```

### 4. Run Development Server
```
npm run dev
```
    
### 5. Access App
Go to http://localhost:3000