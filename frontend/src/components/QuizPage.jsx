import { useEffect, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";

export default function QuizPage() {
  const [notes, setNotes] = useState([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [notesError, setNotesError] = useState("");

  const [selectedNoteId, setSelectedNoteId] = useState(null);
  const [quizData, setQuizData] = useState(null);
  const [quizError, setQuizError] = useState("");
  const [generatingForId, setGeneratingForId] = useState(null);

  const [userAnswers, setUserAnswers] = useState({});
  const [isGraded, setIsGraded] = useState(false);

  useEffect(() => {
    const fetchNotes = async () => {
      setNotesLoading(true);
      setNotesError("");
      try {
        const res = await fetch("http://localhost:8000/api/notes");
        if (!res.ok) {
          throw new Error("노트 목록을 불러오는데 실패했습니다.");
        }
        const data = await res.json();
        setNotes(data || []);
      } catch (e) {
        setNotesError(e?.message || "노트 목록을 불러오는 중 오류가 발생했습니다.");
      } finally {
        setNotesLoading(false);
      }
    };

    fetchNotes();
  }, []);

  const parseQuizPayload = (payload) => {
    if (!payload) return null;

    try {
      if (typeof payload === "string") {
        const parsed = JSON.parse(payload);
        return parsed;
      }
      if (typeof payload === "object" && payload !== null) {
        return payload;
      }
      throw new Error("알 수 없는 퀴즈 데이터 형식입니다.");
    } catch (e) {
      throw new Error(`퀴즈 JSON 파싱 실패: ${e.message}`);
    }
  };

  const handleGenerateQuiz = async (note) => {
    if (!note?.content) {
      setQuizError("선택한 노트에 내용이 없습니다.");
      return;
    }

    setGeneratingForId(note.id);
    setQuizError("");
    setQuizData(null);
    setUserAnswers({});
    setIsGraded(false);

    try {
      const res = await fetch("http://localhost:8000/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: note.content }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        const detail = errJson?.detail || "퀴즈 생성 요청에 실패했습니다.";
        throw new Error(detail);
      }

      const data = await res.json();
      const parsed = parseQuizPayload(data.quiz);

      if (!parsed?.questions || !Array.isArray(parsed.questions) || parsed.questions.length === 0) {
        throw new Error("퀴즈가 생성되지 않았습니다. 다시 시도해 주세요.");
      }

      setSelectedNoteId(note.id);
      setQuizData(parsed);
    } catch (e) {
      setQuizError(e?.message || "퀴즈 생성 중 오류가 발생했습니다.");
    } finally {
      setGeneratingForId(null);
    }
  };

  const handleSelectOption = (questionIndex, optionIndex) => {
    if (isGraded) return;
    setUserAnswers((prev) => ({
      ...prev,
      [questionIndex]: optionIndex,
    }));
  };

  const handleGrade = () => {
    if (!quizData?.questions?.length) return;
    setIsGraded(true);
  };

  const computeScore = () => {
    if (!quizData?.questions?.length || !isGraded) return null;
    let correct = 0;
    quizData.questions.forEach((q, idx) => {
      if (userAnswers[idx] === q.answer) {
        correct += 1;
      }
    });
    return { correct, total: quizData.questions.length };
  };

  const score = computeScore();

  return (
    <div className="space-y-6 md:space-y-8">
      {/* 상단 헤더 */}
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
            퀴즈 연습
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            저장된 노트에서 AI가 생성한 객관식 퀴즈를 풀어보세요.
          </p>
        </div>
        {score && (
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-900 text-white px-4 py-2 text-sm font-medium">
            <Sparkles className="h-4 w-4 text-amber-300" />
            <span>
              점수: {score.correct} / {score.total}
            </span>
          </div>
        )}
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.9fr)]">
        {/* 노트 목록 패널 */}
        <section className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4 md:p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm md:text-base font-semibold text-slate-900">
              노트 목록
            </h2>
            {notesLoading && (
              <span className="inline-flex items-center gap-2 text-xs text-slate-500">
                <Loader2 className="h-3 w-3 animate-spin" />
                불러오는 중...
              </span>
            )}
          </div>

          {notesError && (
            <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {notesError}
            </p>
          )}

          {!notesLoading && !notesError && notes.length === 0 && (
            <p className="text-xs text-slate-500">
              아직 저장된 노트가 없습니다. 먼저 노트를 작성해 주세요.
            </p>
          )}

          <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
            {notes.map((note) => {
              const isSelected = note.id === selectedNoteId;
              const isGenerating = generatingForId === note.id;
              return (
                <article
                  key={note.id}
                  className={`rounded-xl border px-3 py-3 text-sm cursor-pointer transition ${
                    isSelected
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-slate-50 hover:bg-slate-100"
                  }`}
                  onClick={() => setSelectedNoteId(note.id)}
                >
                  <h3
                    className={`font-semibold line-clamp-1 ${
                      isSelected ? "text-white" : "text-slate-900"
                    }`}
                  >
                    {note.title}
                  </h3>
                  <p
                    className={`mt-1 text-xs line-clamp-2 ${
                      isSelected ? "text-slate-200" : "text-slate-500"
                    }`}
                  >
                    {note.content}
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleGenerateQuiz(note);
                      }}
                      disabled={isGenerating}
                      className={`inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                        isSelected
                          ? "bg-white text-slate-900 hover:bg-slate-100"
                          : "bg-slate-900 text-white hover:bg-slate-800"
                      } disabled:opacity-60 disabled:cursor-not-allowed`}
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" />
                          생성 중...
                        </>
                      ) : (
                        <>
                          <span>🎯 퀴즈 생성</span>
                        </>
                      )}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {/* 퀴즈 풀이 패널 */}
        <section className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4 md:p-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm md:text-base font-semibold text-slate-900">
              퀴즈 풀기
            </h2>
            {quizError && (
              <span className="text-xs text-red-500">
                {quizError}
              </span>
            )}
          </div>

          {!quizData && !quizError && (
            <p className="text-xs md:text-sm text-slate-500">
              왼쪽에서 노트를 선택하고 &quot;🎯 퀴즈 생성&quot; 버튼을 눌러 퀴즈를 만들어 보세요.
            </p>
          )}

          {quizData?.questions && quizData.questions.length > 0 && (
            <div className="space-y-5">
              {quizData.questions.map((q, index) => {
                const userAnswer = userAnswers[index];
                const isAnswered = userAnswer !== undefined && userAnswer !== null;
                return (
                  <article
                    key={q.id ?? index}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 md:px-5 md:py-5 space-y-3"
                  >
                    <header className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-medium text-slate-500 mb-1">
                          문제 {index + 1}
                        </p>
                        <h3 className="text-sm md:text-base font-semibold text-slate-900 leading-relaxed">
                          {q.question}
                        </h3>
                      </div>
                    </header>

                    <div className="space-y-2">
                      {q.options?.map((opt, optIdx) => {
                        const isSelected = userAnswer === optIdx;
                        let optionClasses =
                          "w-full text-left text-xs md:text-sm rounded-xl border px-3 py-2 transition";

                        if (!isGraded) {
                          optionClasses += isSelected
                            ? " border-slate-900 bg-slate-900 text-white"
                            : " border-slate-200 bg-white hover:bg-slate-100";
                        } else {
                          const isCorrect = q.answer === optIdx;
                          const isUserChoice = userAnswer === optIdx;

                          if (isCorrect) {
                            optionClasses +=
                              " border-emerald-500 bg-emerald-50 text-emerald-900";
                          } else if (isUserChoice && !isCorrect) {
                            optionClasses +=
                              " border-red-400 bg-red-50 text-red-900";
                          } else {
                            optionClasses += " border-slate-200 bg-white text-slate-800";
                          }
                        }

                        return (
                          <button
                            key={optIdx}
                            type="button"
                            onClick={() => handleSelectOption(index, optIdx)}
                            disabled={isGraded}
                            className={optionClasses}
                          >
                            <div className="flex items-center gap-2">
                              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-300 bg-white text-[11px] font-semibold text-slate-700">
                                {optIdx + 1}
                              </span>
                              <span className="flex-1">{opt}</span>
                              {!isGraded && isSelected && (
                                <span className="text-[10px] font-medium text-slate-200">
                                  선택됨
                                </span>
                              )}
                              {isGraded && q.answer === optIdx && (
                                <span className="text-[10px] font-semibold text-emerald-700">
                                  정답
                                </span>
                              )}
                              {isGraded && userAnswer === optIdx && q.answer !== optIdx && (
                                <span className="text-[10px] font-semibold text-red-700">
                                  내 선택
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {isGraded && (
                      <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs md:text-sm text-slate-700">
                        <p className="font-semibold mb-1 text-slate-800">해설</p>
                        <p className="leading-relaxed whitespace-pre-wrap">
                          {q.explanation}
                        </p>
                      </div>
                    )}

                    {!isGraded && !isAnswered && (
                      <p className="text-[11px] text-slate-400">
                        보기를 선택해 보세요.
                      </p>
                    )}
                  </article>
                );
              })}

              {!isGraded && (
                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={handleGrade}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-black transition"
                  >
                    ✅ 채점하기
                  </button>
                </div>
              )}

              {isGraded && (
                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setUserAnswers({});
                      setIsGraded(false);
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                  >
                    다시 풀기
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

