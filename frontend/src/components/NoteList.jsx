import { Search, Filter, FileText, Plus, ChevronDown } from "lucide-react";

export default function NoteList() {
  return (
    <div className="space-y-6 md:space-y-8">
      {/* 상단: 제목/설명 + 새 노트 작성 버튼 */}
      <section className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
            노트 관리
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            학습 자료를 작성하고 AI 요약을 받아보세요
          </p>
        </div>

        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-slate-800 transition"
        >
          <Plus className="h-4 w-4" />
          <span>새 노트 작성</span>
        </button>
      </section>

      {/* 중간: 검색/필터 바 */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative w-full md:max-w-md">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="노트 검색..."
            className="w-full rounded-full border border-slate-200 bg-white pl-11 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition"
          />
        </div>

        <button
          type="button"
          className="inline-flex w-full md:w-auto items-center justify-between gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition"
        >
          <span className="inline-flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <span>모든 카테고리</span>
          </span>
          <ChevronDown className="h-4 w-4 text-slate-400" />
        </button>
      </section>

      {/* 하단: 빈 상태 */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col items-center justify-center px-6 py-16 md:py-20 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
            <FileText className="h-7 w-7 text-slate-300" />
          </div>
          <p className="mt-4 text-sm md:text-base text-slate-500">
            아직 노트가 없습니다
          </p>
          <button
            type="button"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-slate-800 transition"
          >
            <Plus className="h-4 w-4" />
            <span>첫 노트 만들기</span>
          </button>
        </div>
      </section>
    </div>
  );
}

