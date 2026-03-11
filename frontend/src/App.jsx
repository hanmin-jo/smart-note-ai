import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState } from "react";
import Login from "./components/Login.jsx";
import Signup from "./components/Signup.jsx";
import AuthLayout from "./layouts/AuthLayout.jsx";
import MainLayout from "./layouts/MainLayout.jsx";
import Dashboard from "./components/Dashboard.jsx";
import NoteList from "./components/NoteList.jsx";
import NoteEditor from "./components/NoteEditor.jsx";

function QuizMain() {
  const [content, setContent] = useState("");
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [openAnswers, setOpenAnswers] = useState({});

  const handleSubmit = async () => {
    if (!content.trim()) {
      setError("학습할 텍스트를 입력해 주세요.");
      return;
    }

    setLoading(true);
    setError("");
    setQuizzes([]);

    try {
      const res = await fetch("http://localhost:8000/api/notes/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content,
        }),
      });

      if (!res.ok) {
        throw new Error("퀴즈 생성 요청에 실패했습니다.");
      }

      const data = await res.json();
      // 백엔드 응답: { note: {...}, quizzes: [...] }
      setQuizzes(data.quizzes || []);
      setOpenAnswers({});
    } catch (e) {
      setError(e.message || "요청 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const toggleAnswer = (id) => {
    setOpenAnswers((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      {/* 헤더 */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight">
            AI 학습 보조 서비스
          </h1>
          <span className="text-xs md:text-sm text-slate-400">
            노트를 입력하면 자동으로 퀴즈를 생성해 드려요
          </span>
        </div>
      </header>

      {/* 메인 컨테이너 */}
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* 입력 영역 */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl shadow-slate-900/50 p-6 md:p-8">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg md:text-xl font-semibold">
                  학습 노트 입력
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                  강의 내용, 책 요약, 개념 정리 등을 자유롭게 입력해 보세요.
                </p>
              </div>
            </div>

            <div>
              <textarea
                className="w-full h-56 md:h-64 resize-none rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-3 text-sm md:text-base text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                placeholder="예) HTTP란 무엇인가요? 
- 클라이언트와 서버 간 통신 규약...
- 요청 메서드: GET, POST, PUT, DELETE 등..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            </div>

            {error && (
              <p className="text-sm text-red-400 bg-red-950/40 border border-red-900/60 px-3 py-2 rounded-lg">
                {error}
              </p>
            )}

            <div className="flex items-center justify-between gap-4 pt-2">
              <p className="text-xs md:text-sm text-slate-500">
                입력한 텍스트를 기반으로 객관식 퀴즈 3개를 생성합니다.
              </p>

              <button
                onClick={handleSubmit}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-full bg-indigo-500 hover:bg-indigo-400 disabled:bg-indigo-500/60 px-5 py-2.5 text-sm md:text-base font-medium shadow-lg shadow-indigo-500/30 transition disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 border-2 border-indigo-200 border-t-transparent rounded-full animate-spin" />
                    생성 중...
                  </>
                ) : (
                  <>노트 저장 및 퀴즈 생성</>
                )}
              </button>
            </div>
          </div>
        </section>

        {/* 퀴즈 리스트 */}
        <section className="space-y-4">
          <h2 className="text-lg md:text-xl font-semibold">
            생성된 퀴즈
          </h2>

          {loading && quizzes.length === 0 && (
            <p className="text-sm text-slate-400">
              퀴즈를 생성하는 중입니다. 잠시만 기다려 주세요...
            </p>
          )}

          {!loading && quizzes.length === 0 && (
            <p className="text-sm text-slate-500">
              아직 생성된 퀴즈가 없습니다. 상단에 학습 노트를 입력하고
              퀴즈를 생성해 보세요.
            </p>
          )}

          <div className="grid gap-4 md:gap-6 md:grid-cols-2">
            {quizzes.map((quiz) => (
              <article
                key={quiz.id ?? quiz.question}
                className="group relative rounded-2xl border border-slate-800 bg-slate-900/80 p-5 md:p-6 shadow-lg shadow-slate-900/60 hover:border-indigo-500/70 hover:shadow-indigo-500/20 transition"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <h3 className="text-sm md:text-base font-semibold leading-snug">
                    {quiz.question}
                  </h3>
                  <span className="inline-flex items-center rounded-full bg-slate-800 px-2 py-0.5 text-[10px] md:text-xs text-slate-300">
                    객관식 퀴즈
                  </span>
                </div>

                <ul className="space-y-1.5 text-sm md:text-sm text-slate-200 mb-4">
                  {quiz.choices?.map((choice, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2 rounded-lg bg-slate-800/70 px-3 py-1.5"
                    >
                      <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[10px] font-medium text-slate-200">
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span>{choice}</span>
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  onClick={() => toggleAnswer(quiz.id ?? quiz.question)}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-full border border-indigo-500/70 bg-indigo-500/10 px-4 py-2 text-xs md:text-sm font-medium text-indigo-300 hover:bg-indigo-500/20 transition"
                >
                  {openAnswers[quiz.id ?? quiz.question]
                    ? "정답/해설 숨기기"
                    : "정답 확인"}
                </button>

                {openAnswers[quiz.id ?? quiz.question] && (
                  <div className="mt-4 space-y-2 rounded-xl bg-slate-900/90 border border-slate-700 px-4 py-3 text-xs md:text-sm">
                    <p className="font-semibold text-emerald-300">
                      정답:{" "}
                      <span className="font-normal text-slate-100">
                        {quiz.answer}
                      </span>
                    </p>
                    {quiz.explanation && (
                      <p className="text-slate-300 leading-relaxed">
                        {quiz.explanation}
                      </p>
                    )}
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AuthLayout />}>
          <Route index element={<Navigate to="login" replace />} />
          <Route path="login" element={<Login />} />
          <Route path="signup" element={<Signup />} />
        </Route>
        <Route path="/dashboard" element={<MainLayout />}>
          <Route index element={<Dashboard />} />
        </Route>
        <Route path="/notes" element={<MainLayout />}>
          <Route index element={<NoteList />} />
          <Route path=":id" element={<NoteEditor />} />
        </Route>
        <Route path="/note/write" element={<MainLayout />}>
          <Route index element={<NoteEditor />} />
        </Route>
        <Route path="/main" element={<QuizMain />} />
      </Routes>
    </BrowserRouter>
  );
}

