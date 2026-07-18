import datetime
from pathlib import Path
from typing import List
from langchain_community.document_loaders import PyPDFLoader, TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_mistralai import MistralAIEmbeddings
from langchain_postgres import PGVector
from src.config import config

class DocumentIngestor:
    def __init__(self):
        self.embeddings = MistralAIEmbeddings(
            model=config.EMBEDDING_MODEL,
            api_key=config.OPENAI_API_KEY
        )
        self.splitter = RecursiveCharacterTextSplitter(
            chunk_size=config.CHUNK_SIZE,
            chunk_overlap=config.CHUNK_OVERLAP,
            separators=["\n\n", "\n", ". ", " ", ""]
        )
        self.vector_store = PGVector(
            connection=config.DB_CONNECTION,
            embeddings=self.embeddings,
            collection_name="enterprise_docs"
        )
    
    def load_document(self, path: str) -> List:
        """Load PDF or TXT files."""
        path = Path(path)
        if path.suffix == ".pdf":
            loader = PyPDFLoader(str(path))
        else:
            loader = TextLoader(str(path))
        return loader.load()
    
    def ingest(self, file_path: str) -> int:
        """
        Full pipeline: load → split → embed → store in pgvector.
        Returns number of chunks ingested.
        """
        docs = self.load_document(file_path)
        chunks = self.splitter.split_documents(docs)
        
        # Add metadata for filtering
        for chunk in chunks:
            chunk.metadata.update({
                "source": file_path,
                "doc_type": Path(file_path).suffix,
                "ingestion_date": str(datetime.now())
            })
        
        self.vector_store.add_documents(chunks)
        return len(chunks)

