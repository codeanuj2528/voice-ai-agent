import { useState, useEffect, useRef } from 'react';
import { uploadDocument, getDocuments, deleteDocument } from '../lib/api';
import {
    Upload,
    FileText,
    Trash2,
    Loader2,
    CheckCircle2,
    AlertCircle,
    FolderOpen,
    X,
} from 'lucide-react';

export default function DocumentUpload() {
    const [documents, setDocuments] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState(null);
    const [dragActive, setDragActive] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        loadDocuments();
    }, []);

    async function loadDocuments() {
        try {
            const data = await getDocuments();
            setDocuments(data.documents || []);
        } catch (err) {
            console.error('Failed to load documents:', err);
        }
    }

    async function handleUpload(files) {
        if (!files || files.length === 0) return;

        setUploading(true);
        setError(null);

        try {
            for (const file of files) {
                await uploadDocument(file);
            }
            await loadDocuments();
        } catch (err) {
            setError(err.message);
            setTimeout(() => setError(null), 5000);
        } finally {
            setUploading(false);
        }
    }

    async function handleDelete(docId) {
        setDeletingId(docId);
        try {
            await deleteDocument(docId);
            setDocuments((prev) => prev.filter((d) => d.doc_id !== docId));
        } catch (err) {
            setError(err.message);
            setTimeout(() => setError(null), 5000);
        } finally {
            setDeletingId(null);
        }
    }

    function handleDrop(e) {
        e.preventDefault();
        setDragActive(false);
        handleUpload(e.dataTransfer.files);
    }

    function handleDragOver(e) {
        e.preventDefault();
        setDragActive(true);
    }

    function handleDragLeave() {
        setDragActive(false);
    }

    const fileExtIcon = (filename) => {
        const ext = filename.split('.').pop().toLowerCase();
        const colors = {
            pdf: 'text-red-400',
            txt: 'text-blue-400',
            md: 'text-green-400',
            docx: 'text-indigo-400',
        };
        return colors[ext] || 'text-(--color-text-dim)';
    };

    return (
        <div className="flex flex-col gap-3">
            {/* Header */}
            <div className="flex items-center gap-2">
                <FolderOpen size={16} className="text-(--color-accent)" />
                <h3 className="text-sm font-semibold text-(--color-text)">Knowledge Base</h3>
                {documents.length > 0 && (
                    <span className="text-xs px-1.5 py-0.5 bg-(--color-primary)/10 text-(--color-primary) rounded-full">
                        {documents.length}
                    </span>
                )}
            </div>

            {/* Drop Zone */}
            <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`
          flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed rounded-(--radius-lg)
          cursor-pointer transition-all duration-200
          ${dragActive
                        ? 'border-(--color-primary) bg-(--color-primary)/5'
                        : 'border-(--color-border) hover:border-(--color-border-hover) hover:bg-(--color-surface-hover)/50'
                    }
        `}
            >
                {uploading ? (
                    <>
                        <Loader2 size={24} className="animate-spin text-(--color-primary)" />
                        <span className="text-xs text-(--color-text-muted)">Uploading & processing...</span>
                    </>
                ) : (
                    <>
                        <Upload size={24} className="text-(--color-text-dim)" />
                        <span className="text-xs text-(--color-text-muted)">
                            Drop files or click to upload
                        </span>
                        <span className="text-xs text-(--color-text-dim)">
                            PDF, TXT, MD, DOCX
                        </span>
                    </>
                )}
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.txt,.md,.docx"
                    className="hidden"
                    onChange={(e) => handleUpload(e.target.files)}
                />
            </div>

            {/* Error */}
            {error && (
                <div className="flex items-center gap-2 px-3 py-2 bg-(--color-error)/10 border border-(--color-error)/30 rounded-(--radius-md) text-xs text-(--color-error)">
                    <AlertCircle size={12} />
                    {error}
                </div>
            )}

            {/* Document List */}
            {documents.length > 0 && (
                <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
                    {documents.map((doc) => (
                        <div
                            key={doc.doc_id}
                            className="flex items-center justify-between px-3 py-2 bg-(--color-background) rounded-(--radius-md) group hover:bg-(--color-surface-hover) transition-colors"
                        >
                            <div className="flex items-center gap-2 min-w-0">
                                <FileText size={14} className={fileExtIcon(doc.filename)} />
                                <span className="text-xs text-(--color-text) truncate" title={doc.filename}>
                                    {doc.filename}
                                </span>
                            </div>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(doc.doc_id);
                                }}
                                disabled={deletingId === doc.doc_id}
                                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-(--color-error)/10 rounded transition-all cursor-pointer"
                            >
                                {deletingId === doc.doc_id ? (
                                    <Loader2 size={12} className="animate-spin text-(--color-text-dim)" />
                                ) : (
                                    <Trash2 size={12} className="text-(--color-error)" />
                                )}
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
