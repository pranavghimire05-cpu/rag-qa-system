import json
from pathlib import Path
import pandas as pd
from datetime import datetime
from typing import List, Dict
from datasets import Dataset
from ragas import evaluate
from ragas.metrics import (
    faithfulness,
    answer_relevancy,
    context_precision,
    context_recall,
    context_entity_recall
)
from langchain_mistralai import ChatMistralAI, MistralAIEmbeddings
from backend.pgvector.retrieval import HybridRetriever
from backend.pgvector.generation import RAGGenerator
from backend.src.config import config
from backend.src.embedding_wrapper import MistralEmbeddingsWrapper 

class RAGEvaluator:
    def __init__(self):
        self.retriever = HybridRetriever()
        self.generator = RAGGenerator()
        self.llm = ChatMistralAI(
            model=config.LLM_MODEL,
            openai_api_key=config.MISTRAL_API_KEY
        )
        self.embeddings = MistralEmbeddingsWrapper(
            model=config.EMBEDDING_MODEL,
            api_key=config.MISTRAL_API_KEY
        )
    
    def run_evaluation(self, test_questions: List[Dict]) -> Dict:
        """
        test_questions format:
        [
            {
                "question": "What was Q3 revenue?",
                "ground_truth": "The Q3 revenue was $45M",
                "ground_truth_context": ["Revenue in Q3 reached $45 million..."]
            }
        ]
        """
        results = []
        
        for item in test_questions:
            # Retrieve
            docs = self.retriever.retrieve(item["question"])
            contexts = [d.page_content for d in docs]
            
            # Generate
            response = self.generator.generate(item["question"], docs)
            
            results.append({
                "question": item["question"],
                "answer": response["answer"],
                "contexts": contexts,
                "ground_truth": item["ground_truth"],
                "ground_truth_contexts": item.get("ground_truth_context", [])
            })
        
        # Convert to ragas Dataset
        dataset = Dataset.from_list(results)
        
        # Run metrics
        scores = evaluate(
            dataset=dataset,
            metrics=[
                faithfulness,
                answer_relevancy,
                context_precision,
                context_recall,
                context_entity_recall
            ],
            llm=self.llm,
            embeddings=self.embeddings
        )
        
        return {
            "timestamp": datetime.now().isoformat(),
            "num_questions": len(test_questions),
            "scores": scores.to_pandas().to_dict(),
            "raw_results": results
        }
    
    def save_report(self, report: Dict, path: str = "evaluation/nightly_results"):
        """Save evaluation report with timestamp."""
        Path(path).mkdir(parents=True, exist_ok=True)
        filename = f"{path}/eval_{datetime.now().strftime('%Y%m%d_%H%M')}.json"
        
        with open(filename, "w") as f:
            json.dump(report, f, indent=2, default=str)
        
        print(f"📊 Evaluation saved to {filename}")
        
        # Print summary
        df = pd.DataFrame([report["scores"]])
        print("\n📈 Metrics Summary:")
        for metric, value in report["scores"].items():
            if isinstance(value, (int, float)):
                print(f"  • {metric}: {value:.3f}")
        
        return filename

# Example test set (build this from your actual docs!)
TEST_SET = [
    {
        "question": "What was the company's revenue in 2023?",
        "ground_truth": "The company reported $120M in revenue for 2023.",
        "ground_truth_context": ["In fiscal year 2023, total revenue reached $120 million..."]
    },
    # Add 20-50 questions covering edge cases
]

# Usage
# evaluator = RAGEvaluator()
# report = evaluator.run_evaluation(TEST_SET[:5])  # Start small
# evaluator.save_report(report)