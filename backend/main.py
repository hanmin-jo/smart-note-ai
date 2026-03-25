import json
import os
from io import BytesIO
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import Depends, FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func
from sqlalchemy.orm import Session
from dotenv import load_dotenv
from google import genai
from pypdf import PdfReader

from database import Base, engine, get_db
from models import Note, Quiz, StudyRecord, User
from schemas import (
    DashboardStats,
    NoteCreateRequest,
    NoteResponse,
    NoteUpdateRequest,
    NoteWithQuizzesResponse,
    QuizResponse,
    StudyRecordBatch,
    TokenResponse,
    UserCreate,
    UserLogin,
    UserResponse,
)
from auth import create_access_token, get_current_user, hash_password, verify_password

load_dotenv()

# Gemini — 요약·PDF 요약·퀴즈 등 모든 generate_content 호출에서 동일 모델 사용
GEMINI_MODEL = "gemini-1.5-flash"


# ─── DB 초기화 ────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title="Smart Note AI", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── 헬퍼 함수 ───────────────────────────────────────────────────────────────

def _get_gemini_client() -> genai.Client:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="서버 환경 설정 오류(GEMINI_API_KEY 미설정)",
        )
    return genai.Client(api_key=api_key)


def _clean_json(raw: str) -> str:
    """Gemini 응답에서 마크다운 코드블록 제거"""
    for fence in ("```json", "```JSON", "```"):
        raw = raw.replace(fence, "")
    return raw.strip()


def _parse_gemini_json(raw: str, context: str) -> Dict[str, Any]:
    """
    Gemini에서 반환된 텍스트를 JSON으로 파싱.
    실패 시 내부 로그를 남기고, 사용자에게는 일반적인 오류 메시지를 전달한다.
    """
    cleaned = _clean_json(raw)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as e:
        # 디버깅용 서버 로그
        print(
            f"[Gemini JSONDecodeError] context={context} error={e} "
            f"raw_snippet={cleaned[:500]!r}"
        )
        raise HTTPException(
            status_code=500,
            detail="AI 응답을 처리하는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
        )


def generate_quizzes_with_gemini(content: str) -> List[Dict[str, Any]]:
    """노트 내용으로 Gemini 퀴즈 생성. answer는 정수 인덱스(0~3)."""
    client = _get_gemini_client()
    prompt = f"""
당신은 최고의 퀴즈 출제 AI입니다. 아래 [학습 노트]를 바탕으로 객관식 4지선다 퀴즈를 3~5개 출제하세요.
마크다운 코드블록 없이 순수 JSON만 출력하세요.

[JSON 형식]
{{
  "questions": [
    {{
      "question": "문제 내용",
      "options": ["보기1", "보기2", "보기3", "보기4"],
      "answer": 0,
      "explanation": "정답 해설"
    }}
  ]
}}

규칙:
- answer는 options 배열의 정답 인덱스(0~3)
- 반드시 노트 내용에서만 출제
- JSON 외 다른 텍스트 절대 포함 금지

[학습 노트]
{content[:4000]}
"""
    response = client.models.generate_content(model=GEMINI_MODEL, contents=prompt)
    data = _parse_gemini_json(response.text, context="note_quiz_generation")
    questions = data.get("questions", [])

    validated = []
    for q in questions:
        if (
            isinstance(q.get("question"), str)
            and isinstance(q.get("options"), list)
            and len(q["options"]) == 4
            and isinstance(q.get("answer"), int)
            and 0 <= q["answer"] <= 3
        ):
            validated.append(q)
    return validated


def _quiz_to_response(quiz: Quiz) -> QuizResponse:
    choices = json.loads(quiz.choices_json)
    try:
        answer_idx = choices.index(quiz.answer)
    except ValueError:
        answer_idx = 0
    return QuizResponse(
        id=quiz.id,
        question=quiz.question,
        choices=choices,
        answer=answer_idx,
        explanation=quiz.explanation,
    )


def _save_quizzes(note_id: int, questions: List[Dict], db: Session) -> List[Quiz]:
    quiz_models: List[Quiz] = []
    for q in questions:
        answer_text = q["options"][q["answer"]]
        quiz = Quiz(
            note_id=note_id,
            question=q["question"],
            answer=answer_text,
            choices_json=json.dumps(q["options"], ensure_ascii=False),
            explanation=q.get("explanation", ""),
        )
        db.add(quiz)
        quiz_models.append(quiz)
    db.commit()
    for qm in quiz_models:
        db.refresh(qm)
    return quiz_models


# ─── Health ───────────────────────────────────────────────────────────────────

@app.get("/", tags=["health"])
def health_check() -> dict:
    return {"status": "ok"}


# ─── Auth ─────────────────────────────────────────────────────────────────────

@app.post("/api/auth/register", response_model=TokenResponse, tags=["auth"])
def register(payload: UserCreate, db: Session = Depends(get_db)) -> TokenResponse:
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=409, detail="이미 사용 중인 이메일입니다.")

    user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        name=payload.name,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(user.id)
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


@app.post("/api/auth/login", response_model=TokenResponse, tags=["auth"])
def login(payload: UserLogin, db: Session = Depends(get_db)) -> TokenResponse:
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="이메일 또는 비밀번호가 올바르지 않습니다.")

    token = create_access_token(user.id)
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


@app.get("/api/auth/me", response_model=UserResponse, tags=["auth"])
def me(current_user: User = Depends(get_current_user)) -> UserResponse:
    return UserResponse.model_validate(current_user)


# ─── AI (인증 필요) ───────────────────────────────────────────────────────────

@app.post("/api/summary", tags=["ai"])
def create_summary(
    payload: dict,
    current_user: User = Depends(get_current_user),
) -> Dict[str, str]:
    text = payload.get("text", "")
    if not text.strip():
        raise HTTPException(status_code=400, detail="텍스트를 입력해주세요.")

    client = _get_gemini_client()
    contents = f"""
당신은 학생들의 학습을 돕는 보조 AI입니다.
아래 [원본 텍스트]를 읽고 핵심 내용만 요약해 주세요.

[규칙]
- 오직 원본 텍스트의 정보만 사용
- 서론/인사말 없이 바로 요약 내용 출력
- 마크다운 문법으로 가독성 좋게 구조화

[원본 텍스트]
{text[:4000]}
"""
    try:
        response = client.models.generate_content(model=GEMINI_MODEL, contents=contents)
        return {"summary": response.text}
    except Exception as e:
        print(f"[Gemini Summary Error] {e}")
        raise HTTPException(status_code=500, detail="AI 요약 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.")


@app.post("/api/pdf-summary", tags=["ai"])
async def create_pdf_summary(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
) -> Dict[str, str]:
    if file.content_type:
        ct = file.content_type.lower()
        if ct not in (
            "application/pdf",
            "application/x-pdf",
            "application/octet-stream",
        ):
            raise HTTPException(
                status_code=400,
                detail="PDF 파일만 업로드할 수 있습니다.",
            )

    try:
        file_bytes = await file.read()
    except Exception as e:
        print(f"[PDF Upload Read Error] {e}")
        raise HTTPException(
            status_code=400,
            detail="파일을 읽는 중 오류가 발생했습니다.",
        )

    if not file_bytes:
        raise HTTPException(status_code=400, detail="빈 파일입니다.")

    try:
        reader = PdfReader(BytesIO(file_bytes))
    except Exception as e:
        print(f"[PDF Parse Error] {e}")
        raise HTTPException(
            status_code=400,
            detail="PDF 형식이 올바르지 않거나 손상된 파일입니다.",
        )

    extracted_parts: List[str] = []
    try:
        for page in reader.pages:
            extracted_parts.append(page.extract_text() or "")
    except Exception as e:
        print(f"[PDF Extract Error] {e}")
        raise HTTPException(
            status_code=400,
            detail="PDF 페이지에서 텍스트를 읽는 중 오류가 발생했습니다.",
        )

    text = "\n".join(extracted_parts).strip()
    if not text:
        raise HTTPException(
            status_code=400,
            detail="PDF에서 텍스트를 추출할 수 없습니다. (이미지 전용 PDF일 수 있습니다.)",
        )

    client = _get_gemini_client()
    contents = f"""
당신은 학생들의 학습을 돕는 보조 AI입니다.
아래 [원본 텍스트]를 읽고 핵심 내용만 요약해 주세요.

[규칙]
- 오직 원본 텍스트의 정보만 사용
- 서론/인사말 없이 바로 요약 내용 출력
- 마크다운 문법으로 가독성 좋게 구조화

[원본 텍스트]
{text[:4000]}
"""
    try:
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=contents,
        )
        return {"summary": response.text}
    except Exception as e:
        print(f"[Gemini PDF Summary Error] {e}")
        raise HTTPException(
            status_code=500,
            detail="AI 요약 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
        )


@app.post("/api/quiz", tags=["ai"])
def create_quiz_adhoc(
    payload: dict,
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """NoteEditor에서 임시 퀴즈 미리보기 용도 (DB 저장 없음)"""
    text = payload.get("text", "")
    if not text.strip():
        raise HTTPException(status_code=400, detail="텍스트를 입력해주세요.")

    client = _get_gemini_client()
    prompt = f"""
당신은 최고의 퀴즈 출제 AI입니다. 아래 [학습 노트]를 바탕으로 객관식 4지선다 퀴즈를 3~5개 출제하세요.
마크다운 코드블록 없이 순수 JSON만 출력하세요.

[JSON 형식]
{{
  "questions": [
    {{
      "id": 1,
      "question": "문제",
      "options": ["보기1","보기2","보기3","보기4"],
      "answer": 0,
      "explanation": "해설"
    }}
  ]
}}

[학습 노트]
{text[:4000]}
"""
    try:
        response = client.models.generate_content(model=GEMINI_MODEL, contents=prompt)
        quiz_json = _parse_gemini_json(response.text, context="adhoc_quiz_preview")
        if "questions" not in quiz_json:
            print(
                "[Gemini Quiz Shape Error] context=adhoc_quiz_preview "
                f"keys={list(quiz_json.keys())}"
            )
            raise HTTPException(
                status_code=500,
                detail="AI 퀴즈 생성 형식이 올바르지 않습니다. 잠시 후 다시 시도해주세요.",
            )
        return {"quiz": quiz_json}
    except HTTPException:
        # 이미 의미 있는 HTTPException으로 변환된 경우 그대로 전달
        raise
    except Exception as e:
        print(f"[Gemini Quiz Error] {e}")
        raise HTTPException(
            status_code=500,
            detail="AI 퀴즈 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
        )


# ─── Notes ────────────────────────────────────────────────────────────────────

@app.post("/api/notes/", response_model=NoteWithQuizzesResponse, tags=["notes"])
def create_note(
    payload: NoteCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> NoteWithQuizzesResponse:
    note = Note(
        user_id=current_user.id,
        title=payload.title or "새 노트",
        content=payload.content,
        category=payload.category or "일반",
    )
    db.add(note)
    db.commit()
    db.refresh(note)

    # Gemini로 실제 퀴즈 생성 (실패해도 노트는 저장됨)
    quiz_resps: List[QuizResponse] = []
    try:
        questions = generate_quizzes_with_gemini(payload.content)
        quiz_models = _save_quizzes(note.id, questions, db)
        quiz_resps = [_quiz_to_response(q) for q in quiz_models]
    except Exception as e:
        print(f"⚠️ 퀴즈 생성 실패 (노트는 저장됨): {e}")

    return NoteWithQuizzesResponse(
        note=NoteResponse.model_validate(note),
        quizzes=quiz_resps,
    )


@app.get("/api/notes/categories", tags=["notes"])
def get_categories(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> List[str]:
    rows = (
        db.query(Note.category)
        .filter(Note.user_id == current_user.id)
        .distinct()
        .all()
    )
    return sorted([r.category for r in rows if r.category])


@app.get("/api/notes", response_model=List[NoteResponse], tags=["notes"])
def list_notes(
    search: Optional[str] = Query(default=None),
    category: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> List[NoteResponse]:
    q = db.query(Note).filter(Note.user_id == current_user.id)
    if search:
        like = f"%{search}%"
        q = q.filter(Note.title.ilike(like) | Note.content.ilike(like))
    if category:
        q = q.filter(Note.category == category)
    notes = q.order_by(Note.created_at.desc()).all()
    return [NoteResponse.model_validate(n) for n in notes]


@app.get("/api/notes/{note_id}", response_model=NoteResponse, tags=["notes"])
def get_note(
    note_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> NoteResponse:
    note = db.query(Note).filter(Note.id == note_id, Note.user_id == current_user.id).first()
    if not note:
        raise HTTPException(status_code=404, detail="노트를 찾을 수 없습니다.")
    return NoteResponse.model_validate(note)


@app.patch("/api/notes/{note_id}", response_model=NoteResponse, tags=["notes"])
def update_note(
    note_id: int,
    payload: NoteUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> NoteResponse:
    note = db.query(Note).filter(Note.id == note_id, Note.user_id == current_user.id).first()
    if not note:
        raise HTTPException(status_code=404, detail="노트를 찾을 수 없습니다.")

    if payload.title is not None:
        note.title = payload.title
    if payload.content is not None:
        note.content = payload.content
    if payload.category is not None:
        note.category = payload.category

    db.commit()
    db.refresh(note)
    return NoteResponse.model_validate(note)


@app.delete("/api/notes/{note_id}", tags=["notes"])
def delete_note(
    note_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    note = db.query(Note).filter(Note.id == note_id, Note.user_id == current_user.id).first()
    if not note:
        raise HTTPException(status_code=404, detail="노트를 찾을 수 없습니다.")
    db.delete(note)
    db.commit()
    return {"status": "deleted", "id": note_id}


# ─── Note Quizzes ─────────────────────────────────────────────────────────────

@app.get("/api/notes/{note_id}/quizzes", response_model=List[QuizResponse], tags=["quizzes"])
def get_note_quizzes(
    note_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> List[QuizResponse]:
    note = db.query(Note).filter(Note.id == note_id, Note.user_id == current_user.id).first()
    if not note:
        raise HTTPException(status_code=404, detail="노트를 찾을 수 없습니다.")
    quizzes = db.query(Quiz).filter(Quiz.note_id == note_id).all()
    return [_quiz_to_response(q) for q in quizzes]


@app.post("/api/notes/{note_id}/regenerate-quiz", response_model=List[QuizResponse], tags=["quizzes"])
def regenerate_quiz(
    note_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> List[QuizResponse]:
    note = db.query(Note).filter(Note.id == note_id, Note.user_id == current_user.id).first()
    if not note:
        raise HTTPException(status_code=404, detail="노트를 찾을 수 없습니다.")

    # 기존 퀴즈 삭제
    db.query(Quiz).filter(Quiz.note_id == note_id).delete()
    db.commit()

    try:
        questions = generate_quizzes_with_gemini(note.content)
        quiz_models = _save_quizzes(note.id, questions, db)
        return [_quiz_to_response(q) for q in quiz_models]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"퀴즈 생성 실패: {e}")


# ─── Study Records ────────────────────────────────────────────────────────────

@app.post("/api/study-records/batch", tags=["study"])
def save_study_records(
    payload: StudyRecordBatch,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    for r in payload.records:
        # quiz가 현재 유저의 노트에 속하는지 검증
        quiz = (
            db.query(Quiz)
            .join(Note, Quiz.note_id == Note.id)
            .filter(Quiz.id == r.quiz_id, Note.user_id == current_user.id)
            .first()
        )
        if not quiz:
            raise HTTPException(status_code=403, detail=f"quiz_id {r.quiz_id}에 대한 접근 권한이 없습니다.")
        record = StudyRecord(
            user_id=current_user.id,
            quiz_id=r.quiz_id,
            is_correct=r.is_correct,
        )
        db.add(record)
    db.commit()
    return {"status": "ok", "saved": len(payload.records)}


# ─── Dashboard ────────────────────────────────────────────────────────────────

@app.get("/api/dashboard/stats", response_model=DashboardStats, tags=["dashboard"])
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DashboardStats:
    total_notes = db.query(Note).filter(Note.user_id == current_user.id).count()

    total_records = (
        db.query(StudyRecord).filter(StudyRecord.user_id == current_user.id).count()
    )
    correct_records = (
        db.query(StudyRecord)
        .filter(StudyRecord.user_id == current_user.id, StudyRecord.is_correct == True)
        .count()
    )
    avg_score = round((correct_records / total_records) * 100, 1) if total_records > 0 else 0.0

    today = datetime.utcnow().date()
    today_activity = (
        db.query(StudyRecord)
        .filter(
            StudyRecord.user_id == current_user.id,
            func.date(StudyRecord.studied_at) == today,
        )
        .count()
    )

    return DashboardStats(
        total_notes=total_notes,
        total_quizzes_completed=total_records,
        average_score=avg_score,
        today_activity=today_activity,
    )


@app.get("/api/dashboard/recent-notes", response_model=List[NoteResponse], tags=["dashboard"])
def get_recent_notes(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> List[NoteResponse]:
    notes = (
        db.query(Note)
        .filter(Note.user_id == current_user.id)
        .order_by(Note.created_at.desc())
        .limit(3)
        .all()
    )
    return [NoteResponse.model_validate(n) for n in notes]


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
