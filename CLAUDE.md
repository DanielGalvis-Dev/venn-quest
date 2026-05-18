# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**VennQuest** is an educational web app teaching Set Theory and Venn Diagrams via drag-and-drop mechanics with AI-powered feedback from Google Gemini. Students drag numbered tokens into Venn diagram zones and receive adaptive pedagogical explanations.

**Stack:** React 18 + TypeScript + Vite (frontend) · Node.js + Express + TypeScript (backend) · MySQL (database) · Google Generative AI (Gemini) · @dnd-kit/core (drag and drop) · Tailwind CSS

---

## Commands

### Root (from `venn-quest/`)
```bash
npm run install:all     # Install dependencies for both workspaces
npm run dev             # Start backend + frontend concurrently
npm run build:backend
npm run build:frontend
```

### Backend (from `venn-quest/backend/`)
```bash
npm run dev             # ts-node-dev with hot reload on port 3001
npm run build           # Compile TypeScript → dist/
npm run start           # Run compiled output
npm run db:init         # Re-seed MySQL database with problems
```

### Frontend (from `venn-quest/frontend/`)
```bash
npm run dev             # Vite dev server on port 5173
npm run build           # tsc + Vite production build
npm run lint            # ESLint
npm run preview         # Preview production build
```

There are no automated tests; validation is done manually.

---

## Architecture

### Monorepo Layout
```
venn-quest/
├── backend/src/
│   ├── index.ts          # Express server entry point
│   ├── db/database.ts    # MySQL pool + query helpers
│   └── routes/           # problem.ts · evaluate.ts · users.ts
└── frontend/src/
    ├── App.tsx            # Top-level state machine (view routing)
    ├── components/game/   # GameScreen, VennDiagram*Set, DraggableChip, DropZone, FeedbackModal
    ├── components/ui/     # SignIn, SignUp, Header, modals, LoadingScreen
    ├── hooks/useVennGame.ts  # All game state (token positions, distribution)
    ├── types/index.ts     # Shared TypeScript types & ZoneId enum
    └── utils/             # api.ts (fetch wrappers) · alerts.ts (SweetAlert2)
```

### Frontend State Flow
`App.tsx` holds a simple view state machine:
- **`appState`**: `"signin" | "signup" | "loading" | "playing" | "error"`
- **`user`**: `UserState | null` (id, username, level, XP) — persisted in `localStorage`
- **`problem`**: current `Problem` to solve

Game logic lives entirely in `useVennGame` hook: tracks each token's `zone`, exposes `moveItem()`, `getDistribution()`, and `allPlaced` flag.

### Backend Evaluation Pipeline
`POST /api/evaluate`:
1. Validates token distribution against `solution_json` stored in MySQL
2. On correct answer: calls Gemini with an adaptive prompt that includes the student's attempt and the correct answer
3. Returns `{ isCorrect, feedback, user }` — feedback gracefully falls back to a generic message if Gemini fails
4. XP reward: full on first solve, 25% on repeat. Level thresholds: 400 XP → level 2, 900 XP → level 3

### Leveled Progression
| Level | Name | Diagram | Zones |
|-------|------|---------|-------|
| 1 – Aprendiz | 2-set | 3 zones |
| 2 – Explorador | 3-set | 7 zones |
| 3 – Maestro | 4-set | 14 zones (no A∩D or B∩C — diagonally opposite in layout) |

### Database Schema (MySQL)
- **`users`**: id, username, password_hash, email, current_level, experience_points
- **`problems`**: id, level, title, statement, solution_json, hints_json, xp_reward
- **`user_progress`**: user_id, problem_id, attempts

### API Routes
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/problem?userId=X` | Next unsolved problem for user's level |
| POST | `/api/evaluate` | Submit answer, get feedback + updated user |
| POST | `/api/users` | Register |
| POST | `/api/users/login` | Authenticate |
| POST | `/api/users/forgot-password` | Email reset link |
| PUT | `/api/users/update-username` | Change username |
| PUT | `/api/users/update-password` | Change password |
| GET | `/api/users` | All users (leaderboard) |

### Environment Variables
Backend reads from `backend/.env`:
```
PORT, GEMINI_API_KEY
DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT
EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS, EMAIL_FROM
```

### Vite Proxy
`frontend/vite.config.ts` proxies `/api` → `localhost:3001`, so frontend fetch calls use relative `/api/...` paths in development.

### Styling
Custom Tailwind theme in `frontend/tailwind.config.js`:
- **Colors** (`quest.*`): bg `#0f0e17`, card `#1a1a2e`, purple `#7c3aed`, cyan `#06b6d4`, gold `#fbbf24`
- **Fonts**: Fredoka One (display/logo), Nunito (body) via Google Fonts
- **Animations**: `float`, `pulse-glow`, `level-up`, `shake`, `slide-up`, `sparkle`
