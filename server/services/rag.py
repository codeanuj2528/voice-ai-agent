import logging

from google.cloud.firestore_v1.vector import Vector
from google.cloud.firestore_v1.base_vector_query import DistanceMeasure

from services.knowledge_base import _get_db, _get_query_embedding, CHUNKS_COLLECTION

logger = logging.getLogger(__name__)


async def retrieve_context(query: str, top_k: int = 5) -> list[dict]:
    """
    Retrieve relevant document chunks for a query using Firestore vector search.

    Steps:
    1. Embed the query using Jina AI (with task="retrieval.query")
    2. Perform KNN vector search in Firestore (cosine distance)
    3. Return top-k chunks with metadata (source, page, file_type)
    """
    try:
        # 1. Get query embedding
        query_embedding = await _get_query_embedding(query)

        # 2. Perform vector search in Firestore
        db = _get_db()
        chunks_ref = db.collection(CHUNKS_COLLECTION)

        # Firestore vector nearest neighbor query
        vector_query = chunks_ref.find_nearest(
            vector_field="embedding",
            query_vector=Vector(query_embedding),
            distance_measure=DistanceMeasure.COSINE,
            limit=top_k,
        )

        results = vector_query.stream()

        # 3. Format results with metadata
        context_chunks = []
        for doc in results:
            data = doc.to_dict()
            metadata = data.get("metadata", {})
            context_chunks.append({
                "content": data.get("content", ""),
                "doc_id": data.get("doc_id", ""),
                "chunk_index": data.get("chunk_index", 0),
                # Rich metadata for RAG Sources panel
                "source": metadata.get("source", data.get("filename", "unknown")),
                "file_type": metadata.get("file_type", ""),
                "page": metadata.get("page", 1),
                "total_pages": metadata.get("total_pages", 1),
            })

        logger.info(f"Retrieved {len(context_chunks)} chunks for query: '{query[:50]}...'")
        return context_chunks

    except Exception as e:
        logger.exception(f"RAG retrieval failed: {e}")
        return []


def format_context_for_llm(chunks: list[dict]) -> str:
    """Format retrieved chunks into a context string for the LLM."""
    if not chunks:
        return "No relevant information found in the knowledge base."

    context_parts = []
    for i, chunk in enumerate(chunks, 1):
        source = chunk.get("source", "unknown")
        page = chunk.get("page", 1)
        total_pages = chunk.get("total_pages", 1)

        # Include page info for multi-page docs
        if total_pages > 1:
            header = f"[Source {i}: {source}, page {page}/{total_pages}]"
        else:
            header = f"[Source {i}: {source}]"

        context_parts.append(f"{header}\n{chunk['content']}")

    return "\n\n---\n\n".join(context_parts)
