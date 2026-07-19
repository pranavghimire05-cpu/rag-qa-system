from typing import List
from backend.src.config import config
from langchain_mistralai import MistralAIEmbeddings


class MistralEmbeddingsWrapper:
    """
    Standalone wrapper - does NOT inherit from MistralAIEmbeddings.
    This prevents Chroma from calling any inherited tuple-returning methods.
    """
    
    def __init__(self, model: str, api_key: str):
        self._embeddings = MistralAIEmbeddings(
            model=model,
            api_key=api_key
        )
    
    def embed_query(self, text: str) -> List[float]:
        result = self._embeddings.embed_query(text)
        # Handle tuple return
        if isinstance(result, tuple):
            result = list(result)
        # Handle nested tuple: ([0.1, 0.2, ...],)
        if len(result) == 1 and isinstance(result[0], (list, tuple)):
            result = list(result[0])
        return result
    
    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        results = self._embeddings.embed_documents(texts)
        fixed = []
        for r in results:
            if isinstance(r, tuple):
                r = list(r)
            if len(r) == 1 and isinstance(r[0], (list, tuple)):
                r = list(r[0])
            fixed.append(r)
        return fixed