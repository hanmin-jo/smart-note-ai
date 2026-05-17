from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field


# ─── Auth ────────────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    name: str = Field(..., min_length=1)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    email: str
    name: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse


# ─── Note ────────────────────────────────────────────────────────────────────

class NoteCreateRequest(BaseModel):
    content: str = Field(..., description="노트 원본 텍스트")
    title: Optional[str] = Field(default=None)
    category: Optional[str] = Field(default="일반")


class NoteUpdateRequest(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None


class CategoryCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)


class CategoryResponse(BaseModel):
    id: int
    name: str
    created_at: datetime

    class Config:
        from_attributes = True


class NoteResponse(BaseModel):
    id: int
    title: str
    content: str
    category: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ─── Quiz ────────────────────────────────────────────────────────────────────

class QuizResponse(BaseModel):
    id: int
    question: str
    choices: List[str]
    answer: int          # 정답 인덱스 (0~3)
    explanation: str


class NoteWithQuizzesResponse(BaseModel):
    note: NoteResponse
    quizzes: List[QuizResponse]


# ─── Study Record ─────────────────────────────────────────────────────────────

class StudyRecordCreate(BaseModel):
    quiz_id: int
    is_correct: bool


class StudyRecordBatch(BaseModel):
    records: List[StudyRecordCreate]


# ─── Calendar ────────────────────────────────────────────────────────────────

class StudyScheduleResponse(BaseModel):
    id: int
    user_id: int
    note_id: int
    title: str
    scheduled_date: date
    is_completed: bool

    class Config:
        from_attributes = True


class StudyScheduleUpdateRequest(BaseModel):
    scheduled_date: Optional[date] = None
    is_completed: Optional[bool] = None


class DailyActivityResponse(BaseModel):
    id: int
    user_id: int
    date: date
    activity_count: int

    class Config:
        from_attributes = True


class CalendarMemoCreateRequest(BaseModel):
    date: date
    content: str = Field(..., min_length=1, max_length=255)


class CalendarMemoResponse(BaseModel):
    id: int
    user_id: int
    date: date
    content: str
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Dashboard ───────────────────────────────────────────────────────────────

class DashboardStats(BaseModel):
    total_notes: int
    total_quizzes_completed: int
    average_score: float
    today_activity: int
