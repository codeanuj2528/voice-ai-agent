import os
import json

from fastapi import APIRouter
from pydantic import BaseModel

from config import settings

router = APIRouter()


class PromptRequest(BaseModel):
    """Request body for updating the system prompt."""
    system_prompt: str


class PromptResponse(BaseModel):
    """Response with the current system prompt."""
    system_prompt: str


def _read_prompt() -> str:
    """Read the system prompt from the JSON file."""
    try:
        with open(settings.prompt_file, "r") as f:
            data = json.load(f)
            return data.get("system_prompt", "")
    except (FileNotFoundError, json.JSONDecodeError):
        return "You are a helpful voice AI assistant."


def _write_prompt(prompt: str):
    """Write the system prompt to the JSON file."""
    with open(settings.prompt_file, "w") as f:
        json.dump({"system_prompt": prompt}, f, indent=2)


@router.get("", response_model=PromptResponse)
async def get_prompt():
    """Get the current system prompt."""
    return PromptResponse(system_prompt=_read_prompt())


@router.put("", response_model=PromptResponse)
async def update_prompt(request: PromptRequest):
    """Update the system prompt. The agent will use this on the next call."""
    _write_prompt(request.system_prompt)
    return PromptResponse(system_prompt=request.system_prompt)
