import { useState } from "react";
import { Search, Filter, FileText, Plus, ChevronDown, X } from "lucide-react";

export default function NoteList() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  return (
    <>
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
            onClick={openModal}
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
              onClick={openModal}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-slate-800 transition"
            >
              <Plus className="h-4 w-4" />
              <span>첫 노트 만들기</span>
            </button>
          </div>
        </section>
      </div>

      {/* 새 노트 작성 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          {/* 어두운 배경 */}
          <button
            type="button"
            aria-label="모달 닫기"
            onClick={closeModal}
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
          />

          {/* 모달 카드 */}
          <div className="relative z-50 w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 px-6 py-6 md:px-8 md:py-7">
            {/* 헤더 */}
            <header className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg md:text-xl font-semibold text-slate-900">
                  새 노트 작성
                </h2>
                <p className="mt-1 text-xs md:text-sm text-slate-500">
                  텍스트를 입력하거나 카테고리를 선택하여 학습 자료를 추가하세요
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="mt-5 space-y-4">
              {/* 제목 입력 */}
              <div className="space-y-1">
                <label className="block text-xs md:text-sm font-medium text-slate-700">
                  제목
                </label>
                <input
                  type="text"
                  placeholder="노트 제목을 입력하세요"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition"
                />
              </div>

              {/* 카테고리: 기존 선택 + 새 카테고리 입력 가능 */}
              <div className="space-y-1">
                <label className="block text-xs md:text-sm font-medium text-slate-700">
                  카테고리
                </label>
                <input
                  list="note-categories"
                  placeholder="카테고리를 선택하거나 새로 입력하세요"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition"
                />
                <datalist id="note-categories">
                  <option value="일반" />
                  <option value="수학" />
                  <option value="과학" />
                  <option value="언어" />
                </datalist>
                <p className="text-[11px] text-slate-400">
                  목록에서 선택하거나 직접 입력해 새로운 카테고리를 추가할 수 있어요.
                </p>
              </div>
            </div>

            {/* 하단 버튼 */}
            <div className="mt-6">
              <button
                type="button"
                className="w-full inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 transition"
              >
                노트 생성
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

