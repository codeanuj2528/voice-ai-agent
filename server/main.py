import os
import json
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from routers import token, documents, prompt

# Configure logging so service module logs show in uvicorn output
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)


@asynccontextmanager
async def lifespan(app):
    """Application lifespan — initialize resources on startup."""
    # Initialize default system prompt if not exists
    if not os.path.exists(settings.prompt_file):
        default_prompt = {
            "system_prompt": (
                "You are a helpful voice AI assistant. "
                "When the user asks a factual question, use the search_knowledge_base tool "
                "to find relevant information from the uploaded documents. "
                "Always provide clear, concise, and conversational answers. "
                "If you use information from the knowledge base, mention that you found it in the documents."
            )
        }
        with open(settings.prompt_file, "w") as f:
            json.dump(default_prompt, f, indent=2)

    yield


app = FastAPI(
    title="Voice AI Agent API",
    description="Backend for real-time voice AI agent with RAG",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", 
        "http://localhost:3000",
        "http://localhost",
        "http://127.0.0.1",
        "http://127.0.0.1:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers
app.include_router(token.router, prefix="/api/token", tags=["Token"])
app.include_router(documents.router, prefix="/api/documents", tags=["Documents"])
app.include_router(prompt.router, prefix="/api/prompt", tags=["Prompt"])


@app.get("/api/health")
async def health_check():
    return {"status": "ok"}
