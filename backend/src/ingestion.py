import chromadb
from chromadb.config import Settings
from datetime import datetime
from pathlib import Path
from typing import List
from langchain_community.document_loaders import PyPDFLoader, TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_mistralai import MistralAIEmbeddings
from langchain_community.vectorstores import Chroma
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

        self.client = chromadb.PersistentClient(
            path=config.CHROMA_PERSIST_DIR,
            settings=Settings(anonymized_telemetry=False)
        

        )
        self.vector_store = Chroma(
            client=self.client,
            collection_name=config.CHROMA_COLLECTION_NAME,
            embedding_function=self.embeddings
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
    
    def get_stats(self) -> dict:
        """Get collection stats."""  # ✅ THIS METHOD MUST EXIST
        collection = self.client.get_collection(config.CHROMA_COLLECTION_NAME)
        return {
            "total_documents": collection.count(),
            "collection_name": config.CHROMA_COLLECTION_NAME
        }

