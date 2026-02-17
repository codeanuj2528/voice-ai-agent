import { useState, useEffect } from 'react';
import { getPrompt, updatePrompt } from '../lib/api';
import { Save, RotateCcw, Loader2, CheckCircle2, AlertCircle, Settings2 } from 'lucide-react';

export default function PromptEditor() {
    const [prompt, setPrompt] = useState('');
    const [originalPrompt, setOriginalPrompt] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState(null); // 'success' | 'error' | null

    useEffect(() => {
        loadPrompt();
    }, []);

    async function loadPrompt() {
        setLoading(true);
        try {
            const data = await getPrompt();
            setPrompt(data.system_prompt);
            setOriginalPrompt(data.system_prompt);
        } catch (err) {
            setStatus('error');
        } finally {
            setLoading(false);
        }
    }

    async function handleSave() {
        setSaving(true);
        setStatus(null);
        try {
            await updatePrompt(prompt);
            setOriginalPrompt(prompt);
            setStatus('success');
            setTimeout(() => setStatus(null), 3000);
        } catch (err) {
            setStatus('error');
        } finally {
            setSaving(false);
        }
    }

    function handleReset() {
        setPrompt(originalPrompt);
        setStatus(null);
    }

    const hasChanges = prompt !== originalPrompt;

    return (
        <div className="flex flex-col gap-3">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Settings2 size={16} className="text-(--color-primary)" />
                    <h3 className="text-sm font-semibold text-(--color-text)">System Prompt</h3>
                </div>
                {/* Status indicator */}
                {status === 'success' && (
                    <div className="flex items-center gap-1 text-xs text-(--color-success)">
                        <CheckCircle2 size={12} />
                        Saved
                    </div>
                )}
                {status === 'error' && (
                    <div className="flex items-center gap-1 text-xs text-(--color-error)">
                        <AlertCircle size={12} />
                        Error
                    </div>
                )}
            </div>

            {/* Textarea */}
            {loading ? (
                <div className="flex items-center justify-center h-40">
                    <Loader2 size={20} className="animate-spin text-(--color-text-dim)" />
                </div>
            ) : (
                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={8}
                    className="w-full px-3 py-2.5 bg-(--color-background) border border-(--color-border) rounded-(--radius-lg) text-sm text-(--color-text) placeholder:text-(--color-text-dim) resize-y focus:outline-none focus:border-(--color-primary) transition-colors"
                    placeholder="Enter the system prompt for the voice agent..."
                />
            )}

            {/* Actions */}
            <div className="flex items-center gap-2">
                <button
                    onClick={handleSave}
                    disabled={saving || !hasChanges}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-(--color-primary) hover:bg-(--color-primary-hover) disabled:opacity-40 text-white text-xs font-medium rounded-(--radius-md) transition-all cursor-pointer disabled:cursor-not-allowed"
                >
                    {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                    Save
                </button>
                <button
                    onClick={handleReset}
                    disabled={!hasChanges}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-(--color-surface-hover) hover:bg-(--color-surface-active) disabled:opacity-40 text-(--color-text-muted) text-xs font-medium rounded-(--radius-md) transition-all cursor-pointer disabled:cursor-not-allowed"
                >
                    <RotateCcw size={12} />
                    Reset
                </button>
            </div>
        </div>
    );
}
