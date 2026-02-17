import { useState, useCallback, useRef, useEffect } from 'react';
import {
    LiveKitRoom,
    useVoiceAssistant,
    BarVisualizer,
    RoomAudioRenderer,
    VoiceAssistantControlBar,
    useTrackTranscription,
    useLocalParticipant,
    useDataChannel,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import { getToken } from '../lib/api';
import { Mic, MicOff, Phone, PhoneOff, Loader2 } from 'lucide-react';

function AgentVisualizer({ onTranscriptUpdate, onRagSourcesUpdate }) {
    const { state, audioTrack, agent } = useVoiceAssistant();
    const { localParticipant } = useLocalParticipant();

    // Track agent transcription — audioTrack from useVoiceAssistant IS the agent's track
    const agentTranscription = useTrackTranscription(audioTrack);

    // Track user transcription (local participant's microphone)
    const localMicPub = localParticipant?.getTrackPublication(Track.Source.Microphone);
    const userTrackRef = localMicPub
        ? { participant: localParticipant, source: Track.Source.Microphone, publication: localMicPub }
        : undefined;
    const userTranscription = useTrackTranscription(userTrackRef);

    // Listen for RAG sources via data channel
    useDataChannel('rag-sources', (msg) => {
        try {
            const text = new TextDecoder().decode(msg.payload);
            const data = JSON.parse(text);
            if (data.type === 'rag_sources' && data.sources && onRagSourcesUpdate) {
                onRagSourcesUpdate(data.sources);
            }
        } catch (e) {
            console.error('Failed to parse RAG sources:', e);
        }
    });

    // Forward transcriptions up
    useEffect(() => {
        if (onTranscriptUpdate) {
            onTranscriptUpdate({
                agent: agentTranscription?.segments || [],
                user: userTranscription?.segments || [],
            });
        }
    }, [agentTranscription?.segments, userTranscription?.segments, onTranscriptUpdate]);

    const stateText = {
        disconnected: 'Disconnected',
        connecting: 'Connecting...',
        initializing: 'Initializing...',
        listening: 'Listening...',
        thinking: 'Thinking...',
        speaking: 'Speaking...',
    };

    return (
        <div className="flex flex-col items-center gap-6">
            {/* Status */}
            <div className="flex items-center gap-2">
                <div
                    className={`w-2.5 h-2.5 rounded-full ${state === 'listening' || state === 'speaking'
                        ? 'bg-(--color-success) animate-pulse'
                        : state === 'thinking'
                            ? 'bg-(--color-warning) animate-pulse'
                            : 'bg-(--color-text-dim)'
                        }`}
                />
                <span className="text-sm text-(--color-text-muted)">
                    {stateText[state] || state}
                </span>
            </div>

            {/* Audio Visualizer */}
            <div className="w-full h-32 flex items-center justify-center">
                {audioTrack ? (
                    <BarVisualizer
                        state={state}
                        trackRef={audioTrack}
                        barCount={24}
                        style={{
                            width: '100%',
                            height: '100%',
                            maxWidth: '300px',
                        }}
                        options={{
                            minHeight: 4,
                        }}
                    />
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-(--color-text-dim) text-sm">
                            {state === 'disconnected' ? 'Start a call to begin' : 'Waiting for audio...'}
                        </div>
                    </div>
                )}
            </div>

            <RoomAudioRenderer />
        </div>
    );
}

export default function VoiceAgent({ onTranscriptUpdate, onRagSourcesUpdate }) {
    const [isConnected, setIsConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [token, setToken] = useState(null);
    const [livekitUrl, setLivekitUrl] = useState(null);
    const [error, setError] = useState(null);

    const handleConnect = useCallback(async () => {
        setIsConnecting(true);
        setError(null);
        try {
            const data = await getToken('voice-agent-room', `user-${Date.now()}`);
            setToken(data.token);
            setLivekitUrl(data.livekit_url);
            setIsConnected(true);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsConnecting(false);
        }
    }, []);

    const handleDisconnect = useCallback(() => {
        setIsConnected(false);
        setToken(null);
        setLivekitUrl(null);
    }, []);

    return (
        <div className="flex flex-col items-center gap-6 w-full">
            {/* Title */}
            <div className="text-center">
                <h2 className="text-2xl font-semibold bg-gradient-to-r from-(--color-primary) to-(--color-accent) bg-clip-text text-transparent">
                    Voice Assistant
                </h2>
                <p className="text-sm text-(--color-text-muted) mt-1">
                    Talk to the AI agent in real-time
                </p>
            </div>

            {/* Error */}
            {error && (
                <div className="w-full px-4 py-3 bg-(--color-error)/10 border border-(--color-error)/30 rounded-(--radius-lg) text-sm text-(--color-error)">
                    {error}
                </div>
            )}

            {/* LiveKit Room */}
            {isConnected && token && livekitUrl ? (
                <LiveKitRoom
                    token={token}
                    serverUrl={livekitUrl}
                    connect={true}
                    audio={true}
                    video={false}
                    onDisconnected={handleDisconnect}
                    className="w-full"
                >
                    <AgentVisualizer
                        onTranscriptUpdate={onTranscriptUpdate}
                        onRagSourcesUpdate={onRagSourcesUpdate}
                    />

                    {/* Controls */}
                    <div className="flex items-center justify-center gap-4 mt-6">
                        <VoiceAssistantControlBar />
                        <button
                            onClick={handleDisconnect}
                            className="flex items-center gap-2 px-5 py-2.5 bg-(--color-error)/10 hover:bg-(--color-error)/20 text-(--color-error) rounded-(--radius-lg) transition-all duration-200 text-sm font-medium cursor-pointer"
                        >
                            <PhoneOff size={16} />
                            End Call
                        </button>
                    </div>
                </LiveKitRoom>
            ) : (
                <div className="flex flex-col items-center gap-6">
                    {/* Idle state visual */}
                    <div className="w-32 h-32 rounded-full bg-(--color-surface) border-2 border-(--color-border) flex items-center justify-center">
                        <Phone size={40} className="text-(--color-text-dim)" />
                    </div>

                    {/* Connect button */}
                    <button
                        onClick={handleConnect}
                        disabled={isConnecting}
                        className="flex items-center gap-2 px-8 py-3 bg-(--color-primary) hover:bg-(--color-primary-hover) disabled:opacity-50 text-white rounded-(--radius-xl) transition-all duration-200 text-sm font-medium shadow-lg shadow-(--color-primary-glow) cursor-pointer disabled:cursor-not-allowed"
                    >
                        {isConnecting ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                Connecting...
                            </>
                        ) : (
                            <>
                                <Mic size={18} />
                                Start Call
                            </>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
}
