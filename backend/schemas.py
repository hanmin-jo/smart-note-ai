from typing import List, Optional

from pydantic import BaseModel, Field


class NoteCreateRequest(BaseModel):
    """
    클라이언트에서 노트 생성 + 퀴즈 생성을 요청할 때 사용하는 스키마.

    기본 요구사항은 content 이지만,
    향후 확장을 위해 title, user_id 는 선택 항목으로 둔다.
    """

    content: str = Field(..., description="저장할 노트의 원본 텍스트")
    title: Optional[str] = Field(
        default=None,
        description="노트 제목 (없으면 서버에서 기본값 생성)",
    )
    user_id: Optional[int] = Field(
        default=None,
        description="작성자 사용자 ID (없으면 임시 기본값 사용)",
    )


class NoteResponse(BaseModel):
    id: int
    title: str
    content: str

    class Config:
        from_attributes = True


class QuizResponse(BaseModel):
    id: int
    question: str
    choices: List[str]
    answer: str
    explanation: str

    class Config:
        from_attributes = True


class NoteWithQuizzesResponse(BaseModel):
    note: NoteResponse
    quizzes: List[QuizResponse]


class NoteUpdateRequest(BaseModel):
    """
    노트의 제목/내용을 부분 업데이트할 때 사용하는 스키마.
    """

    title: Optional[str] = None
    content: Optional[str] = None


