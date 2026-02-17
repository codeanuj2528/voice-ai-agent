import { useState, useCallback } from 'react';
import VoiceAgent from './components/VoiceAgent';
import PromptEditor from './components/PromptEditor';
import DocumentUpload from './components/DocumentUpload';
import TranscriptView from './components/TranscriptView';
import RagSources from './components/RagSources';
import { Bot } from 'lucide-react';

import './App.css';

function App() {
  const [transcriptData, setTranscriptData] = useState(null);
  const [ragSources, setRagSources] = useState([]);

  const handleTranscriptUpdate = useCallback((data) => {
    setTranscriptData(data);
  }, []);

  const handleRagSourcesUpdate = useCallback((sources) => {
    setRagSources(sources);
  }, []);

  return (
    <div className="min-h-screen bg-(--color-background) flex flex-col">
      {/* Header */}
      <header className="border-b border-(--color-border) bg-(--color-surface)/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-(--radius-lg) bg-gradient-to-br from-(--color-primary) to-(--color-accent) flex items-center justify-center">
              <Bot size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-(--color-text)">Voice AI Agent</h1>
              <p className="text-xs text-(--color-text-dim)">Real-time voice assistant with RAG</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-(--color-success) animate-pulse" />
            <span className="text-xs text-(--color-text-muted)">System Online</span>
          </div>
        </div>
      </header>

      {/* Main Content — Three Panel Layout */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
          {/* Left Sidebar — Config & KB */}
          <div className="lg:col-span-3 flex flex-col gap-4">
            {/* Prompt Editor Card */}
            <div className="bg-(--color-surface) border border-(--color-border) rounded-(--radius-xl) p-4">
              <PromptEditor />
            </div>

            {/* Document Upload Card */}
            <div className="bg-(--color-surface) border border-(--color-border) rounded-(--radius-xl) p-4">
              <DocumentUpload />
            </div>
          </div>

          {/* Center — Voice Agent */}
          <div className="lg:col-span-6 flex flex-col">
            <div className="bg-(--color-surface) border border-(--color-border) rounded-(--radius-xl) p-8 flex-1 flex flex-col items-center justify-center">
              <VoiceAgent
                onTranscriptUpdate={handleTranscriptUpdate}
                onRagSourcesUpdate={handleRagSourcesUpdate}
              />
            </div>
          </div>

          {/* Right Sidebar — Transcripts & Sources */}
          <div className="lg:col-span-3 flex flex-col gap-4">
            {/* Transcript Card */}
            <div className="bg-(--color-surface) border border-(--color-border) rounded-(--radius-xl) p-4 flex-1">
              <TranscriptView transcriptData={transcriptData} />
            </div>

            {/* RAG Sources Card */}
            <div className="bg-(--color-surface) border border-(--color-border) rounded-(--radius-xl) p-4">
              <RagSources sources={ragSources} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
