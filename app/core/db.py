import os
import logging
import psycopg2
from pgvector.psycopg2 import register_vector

logger = logging.getLogger(__name__)

class VectorDatabase:
    def __init__(self):
        self.host = os.getenv("DB_HOST", "localhost")
        self.port = os.getenv("DB_PORT", "5432")
        self.dbname = os.getenv("DB_NAME", "postgres")
        self.user = os.getenv("DB_USER", "postgres")
        self.password = os.getenv("DB_PASSWORD", "")
        
    def get_connection(self):
        if not self.password:
            logger.warning("DB_PASSWORD is empty. Database operations will likely fail.")
        conn = psycopg2.connect(
            host=self.host,
            port=self.port,
            dbname=self.dbname,
            user=self.user,
            password=self.password,
            sslmode='require'
        )
        return conn

    def initialize_schema(self):
        """Creates the vector extension and the knowledge_nodes table if they don't exist."""
        try:
            with self.get_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("CREATE EXTENSION IF NOT EXISTS vector;")
                    cur.execute("""
                        CREATE TABLE IF NOT EXISTS knowledge_nodes (
                            id SERIAL PRIMARY KEY,
                            repository_name VARCHAR(255),
                            knowledge_type VARCHAR(50),
                            title VARCHAR(255),
                            summary TEXT,
                            details TEXT,
                            evidence TEXT,
                            embedding VECTOR(768)
                        );
                    """)
                conn.commit()
                logger.info("Database schema initialized successfully.")
        except Exception as e:
            logger.error(f"Failed to initialize database schema: {e}")

    def insert_knowledge(self, repository_name: str, knowledge_type: str, title: str, summary: str, details: str, evidence: str, embedding: list):
        """Inserts a single vectorized knowledge item into the database."""
        try:
            with self.get_connection() as conn:
                register_vector(conn)
                with conn.cursor() as cur:
                    cur.execute("""
                        INSERT INTO knowledge_nodes 
                        (repository_name, knowledge_type, title, summary, details, evidence, embedding)
                        VALUES (%s, %s, %s, %s, %s, %s, %s)
                    """, (repository_name, knowledge_type, title, summary, details, evidence, embedding))
                conn.commit()
        except Exception as e:
            logger.error(f"Failed to insert knowledge node: {e}")
            raise e
