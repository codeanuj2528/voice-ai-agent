import { useRef, useEffect } from 'react';
import { MessageSquare, User, Bot } from 'lucide-react';

export default function TranscriptView({ transcriptData }) {
    const scrollRef = useRef(null);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [transcriptData]);

    // Merge and sort all transcript segments by timestamp
    const allSegments = [];

    if (transcriptData?.agent) {
        for (const segment of transcriptData.agent) {
            if (segment.text?.trim()) {
                allSegments.push({
                    role: 'agent',
                    text: segment.text,
                    id: segment.id || `agent-${segment.firstReceivedTime}`,
                    isFinal: segment.final,
                    timestamp: segment.firstReceivedTime || 0,
                });
            }
        }
    }

    if (transcriptData?.user) {
        for (const segment of transcriptData.user) {
            if (segment.text?.trim()) {
                allSegments.push({
                    role: 'user',
                    text: segment.text,
                    id: segment.id || `user-${segment.firstReceivedTime}`,
                    isFinal: segment.final,
                    timestamp: segment.firstReceivedTime || 0,
                });
            }
        }
    }

    // Sort by timestamp  
    allSegments.sort((a, b) => a.timestamp - b.timestamp);

    return (
        <div className="flex flex-col gap-3 h-full">
            {/* Header */}
            <div className="flex items-center gap-2">
                <MessageSquare size={16} className="text-(--color-primary)" />
                <h3 className="text-sm font-semibold text-(--color-text)">Live Transcript</h3>
            </div>

            {/* Messages */}
            <div
                ref={scrollRef}
                className="flex flex-col gap-2 flex-1 overflow-y-auto min-h-0"
            >
                {allSegments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-(--color-text-dim)">
                        <MessageSquare size={24} className="mb-2 opacity-50" />
                        <span className="text-xs">Transcripts will appear here</span>
                    </div>
                ) : (
                    allSegments.map((segment) => (
                        <div
                            key={segment.id}
                            className={`flex gap-2 ${segment.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                        >
                            {/* Avatar */}
                            <div
                                className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${segment.role === 'agent'
                                    ? 'bg-(--color-primary)/15 text-(--color-primary)'
                                    : 'bg-(--color-accent)/15 text-(--color-accent)'
                                    }`}
                            >
                                {segment.role === 'agent' ? <Bot size={12} /> : <User size={12} />}
                            </div>

                            {/* Message bubble */}
                            <div
                                className={`
                  px-3 py-2 rounded-(--radius-lg) text-xs leading-relaxed max-w-[85%]
                  ${segment.role === 'agent'
                                        ? 'bg-(--color-surface-hover) text-(--color-text)'
                                        : 'bg-(--color-primary)/10 text-(--color-text)'
                                    }
                  ${!segment.isFinal ? 'opacity-60' : ''}
                `}
                            >
                                {segment.text}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
