import { BookOpen, FileText, File } from 'lucide-react';

export default function RagSources({ sources }) {
    const getFileIcon = (fileType) => {
        switch (fileType) {
            case 'pdf': return <FileText size={12} />;
            default: return <File size={12} />;
        }
    };

    return (
        <div className="flex flex-col gap-3">
            {/* Header */}
            <div className="flex items-center gap-2">
                <BookOpen size={16} className="text-(--color-accent)" />
                <h3 className="text-sm font-semibold text-(--color-text)">RAG Sources</h3>
                {sources && sources.length > 0 && (
                    <span className="text-xs text-(--color-text-dim) ml-auto">
                        {sources.length} chunk{sources.length !== 1 ? 's' : ''}
                    </span>
                )}
            </div>

            {/* Sources */}
            <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto">
                {(!sources || sources.length === 0) ? (
                    <div className="flex flex-col items-center justify-center h-24 text-(--color-text-dim)">
                        <BookOpen size={24} className="mb-2 opacity-50" />
                        <span className="text-xs">Referenced sources will appear here</span>
                    </div>
                ) : (
                    sources.map((source, index) => (
                        <div
                            key={index}
                            className="px-3 py-2.5 bg-(--color-background) rounded-(--radius-md) border border-(--color-border)/50"
                        >
                            <div className="flex items-center gap-2 mb-1.5">
                                <span className="text-xs font-medium text-(--color-primary)">
                                    Source {index + 1}
                                </span>
                                {source.source && (
                                    <span className="flex items-center gap-1 text-xs text-(--color-text-dim) truncate">
                                        {getFileIcon(source.file_type)}
                                        {source.source}
                                    </span>
                                )}
                                {source.total_pages > 1 && (
                                    <span className="text-xs text-(--color-text-dim) ml-auto flex-shrink-0">
                                        p.{source.page}/{source.total_pages}
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-(--color-text-muted) leading-relaxed line-clamp-3">
                                {source.content}
                            </p>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
