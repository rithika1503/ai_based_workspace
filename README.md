# AI-Powered Collaborative Engineering Workspace

A full-stack, real-time collaborative project management platform with deep AI capabilities.

## Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                       React Frontend                        │
│             (Vite + TypeScript + Tailwind CSS)              │
│       Kanban Board · Real-time Presence · AI Assistant      │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP / WebSocket (Socket.IO)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                      Node.js Backend                        │
│          (Express + TypeScript + Prisma ORM + Redis)        │
│       Auth (JWT) · Workspaces · Tasks · Notifications       │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │ HTTP Proxy
               ▼                              ▼
┌──────────────────────────────┐ ┌────────────────────────────┐
│      PostgreSQL + Redis      │ │      Python AI Service     │
│       (Docker Compose)       │ │  (FastAPI + Google Gemini) │
│   Data Store · Socket.IO bus │ │ Breakdown · Chat · Meeting │
└──────────────────────────────┘ └────────────────────────────┘
```

---

## Features

- **Multi-tenant Workspaces & Projects**: Organizations, workspace invitations, and scoped projects.
- **Interactive Kanban Board**: Drag-and-drop task workflow (`BACKLOG`, `TODO`, `IN_PROGRESS`, `REVIEW`, `DONE`) with priority tags and due dates.
- **Real-Time Collaboration**:
  - Live task status and movement updates via Socket.IO.
  - Active user presence dots in project boards.
  - In-app notification center.
- **AI-Powered Capabilities**:
  - **Task Breakdown**: Enter a feature description and get structured, actionable sub-tasks.
  - **AI Project Assistant**: Context-aware project chat with suggestions and status summaries.
  - **Meeting to Tasks**: Paste meeting notes or transcripts to automatically extract action items, assignees, and priorities.
  - **Task Enhancement**: Enrich task descriptions with acceptance criteria and implementation steps.

---

## Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, `@dnd-kit`, `@tanstack/react-query`, Lucide Icons |
| **Backend** | Node.js, Express, TypeScript, Prisma ORM, Socket.IO, Redis adapter |
| **AI Service** | Python 3, FastAPI, Uvicorn, Google Generative AI (`google-generativeai`), Pydantic |
| **Infrastructure** | PostgreSQL 15, Redis 7 (Docker Compose) |

---

## Project Structure

```text
├── backend/            # Express TypeScript API & Socket.IO server
│   ├── prisma/         # Prisma schema and database migrations
│   └── src/            # Auth, workspaces, projects, tasks, comments, AI proxy
├── frontend/           # React TypeScript single-page application
│   └── src/            # Components, pages, hooks, services, types
├── ai-service/         # FastAPI Python service for Gemini LLM integrations
│   ├── main.py         # AI endpoints (breakdown, chat, meeting-to-tasks)
│   └── requirements.txt
├── database/           # Database scripts and configuration
├── docs/               # System architecture and specifications
├── docker-compose.yml  # PostgreSQL & Redis container definitions
└── README.md
```

---

## Quick Start

### 1. Prerequisites
- [Docker & Docker Desktop](https://www.docker.com/)
- [Node.js](https://nodejs.org/) (v18+) & `npm`
- [Python 3.10+](https://www.python.org/) & `pip`
- Google Gemini API Key ([Google AI Studio](https://aistudio.google.com/))

### 2. Start PostgreSQL & Redis
```bash
docker compose up -d
```

### 3. Setup and Run Backend
```bash
cd backend
cp .env.example .env
npm install
npm run db:migrate
npm run dev
```
Backend runs at `http://localhost:4000`.

### 4. Setup and Run Python AI Service
```bash
cd ../ai-service
cp .env.example .env
# Edit .env and set your GEMINI_API_KEY
pip install -r requirements.txt
uvicorn main:app --port 8000 --reload
```
AI Service runs at `http://localhost:8000`.

### 5. Setup and Run Frontend
```bash
cd ../frontend
npm install
npm run dev
```
Frontend runs at `http://localhost:5173`.

---

## Environment Configuration

### Backend (`backend/.env`)
```env
DATABASE_URL="postgresql://aiws_user:aiws_pass@localhost:5432/aiws_db"
REDIS_URL="redis://localhost:6379"
AI_SERVICE_URL="http://localhost:8000"
JWT_ACCESS_SECRET="your-access-secret"
JWT_REFRESH_SECRET="your-refresh-secret"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
PORT=4000
NODE_ENV="development"
CLIENT_URL="http://localhost:5173"
```

### AI Service (`ai-service/.env`)
```env
GEMINI_API_KEY="your-gemini-api-key"
AI_SERVICE_PORT=8000
NODE_BACKEND_URL="http://localhost:4000"
```

---

## License
MIT
