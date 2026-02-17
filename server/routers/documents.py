import os
import uuid
import logging

from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel

from services.knowledge_base import ingest_document, delete_document_chunks, list_documents

router = APIRouter()
logger = logging.getLogger(__name__)

# 2 MB file size limit
MAX_FILE_SIZE = 2 * 1024 * 1024


class DocumentInfo(BaseModel):
    """Info about an uploaded document."""
    doc_id: str
    filename: str
    status: str


class DocumentListResponse(BaseModel):
    """Response with list of documents."""
    documents: list[DocumentInfo]


@router.post("/upload", response_model=DocumentInfo)
async def upload_document(file: UploadFile = File(...)):
    """
    Upload a document for the knowledge base.
    
    Supports: PDF, TXT, MD, DOCX (max 2 MB)
    The document is processed entirely in memory — chunked, embedded,
    and stored in Firestore for RAG retrieval during voice calls.
    """
    # Validate file type
    allowed_extensions = {".pdf", ".txt", ".md", ".docx"}
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {file_ext}. Allowed: {', '.join(allowed_extensions)}",
        )

    # Read file into memory and enforce size limit
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large ({len(content) / 1024 / 1024:.1f} MB). Maximum allowed: 2 MB.",
        )

    doc_id = str(uuid.uuid4())

    try:
        # Ingest in-memory (chunk + embed + store in Firestore)
        await ingest_document(content, file_ext, doc_id, file.filename)

        logger.info(f"Document ingested: {file.filename} (ID: {doc_id})")

        return DocumentInfo(
            doc_id=doc_id,
            filename=file.filename,
            status="ingested",
        )

    except Exception as e:
        logger.error(f"Failed to ingest document: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to ingest document: {str(e)}")


@router.get("", response_model=DocumentListResponse)
async def get_documents():
    """List all uploaded documents."""
    docs = await list_documents()
    return DocumentListResponse(documents=docs)


@router.delete("/{doc_id}")
async def delete_document(doc_id: str):
    """Delete a document and its vector embeddings."""
    try:
        await delete_document_chunks(doc_id)
        return {"status": "deleted", "doc_id": doc_id}

    except Exception as e:
        logger.error(f"Failed to delete document {doc_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete document: {str(e)}")
