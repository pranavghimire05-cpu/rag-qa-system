import os
from dataclasses import dataclass
from dotenv import load_dotenv

load_dotenv()

@dataclass
class Config:
    # OpenAI
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY")
    EMBEDDING_MODEL: str = "mistral-embed"
    LLM_MODEL: str = "mistral-small-latest"
    
    # Database
    DB_CONNECTION: str = os.getenv(
        "DATABASE_URL", 
        "postgresql://postgres:1234@localhost:5432/rag_db"
    )
    
    # Chunking
    CHUNK_SIZE: int = 512
    CHUNK_OVERLAP: int = 50
    
    # Retrieval
    TOP_K_RETRIEVE: int = 10      # Initial retrieval
    TOP_K_RERANK: int = 5         # After re-ranking
    
    # Evaluation
    EVAL_SAMPLE_SIZE: int = 50    # Questions to eval nightly

config = Config()