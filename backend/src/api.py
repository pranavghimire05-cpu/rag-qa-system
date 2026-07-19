from fastapi import FastAPI, HTTPException, UploadFile, File, Response
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from pathlib import Path
import io

# Swapped out pdf2image for PyMuPDF (fitz) to eliminate system Poppler dependencies
import fitz 

from backend.pgvector.retrieval import HybridRetriever
from backend.pgvector.generation import RAGGenerator
from backend.src.ingestion import DocumentIngestor
from backend.src.config import config

app = FastAPI(title="Enterprise RAG Q&A API", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Your React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

retriever = HybridRetriever()
generator = RAGGenerator()
ingestor = DocumentIngestor()

# Ensure upload directory exists
UPLOAD_DIR = Path("data/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_TYPES = {
    "application/pdf": ".pdf",
    "text/plain": ".txt",
    "text/markdown": ".md"
}

class QuestionRequest(BaseModel):
    question: str
    top_k: Optional[int] = 5
    use_hybrid: Optional[bool] = True

class AnswerResponse(BaseModel):
    question: str
    answer: str
    sources: List[dict]
    confidence: str
    retrieval_method: str

# ─── UPDATED ENDPOINT: PURE PYTHON RAG VISUAL DEEP VERIFICATION ───
@app.get("/render-pdf")
async def render_pdf_page(file: str, page: int):
    """
    Extract a specific page from an uploaded PDF using PyMuPDF and return it as a JPEG image.
    Eliminates external system poppler requirements.
    """
    # 1. Sanitize input path to prevent directory traversal attacks
    safe_filename = Path(file).name
    file_path = UPLOAD_DIR / safe_filename
    
    if not file_path.exists() or file_path.suffix.lower() != ".pdf":
        raise HTTPException(status_code=404, detail="Target PDF document not found")
        
    if page < 1:
        raise HTTPException(status_code=400, detail="Page numbers must be 1 or greater")
        
    try:
        # 2. Map PDF directly into a PyMuPDF Document instance object
        doc = fitz.open(str(file_path))
        
        # UI uses 1-based indexing; PyMuPDF uses 0-based indexing
        target_index = page - 1
        
        if target_index < 0 or target_index >= doc.page_count:
            doc.close()
            raise HTTPException(
                status_code=404, 
                detail=f"Page {page} out of bounds. Target only contains {doc.page_count} pages."
            )
            
        # 3. Extract target index asset structure
        pdf_page = doc[target_index]
        
        # 4. Multiply rendering matrix scale context for high definition clarity (1.5x)
        matrix = fitz.Matrix(1.5, 1.5)
        pixmap = pdf_page.get_pixmap(matrix=matrix, alpha=False)
        
        # 5. Extract raw memory matrix payload stream directly into byte blocks
        image_bytes = pixmap.tobytes("jpeg")
        doc.close()
        
        return Response(content=image_bytes, media_type="image/jpeg")
        
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal PDF layout matrix exception: {str(e)}")

@app.post("/upload", response_model=dict)
async def upload_document(file: UploadFile = File(...)):
    """
    Upload a PDF, TXT, or MD file, ingest it into ChromaDB, and return stats.
    """
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: {list(ALLOWED_TYPES.keys())}"
        )
    
    contents = await file.read()
    if len(contents) > 50 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large (max 50MB)")
    
    file_path = UPLOAD_DIR / f"{file.filename}"
    with open(file_path, "wb") as f:
        f.write(contents)
    
    try:
        chunk_count = ingestor.ingest(str(file_path))
        stats = ingestor.get_stats()
        
        return {
            "status": "success",
            "filename": file.filename,
            "chunks_ingested": chunk_count,
            "total_documents": stats["total_documents"],
            "file_path": str(file_path)
        }
        
    except Exception as e:
        if file_path.exists():
            file_path.unlink()
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {str(e)}")

@app.post("/ask", response_model=AnswerResponse)
async def ask_question(req: QuestionRequest):
    try:
        if req.use_hybrid:
            docs = retriever.retrieve_hybrid(req.question)
            method = "hybrid"
        else:
            docs = retriever.retrieve_vector_only(req.question, k=req.top_k)
            method = "vector-only"
        
        if not docs:
            raise HTTPException(404, "No relevant documents found")
        
        result = generator.generate(req.question, docs)
        confidence = "high" if len(docs) >= 3 else "medium" if len(docs) >= 1 else "low"
        
        return AnswerResponse(
            question=result["question"],
            answer=result["answer"],
            sources=result["sources"],
            confidence=confidence,
            retrieval_method=method
        )
    except Exception as e:
        raise HTTPException(500, str(e))

@app.get("/stats")
async def get_stats():
    return ingestor.get_stats()

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "vector_db": "chroma",
        "upload_dir": str(UPLOAD_DIR),
        "version": "1.0"
    }