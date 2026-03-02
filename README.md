# Yurika Frontend

**Next.js 15 frontend for the Yurika AI Legal Assistant.**

A modern, responsive legal chat interface with trilingual support (EN/UZ/RU), dark/light themes, an admin panel, and a premium glassmorphism design.

---

## Quick Start

```bash
# Install dependencies
npm install

# Configure
echo 'NEXT_PUBLIC_API_URL=http://localhost:8000' > .env.local

# Run dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Project Structure

```
app/
├── layout.tsx                # Root layout (providers, metadata, fonts)
├── page.tsx                  # Main chat page (3-pane layout)
├── globals.css               # Tailwind 4 + design tokens + animations
├── (auth)/
│   ├── login/page.tsx         # Email/password + Google OAuth login
│   └── signup/page.tsx        # Registration page
├── admin/
│   ├── layout.tsx             # Admin shell with sidebar navigation
│   ├── page.tsx               # Dashboard (stats + system settings)
│   ├── documents/page.tsx     # Document management (view/edit/delete)
│   └── users/page.tsx         # User management (roles/ban/analytics)
└── chat/[id]/page.tsx         # Dynamic chat session route

components/
├── ChatArea.tsx               # Chat messages, input, dynamic greetings
├── Sidebar.tsx                # Session list, search, profile dropdown
├── InsightPanel.tsx           # Full document preview sidebar
├── MessageBubble.tsx          # Individual message (markdown rendering)
├── SettingsModal.tsx          # Theme + account settings modal
├── ThemeProvider.tsx          # next-themes wrapper
└── ui/                        # shadcn/ui primitives (10 components)

contexts/
├── AuthContext.tsx             # Auth state, JWT cookie management
└── LanguageContext.tsx         # i18n context (EN/UZ/RU)

hooks/
├── useChatManager.ts          # Chat logic, API calls, citation handling
├── useSessions.ts             # Session CRUD (API for auth, localStorage for guests)
└── use-mobile.ts              # Responsive breakpoint detection
```

---

## Key Features

### 3-Pane Layout

```
┌──────────┬────────────────────────┬──────────────┐
│ Sidebar  │       Chat Area        │   Insight    │
│          │                        │    Panel     │
│ Sessions │  Messages + Input      │  Document    │
│ Search   │  Dynamic Greeting      │  Preview     │
│ Profile  │  Citation Buttons      │  (Markdown)  │
└──────────┴────────────────────────┴──────────────┘
```

### Dynamic Greetings

The dashboard greeting adapts based on:
- **Time of day** — Morning (5–11), Afternoon (12–16), Evening (17–20), Night (21–4)
- **User name** — Personalized with first name for logged-in users
- **Session count** — "Welcome back!" variants for returning users
- **Guest mode** — Clean, generic greetings without names

### Authentication

| Mode | Behavior |
|---|---|
| **Guest** | Chat with rate limits, sessions in localStorage |
| **Logged in** | Full access, sessions stored server-side |
| **Admin** | Admin panel access via sidebar link |

Auth state managed by `AuthContext` with JWT stored in HTTP-only cookies.

### Localization

Full trilingual UI via `locales.json`:
- 🇬🇧 English
- 🇺🇿 Oʻzbekcha (Uzbek)
- 🇷🇺 Русский (Russian)

Language switcher in the sidebar. All UI strings (greetings, labels, errors) are translated.

### Settings Modal

Two tabs:
- **General** — Theme selection (Light / Dark / System)
- **Account** — Edit full name (PATCHes `/api/auth/me`, syncs immediately)

### Admin Panel (`/admin`)

| Page | Features |
|---|---|
| Dashboard | Document/chunk/user counts, editable system settings |
| Documents | Full markdown viewer, inline title edit, delete with confirmation |
| Users | Role management, ban/unban toggle, per-user analytics modal |

---

## Tech Stack

| Technology | Version | Purpose |
|---|---|---|
| Next.js | 15 | App Router, SSR, file routing |
| React | 19 | UI rendering |
| Tailwind CSS | 4 | Utility-first styling |
| shadcn/ui | latest | Accessible component primitives |
| Motion | 12 | Animations (Framer Motion) |
| Lucide | latest | Icon library |
| react-markdown | 10 | Markdown rendering |
| next-themes | 0.4 | Dark/light/system theme |

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | ✅ | Backend URL (e.g. `http://localhost:8000`) |

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run clean` | Clean `.next` build cache |

---

## Design System

The UI follows a **"Modern Ministry"** aesthetic:

- **Typography**: `Instrument Serif` for headings, system sans-serif for body
- **Colors**: Warm amber accent on a clean slate/dark background
- **Shapes**: Rounded corners (`rounded-2xl`), soft shadows
- **Animations**: Spring-based transitions, marquee prompt carousel
- **Dark mode**: Full dark theme with Neon-inspired color palette (`#0D1117`, `#161B22`, `#1F6FEB`)
