# 🤖 Dynamic AI Assistant Platform

Create your own AI assistants dynamically without writing any code! Upload your data, customize instructions, and start chatting instantly.

![Dynamic AI Assistant](https://img.shields.io/badge/AI-Assistant-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-0.109.0-green)
![LangChain](https://img.shields.io/badge/LangChain-RAG-orange)
![Groq](https://img.shields.io/badge/Groq-LLaMA_3.3-red)

## 🌟 Features

- **Dynamic Assistant Creation**: Create AI assistants on-the-fly without backend code changes
- **Multiple Data Sources**: Support for CSV, JSON files, and any website URL
- **Web Scraping**: Extract and analyze content from blogs, documentation sites, and articles
- **Custom Instructions**: Define exactly how your assistant should behave
- **RAG-Powered**: Uses Retrieval-Augmented Generation for accurate, data-grounded responses
- **Multi-Tenant**: Each assistant is isolated with its own vector store
- **Real-Time Chat**: Modern chat interface similar to ChatGPT
- **Optional Features**: Enable statistics, alerts, and recommendations per assistant
- **Production-Ready**: Clean architecture, error handling, and logging

## 🏗️ Architecture

```
Dynamic-Assistant/
├── backend/
│   ├── __init__.py
│   ├── main.py                 # FastAPI application
│   ├── assistant_engine.py     # Core RAG engine
│   ├── data_loader.py          # Data loading from multiple sources
│   ├── vector_store.py         # FAISS vector store management
│   └── models.py               # Pydantic models
├── frontend/
│   ├── index.html              # Main HTML structure
│   ├── styles.css              # Responsive CSS styling
│   └── script.js               # Frontend logic
├── requirements.txt            # Python dependencies
├── .env.example                # Environment variables template
├── .gitignore
└── README.md
```

## 🚀 Quick Start

### Prerequisites

- Python 3.9+
- Groq API Key ([Get one free at groq.com](https://console.groq.com))

### Installation

1. **Clone or download this project**

2. **Create virtual environment**
   ```powershell
   python -m venv venv
   .\venv\Scripts\Activate.ps1
   ```

3. **Install dependencies**
   ```powershell
   pip install -r requirements.txt
   ```

4. **Configure environment variables**
   ```powershell
   # Copy example env file
   copy .env.example .env
   
   # Edit .env and add your Groq API key
   # GROQ_API_KEY=your_actual_api_key_here
   ```

5. **Run the application**
   ```powershell
   python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
   ```

6. **Open your browser**
   ```
   http://localhost:8000
   ```

## 📖 How to Use

### Creating an Assistant

1. Click **"Get Started"** on the landing page
2. Fill in the form:
   - **Assistant Name**: Give your assistant a descriptive name
   - **Data Source**: Choose CSV, JSON file, or URL
   - **Upload/URL**: Provide your data
   - **Custom Instructions**: Define assistant behavior
   - **Optional Features**: Enable statistics, alerts, or recommendations
3. Click **"Create Assistant"**
4. Start chatting immediately!

### Example Data Formats

**CSV Example:**
```csv
product,price,category,stock
Laptop,999,Electronics,50
Mouse,29,Accessories,200
Keyboard,79,Accessories,150
```

**JSON Example:**
```json
[
  {
    "product": "Laptop",
    "price": 999,
    "category": "Electronics",
    "stock": 50
  },
  {
    "product": "Mouse",
    "price": 29,
    "category": "Accessories",
    "stock": 200
  }
]
```

**URL Example:**
```
https://example.com/blog/article
https://docs.example.com/api
https://api.example.com/products.json
```

Use any website URL to extract and analyze its content, or provide API endpoints that return JSON/CSV data.

## 🔧 API Endpoints

### Health Check
```
GET /health
```

### Create Assistant
```
POST /api/assistants/create
Content-Type: multipart/form-data

Fields:
- name: string
- data_source_type: csv | json | url
- file: file (for CSV/JSON)
- data_source_url: string (for URL)
- custom_instructions: string
- enable_statistics: boolean
- enable_alerts: boolean
- enable_recommendations: boolean
```

### Chat with Assistant
```
POST /api/chat
Content-Type: application/json

{
  "assistant_id": "uuid",
  "message": "Your question"
}
```

### Get Assistant Info
```
GET /api/assistants/{assistant_id}
```

### List All Assistants
```
GET /api/assistants
```

### Delete Assistant
```
DELETE /api/assistants/{assistant_id}
```

## 🧠 How It Works

1. **Data Loading**: User uploads CSV/JSON or provides URL
2. **Document Creation**: Data is converted to LangChain Document objects
3. **Vector Store**: Documents are embedded using HuggingFace embeddings and stored in FAISS
4. **Assistant Creation**: Configuration stored in-memory with isolated vector store
5. **RAG Pipeline**: 
   - User asks a question
   - Similarity search retrieves relevant documents
   - Context + question sent to Groq LLM
   - AI generates answer based only on retrieved data
6. **Response**: Answer displayed in chat interface

## 🎨 Features Explained

### Statistics Mode
When enabled, the assistant provides statistical insights like averages, totals, and trends.

Example:
```
Q: What's the average price?
A: Based on the data, the average price is $369, with products ranging from $29 to $999.
```

### Alerts Mode
Detects anomalies and important patterns in your data.

Example:
```
Q: Are there any issues with inventory?
A: Alert: The Laptop has low stock (only 50 units) compared to accessories.
```

### Recommendations Mode
Provides actionable suggestions based on data insights.

Example:
```
Q: What should I focus on?
A: Recommendation: Restock laptops and consider bundling high-margin accessories.
```

## 🔒 Security Considerations

### For Development
- CORS is set to allow all origins (`*`)
- Files stored in local `uploads/` directory
- Assistants stored in-memory (lost on restart)

### For Production
1. **Update CORS**: Specify exact allowed origins in `main.py`
2. **Use Database**: Replace in-memory storage with PostgreSQL/MongoDB
3. **File Storage**: Use S3 or cloud storage instead of local disk
4. **Authentication**: Add user authentication and authorization
5. **Rate Limiting**: Implement rate limiting on API endpoints
6. **HTTPS**: Use SSL/TLS certificates
7. **Input Validation**: Additional validation for file uploads
8. **API Key Security**: Use secrets management service

## 📦 Dependencies

Key libraries:
- **FastAPI**: Modern web framework
- **LangChain**: RAG and document processing
- **Groq**: Fast LLM inference with LLaMA 3.3
- **FAISS**: Efficient similarity search
- **HuggingFace**: Free embeddings (no API key needed)
- **Pandas**: Data manipulation

## 🐛 Troubleshooting

### "GROQ_API_KEY not found"
Make sure you've created a `.env` file with your Groq API key.

### "Module not found" errors
Ensure you've activated the virtual environment and installed all dependencies.

### File upload fails
Check file size (max 10MB by default). Adjust `MAX_FILE_SIZE_MB` in `.env` if needed.

### Slow embedding generation
First time running will download the HuggingFace model (~80MB). Subsequent runs are faster.

### Assistant not responding
Check:
1. Data was loaded successfully (check logs)
2. Vector store created without errors
3. Groq API key is valid and has quota

## 🔄 Customization

### Change LLM Model
Edit `.env`:
```
GROQ_MODEL_NAME=mixtral-8x7b-32768
```

Available models: `llama-3.3-70b-versatile`, `mixtral-8x7b-32768`, `gemma2-9b-it`

### Change Embedding Model
Edit `vector_store.py`:
```python
self.embeddings = HuggingFaceEmbeddings(
    model_name="all-mpnet-base-v2",  # Better but slower
    ...
)
```

### Adjust Search Results
Edit `assistant_engine.py`:
```python
relevant_docs = self.vector_store_manager.similarity_search(
    vector_store=vector_store,
    query=user_message,
    k=6  # Return more documents
)
```

## 📝 Example Use Cases

1. **Customer Support Bot**: Upload FAQ data, create assistant for instant support
2. **Product Catalog Assistant**: Upload product data, help customers find products
3. **Sales Data Analyzer**: Upload sales CSV, get insights and trends
4. **HR Assistant**: Upload employee handbook, answer policy questions
5. **Research Assistant**: Upload research papers (JSON), answer questions
6. **Inventory Manager**: Upload inventory data, get alerts on low stock

## 🤝 Contributing

Contributions are welcome! Areas for improvement:
- Add PDF/DOCX support
- Implement conversation history
- Add user authentication
- Database integration
- Advanced analytics dashboard
- Multi-language support

## 📄 License

MIT License - feel free to use this for personal or commercial projects!

## 🙏 Acknowledgments

- Built with [FastAPI](https://fastapi.tiangolo.com/)
- Powered by [LangChain](https://python.langchain.com/)
- AI inference by [Groq](https://groq.com/)
- Vector search by [FAISS](https://github.com/facebookresearch/faiss)

## 📧 Support

For issues or questions:
1. Check the troubleshooting section
2. Review API documentation
3. Check application logs

---

**Built with ❤️ for the AI community**

Start building your dynamic AI assistants today! 🚀
#   D y n a m i c - A I - A s s i s t a n t  
 