import json
import os
from typing import Any, Dict, List

import openai
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
from dotenv import load_dotenv
from google import genai

from database import Base, engine, get_db
import models
from models import Note, Quiz
from schemas import NoteCreateRequest, NoteWithQuizzesResponse, NoteResponse, QuizResponse, NoteUpdateRequest


def create_tables() -> None:
    """
    Create all database tables.
    Call this once on startup in simple setups.
    """
    Base.metadata.create_all(bind=engine)


app = FastAPI(title="Study Backend", version="0.1.0")

# CORS 설정: 프론트엔드 서버에서의 모든 요청/헤더 허용
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# .env 로드
load_dotenv()


# ---- OpenAI 설정 ----
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    # 개발 단계에서는 없을 수 있으므로, 런타임 시점에만 예외 처리
    # 엔드포인트 내부에서 다시 한 번 확인한다.
    openai.api_key = None
else:
    openai.api_key = OPENAI_API_KEY


class AIRequest(BaseModel):
    text: str


@app.on_event("startup")
def on_startup() -> None:
    create_tables()


@app.get("/", tags=["health"])
def health_check() -> dict:
    """
    Simple health check endpoint.
    """
    return {"status": "ok"}


@app.post("/api/summary", tags=["ai"])
def create_summary(payload: AIRequest) -> Dict[str, str]:
    """
    Gemini를 사용하여 학습 노트를 구조적으로 요약하는 엔드포인트.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="GEMINI_API_KEY가 설정되어 있지 않습니다.",
        )

    contents = f"""
당신은 학생들의 학습을 돕는 보조 AI입니다. 
아래 [원본 텍스트]를 읽고 핵심 내용만 요약해 주세요.

[엄격한 규칙]
절대 외부 지식을 추가하지 마세요. 오직 [원본 텍스트]에 있는 정보만 사용하세요.
'다음은 요약입니다' 같은 서론이나 인사말은 생략하고, 바로 요약 내용만 출력하세요.
마크다운(Markdown) 문법을 사용해 가독성 좋게 구조화하세요.

[원본 텍스트]
{payload.text}
"""

    try:
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=contents,
        )
        summary_text = response.text if hasattr(response, "text") else str(response)
        return {"summary": summary_text}
    except Exception as e:  # noqa: BLE001
        print(f"🚨 AI API 에러 상세 (/api/summary): {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=str(e),
        ) from e


@app.post("/api/quiz", tags=["ai"])
def create_quiz(payload: AIRequest) -> Dict[str, Any]:
    """
    Gemini를 사용하여 객관식 4지선다 퀴즈를 JSON 형식으로 생성하는 엔드포인트.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="GEMINI_API_KEY가 설정되어 있지 않습니다.",
        )

    prompt = f"""
당신은 '최고의 1타 출제위원 AI'입니다. 아래 [학습 노트]를 바탕으로 객관식 4지선다 퀴즈를 출제하세요.
분량에 따라 3~5문제를 출제하며, 반드시 아래의 JSON 형식으로만 응답해야 합니다. 마크다운 코드블록(```json 등)이나 다른 설명은 절대 포함하지 말고 오직 JSON 텍스트만 출력하세요.
[JSON 응답 양식]
{{
  "questions": [
    {{
      "id": 1,
      "question": "문제 내용",
      "options": ["보기1", "보기2", "보기3", "보기4"],
      "answer": 0,
      "explanation": "정답인 이유와 간단한 해설"
    }}
  ]
}}

[학습 노트]
{payload.text}
"""

    try:
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )
        raw_text = response.text if hasattr(response, "text") else str(response)

        if not isinstance(raw_text, str):
            raise ValueError("모델 응답이 문자열 형식이 아닙니다.")

        # 마크다운 코드블록 백틱 등 불필요한 래퍼 제거
        cleaned = raw_text.strip()
        for fence in ("```json", "```JSON", "```", "~~~json", "~~~JSON", "~~~"):
            cleaned = cleaned.replace(fence, "")
        cleaned = cleaned.strip()

        try:
            quiz_json = json.loads(cleaned)
        except json.JSONDecodeError as parse_err:
            print(f"🚨 퀴즈 JSON 파싱 오류: {parse_err}; 원본 응답: {cleaned}")
            raise HTTPException(
                status_code=500,
                detail="퀴즈 JSON 파싱 중 오류가 발생했습니다.",
            ) from parse_err

        # 최소한의 구조 확인
        if not isinstance(quiz_json, dict) or "questions" not in quiz_json:
            raise HTTPException(
                status_code=500,
                detail="퀴즈 JSON 구조가 올바르지 않습니다. 'questions' 키가 필요합니다.",
            )

        return {"quiz": quiz_json}
    except HTTPException:
        raise
    except Exception as e:  # noqa: BLE001
        print(f"🚨 AI API 에러 상세 (/api/quiz): {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=str(e),
        ) from e


def _parse_quiz_json(raw_content: str) -> List[Dict[str, Any]]:
    """
    모델이 반드시 JSON만 반환하도록 요청하지만,
    방어적으로 앞뒤 불필요한 텍스트를 제거한 뒤 파싱한다.
    """
    start = raw_content.find("{")
    end = raw_content.rfind("}")
    if start != -1 and end != -1 and end > start:
        raw_content = raw_content[start : end + 1]

    data = json.loads(raw_content)

    # {"quizzes": [...]} 형태 또는 바로 리스트 둘 다 허용
    if isinstance(data, dict) and "quizzes" in data:
        quizzes = data["quizzes"]
    else:
        quizzes = data

    if not isinstance(quizzes, list):
        raise ValueError("퀴즈 JSON 형식이 올바르지 않습니다.")

    return quizzes


def generate_quizzes_from_content(content: str) -> List[Dict[str, Any]]:
    """
    노트 텍스트를 기반으로 객관식 퀴즈 3개를 생성한다.

    반환 형식 (예시):
    {
      "quizzes": [
        {
          "question": "질문 내용",
          "choices": ["보기1", "보기2", "보기3", "보기4"],
          "answer": "정답 보기 텍스트",
          "explanation": "정답에 대한 해설"
        },
        ...
      ]
    }
    """
    if not openai.api_key:
        raise RuntimeError("OPENAI_API_KEY 가 설정되어 있지 않습니다.")

    system_prompt = (
        "너는 학습용 객관식 퀴즈를 만들어 주는 도우미야. "
        "사용자가 준 학습 노트를 바탕으로 중요한 개념을 잘 이해했는지 확인할 수 있는 "
        "객관식 퀴즈 3개를 만들어라. "
        "반드시 JSON 형식만 반환해야 하고, 자연어 설명은 절대 함께 쓰지 마."
    )

    user_prompt = """
다음 학습 노트를 읽고 객관식 퀴즈 3개를 만들어 주세요.
각 퀴즈는 아래 JSON 스키마를 반드시 따라야 합니다.

반환 형식(JSON 전체 예시):
{
  "quizzes": [
    {
      "question": "질문 내용",
      "choices": ["보기1", "보기2", "보기3", "보기4"],
      "answer": "정답 보기 텍스트 (choices 중 하나)",
      "explanation": "왜 이 보기가 정답인지에 대한 해설"
    },
    {
      "question": "질문 내용",
      "choices": ["보기1", "보기2", "보기3", "보기4"],
      "answer": "정답 보기 텍스트 (choices 중 하나)",
      "explanation": "왜 이 보기가 정답인지에 대한 해설"
    },
    {
      "question": "질문 내용",
      "choices": ["보기1", "보기2", "보기3", "보기4"],
      "answer": "정답 보기 텍스트 (choices 중 하나)",
      "explanation": "왜 이 보기가 정답인지에 대한 해설"
    }
  ]
}

제약 조건:
- 반드시 quizzes 배열에 정확히 3개의 퀴즈를 생성할 것
- choices 리스트 길이는 항상 4개일 것
- answer 값은 항상 choices 중 하나일 것
- JSON 외의 자연어 텍스트는 절대 포함하지 말 것

--- 학습 노트 시작 ---
{note_content}
--- 학습 노트 끝 ---
""".strip().format(
        note_content=content
    )

    response = openai.ChatCompletion.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.7,
    )

    raw_content = response["choices"][0]["message"]["content"]
    quizzes = _parse_quiz_json(raw_content)

    # 최소한의 검증 (객관식 3개, 보기 4개)
    valid_quizzes: List[Dict[str, Any]] = []
    for item in quizzes:
        question = item.get("question")
        choices = item.get("choices")
        answer = item.get("answer")
        explanation = item.get("explanation", "")

        if not question or not isinstance(choices, list) or len(choices) != 4:
            continue
        if answer not in choices:
            continue

        valid_quizzes.append(
            {
                "question": question,
                "choices": choices,
                "answer": answer,
                "explanation": explanation,
            }
        )

    if len(valid_quizzes) == 0:
        raise ValueError("유효한 퀴즈를 생성하지 못했습니다.")

    # 최대 3개까지만 사용
    return valid_quizzes[:3]


@app.post(
    "/api/notes/",
    response_model=NoteWithQuizzesResponse,
    tags=["notes"],
)
def create_note_and_quizzes(
    payload: NoteCreateRequest,
    db: Session = Depends(get_db),
) -> NoteWithQuizzesResponse:
    """
    1. 텍스트(content)를 Note 테이블에 저장
    2. 저장한 텍스트를 OpenAI API에 보내 객관식 퀴즈 3개 생성
    3. 생성된 퀴즈를 Quiz 테이블에 저장
    4. 최종적으로 Note + Quiz 리스트를 응답
    """
    # NOTE: 아직 인증/사용자 관리가 없으므로 임시로 user_id 기본값 사용
    user_id = payload.user_id or 1
    title = payload.title or "새 노트"

    # 1) 노트 저장
    note = Note(
        user_id=user_id,
        title=title,
        content=payload.content,
    )
    db.add(note)
    db.commit()
    db.refresh(note)

    # 2) OpenAI를 이용해 퀴즈 생성 (현재는 API 키가 없어 목 데이터 사용)
    # try:
    #     quiz_items = generate_quizzes_from_content(payload.content)
    # except Exception as e:  # noqa: BLE001
    #     # 노트 저장은 이미 되었으므로, 퀴즈 생성 실패만 알려준다.
    #     raise HTTPException(
    #         status_code=500,
    #         detail=f"퀴즈 생성 중 오류가 발생했습니다: {e}",
    #     ) from e

    # ---- Mock 데이터 (프론트엔드 개발용 하드코딩 퀴즈 3개) ----
    quiz_items = [
        {
            "question": "HTTP에서 클라이언트가 서버에 리소스를 요청할 때 사용하는 메서드가 아닌 것은 무엇인가요?",
            "choices": ["GET", "POST", "DELETE", "TRANSMIT"],
            "answer": "TRANSMIT",
            "explanation": "HTTP 표준 메서드에는 GET, POST, PUT, DELETE 등이 있지만 TRANSMIT 이라는 메서드는 존재하지 않습니다.",
        },
        {
            "question": "REST API 설계 원칙에 대한 설명으로 가장 알맞은 것은 무엇인가요?",
            "choices": [
                "모든 요청은 반드시 동일한 URL을 사용해야 한다.",
                "리소스는 URL로 표현하고, 행위는 HTTP 메서드로 표현한다.",
                "요청마다 새로운 TCP 소켓을 생성할 필요가 없다.",
                "항상 XML 포맷으로만 데이터를 주고받아야 한다.",
            ],
            "answer": "리소스는 URL로 표현하고, 행위는 HTTP 메서드로 표현한다.",
            "explanation": "REST에서는 /notes/1 과 같은 URL로 리소스를 표현하고, 조회/생성/수정/삭제는 GET/POST/PUT/DELETE 같은 HTTP 메서드로 구분합니다.",
        },
        {
            "question": "다음 중 데이터베이스 트랜잭션의 특징(ACID)에 해당하지 않는 것은 무엇인가요?",
            "choices": ["원자성(Atomicity)", "일관성(Consistency)", "격리성(Isolation)", "분산성(Distribution)"],
            "answer": "분산성(Distribution)",
            "explanation": "ACID는 원자성, 일관성, 격리성, 지속성(Durability)을 의미하며, 분산성은 여기에 포함되지 않습니다.",
        },
    ]

    # 3) Quiz 테이블에 저장
    quiz_models: List[Quiz] = []
    for item in quiz_items:
        quiz = Quiz(
            note_id=note.id,
            question=item["question"],
            answer=item["answer"],
            choices_json=json.dumps(item["choices"], ensure_ascii=False),
            explanation=item["explanation"],
        )
        db.add(quiz)
        quiz_models.append(quiz)

    db.commit()
    for quiz in quiz_models:
        db.refresh(quiz)

    # 4) 응답 스키마로 변환
    note_resp = NoteResponse.model_validate(note)
    quiz_resps: List[QuizResponse] = []
    for quiz in quiz_models:
        quiz_resps.append(
            QuizResponse(
                id=quiz.id,
                question=quiz.question,
                choices=json.loads(quiz.choices_json),
                answer=quiz.answer,
                explanation=quiz.explanation,
            )
        )

    return NoteWithQuizzesResponse(note=note_resp, quizzes=quiz_resps)


@app.get(
    "/api/notes",
    response_model=list[NoteResponse],
    tags=["notes"],
)
def list_notes(db: Session = Depends(get_db)) -> list[NoteResponse]:
    """
    저장된 노트 목록을 최신 순으로 반환하는 엔드포인트.
    (현재는 인증이 없어 모든 사용자 노트를 반환)
    """
    notes = db.query(Note).order_by(Note.created_at.desc()).all()
    return [NoteResponse.model_validate(note) for note in notes]


@app.patch(
    "/api/notes/{note_id}",
    response_model=NoteResponse,
    tags=["notes"],
)
def update_note(
    note_id: int,
    payload: NoteUpdateRequest,
    db: Session = Depends(get_db),
) -> NoteResponse:
    """
    노트의 제목/내용을 부분 업데이트하는 엔드포인트.
    """
    note: Note | None = db.query(Note).filter(Note.id == note_id).first()
    if note is None:
        raise HTTPException(status_code=404, detail="해당 노트를 찾을 수 없습니다.")

    if payload.title is not None:
        note.title = payload.title
    if payload.content is not None:
        note.content = payload.content

    db.commit()
    db.refresh(note)
    return NoteResponse.model_validate(note)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

