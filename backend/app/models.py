from sqlalchemy import Column, String, Text, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy import create_engine
from sqlalchemy.sql import func
import os

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./insightboard.db")

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class Transcript(Base):
    __tablename__ = "transcripts"
    id = Column(String, primary_key=True, index=True)
    content = Column(Text, nullable=False)
    hash = Column(String, unique=True, index=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Task(Base):
    __tablename__ = "tasks"
    id = Column(String, primary_key=True, index=True)
    transcript_id = Column(String, index=True)
    description = Column(Text, nullable=False)
    priority = Column(String, nullable=False)
    dependencies = Column(Text, nullable=True)  # JSON array stored as text
    status = Column(String, nullable=False)


class Job(Base):
    __tablename__ = "jobs"
    id = Column(String, primary_key=True, index=True)
    transcript_id = Column(String, index=True)
    status = Column(String, nullable=False)
    result = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

