import { NotebookText, CheckCircle2, Star, CalendarDays, PlusCircle, Sparkles, BookOpen, Brain, BarChart3 } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6 md:space-y-8">
      {/* 상단 배너 */}
      <section className="rounded-2xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-blue-500 text-white px-6 py-6 md:px-8 md:py-7 shadow-sm">
        <h1 className="text-xl md:text-2xl font-semibold">
          환영합니다, 홍길동님!
        </h1>
        <p className="mt-1 text-xs md:text-sm text-indigo-100">
          오늘도 효율적인 학습을 시작해보세요
        </p>
      </section>

      {/* 통계 카드 영역 */}
      <section className="grid gap-4 md:gap-5 grid-cols-2 md:grid-cols-4">
        <button
          type="button"
          onClick={() => navigate("/notes")}
          className="rounded-xl bg-white px-4 py-3.5 shadow-sm border border-slate-100 flex flex-col justify-between text-left hover:bg-slate-50 transition"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs text-slate-500">총 노트</p>
              <p className="mt-2 text-xl font-semibold text-slate-900">0</p>
            </div>
            <NotebookText className="h-4 w-4 text-indigo-400" />
          </div>
          <p className="mt-3 text-[11px] text-slate-400">저장된 학습 자료</p>
        </button>

        <div className="rounded-xl bg-white px-4 py-3.5 shadow-sm border border-slate-100 flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs text-slate-500">완료한 퀴즈</p>
              <p className="mt-2 text-xl font-semibold text-slate-900">0</p>
            </div>
            <CheckCircle2 className="h-4 w-4 text-purple-400" />
          </div>
          <p className="mt-3 text-[11px] text-slate-400">풀이 완료</p>
        </div>

        <div className="rounded-xl bg-white px-4 py-3.5 shadow-sm border border-slate-100 flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs text-slate-500">평균 점수</p>
              <p className="mt-2 text-xl font-semibold text-slate-900">
                0.0%
              </p>
            </div>
            <Star className="h-4 w-4 text-amber-400" />
          </div>
          <p className="mt-3 text-[11px] text-slate-400">전체 평균</p>
        </div>

        <div className="rounded-xl bg-white px-4 py-3.5 shadow-sm border border-slate-100 flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs text-slate-500">오늘의 활동</p>
              <p className="mt-2 text-xl font-semibold text-slate-900">0</p>
            </div>
            <CalendarDays className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="mt-3 text-[11px] text-slate-400">기록된 활동</p>
        </div>
      </section>

      {/* 빠른 실행 영역 */}
      <section className="grid gap-4 md:gap-5 md:grid-cols-3">
        <button
          type="button"
          onClick={() => navigate("/notes")}
          className="rounded-xl bg-white px-4 py-4 text-left shadow-sm border border-slate-100 hover:bg-slate-50 transition"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
              <PlusCircle className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">새 노트 작성</p>
              <p className="mt-1 text-xs text-slate-500">
                학습 자료를 추가하고 AI 요약을 받아보세요
              </p>
            </div>
          </div>
        </button>

        <button className="rounded-xl bg-white px-4 py-4 text-left shadow-sm border border-slate-100 hover:bg-slate-50 transition">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">퀴즈 생성</p>
              <p className="mt-1 text-xs text-slate-500">
                노트 기반 맞춤형 퀴즈를 생성하세요
              </p>
            </div>
          </div>
        </button>

        <button className="rounded-xl bg-white px-4 py-4 text-left shadow-sm border border-slate-100 hover:bg-slate-50 transition">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
              <BarChart3 className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">학습 분석</p>
              <p className="mt-1 text-xs text-slate-500">
                강점과 약점을 파악하고 개선하세요
              </p>
            </div>
          </div>
        </button>
      </section>

      {/* 최근 기록 영역 */}
      <section className="grid gap-4 md:gap-5 md:grid-cols-2">
        <button
          type="button"
          onClick={() => navigate("/notes")}
          className="rounded-2xl bg-white px-5 py-5 md:px-6 md:py-6 shadow-sm border border-slate-100 flex flex-col text-left hover:bg-slate-50 transition"
        >
          <h3 className="text-sm md:text-base font-semibold text-slate-900">
            최근 노트
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            최근에 작성한 학습 자료
          </p>
          <div className="flex-1 flex flex-col items-center justify-center py-6">
            <BookOpen className="h-8 w-8 text-slate-200" />
            <p className="mt-3 text-sm text-slate-400">아직 노트가 없습니다</p>
            <p className="mt-1 text-xs text-indigo-500 font-medium">
              첫 노트 만들기
            </p>
          </div>
        </button>

        <div className="rounded-2xl bg-white px-5 py-5 md:px-6 md:py-6 shadow-sm border border-slate-100 flex flex-col">
          <h3 className="text-sm md:text-base font-semibold text-slate-900">
            최근 퀴즈 결과
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            최근 완료한 퀴즈 기록
          </p>
          <div className="flex-1 flex flex-col items-center justify-center py-6">
            <Brain className="h-8 w-8 text-slate-200" />
            <p className="mt-3 text-sm text-slate-400">
              아직 완료한 퀴즈가 없습니다
            </p>
            <p className="mt-1 text-xs text-indigo-500 font-medium">
              첫 퀴즈 풀기
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

