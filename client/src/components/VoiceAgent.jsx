import { useCallback, useMemo, useEffect, useRef, useState } from 'react';
import {
    useVoiceAssistant,
    BarVisualizer,
    RoomAudioRenderer,
    useTrackTranscription,
    useLocalParticipant,
    useDataChannel,
    useTracks,
    useMultibandTrackVolume,
    useMediaDevices,
    useSession,
    SessionProvider,
} from '@livekit/components-react';
import { Track, TokenSource, ConnectionState } from 'livekit-client';
import { getToken } from '../lib/api';
import { Mic, MicOff, Phone, PhoneOff, Loader2, AlertCircle } from 'lucide-react';

/**
 * A provider component for agent sessions that wraps SessionProvider
 * and includes RoomAudioRenderer for audio playback.
 */
function AgentSessionProvider({
    session,
    children,
    ...roomAudioRendererProps
}) {
    return (
        <SessionProvider session={session}>
            {children}
            <RoomAudioRenderer {...roomAudioRendererProps} />
        </SessionProvider>
    );
}

function AgentVisualizer({ onTranscriptUpdate, onRagSourcesUpdate, isPushToTalkActive }) {
    const { state, audioTrack } = useVoiceAssistant();
    const micTracks = useTracks([Track.Source.Microphone], { onlySubscribed: true });
    const { localParticipant } = useLocalParticipant();

    const fallbackRemoteMicTrack = useMemo(() => (
        micTracks.find((t) => !t.participant?.isLocal)
    ), [micTracks]);

    const effectiveAudioTrack = audioTrack || fallbackRemoteMicTrack;

    // Prefer agent track; fallback helps when participant kind is not resolved as AGENT.
    const agentTranscription = useTrackTranscription(effectiveAudioTrack);

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
        ready: 'Ready',
        disconnected: 'Disconnected',
        connecting: 'Connecting...',
        initializing: 'Initializing...',
        listening: 'Listening...',
        thinking: 'Thinking...',
        speaking: 'Speaking...',
    };

    const effectiveState = isPushToTalkActive
        ? 'listening'
        : (state === 'thinking' || state === 'speaking' ? state : 'ready');

    return (
        <div className="flex flex-col items-center gap-6">
            {/* Status */}
            <div className="flex items-center gap-2">
                <div
                    className={`w-2.5 h-2.5 rounded-full ${effectiveState === 'listening' || effectiveState === 'speaking'
                        ? 'bg-(--color-success) animate-pulse'
                        : effectiveState === 'thinking'
                            ? 'bg-(--color-warning) animate-pulse'
                            : 'bg-(--color-text-dim)'
                        }`}
                />
                <span className="text-sm text-(--color-text-muted)">
                    {stateText[effectiveState] || effectiveState}
                </span>
            </div>

            {/* Audio Visualizer */}
            <div className="w-full h-32 flex items-center justify-center">
                {effectiveAudioTrack ? (
                    <BarVisualizer
                        state={state}
                        trackRef={effectiveAudioTrack}
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
                        <div className="text-(--color-text-dim) text-sm flex items-center gap-2">
                            {state === 'disconnected' ? 'Start a call to begin' : (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    Waiting for agent audio...
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>

        </div>
    );
}

function ConnectedMicPanel({ session, isPushToTalkActive, setIsPushToTalkActive }) {
    const { localParticipant, isMicrophoneEnabled, microphoneTrack } = useLocalParticipant();
    const devices = useMediaDevices({ kind: 'audioinput' });
    const [activeDeviceId, setActiveDeviceId] = useState('');
    const selectedDeviceId = activeDeviceId || session.room.getActiveDevice('audioinput') || '';

    const localMicTrackRef = useMemo(() => {
        if (!microphoneTrack) return undefined;
        return {
            participant: localParticipant,
            source: Track.Source.Microphone,
            publication: microphoneTrack,
        };
    }, [localParticipant, microphoneTrack]);

    const frequencyBands = useMultibandTrackVolume(localMicTrackRef, {
        bands: 8,
        loPass: 100,
        hiPass: 500,
    });

    const micLevel = useMemo(() => {
        if (!frequencyBands.length) return 0;
        const avg = frequencyBands.reduce((sum, value) => sum + value, 0) / frequencyBands.length;
        return Math.round(avg * 100);
    }, [frequencyBands]);

    const startTalking = useCallback(async () => {
        setIsPushToTalkActive(true);
        await localParticipant.setMicrophoneEnabled(true, undefined, {
            preConnectBuffer: false,
            stopMicTrackOnMute: true,
        });
    }, [localParticipant, setIsPushToTalkActive]);

    const stopTalking = useCallback(async () => {
        setIsPushToTalkActive(false);
        await localParticipant.setMicrophoneEnabled(false);
    }, [localParticipant, setIsPushToTalkActive]);

    useEffect(() => {
        if (!isPushToTalkActive) return;

        const handleRelease = () => {
            stopTalking().catch(() => { });
        };

        window.addEventListener('pointerup', handleRelease);
        window.addEventListener('pointercancel', handleRelease);
        window.addEventListener('blur', handleRelease);

        return () => {
            window.removeEventListener('pointerup', handleRelease);
            window.removeEventListener('pointercancel', handleRelease);
            window.removeEventListener('blur', handleRelease);
        };
    }, [isPushToTalkActive, stopTalking]);

    const handleMicSourceChange = useCallback(async (event) => {
        const deviceId = event.target.value;
        setActiveDeviceId(deviceId);
        await session.room.switchActiveDevice('audioinput', deviceId, true);
    }, [session.room]);

    return (
        <div className="w-full mt-4 rounded-(--radius-lg) border border-(--color-border) bg-(--color-surface) p-4">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <div className="text-sm font-medium text-(--color-text)">Microphone</div>
                    <div className="text-xs text-(--color-text-dim)">
                        {isMicrophoneEnabled ? `Live • Level ${micLevel}%` : 'Muted • Hold to talk'}
                    </div>
                </div>
                <button
                    type="button"
                    onPointerDown={startTalking}
                    onPointerUp={stopTalking}
                    onPointerCancel={stopTalking}
                    onPointerLeave={stopTalking}
                    className={`flex items-center gap-2 px-3 py-2 rounded-(--radius-md) text-sm font-medium transition-all duration-200 cursor-pointer ${isMicrophoneEnabled
                        ? 'bg-(--color-primary)/10 text-(--color-primary) hover:bg-(--color-primary)/20'
                        : 'bg-(--color-surface) text-(--color-text) hover:bg-(--color-background)'
                        }`}
                >
                    {isMicrophoneEnabled ? <Mic size={16} /> : <MicOff size={16} />}
                    {isPushToTalkActive ? 'Release to Mute' : 'Hold to Talk'}
                </button>
            </div>

            <div className="mt-3">
                <div className="mb-3">
                    <label className="block text-xs text-(--color-text-dim) mb-1">Mic Source</label>
                    <select
                        value={selectedDeviceId}
                        onChange={handleMicSourceChange}
                        className="w-full bg-(--color-background) border border-(--color-border) rounded-(--radius-md) px-3 py-2 text-sm text-(--color-text)"
                    >
                        <option value="" disabled>Select microphone</option>
                        {devices.map((device) => (
                            <option key={device.deviceId} value={device.deviceId}>
                                {device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="text-xs text-(--color-text-dim) mb-2">Mic Frequency Bands</div>
                <div className="h-16 flex items-end gap-1">
                    {frequencyBands.map((band, idx) => (
                        <div
                            key={idx}
                            className="flex-1 rounded-sm bg-(--color-primary)/70 transition-all duration-100"
                            style={{ height: `${Math.max(8, Math.min(100, band * 100))}%` }}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}

function ConnectionControls({ session, error, isPushToTalkActive, setIsPushToTalkActive }) {
    const handleConnect = useCallback(() => {
        session.start({
            tracks: {
                microphone: {
                    enabled: false,
                    publishOptions: {
                        preConnectBuffer: false,
                        stopMicTrackOnMute: true,
                    },
                },
            },
        });
    }, [session]);

    const handleDisconnect = useCallback(() => {
        session.end();
    }, [session]);

    // Derived state from session
    // Use ConnectionState enum for robustness
    const isConnected = session.isConnected;
    const isConnecting = session.connectionState === ConnectionState.Connecting || session.connectionState === ConnectionState.Reconnecting;

    return (
        <>
            {/* Error */}
            {error && (
                <div className="w-full px-4 py-3 bg-(--color-error)/10 border border-(--color-error)/30 rounded-(--radius-lg) text-sm text-(--color-error) flex items-start gap-2">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                    <span>{error.message || '' + error}</span>
                </div>
            )}

            {isConnected ? (
                <div className="w-full">
                    <div className="flex items-center justify-center gap-4 mt-6">
                        <button
                            onClick={handleDisconnect}
                            className="flex items-center gap-2 px-5 py-2.5 bg-(--color-error)/10 hover:bg-(--color-error)/20 text-(--color-error) rounded-(--radius-lg) transition-all duration-200 text-sm font-medium cursor-pointer"
                        >
                            <PhoneOff size={16} />
                            End Call
                        </button>
                    </div>
                    <ConnectedMicPanel
                        session={session}
                        isPushToTalkActive={isPushToTalkActive}
                        setIsPushToTalkActive={setIsPushToTalkActive}
                    />
                </div>
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
        </>
    );
}

export default function VoiceAgent({ onTranscriptUpdate, onRagSourcesUpdate }) {
    const retryAttemptsRef = useRef(0);
    const maxRetries = 2;
    const [isPushToTalkActive, setIsPushToTalkActive] = useState(false);
    const [sessionParams] = useState(() => {
        if (typeof crypto === 'undefined' || !crypto.randomUUID) {
            return null;
        }

        const sessionId = crypto.randomUUID();
        return {
            roomName: `voice-demo-${sessionId}`,
            participantName: `user-${sessionId}`,
        };
    });

    const tokenSource = useMemo(() => {
        return TokenSource.custom(async (options) => {
            if (!sessionParams) {
                throw new Error('Session initialization in progress');
            }

            const { roomName, participantName } = sessionParams;
            const data = await getToken(roomName, participantName, options?.agentName || 'voice-agent');

            const participantToken = data.participant_token || data.accessToken || data.token;
            const serverUrl = data.server_url || data.livekit_url;

            if (!participantToken || !serverUrl) {
                throw new Error('Token endpoint response missing LiveKit connection fields');
            }

            return {
                participantToken,
                serverUrl,
            };
        });
    }, [sessionParams]);

    const session = useSession(tokenSource, {
        agentName: 'voice-agent',
        agentConnectTimeoutMilliseconds: 30000,
    });

    const handleRetry = useCallback(() => {
        if (retryAttemptsRef.current >= maxRetries) {
            return;
        }
        if (
            session.connectionState !== ConnectionState.Connecting &&
            session.connectionState !== ConnectionState.Reconnecting
        ) {
            return;
        }

        retryAttemptsRef.current += 1;
        session.end();
        setTimeout(() => {
            session.start();
        }, 700 * retryAttemptsRef.current);
    }, [session]);

    useEffect(() => {
        if (session.connectionState === ConnectionState.Connected) {
            retryAttemptsRef.current = 0;
        }
    }, [session.connectionState]);

    useEffect(() => {
        if (
            session.connectionState === ConnectionState.Connecting ||
            session.connectionState === ConnectionState.Reconnecting
        ) {
            const timeout = setTimeout(() => {
                handleRetry();
            }, 15000);
            return () => clearTimeout(timeout);
        }
    }, [session.connectionState, handleRetry]);

    return (
        <AgentSessionProvider session={session}>
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

                {/* Main Content */}
                <AgentVisualizer
                    onTranscriptUpdate={onTranscriptUpdate}
                    onRagSourcesUpdate={onRagSourcesUpdate}
                    isPushToTalkActive={isPushToTalkActive}
                />

                {/* Connection Controls */}
                {/* We pass session here to access state/start/disconnect */}
                <ConnectionControls
                    session={session}
                    error={session.error}
                    isPushToTalkActive={isPushToTalkActive}
                    setIsPushToTalkActive={setIsPushToTalkActive}
                />
            </div>
        </AgentSessionProvider>
    );
}
