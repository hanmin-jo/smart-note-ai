from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship, Mapped

from database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = Column(Integer, primary_key=True, index=True)
    email: Mapped[str] = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = Column(String(255), nullable=False)
    name: Mapped[str] = Column(String(100), nullable=False)
    is_active: Mapped[bool] = Column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = Column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )

    notes: Mapped[list["Note"]] = relationship(
        "Note", back_populates="user", cascade="all, delete-orphan"
    )
    categories: Mapped[list["Category"]] = relationship(
        "Category", back_populates="user", cascade="all, delete-orphan"
    )
    study_records: Mapped[list["StudyRecord"]] = relationship(
        "StudyRecord", back_populates="user", cascade="all, delete-orphan"
    )


class Category(Base):
    __tablename__ = "categories"
    __table_args__ = (
        UniqueConstraint("user_id", "name", name="uq_user_category_name"),
    )

    id: Mapped[int] = Column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = Column(String(100), nullable=False)
    created_at: Mapped[datetime] = Column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )

    user: Mapped["User"] = relationship("User", back_populates="categories")


class Note(Base):
    __tablename__ = "notes"

    id: Mapped[int] = Column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = Column(String(255), nullable=False)
    content: Mapped[str] = Column(Text, nullable=False)
    category: Mapped[str] = Column(String(100), nullable=True, default="일반")
    created_at: Mapped[datetime] = Column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = Column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    user: Mapped["User"] = relationship("User", back_populates="notes")
    quizzes: Mapped[list["Quiz"]] = relationship(
        "Quiz", back_populates="note", cascade="all, delete-orphan"
    )


class Quiz(Base):
    __tablename__ = "quizzes"

    id: Mapped[int] = Column(Integer, primary_key=True, index=True)
    note_id: Mapped[int] = Column(
        Integer, ForeignKey("notes.id", ondelete="CASCADE"), nullable=False, index=True
    )
    question: Mapped[str] = Column(Text, nullable=False)
    answer: Mapped[str] = Column(Text, nullable=False)        # 정답 텍스트
    choices_json: Mapped[str] = Column(Text, nullable=False)  # JSON 배열 문자열
    explanation: Mapped[str] = Column(Text, nullable=False)
    created_at: Mapped[datetime] = Column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )

    note: Mapped["Note"] = relationship("Note", back_populates="quizzes")
    study_records: Mapped[list["StudyRecord"]] = relationship(
        "StudyRecord", back_populates="quiz", cascade="all, delete-orphan"
    )


class StudyRecord(Base):
    __tablename__ = "study_records"

    id: Mapped[int] = Column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    quiz_id: Mapped[int] = Column(
        Integer, ForeignKey("quizzes.id", ondelete="CASCADE"), nullable=False
    )
    is_correct: Mapped[bool] = Column(Boolean, default=False, nullable=False)
    studied_at: Mapped[datetime] = Column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )

    user: Mapped["User"] = relationship("User", back_populates="study_records")
    quiz: Mapped["Quiz"] = relationship("Quiz", back_populates="study_records")
