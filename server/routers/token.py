from fastapi import APIRouter
from pydantic import BaseModel
from livekit.api import AccessToken, VideoGrants, RoomConfiguration, RoomAgentDispatch

from config import settings

router = APIRouter()


class TokenRequest(BaseModel):
    """Request body for token generation."""
    room_name: str = "voice-agent-room"
    participant_name: str = "user"
    agent_name: str | None = None


class TokenResponse(BaseModel):
    """Response with the generated access token."""
    token: str
    accessToken: str
    livekit_url: str
    participant_token: str
    server_url: str


@router.post("", response_model=TokenResponse)
async def create_token(request: TokenRequest):
    """
    Generate a LiveKit access token for a participant to join a room.
    
    The token is a JWT signed with our LiveKit API key/secret pair.
    The frontend uses this token to authenticate with the LiveKit server
    and join the WebRTC room. The agent is auto-dispatched by LiveKit
    when a participant joins a room.
    """
    dispatch_agent_name = request.agent_name or settings.livekit_agent_name

    room_config = RoomConfiguration()
    dispatch = RoomAgentDispatch()
    dispatch.agent_name = dispatch_agent_name
    room_config.agents.append(dispatch)

    token = (
        AccessToken(settings.livekit_api_key, settings.livekit_api_secret)
        .with_identity(request.participant_name)
        .with_grants(
            VideoGrants(
                room_join=True,
                room=request.room_name,
            )
        )
        .with_room_config(room_config)
    )

    jwt_token = token.to_jwt()

    return TokenResponse(
        token=jwt_token,
        accessToken=jwt_token,
        livekit_url=settings.livekit_url,
        participant_token=jwt_token,
        server_url=settings.livekit_url,
    )
