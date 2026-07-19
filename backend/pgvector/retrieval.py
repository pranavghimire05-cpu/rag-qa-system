import chromadb
from chromadb.config import Settings
from typing import List
from langchain_community.retrievers import BM25Retriever
from langchain_classic.retrievers import EnsembleRetriever
from langchain_community.cross_encoders import HuggingFaceCrossEncoder
from langchain_classic.retrievers.document_compressors import CrossEncoderReranker
from langchain_classic.retrievers.contextual_compression import ContextualCompressionRetriever
from langchain_community.vectorstores import Chroma
from backend.src.embedding_wrapper import MistralEmbeddingsWrapper 
from backend.src.config import config

class HybridRetriever:
    def __init__(self):
        self.embeddings = MistralEmbeddingsWrapper(
            model=config.EMBEDDING_MODEL,
            api_key=config.MISTRAL_API_KEY)
        
        self.client = chromadb.PersistentClient(
                path=config.CHROMA_PERSIST_DIR,
                settings=Settings(anonymized_telemetry=False)
            )
        
        self.vector_store = Chroma(
            client=self.client,
            collection_name=config.CHROMA_COLLECTION_NAME,
            embedding_function=self.embeddings
        )
        
        # Cross-encoder for re-ranking
        self.reranker = CrossEncoderReranker(
            model=HuggingFaceCrossEncoder(model_name="cross-encoder/ms-marco-MiniLM-L-6-v2"),
            top_n=config.TOP_K_RERANK
        )
    
    def retrieve_hybrid(self, query: str) -> List:
        """
        1. Dense retrieval (pgvector) + BM25 keyword search
        2. Ensemble (combine both)
        3. Cross-encoder re-ranking
        """
        # Dense retriever
        dense_retriever = self.vector_store.as_retriever(
            search_kwargs={"k": config.TOP_K_RETRIEVE}
        )
        
        # Get all docs for BM25 (in production, use a smaller index)
        all_docs = self.vector_store.similarity_search("", k=1000)
        bm25_retriever = BM25Retriever.from_documents(all_docs)
        bm25_retriever.k = config.TOP_K_RETRIEVE
        
        # Ensemble: 60% dense, 40% BM25
        ensemble = EnsembleRetriever(
            retrievers=[dense_retriever, bm25_retriever],
            weights=[0.6, 0.4]
        )
        
        # Re-rank with cross-encoder
        compression_retriever = ContextualCompressionRetriever(
            base_compressor=self.reranker,
            base_retriever=ensemble
        )
        
        return compression_retriever.invoke(query)

