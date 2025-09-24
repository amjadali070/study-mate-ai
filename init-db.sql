-- Initialize the RAG database
-- This script runs when the PostgreSQL container first starts

-- Create extensions if needed (for future pgvector support)
-- CREATE EXTENSION IF NOT EXISTS vector;

-- Grant permissions to the postgres user
GRANT ALL PRIVILEGES ON DATABASE rag_db TO postgres;
