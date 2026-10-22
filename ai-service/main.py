import os
import json
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import google.generativeai as genai

load_dotenv()

# ─── Gemini setup ─────────────────────────────────────────────────────────────
API_KEY = os.getenv("GEMINI_API_KEY", "")
if API_KEY and API_KEY != "your-gemini-api-key-here":
    genai.configure(api_key=API_KEY)
    model = genai.GenerativeModel("gemini-2.0-flash")
else:
    model = None

app = FastAPI(title="AI Engineering Workspace — AI Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:4000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Helpers ──────────────────────────────────────────────────────────────────

def require_model():
    if model is None:
        raise HTTPException(
            status_code=503,
            detail="AI service not configured. Add GEMINI_API_KEY to ai-service/.env"
        )

def call_gemini(prompt: str) -> str:
    require_model()
    response = model.generate_content(prompt)
    return response.text

# ─── Health ───────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "model": "gemini-2.0-flash", "api_key_set": bool(API_KEY and API_KEY != "your-gemini-api-key-here")}

# ─── 3a: AI Task Breakdown ────────────────────────────────────────────────────

class TaskBreakdownRequest(BaseModel):
    feature: str                    # e.g. "Build e-commerce checkout"
    project_context: Optional[str] = None  # existing tasks, project name
    count: int = 5

class GeneratedTask(BaseModel):
    title: str
    description: str
    priority: str      # HIGH | MEDIUM | LOW
    estimated_hours: Optional[int] = None

class TaskBreakdownResponse(BaseModel):
    tasks: list[GeneratedTask]
    summary: str

@app.post("/ai/task-breakdown", response_model=TaskBreakdownResponse)
def task_breakdown(req: TaskBreakdownRequest):
    context_block = f"\n\nExisting project context:\n{req.project_context}" if req.project_context else ""

    prompt = f"""You are a senior software engineering project manager.

Break down the following feature request into exactly {req.count} actionable development tasks.{context_block}

Feature: {req.feature}

Respond ONLY with a valid JSON object in this exact format:
{{
  "summary": "One sentence describing the overall feature",
  "tasks": [
    {{
      "title": "Short task title (max 60 chars)",
      "description": "2-3 sentence description of what to implement",
      "priority": "HIGH" | "MEDIUM" | "LOW",
      "estimated_hours": <integer 1-40>
    }}
  ]
}}

Rules:
- Tasks must be concrete and implementable
- Order from foundational to dependent
- Vary priority based on criticality
- estimated_hours should be realistic
- No markdown, no explanation outside JSON"""

    text = call_gemini(prompt)

    # Strip markdown code fences if Gemini wraps in ```json
    clean = text.strip()
    if clean.startswith("```"):
        clean = clean.split("\n", 1)[1]
        clean = clean.rsplit("```", 1)[0]

    try:
        data = json.loads(clean)
        return TaskBreakdownResponse(**data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI returned invalid JSON: {str(e)}\nRaw: {text[:300]}")


# ─── 3b: AI Project Assistant ─────────────────────────────────────────────────

class AssistantRequest(BaseModel):
    question: str
    project_name: str
    tasks: list[dict]            # full task list from DB
    recent_activity: list[dict] = []
    conversation_history: list[dict] = []  # [{role: user|assistant, content: str}]

class AssistantResponse(BaseModel):
    answer: str
    suggestions: list[str] = []

@app.post("/ai/assistant", response_model=AssistantResponse)
def project_assistant(req: AssistantRequest):
    # Build project context summary
    task_summary = []
    for t in req.tasks[:30]:  # cap at 30 to avoid token overflow
        task_summary.append(
            f"- [{t.get('status','?')}] {t.get('title','?')} "
            f"(priority: {t.get('priority','?')}, "
            f"assignee: {t.get('assignee', {}).get('name', 'unassigned') if t.get('assignee') else 'unassigned'}, "
            f"due: {t.get('dueDate','none')})"
        )

    activity_summary = "\n".join([
        f"- {a.get('action','?')}: {a.get('metadata',{})}" for a in req.recent_activity[:10]
    ])

    # Build conversation context
    history_text = ""
    for msg in req.conversation_history[-6:]:  # last 3 turns
        role = "User" if msg["role"] == "user" else "Assistant"
        history_text += f"{role}: {msg['content']}\n"

    prompt = f"""You are an AI project management assistant for the project "{req.project_name}".

Current project tasks:
{chr(10).join(task_summary) if task_summary else "No tasks yet."}

Recent activity:
{activity_summary if activity_summary else "No recent activity."}

{f"Conversation so far:{chr(10)}{history_text}" if history_text else ""}
User: {req.question}

Respond as a helpful, concise project assistant. Be specific — reference actual task names and statuses.
Respond with a JSON object:
{{
  "answer": "Your clear, specific answer referencing the actual tasks",
  "suggestions": ["Optional actionable suggestion 1", "Optional suggestion 2"]
}}

No markdown outside JSON."""

    text = call_gemini(prompt)
    clean = text.strip()
    if clean.startswith("```"):
        clean = clean.split("\n", 1)[1]
        clean = clean.rsplit("```", 1)[0]

    try:
        data = json.loads(clean)
        return AssistantResponse(**data)
    except Exception:
        # Fallback: return raw text as answer
        return AssistantResponse(answer=text.strip(), suggestions=[])


# ─── 3c: Meeting → Tasks ──────────────────────────────────────────────────────

class MeetingTranscriptRequest(BaseModel):
    transcript: str
    project_name: str
    participants: list[str] = []

class MeetingTask(BaseModel):
    title: str
    description: str
    assignee_name: Optional[str] = None   # name from transcript
    due_date: Optional[str] = None        # ISO date string or null
    priority: str = "MEDIUM"

class MeetingResponse(BaseModel):
    action_items: list[MeetingTask]
    decisions: list[str]
    summary: str

@app.post("/ai/meeting-to-tasks", response_model=MeetingResponse)
def meeting_to_tasks(req: MeetingTranscriptRequest):
    participants_str = ", ".join(req.participants) if req.participants else "unknown"

    prompt = f"""You are an expert at extracting action items from meeting transcripts.

Project: {req.project_name}
Meeting participants: {participants_str}

Transcript:
{req.transcript[:4000]}

Extract all action items, decisions, and create a summary.

Respond ONLY with valid JSON:
{{
  "summary": "2-3 sentence meeting summary",
  "decisions": ["Decision 1", "Decision 2"],
  "action_items": [
    {{
      "title": "Task title (max 60 chars)",
      "description": "What needs to be done",
      "assignee_name": "Person's name or null",
      "due_date": "YYYY-MM-DD or null",
      "priority": "HIGH" | "MEDIUM" | "LOW"
    }}
  ]
}}

Rules:
- Only extract explicit action items (things someone committed to do)
- Match assignee_name to one of the participants if mentioned
- due_date only if explicitly mentioned
- priority HIGH if marked urgent, LOW if nice-to-have
- No markdown outside JSON"""

    text = call_gemini(prompt)
    clean = text.strip()
    if clean.startswith("```"):
        clean = clean.split("\n", 1)[1]
        clean = clean.rsplit("```", 1)[0]

    try:
        data = json.loads(clean)
        return MeetingResponse(**data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI parse error: {str(e)}\nRaw: {text[:300]}")


# ─── Task Description Enhancer ────────────────────────────────────────────────

class EnhanceRequest(BaseModel):
    title: str
    rough_description: Optional[str] = None
    project_context: Optional[str] = None

class EnhanceResponse(BaseModel):
    description: str
    acceptance_criteria: list[str]

@app.post("/ai/enhance-task", response_model=EnhanceResponse)
def enhance_task(req: EnhanceRequest):
    prompt = f"""You are a senior engineer writing a task description for a development team.

Task title: {req.title}
{"Rough description: " + req.rough_description if req.rough_description else ""}
{"Project context: " + req.project_context if req.project_context else ""}

Write a clear, professional task description and acceptance criteria.

Respond with JSON:
{{
  "description": "Clear 2-4 sentence task description",
  "acceptance_criteria": ["Criterion 1", "Criterion 2", "Criterion 3"]
}}

No markdown outside JSON."""

    text = call_gemini(prompt)
    clean = text.strip()
    if clean.startswith("```"):
        clean = clean.split("\n", 1)[1]
        clean = clean.rsplit("```", 1)[0]

    try:
        return EnhanceResponse(**json.loads(clean))
    except Exception:
        return EnhanceResponse(
            description=text.strip()[:500],
            acceptance_criteria=[]
        )
