# RAG Assistant - Retrieval-Augmented Generation Application

A full-stack RAG (Retrieval-Augmented Generation) application that allows users to upload documents and chat with their content using AI. Built with React, Node.js, Express, PostgreSQL, and OpenAI.

## Features

### 🔐 Authentication
- User registration and login with JWT authentication
- Protected routes and secure API endpoints
- Password hashing with bcrypt

### 📚 Document Management
- Upload PDF, DOCX, and TXT files
- Automatic text extraction and chunking
- Vector embeddings generation with OpenAI
- Storage in Pinecone or PostgreSQL with pgvector

### 💬 AI Chat Interface
- Chat with your documents using natural language
- Context-aware responses based on uploaded content
- Reference tracking and source attribution
- Chat history and management

### 🧠 Quiz Generation
- Generate multiple-choice questions from documents
- AI-powered question creation with explanations
- Answer validation and scoring

### 🐳 Docker Support
- Multi-service Docker Compose setup
- PostgreSQL database container
- Production-ready Nginx configuration

## Tech Stack

### Backend
- **Node.js** + **Express** + **TypeScript**
- **PostgreSQL** with **Prisma ORM**
- **OpenAI API** for embeddings and chat completion
- **Pinecone** for vector storage (with PostgreSQL fallback)
- **JWT** for authentication
- **Multer** for file uploads

### Frontend
- **React 18** + **TypeScript**
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **React Router** for navigation
- **Axios** for API communication

### Infrastructure
- **Docker** & **Docker Compose**
- **Nginx** for production frontend serving
- **PostgreSQL 15** database

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- Docker and Docker Compose
- OpenAI API key
- Pinecone account (optional, will fallback to PostgreSQL)

### 1. Clone and Setup

```bash
git clone <repository-url>
cd rag-project

# Install dependencies for both server and client
npm run install:all
```

### 2. Environment Configuration

#### Server Environment
Copy the environment template and fill in your API keys:

```bash
cp server/env.example server/.env
```

Edit `server/.env` with your actual values:
```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/rag_db?schema=public"

# JWT
JWT_SECRET="your-super-secret-jwt-key-here"
JWT_EXPIRES_IN="7d"

# OpenAI
OPENAI_API_KEY="sk-your-openai-api-key-here"

# Pinecone (optional)
PINECONE_API_KEY="your-pinecone-api-key-here"
PINECONE_ENVIRONMENT="your-pinecone-environment"
PINECONE_INDEX_NAME="rag-embeddings"

# Server
PORT=4000
NODE_ENV="development"
```

#### Docker Environment
For Docker deployment:

```bash
cp docker-compose.override.yml.example docker-compose.override.yml
```

Edit `docker-compose.override.yml` with your API keys.

### 3. Database Setup

#### Local Development
```bash
# Start PostgreSQL (if running locally)
# Update DATABASE_URL in server/.env to match your local setup

cd server
npm run prisma:generate
npm run prisma:migrate
```

#### Docker Setup
The Docker setup will automatically handle database initialization.

### 4. Development

#### Local Development
```bash
# Start both server and client in development mode
npm run dev

# Or start individually
npm run start:server  # Runs on http://localhost:4000
npm run start:client  # Runs on http://localhost:5173
```

#### Docker Development
```bash
# Start all services with Docker
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### 5. Production Deployment

```bash
# Build and start in production mode
docker-compose -f docker-compose.yml up -d --build

# The application will be available at:
# Frontend: http://localhost:5173
# Backend API: http://localhost:4000
```

## Usage

### 1. Register/Login
- Navigate to the application
- Create an account or login with existing credentials

### 2. Upload Documents
- Go to the Dashboard
- Upload PDF, DOCX, or TXT files
- Wait for processing (text extraction and embedding generation)

### 3. Chat with Documents
- Navigate to the Chat page
- Ask questions about your uploaded documents
- Get AI-powered answers with source references

### 4. Generate Quizzes
- From the Dashboard, click "Quiz" on any document
- Generate multiple-choice questions
- Take the quiz and get scored results

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

### Document Management
- `POST /api/upload` - Upload and process document
- `GET /api/upload/documents` - Get user's documents
- `DELETE /api/upload/documents/:id` - Delete document

### Chat
- `POST /api/chat` - Send chat message
- `GET /api/chat/history` - Get chat history
- `DELETE /api/chat/history` - Clear chat history

### Quiz
- `POST /api/quiz` - Generate quiz from document
- `GET /api/quiz/documents` - Get quiz-eligible documents
- `POST /api/quiz/validate` - Validate quiz answers

## Architecture

### Monorepo Structure
```
rag-project/
├── server/                 # Node.js backend
│   ├── src/
│   │   ├── routes/        # API routes
│   │   ├── middleware/    # Auth middleware
│   │   ├── services/      # OpenAI, Pinecone services
│   │   ├── types/         # TypeScript types
│   │   └── utils/         # Utility functions
│   ├── prisma/           # Database schema
│   └── Dockerfile        # Backend Docker config
├── client/                # React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   ├── services/      # API services
│   │   ├── types/         # TypeScript types
│   │   └── utils/         # Utility functions
│   └── Dockerfile        # Frontend Docker config
├── docker-compose.yml     # Multi-service setup
└── README.md             # This file
```

### Data Flow
1. **Document Upload**: Files → Text Extraction → Chunking → Embeddings → Vector Storage
2. **Chat Query**: User Question → Embedding → Vector Search → Context Retrieval → AI Response
3. **Quiz Generation**: Document Content → AI Processing → MCQ Generation → Validation

## Environment Variables

### Required
- `OPENAI_API_KEY` - OpenAI API key for embeddings and chat
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT token signing

### Optional
- `PINECONE_API_KEY` - Pinecone API key (fallback to PostgreSQL if not provided)
- `PINECONE_ENVIRONMENT` - Pinecone environment
- `PINECONE_INDEX_NAME` - Pinecone index name

## Troubleshooting

### Common Issues

1. **OpenAI API Errors**
   - Verify your API key is correct and has sufficient credits
   - Check OpenAI API status

2. **Database Connection Issues**
   - Ensure PostgreSQL is running
   - Verify DATABASE_URL is correct
   - Run `npm run prisma:migrate` to apply schema changes

3. **File Upload Issues**
   - Check file size limits (10MB max)
   - Ensure file types are supported (PDF, DOCX, TXT)
   - Verify server has write permissions for uploads

4. **Docker Issues**
   - Ensure Docker and Docker Compose are installed
   - Check if ports 4000, 5173, and 5432 are available
   - Use `docker-compose logs` to view error messages

### Development Tips

- Use `npm run dev` for hot reloading during development
- Monitor server logs for API request debugging
- Use browser DevTools for frontend debugging
- Test with small documents first to verify the pipeline

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
1. Check the troubleshooting section above
2. Review the server logs for error messages
3. Ensure all environment variables are properly configured
4. Verify API keys and external service connectivity
