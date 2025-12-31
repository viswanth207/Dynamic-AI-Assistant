
from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse, FileResponse
from typing import Dict, Optional
import uuid
import os
import logging
from datetime import datetime
from dotenv import load_dotenv
import shutil

from backend.models import (
    AssistantCreateRequest,
    AssistantCreateResponse,
    ChatRequest,
    ChatResponse,
    AssistantInfo,
    ErrorResponse,
    HealthResponse,
    DataSourceType
)
from backend.assistant_engine import AssistantEngine
from backend.data_loader import DataLoader

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Dynamic AI Assistant API",
    description="Create and chat with custom AI assistants dynamically",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL_NAME = os.getenv("GROQ_MODEL_NAME", "llama-3.3-70b-versatile")
MAX_FILE_SIZE_MB = int(os.getenv("MAX_FILE_SIZE_MB", "10"))
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

if not GROQ_API_KEY:
    logger.error("GROQ_API_KEY not found in environment variables")
    raise ValueError("GROQ_API_KEY must be set in .env file")

try:
    assistant_engine = AssistantEngine(
        groq_api_key=GROQ_API_KEY,
        model_name=GROQ_MODEL_NAME
    )
    logger.info("Assistant engine initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize assistant engine: {str(e)}")
    raise

assistants_store: Dict[str, Dict] = {}

app.mount("/static", StaticFiles(directory="frontend"), name="static")


@app.get("/")
async def serve_frontend():
    return FileResponse("frontend/index.html")


@app.get("/health", response_model=HealthResponse)
async def health_check():
    return HealthResponse(
        status="healthy",
        timestamp=datetime.utcnow().isoformat()
    )


@app.post("/api/assistants/create", response_model=AssistantCreateResponse)
async def create_assistant(
    name: str = Form(...),
    data_source_type: str = Form(...),
    data_source_url: Optional[str] = Form(None),
    custom_instructions: str = Form(
        "You are a helpful AI assistant. Analyze the data, identify patterns, and answer questions. You can make predictions based on data patterns when asked about hypothetical scenarios."
    ),
    enable_statistics: bool = Form(False),
    enable_alerts: bool = Form(False),
    enable_recommendations: bool = Form(False),
    file: Optional[UploadFile] = File(None)
):
    try:
        logger.info(f"Creating assistant: {name}")
        
        if data_source_type not in ["csv", "json", "url"]:
            raise HTTPException(400, "Invalid data_source_type")
        
        assistant_id = str(uuid.uuid4())
        
        documents = []
        
        if data_source_type == "url":
            if not data_source_url:
                raise HTTPException(400, "data_source_url required for URL type")
            
            logger.info(f"Loading data from URL: {data_source_url}")
            documents = DataLoader.load_from_url(data_source_url)
        
        else:
            if not file:
                raise HTTPException(400, "File required for CSV/JSON type")
            
            file_size = 0
            content = await file.read()
            file_size = len(content) / (1024 * 1024)
            
            if file_size > MAX_FILE_SIZE_MB:
                raise HTTPException(
                    400, 
                    f"File size exceeds {MAX_FILE_SIZE_MB}MB limit"
                )
            
            file_path = os.path.join(UPLOAD_DIR, f"{assistant_id}_{file.filename}")
            with open(file_path, "wb") as f:
                f.write(content)
            
            logger.info(f"File saved: {file_path}")
            
            if data_source_type == "csv":
                documents = DataLoader.load_from_csv(file_path)
            elif data_source_type == "json":
                documents = DataLoader.load_from_json(file_path)
        
        if not documents:
            raise HTTPException(400, "No data could be loaded from the source")
        
        logger.info(f"Loaded {len(documents)} documents")
        
        assistant_config = assistant_engine.create_assistant(
            assistant_id=assistant_id,
            name=name,
            documents=documents,
            custom_instructions=custom_instructions,
            enable_statistics=enable_statistics,
            enable_alerts=enable_alerts,
            enable_recommendations=enable_recommendations
        )
        
        assistants_store[assistant_id] = assistant_config
        
        logger.info(f"Assistant created: {assistant_id}")
        
        return AssistantCreateResponse(
            assistant_id=assistant_id,
            name=name,
            data_source_type=data_source_type,
            documents_loaded=len(documents),
            created_at=assistant_config["created_at"],
            message="Assistant created successfully! You can now start chatting."
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating assistant: {str(e)}")
        raise HTTPException(500, f"Failed to create assistant: {str(e)}")


@app.post("/api/chat", response_model=ChatResponse)
async def chat_with_assistant(request: ChatRequest):
    try:
        logger.info(f"Chat request for assistant: {request.assistant_id}")
        
        if request.assistant_id not in assistants_store:
            raise HTTPException(404, "Assistant not found")
        
        assistant_config = assistants_store[request.assistant_id]
        
        result = assistant_engine.chat(
            assistant_config=assistant_config,
            user_message=request.message
        )
        
        return ChatResponse(
            assistant_id=request.assistant_id,
            user_message=request.message,
            assistant_response=result["response"],
            sources_used=result["sources_used"],
            timestamp=result["timestamp"]
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error during chat: {str(e)}")
        raise HTTPException(500, f"Chat failed: {str(e)}")


@app.get("/api/assistants/{assistant_id}", response_model=AssistantInfo)
async def get_assistant_info(assistant_id: str):
    try:
        if assistant_id not in assistants_store:
            raise HTTPException(404, "Assistant not found")
        
        config = assistants_store[assistant_id]
        
        return AssistantInfo(
            assistant_id=config["assistant_id"],
            name=config["name"],
            data_source_type="dynamic",
            custom_instructions=config["custom_instructions"],
            documents_count=config["documents_count"],
            enable_statistics=config["enable_statistics"],
            enable_alerts=config["enable_alerts"],
            enable_recommendations=config["enable_recommendations"],
            created_at=config["created_at"]
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting assistant info: {str(e)}")
        raise HTTPException(500, f"Failed to get assistant info: {str(e)}")


@app.get("/api/assistants")
async def list_assistants():
    try:
        assistants_list = [
            {
                "assistant_id": config["assistant_id"],
                "name": config["name"],
                "documents_count": config["documents_count"],
                "created_at": config["created_at"]
            }
            for config in assistants_store.values()
        ]
        
        return {"assistants": assistants_list, "count": len(assistants_list)}
    
    except Exception as e:
        logger.error(f"Error listing assistants: {str(e)}")
        raise HTTPException(500, f"Failed to list assistants: {str(e)}")


@app.delete("/api/assistants/{assistant_id}")
async def delete_assistant(assistant_id: str):
    try:
        if assistant_id not in assistants_store:
            raise HTTPException(404, "Assistant not found")
        
        del assistants_store[assistant_id]
        
        for file in os.listdir(UPLOAD_DIR):
            if file.startswith(assistant_id):
                os.remove(os.path.join(UPLOAD_DIR, file))
        
        logger.info(f"Assistant deleted: {assistant_id}")
        
        return {"message": "Assistant deleted successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting assistant: {str(e)}")
        raise HTTPException(500, f"Failed to delete assistant: {str(e)}")


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "detail": str(exc),
            "timestamp": datetime.utcnow().isoformat()
        }
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
