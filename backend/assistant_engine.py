from typing import List, Optional, Dict, Any
from langchain_core.documents import Document
from langchain_groq import ChatGroq
import logging
import os
from datetime import datetime

from backend.vector_store import VectorStoreManager, FAISS
from backend.data_loader import DataLoader

logger = logging.getLogger(__name__)


class AssistantEngine:
    
    def __init__(self, groq_api_key: str, model_name: str = "llama-3.3-70b-versatile"):
        self.groq_api_key = groq_api_key
        self.model_name = model_name
        self.vector_store_manager = VectorStoreManager()
        
        self.llm = ChatGroq(
            api_key=groq_api_key,
            model=model_name,
            temperature=0.3,
            max_tokens=2048
        )
        
        logger.info(f"Assistant engine initialized with model: {model_name}")
    
    def create_assistant(
        self,
        assistant_id: str,
        name: str,
        documents: List[Document],
        custom_instructions: str,
        enable_statistics: bool = False,
        enable_alerts: bool = False,
        enable_recommendations: bool = False
    ) -> Dict[str, Any]:
        try:
            logger.info(f"Creating assistant '{name}' with {len(documents)} documents")
            
            # Create vector store for this assistant
            vector_store = self.vector_store_manager.create_vector_store(documents)
            
            # Build system instructions
            system_instructions = self._build_system_instructions(
                custom_instructions,
                enable_statistics,
                enable_alerts,
                enable_recommendations
            )
            
            assistant_config = {
                "assistant_id": assistant_id,
                "name": name,
                "vector_store": vector_store,
                "custom_instructions": custom_instructions,
                "system_instructions": system_instructions,
                "documents_count": len(documents),
                "enable_statistics": enable_statistics,
                "enable_alerts": enable_alerts,
                "enable_recommendations": enable_recommendations,
                "created_at": datetime.utcnow().isoformat()
            }
            
            logger.info(f"Assistant '{name}' created successfully")
            return assistant_config
            
        except Exception as e:
            logger.error(f"Error creating assistant: {str(e)}")
            raise
    
    def chat(
        self,
        assistant_config: Dict[str, Any],
        user_message: str
    ) -> Dict[str, Any]:
        try:
            vector_store = assistant_config["vector_store"]
            system_instructions = assistant_config["system_instructions"]
            
            logger.info(f"Processing chat for assistant: {assistant_config['name']}")
            
            is_comparison = any(word in user_message.lower() for word in ['highest', 'lowest', 'best', 'worst', 'maximum', 'minimum', 'most', 'least', 'compare', 'all', 'which'])
            k_docs = 30 if is_comparison else 8
            
            relevant_docs = self.vector_store_manager.similarity_search(
                vector_store=vector_store,
                query=user_message,
                k=k_docs
            )
            
            if not relevant_docs:
                return {
                    "response": "I don't have enough information to answer that question based on the provided data.",
                    "sources_used": 0,
                    "timestamp": datetime.utcnow().isoformat()
                }
            
            logger.info(f"Retrieved {len(relevant_docs)} documents for query: {user_message[:50]}...")
            
            context = self._build_context(relevant_docs)
            
            prompt = self._build_prompt(system_instructions, context, user_message, relevant_docs)
            
            response = self.llm.invoke(prompt)
            
            result = {
                "response": response.content,
                "sources_used": len(relevant_docs),
                "timestamp": datetime.utcnow().isoformat(),
                "relevant_documents": [
                    {
                        "content": doc.page_content[:200] + "...",
                        "metadata": doc.metadata
                    }
                    for doc in relevant_docs
                ]
            }
            
            logger.info(f"Generated response using {len(relevant_docs)} sources")
            return result
            
        except Exception as e:
            logger.error(f"Error during chat: {str(e)}")
            raise
    
    def _build_system_instructions(
        self,
        custom_instructions: str,
        enable_statistics: bool,
        enable_alerts: bool,
        enable_recommendations: bool
    ) -> str:
        
        instructions = [custom_instructions]
        
        instructions.append(
            "\nCRITICAL RESPONSE RULES:\n"
            "- You MUST ONLY answer questions based on the provided context/data\n"
            "- If the question is NOT related to the provided data, respond: 'I can only answer questions about the information provided in this dataset. Your question is outside my knowledge base.'\n"
            "- NEVER use general knowledge or external information\n"
            "- If the data doesn't contain the answer, say: 'I don't have information about that in the provided data.'\n"
            "\nRESPONSE FORMAT:\n"
            "- Write like a knowledgeable expert, NOT like someone analyzing documents\n"
            "- ABSOLUTELY NO mentions of 'Source 1', 'Source 2', 'the context', 'I examined', 'I found', etc.\n"
            "- State facts directly in smooth paragraphs\n"
            "- Example WRONG: 'According to Source 3, the CEO is John'\n"
            "- Example RIGHT: 'The CEO is John'\n"
            "- Be direct, concise, and natural"
        )
        
        if enable_statistics:
            instructions.append(
                "\nSTATISTICAL ANALYSIS: Provide statistical insights such as averages, "
                "totals, trends, patterns, correlations, and distributions found in the data. "
                "Use these patterns to make informed predictions when asked about hypothetical scenarios."
            )
        
        if enable_alerts:
            instructions.append(
                "\nALERT DETECTION: Watch for anomalies, outliers, or important "
                "patterns in the data that may require attention."
            )
        
        if enable_recommendations:
            instructions.append(
                "\nRECOMMENDATIONS & PREDICTIONS: Provide actionable recommendations "
                "and predictions based on data patterns. When asked 'what if' questions, "
                "analyze similar cases in the data and provide reasoned predictions. "
                "Always explain your reasoning and which data patterns support your prediction."
            )
        
        return "\n".join(instructions)
    
    def _build_context(self, documents: List[Document]) -> str:
        context_parts = []
        
        for idx, doc in enumerate(documents, 1):
            context_parts.append(f"[Source {idx}]")
            context_parts.append(doc.page_content)
            context_parts.append("")
        
        return "\n".join(context_parts)
    
    def _build_prompt(
        self,
        system_instructions: str,
        context: str,
        user_message: str,
        documents: List[Document] = None
    ) -> str:
        
        is_structured_data = False
        is_website_data = False
        
        if documents:
            for doc in documents[:3]:
                doc_type = doc.metadata.get('type', '')
                if doc_type in ['website_content', 'website_section', 'website_paragraph']:
                    is_website_data = True
                    break
                elif 'row_number' in doc.metadata or 'item_number' in doc.metadata:
                    is_structured_data = True
                    break
        
        if is_website_data:
            answering_instructions = """Answer the user's question directly and naturally.
Write in clear paragraphs as if you're a knowledgeable expert explaining the topic.
Focus on providing useful information without meta-commentary."""
        elif is_structured_data:
            answering_instructions = """CRITICAL: For comparison queries (highest, lowest, best, worst, etc.):
1. Examine EVERY source systematically
2. Compare all values for the metric
3. State the actual maximum/minimum found

For other queries: Provide clear, direct answers based on the data.
If asked practical questions beyond the data, offer helpful advice."""
        else:
            answering_instructions = """Examine the sources carefully and provide a clear, direct answer.
Be helpful and informative."""
        
        prompt = f"""<SYSTEM_INSTRUCTIONS>
{system_instructions}
</SYSTEM_INSTRUCTIONS>

<CONTEXT>
{context}
</CONTEXT>

<USER_QUESTION>
{user_message}
</USER_QUESTION>

{answering_instructions}"""

        return prompt
    
    def get_assistant_stats(self, assistant_config: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "assistant_id": assistant_config["assistant_id"],
            "name": assistant_config["name"],
            "documents_count": assistant_config["documents_count"],
            "created_at": assistant_config["created_at"],
            "features": {
                "statistics": assistant_config["enable_statistics"],
                "alerts": assistant_config["enable_alerts"],
                "recommendations": assistant_config["enable_recommendations"]
            }
        }
