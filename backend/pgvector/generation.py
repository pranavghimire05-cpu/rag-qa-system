from langchain_mistralai import ChatMistralAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from typing import List
from langchain_core.documents import Document
from backend.src.config import config

class RAGGenerator:
    def __init__(self):
        self.llm = ChatMistralAI(
            model_name=config.LLM_MODEL,
            temperature=0.1,  
            api_key=config.MISTRAL_API_KEY
        )
        
        self.prompt = ChatPromptTemplate.from_template("""
You are an expert research assistant. Answer the question using ONLY the provided context.
If the context doesn't contain the answer, say "I don't have enough information to answer that."

Context:
{context}

Question: {question}

Instructions:
- Be concise but complete
- Cite your sources using [Source: filename, page X]
- If multiple sources conflict, mention the discrepancy

Answer:
""")
    
    def format_context(self, docs: List[Document]) -> str:
        """Format retrieved docs with citation metadata."""
        formatted = []
        for i, doc in enumerate(docs, 1):
            source = doc.metadata.get("source", "Unknown")
            page = doc.metadata.get("page", "N/A")
            formatted.append(
                f"[{i}] Source: {source}, Page: {page}\n{doc.page_content}"
            )
        return "\n\n".join(formatted)
    
    def generate(self, question: str, docs: List[Document]) -> dict:
        """
        Generate answer with citations and return structured output.
        """
        context = self.format_context(docs)
        
        chain = self.prompt | self.llm | StrOutputParser()
        answer = chain.invoke({
            "context": context,
            "question": question
        })
        
        return {
            "question": question,
            "answer": answer,
            "sources": [
                {
                    "source": d.metadata.get("source"),
                    "page": d.metadata.get("page"),
                    "score": d.metadata.get("score", "N/A")
                }
                for d in docs
            ],
            "num_sources": len(docs)
        }
