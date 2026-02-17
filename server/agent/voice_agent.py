import json
import asyncio
import logging
import os
import sys

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Fix macOS Python SSL certificate issue
import certifi
os.environ["SSL_CERT_FILE"] = certifi.where()

from dotenv import load_dotenv
load_dotenv()

from livekit import agents, rtc
from livekit.agents import AgentSession, Agent, RoomInputOptions
from livekit.agents.voice import MetricsCollectedEvent
from livekit.plugins import groq, silero, deepgram

from config import settings
from services.rag import retrieve_context, format_context_for_llm

logger = logging.getLogger("voice-agent")
logger.setLevel(logging.INFO)


def _get_system_prompt() -> str:
    """Read the current system prompt from the config file."""
    try:
        with open(settings.prompt_file, "r") as f:
            data = json.load(f)
            return data.get("system_prompt", "You are a helpful voice AI assistant.")
    except (FileNotFoundError, json.JSONDecodeError):
        return "You are a helpful voice AI assistant."


class VoiceAgent(Agent):
    """Voice AI agent with RAG capabilities."""

    def __init__(self, room: rtc.Room):
        super().__init__(
            instructions=_get_system_prompt(),
        )
        self._room = room

    @agents.function_tool()
    async def search_knowledge_base(self, query: str) -> str:
        """
        Search the knowledge base for relevant information about a topic.
        Use this tool when the user asks a factual question that might be
        answered by the uploaded documents. Provide a clear search query
        based on what the user is asking about.
        """
        logger.info(f"KB search query: {query}")
        chunks = await retrieve_context(query, top_k=3)

        if not chunks:
            return "No relevant information found in the knowledge base."

        # Send RAG sources to the client via data channel
        try:
            sources_payload = json.dumps({
                "type": "rag_sources",
                "sources": chunks,
            })
            await self._room.local_participant.publish_data(
                payload=sources_payload.encode("utf-8"),
                topic="rag-sources",
                reliable=True,
            )
            logger.info(f"Published {len(chunks)} RAG sources to client")
        except Exception as e:
            logger.warning(f"Failed to publish RAG sources: {e}")

        context = format_context_for_llm(chunks)
        logger.info(f"Found {len(chunks)} relevant chunks")
        return context


async def entrypoint(ctx: agents.JobContext):
    """Entrypoint for the LiveKit agent worker."""
    logger.info(f"Agent connecting to room: {ctx.room.name}")

    session = AgentSession(
        stt=groq.STT(
            model="whisper-large-v3-turbo",
            language="en",
            api_key=settings.groq_api_key,
        ),
        llm=groq.LLM(
            model="llama-3.1-8b-instant",
            temperature=0.7,
            api_key=settings.groq_api_key,
        ),
        tts=deepgram.TTS(
            api_key=settings.deepgram_api_key,
        ),
        vad=silero.VAD.load(),
    )

    # Log metrics for observability
    @session.on("metrics_collected")
    def on_metrics(ev: MetricsCollectedEvent):
        agents.metrics.log_metrics(ev.metrics)

    await session.start(
        room=ctx.room,
        agent=VoiceAgent(room=ctx.room),
        room_input_options=RoomInputOptions(),
    )

    # Greet the user
    await session.generate_reply(
        instructions="Greet the user warmly and let them know you can answer questions from uploaded documents."
    )


if __name__ == "__main__":
    agents.cli.run_app(
        agents.WorkerOptions(
            entrypoint_fnc=entrypoint,
            api_key=settings.livekit_api_key,
            api_secret=settings.livekit_api_secret,
            ws_url=settings.livekit_url,
        ),
    )
