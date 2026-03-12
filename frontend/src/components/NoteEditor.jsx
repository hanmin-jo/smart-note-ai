import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";

export default function NoteEditor() {
  const location = useLocation();
  const navigate = useNavigate();
  const { id } = useParams();

  const state = location.state || {};
  const note = state.note || state;
  const initialTitle = note.title || "새 노트";
  const category = note.category || "일반";

  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(note.content || "");
  const [summaryResult, setSummaryResult] = useState("");
  const [quizResult, setQuizResult] = useState("");
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [isEditingSummary, setIsEditingSummary] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const toDisplayText = (data) => {
    if (typeof data === "string") return data;
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  };

  const handleSaveNote = async () => {
    if (!title.trim()) {
      alert("노트 제목을 입력해 주세요.");
      return;
    }
    if (!content.trim()) {
      alert("노트 내용을 입력해 주세요.");
      return;
    }

    setIsSaving(true);
    try {
      // 새 노트 작성 (/note/write) 인 경우: 생성
      if (!id) {
        const res = await fetch("http://localhost:8000/api/notes/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            content,
            user_id: 1,
          }),
        });

        if (!res.ok) {
          const errJson = await res.json().catch(() => null);
          const detail = errJson?.detail || "노트 저장에 실패했습니다.";
          throw new Error(detail);
        }

        await res.json();
        alert("노트가 저장되었습니다.");
        navigate("/notes", { replace: true });
      } else {
        // 기존 노트 편집 (/notes/:id) 인 경우: 제목/내용 업데이트
        const res = await fetch(`http://localhost:8000/api/notes/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, content }),
        });

        if (!res.ok) {
          const errJson = await res.json().catch(() => null);
          const detail = errJson?.detail || "노트 수정에 실패했습니다.";
          throw new Error(detail);
        }

        await res.json();
        alert("노트가 수정되었습니다.");
        navigate("/notes", { replace: true });
      }
    } catch (e) {
      alert(e?.message || "노트 저장 중 오류가 발생했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSummary = async () => {
    if (!content.trim()) {
      alert("내용을 먼저 입력해 주세요.");
      return;
    }

    setIsLoadingSummary(true);
    try {
      const res = await fetch("http://localhost:8000/api/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: content }),
      });

      if (!res.ok) throw new Error("요약 요청에 실패했습니다.");
      const data = await res.json();
      setSummaryResult(toDisplayText(data.summary ?? data.result ?? data));
    } catch (e) {
      alert(e?.message || "요약 중 오류가 발생했습니다.");
    } finally {
      setIsLoadingSummary(false);
    }
  };

  const handleQuiz = async () => {
    if (!content.trim()) {
      alert("내용을 먼저 입력해 주세요.");
      return;
    }

    setIsGeneratingQuiz(true);
    try {
      const res = await fetch("http://localhost:8000/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: content }),
      });

      if (!res.ok) throw new Error("퀴즈 생성 요청에 실패했습니다.");
      const data = await res.json();
      setQuizResult(toDisplayText(data.quiz ?? data.result ?? data));
    } catch (e) {
      alert(e?.message || "퀴즈 생성 중 오류가 발생했습니다.");
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  return (
    <div className="space-y-6 md:space-y-8">
      {/* 상단: 뒤로가기 + 제목 + 카테고리 뱃지 */}
      <header className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 transition"
            aria-label="뒤로 가기"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

            <div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 bg-transparent border-none focus:outline-none focus:ring-0 px-0"
              />
              <span className="inline-flex items-center rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                {category}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              노트 ID: <span className="font-medium text-slate-700">{id}</span>
            </p>
          </div>
        </div>
      </header>

      {/* 중단: 학습 내용 입력 */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="px-4 py-4 md:px-6 md:py-5">
          <label className="mb-2 block text-xs md:text-sm font-medium text-slate-700">
            내용
          </label>
          <textarea
            className="min-h-[520px] w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm md:text-base text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition"
            placeholder="학습 내용을 입력하거나 붙여넣기 해주세요..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />

          {/* 결과창 */}
          {(summaryResult || quizResult) && (
            <div className="mt-4 space-y-3">
              {summaryResult && (
                <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-blue-700">
                      요약 결과
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsEditingSummary((prev) => !prev)}
                      className="text-[11px] rounded-full border border-blue-200 bg-white/70 px-2.5 py-1 font-medium text-blue-700 hover:bg-blue-50 transition"
                    >
                      {isEditingSummary ? "✅ 완료" : "✏️ 수정하기"}
                    </button>
                  </div>

                  <div className="mt-2">
                    {isEditingSummary ? (
                      <textarea
                        className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400/60 focus:border-blue-300 transition"
                        rows={8}
                        value={summaryResult}
                        onChange={(e) => setSummaryResult(e.target.value)}
                      />
                    ) : (
                      <div className="prose max-w-none text-gray-800 prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 prose-headings:mb-2 prose-headings:mt-4">
                        <ReactMarkdown>{summaryResult}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {quizResult && (
                <div className="rounded-xl border border-purple-100 bg-purple-50 px-4 py-3">
                  <p className="text-xs font-semibold text-purple-700">
                    퀴즈 결과
                  </p>
                  <div className="mt-2 prose max-w-none text-gray-800 prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 prose-headings:mb-2 prose-headings:mt-4 whitespace-pre-wrap">
                    <ReactMarkdown>{quizResult}</ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 하단 버튼: textarea 바로 아래 우측 정렬 */}
          <div className="mt-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleSaveNote}
              disabled={isSaving}
              className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-transparent px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSaving ? "저장 중..." : "💾 저장"}
            </button>
            <button
              type="button"
              onClick={handleSummary}
              disabled={isLoadingSummary}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoadingSummary ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  요약 중...
                </>
              ) : (
                <>✨ AI 요약</>
              )}
            </button>
            <button
              type="button"
              onClick={handleQuiz}
              disabled={isGeneratingQuiz}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-black transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isGeneratingQuiz ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  퀴즈 생성 중...
                </>
              ) : (
                <>🎯 퀴즈 생성</>
              )}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

