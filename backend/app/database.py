import json

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config import settings

# ensure_ascii=False keeps accents readable in JSON columns, so a keyword
# search ("etudes" / "études") over them matches the text as typed.
engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    json_serializer=lambda obj: json.dumps(obj, ensure_ascii=False),
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
