import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { useToast } from "../context/ToastContext";
import api from "../api";

export default function NoteEditor() {
  const location = useLocation();
  const navigate = useNavigate();
  const { id } = useParams();
  const toast = useToast();

  const state = location.state || {};
  const noteFromState = state.note || (state.title ? state : null);
  const incomingPdfFile = !id && state.pdfFile instanceof File ? state.pdfFile : null;
  const titleFromPdfRoute =
    typeof state.title === "string" ? state.title.trim() : "";

  const hasPrefillContent = !!(noteFromState?.content?.trim());

  const [creationMode, setCreationMode] = useState(() => {
    if (id) return "manual";
    if (hasPrefillContent) return "manual";
    if (incomingPdfFile) return "pdf";
    return null;
  });

  const [title, setTitle] = useState(() => {
    if (id) return noteFromState?.title || "새 노트";
    if (incomingPdfFile) {
      return titleFromPdfRoute || `[PDF 요약] ${incomingPdfFile.name}`;
    }
    return noteFromState?.title || "새 노트";
  });
  const [content, setContent] = useState(noteFromState?.content || "");
  const [category, setCategory] = useState(state.category ?? noteFromState?.category ?? "일반");
  const [isLoadingRoutePdf, setIsLoadingRoutePdf] = useState(() => !!incomingPdfFile);
  const [summaryResult, setSummaryResult] = useState("");
  const [quizResult, setQuizResult] = useState(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [isEditingSummary, setIsEditingSummary] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingNote, setIsLoadingNote] = useState(false);
  const pdfInputRef = useRef(null);

  const isNewNote = !id;
  const showModePicker = isNewNote && creationMode === null;

  // 모달 등에서 location.state.pdfFile 로 넘어온 PDF → 마운트 시 자동 업로드·요약
  useEffect(() => {
    if (id) return;
    const file = location.state?.pdfFile;
    if (!(file instanceof File)) return;

    let cancelled = false;
    setIsLoadingRoutePdf(true);
    setIsLoadingSummary(true);

    (async () => {
      try {
        const formData = new FormData();
        formData.append("file", file);
        const { data } = await api.post("/api/pdf-summary", formData);
        if (cancelled) return;
        setContent(data.summary ?? "");
        setSummaryResult("");
        setQuizResult(null);
        setCreationMode("pdf");
        navigate(location.pathname, { replace: true, state: {} });
      } catch (err) {
        if (cancelled) return;
        toast(err?.message || "PDF 요약 중 오류가 발생했습니다.", "error");
        navigate("/notes", { replace: true });
      } finally {
        if (!cancelled) {
          setIsLoadingRoutePdf(false);
          setIsLoadingSummary(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, location.state, location.pathname, navigate, toast]);

  // 수정 모드에서 state가 없으면 API로 노트 로드
  useEffect(() => {
    if (!id || noteFromState) return;
    setIsLoadingNote(true);
    api.get(`/api/notes/${id}`)
      .then(({ data }) => {
        if (data) {
          setTitle(data.title);
          setContent(data.content);
          setCategory(data.category || "일반");
        }
      })
      .catch(() => {
        toast("노트를 불러오는데 실패했습니다.", "error");
        navigate("/notes", { replace: true });
      })
      .finally(() => setIsLoadingNote(false));
  }, [id]);

  const handleResetCreationFlow = () => {
    setCreationMode(null);
    setTitle("새 노트");
    setContent("");
    setCategory("일반");
    setSummaryResult("");
    setQuizResult(null);
    setIsEditingSummary(false);
  };

  const handleSaveNote = async () => {
    if (!title.trim()) { toast("노트 제목을 입력해 주세요.", "warning"); return; }
    if (!content.trim()) { toast("노트 내용을 입력해 주세요.", "warning"); return; }

    setIsSaving(true);
    try {
      if (!id) {
        await api.post("/api/notes/", { title, content, category });
      } else {
        await api.patch(`/api/notes/${id}`, { title, content, category });
      }
      toast(id ? "노트가 수정되었습니다." : "노트가 저장되었습니다. AI 퀴즈도 생성중이에요!", "success");
      navigate("/notes", { replace: true });
    } catch (e) {
      toast(e?.message || "저장 중 오류가 발생했습니다.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSummary = async () => {
    if (!content.trim()) { toast("내용을 먼저 입력해 주세요.", "warning"); return; }

    setIsLoadingSummary(true);
    try {
      const { data } = await api.post("/api/summary", { text: content });
      setSummaryResult(data.summary ?? "");
      toast("요약이 완료되었습니다.", "success");
    } catch (e) {
      toast(e?.message || "요약 중 오류가 발생했습니다.", "error");
    } finally {
      setIsLoadingSummary(false);
    }
  };

  const handlePdfUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    setIsLoadingSummary(true);
    try {
      const { data } = await api.post("/api/pdf-summary", formData);
      const summary = data.summary ?? "";

      if (!id) {
        setTitle((prev) =>
          prev?.trim() ? prev : `[PDF 요약] ${file.name}`
        );
        setContent(summary);
        setSummaryResult("");
        setQuizResult(null);
        setCreationMode("pdf");
      } else {
        setSummaryResult(summary);
      }
      toast("PDF 요약이 완료되었습니다.", "success");
    } catch (err) {
      toast(err?.message || "PDF 요약 중 오류가 발생했습니다.", "error");
    } finally {
      setIsLoadingSummary(false);
    }
  };

  const handleQuiz = async () => {
    if (!content.trim()) { toast("내용을 먼저 입력해 주세요.", "warning"); return; }

    setIsGeneratingQuiz(true);
    try {
      const { data } = await api.post("/api/quiz", { text: content });
      setQuizResult(data.quiz ?? null);
      toast("퀴즈가 생성되었습니다. 저장 시 DB에도 저장됩니다.", "success");
    } catch (e) {
      toast(e?.message || "퀴즈 생성 중 오류가 발생했습니다.", "error");
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  const PRESET_CATEGORIES = ["일반", "수학", "과학", "언어", "역사", "기술"];

  if (isLoadingNote) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  /* ─── 초기 선택 화면 (새 노트 + creationMode null) ─── */
  if (showModePicker) {
    return (
      <div className="relative min-h-[calc(100vh-8rem)] space-y-8">
        <header className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 transition"
            aria-label="뒤로 가기"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 md:text-2xl">새 노트</h1>
            <p className="text-sm text-slate-500">시작 방식을 선택하세요</p>
          </div>
        </header>

        <input
          ref={pdfInputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={handlePdfUpload}
        />

        <div className="flex min-h-[50vh] flex-col items-center justify-center px-2">
          <div className="grid w-full max-w-4xl grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
            <button
              type="button"
              onClick={() => setCreationMode("manual")}
              disabled={isLoadingSummary}
              className="group relative flex min-h-[200px] flex-col items-center justify-center rounded-2xl border-2 border-slate-200 bg-white p-8 text-center shadow-sm transition duration-300 hover:z-10 hover:scale-[1.02] hover:border-blue-400 hover:shadow-xl hover:shadow-blue-500/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:pointer-events-none disabled:opacity-50"
            >
              <span className="text-4xl transition group-hover:scale-110">✏️</span>
              <span className="mt-4 text-lg font-bold text-slate-800">직접 작성하기</span>
              <span className="mt-2 max-w-xs text-sm text-slate-500">
                제목과 내용을 직접 입력해 노트를 만듭니다
              </span>
            </button>

            <button
              type="button"
              onClick={() => pdfInputRef.current?.click()}
              disabled={isLoadingSummary}
              className="group relative flex min-h-[200px] flex-col items-center justify-center rounded-2xl border-2 border-slate-200 bg-white p-8 text-center shadow-sm transition duration-300 hover:z-10 hover:scale-[1.02] hover:border-emerald-400 hover:shadow-xl hover:shadow-emerald-500/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:pointer-events-none disabled:opacity-50"
            >
              <span className="text-4xl transition group-hover:scale-110">📄</span>
              <span className="mt-4 text-lg font-bold text-slate-800">PDF 업로드 &amp; 요약</span>
              <span className="mt-2 max-w-xs text-sm text-slate-500">
                PDF를 올리면 AI가 요약해 본문에 채워 드립니다
              </span>
            </button>
          </div>
        </div>

        {isLoadingSummary && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/20 bg-white px-8 py-6 shadow-2xl">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="text-sm font-semibold text-slate-800">PDF 요약 중...</p>
              <p className="text-xs text-slate-500">잠시만 기다려 주세요</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ─── 에디터 화면 (기존 노트 수정 · 새 노트 manual/pdf) ─── */
  return (
    <div className="space-y-6 md:space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-wrap items-start gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 transition"
            aria-label="뒤로 가기"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          {isNewNote && (
            <button
              type="button"
              onClick={handleResetCreationFlow}
              className="mt-0.5 inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900 shadow-sm hover:bg-amber-100 transition"
            >
              🔙 방식 변경
            </button>
          )}
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 bg-transparent border-none focus:outline-none focus:ring-0 px-0"
              />
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 focus:outline-none"
              >
                {PRESET_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            {id && (
              <p className="mt-1 text-sm text-slate-500">
                노트 ID: <span className="font-medium text-slate-700">{id}</span>
              </p>
            )}
          </div>
        </div>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="px-4 py-4 md:px-6 md:py-5">
          <label className="mb-2 block text-xs md:text-sm font-medium text-slate-700">내용</label>
          <textarea
            className="min-h-[480px] w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm md:text-base text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition"
            placeholder="학습 내용을 입력하거나 붙여넣기 해주세요..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />

          {summaryResult && (
            <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-blue-700">요약 결과</p>
                <button
                  type="button"
                  onClick={() => setIsEditingSummary((p) => !p)}
                  className="text-[11px] rounded-full border border-blue-200 bg-white/70 px-2.5 py-1 font-medium text-blue-700 hover:bg-blue-50 transition"
                >
                  {isEditingSummary ? "✅ 완료" : "✏️ 수정하기"}
                </button>
              </div>
              <div className="mt-2">
                {isEditingSummary ? (
                  <textarea
                    className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-400/60 transition"
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

          {quizResult?.questions && (
            <div className="mt-4 rounded-xl border border-purple-100 bg-purple-50 px-4 py-3">
              <p className="text-xs font-semibold text-purple-700 mb-3">
                퀴즈 미리보기 ({quizResult.questions.length}문제) — 저장 시 DB에 반영됩니다
              </p>
              <div className="space-y-3">
                {quizResult.questions.map((q, i) => (
                  <div key={i} className="rounded-lg bg-white border border-purple-100 px-3 py-3">
                    <p className="text-xs font-semibold text-slate-800">{i + 1}. {q.question}</p>
                    <ol className="mt-2 space-y-1">
                      {q.options.map((opt, j) => (
                        <li
                          key={j}
                          className={`text-xs px-2 py-1 rounded ${j === q.answer ? "bg-emerald-50 text-emerald-800 font-medium" : "text-slate-600"}`}
                        >
                          {j + 1}. {opt}
                        </li>
                      ))}
                    </ol>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
            <input
              ref={pdfInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={handlePdfUpload}
            />
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
              onClick={() => pdfInputRef.current?.click()}
              disabled={isLoadingSummary}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50/80 px-4 py-2 text-sm font-semibold text-blue-800 shadow-sm hover:bg-blue-100 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              📄 PDF 업로드
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
                  생성 중...
                </>
              ) : (
                <>🎯 퀴즈 생성</>
              )}
            </button>
          </div>
        </div>
      </section>

      {isLoadingRoutePdf && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/20 bg-white px-8 py-6 shadow-2xl">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-sm font-semibold text-slate-800">PDF 요약 중...</p>
            <p className="text-xs text-slate-500">잠시만 기다려 주세요</p>
          </div>
        </div>
      )}
    </div>
  );
}
