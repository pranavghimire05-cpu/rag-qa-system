import chromadb
from datetime import datetime
from pathlib import Path
from typing import List
from langchain_community.document_loaders import PyPDFLoader, TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from supabase import create_client, Client # ✅ Added
from backend.src.config import config
from backend.src.embedding_wrapper import MistralEmbeddingsWrapper 

class DocumentIngestor:
    def __init__(self):
        self.embeddings = MistralEmbeddingsWrapper(
            model=config.EMBEDDING_MODEL,
            api_key=config.MISTRAL_API_KEY
        )
        self.splitter = RecursiveCharacterTextSplitter(
            chunk_size=config.CHUNK_SIZE,
            chunk_overlap=config.CHUNK_OVERLAP,
            separators=["\n\n", "\n", ". ", " ", ""]
        )

        # Chroma Cloud Client setup
        self.client = chromadb.CloudClient(
            api_key=config.CHROMA_API_KEY,
            tenant=config.CHROMA_TENANT,
            database=config.CHROMA_DATABASE
        )
        self.vector_store = Chroma(
            client=self.client,
            collection_name=config.CHROMA_COLLECTION_NAME,
            embedding_function=self.embeddings
        )

        self.supabase: Client = create_client(
            config.SUPABASE_URL, 
            config.SUPABASE_KEY
        )
    
    def process_new_upload(self, file_path: str):
        """Orchestrates the entry workflow: Storage -> Postgres -> Chroma"""
        path = Path(file_path)
        filename = path.name

        # 1. Upload raw PDF to Supabase Storage Bucket
        with open(file_path, "rb") as f:
            self.supabase.storage.from_("pdfs").upload(
                path=filename, 
                file=f, 
                file_options={"content-type": "application/pdf" if path.suffix == ".pdf" else "text/plain"}
            )
        
        # 2. Get the file's hosted asset URL
        file_url = self.supabase.storage.from_("pdfs").get_public_url(filename)
        
        # 3. Insert record into Postgres DB metadata tracking
        db_record = self.supabase.table("documents").insert({
            "filename": filename,
            "file_url": file_url,
            "status": "processing"
        }).execute()
        
        doc_id = db_record.data[0]["id"]

        # 4. Trigger text parsing and upload to Chroma
        chunks_count = self.ingest(file_path, doc_id)
        
        # 5. Mark database status as completed
        self.supabase.table("documents").update({"status": "completed"}).eq("id", doc_id).execute()
        
        return {"document_id": doc_id, "chunks": chunks_count}

    def load_document(self, path: str) -> List:
        path = Path(path)
        return PyPDFLoader(str(path)).load() if path.suffix == ".pdf" else TextLoader(str(path)).load()
    
    def ingest(self, file_path: str, doc_id: int) -> int:
        docs = self.load_document(file_path)
        chunks = self.splitter.split_documents(docs)
        
        for chunk in chunks:
            chunk.metadata.update({
                "relational_doc_id": doc_id, # ✅ Links vector back to the Postgres entry
                "source": file_path,
                "ingestion_date": str(datetime.now())
            })
    
        self.vector_store.add_documents(chunks)
        return len(chunks)