import os
from dataclasses import dataclass
from dotenv import load_dotenv

load_dotenv()

@dataclass
class Config:
    # OpenAI
    MISTRAL_API_KEY: str = os.getenv("MISTRAL_API_KEY")
    EMBEDDING_MODEL: str = "mistral-embed"
    LLM_MODEL: str = "mistral-small-latest"

    
    # Database
    CHROMA_API_KEY: str = os.getenv("CHROMA_API_KEY")
    CHROMA_TENANT: str = os.getenv("CHROMA_TENANT")
    CHROMA_DATABASE : str = os.getenv("CHROMA_DATABASE")

    SUPABASE_URL = os.getenv("SUPABASE_URL")
    SUPABASE_KEY = os.getenv("SUPABASE_KEY")  # Use the 'anon public' key here
    
    # Chunking
    CHUNK_SIZE: int = 512
    CHUNK_OVERLAP: int = 50
    
    # Retrieval
    TOP_K_RETRIEVE: int = 10      # Initial retrieval
    TOP_K_RERANK: int = 5         # After re-ranking
    
    # Evaluation
    EVAL_SAMPLE_SIZE: int = 50    # Questions to eval nightly

config = Config()