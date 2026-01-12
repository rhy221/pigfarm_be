# PigFarm Chatbot Service

AI Chatbot Agent cho hệ thống quản lý trang trại heo. Sử dụng LangChain + Gemini để xây dựng Agent có khả năng:

- Truy vấn SQL database để lấy số liệu trang trại
- Tìm kiếm tài liệu hướng dẫn chăn nuôi với RAG (Hybrid Search + Reranking)

## Tech Stack

- **Framework**: FastAPI
- **AI/LLM**: LangChain + Google Gemini
- **Database**: PostgreSQL + pgvector (Supabase)
- **Reranker**: Cohere
- **Search**: Hybrid (Vector + BM25/FTS)

## Cài đặt

### 1. Tạo môi trường Python

```bash
cd pigfarm_chatbot
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

### 2. Cài dependencies

```bash
pip install -r requirements.txt
```

### 3. Cấu hình môi trường

```bash
cp .env.example .env
```

Chỉnh sửa file `.env`:

```env
# Database (Supabase PostgreSQL)
DATABASE_URL=postgresql+asyncpg://postgres:YOUR_PASSWORD@db.YOUR_PROJECT.supabase.co:5432/postgres

# API Keys
GOOGLE_API_KEY=your_gemini_api_key
COHERE_API_KEY=your_cohere_api_key

# Server
HOST=0.0.0.0
PORT=8000
DEBUG=true

# CORS
FRONTEND_URL=http://localhost:3000
```

### 4. Chạy server

Development mode (auto-reload):
```bash
fastapi dev app/main.py
```

Production mode:
```bash
fastapi run app/main.py
```

## API Endpoints

### Chat

| Method   | Endpoint                     | Mô tả                        |
| -------- | ---------------------------- | ---------------------------- |
| `POST`   | `/chat/message`              | Gửi tin nhắn (non-streaming) |
| `POST`   | `/chat/message/stream`       | Gửi tin nhắn (streaming SSE) |
| `GET`    | `/chat/history/{session_id}` | Xem lịch sử chat             |
| `DELETE` | `/chat/session/{session_id}` | Xóa session                  |

### Documents (RAG)

| Method   | Endpoint                | Mô tả                  |
| -------- | ----------------------- | ---------------------- |
| `POST`   | `/documents/upload`     | Upload PDF tài liệu    |
| `GET`    | `/documents/`           | Liệt kê documents      |
| `GET`    | `/documents/summary`    | Tổng hợp theo filename |
| `DELETE` | `/documents/{filename}` | Xóa document           |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       User Message                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Agent (Gemini)                         │
│   Phân tích câu hỏi và chọn tool phù hợp                    │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              │                               │
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────────┐
│      SQL Tool           │     │        RAG Tool             │
│                         │     │                             │
│  • Read-only queries    │     │  • Query Transformation     │
│  • Farm data access     │     │  • Hybrid Search (V+BM25)   │
│                         │     │  • Cohere Reranking         │
└─────────────────────────┘     └─────────────────────────────┘
              │                               │
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────────┐
│    PostgreSQL DB        │     │   PostgreSQL + pgvector     │
│    (Farm Data)          │     │   (Document Embeddings)     │
└─────────────────────────┘     └─────────────────────────────┘
```

## RAG Pipeline

```
Query → Rewrite → Multi-Query → [Vector Search + BM25] → RRF Fusion → Cohere Rerank → Top-5 Docs → LLM
```

### Query Transformation

1. **Query Rewriting**: Viết lại câu hỏi rõ ràng hơn
2. **Multi-Query**: Tạo 3 biến thể câu hỏi

### Hybrid Search

1. **Vector Search**: pgvector cosine similarity
2. **BM25 Search**: PostgreSQL Full-Text Search + Trigram

### Reranking

- **Model**: Cohere `rerank-multilingual-v3.0`
- **Threshold**: 0.3 (lọc bỏ kết quả không liên quan)

## Environment Variables

| Variable         | Description                  | Required              |
| ---------------- | ---------------------------- | --------------------- |
| `DATABASE_URL`   | PostgreSQL connection string | ✅                    |
| `GOOGLE_API_KEY` | Gemini API key               | ✅                    |
| `COHERE_API_KEY` | Cohere API key               | ✅                    |
| `FRONTEND_URL`   | Frontend URL for CORS        | ✅                    |
| `HOST`           | Server host                  | ❌ (default: 0.0.0.0) |
| `PORT`           | Server port                  | ❌ (default: 8000)    |
| `DEBUG`          | Debug mode                   | ❌ (default: false)   |

## Docker

```bash
# Build
docker build -t pigfarm-chatbot .

# Run
docker run -p 8000:8000 --env-file .env pigfarm-chatbot
```

## Sử dụng

### 1. Upload tài liệu PDF

```bash
curl -X POST "http://localhost:8000/documents/upload" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@huong_dan_chan_nuoi.pdf"
```

### 2. Chat với Agent

```bash
curl -X POST "http://localhost:8000/chat/message" \
  -H "Content-Type: application/json" \
  -d '{"message": "Có bao nhiêu con heo trong trang trại?", "session_id": "abc123"}'
```

### 3. Chat streaming

Frontend sử dụng EventSource để nhận SSE streaming response.
