from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker
from datetime import datetime, timezone

# 1. Database connection (Local SQLite file)
SQLALCHEMY_DATABASE_URL = "sqlite:///./agency_history.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# 2. Our table who saves History
class RunHistory(Base):
    __tablename__ = "run_history"
    
    id = Column(Integer, primary_key=True, index=True)
    task_description = Column(Text, nullable=False)
    generated_code = Column(Text, nullable=False) # Save in JSON Format
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

# 3. create the table
Base.metadata.create_all(bind=engine)

# 4. taking database session for each request
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()