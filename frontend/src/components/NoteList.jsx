import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Filter, FileText, Plus, ChevronDown, X, Trash2 } from "lucide-react";
import { useToast } from "../context/ToastContext";
import api from "../api";

export default function NoteList() {
  const navigate = useNavigate();
  const toast = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [inputType, setInputType] = useState("manual");
  const [pdfFile, setPdfFile] = useState(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("일반");
  const modalPdfInputRef = useRef(null);

  const [notes, setNotes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  const [deletingId, setDeletingId] = useState(null);

  const fetchNotes = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set("search", searchQuery);
      if (selectedCategory) params.set("category", selectedCategory);
      const qs = params.toString() ? `?${params.toString()}` : "";

      const { data } = await api.get(`/api/notes${qs}`);
      setNotes(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(
        typeof e?.message === "string"
          ? e.message
          : "노트 목록을 불러오는데 실패했습니다."
      );
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedCategory]);

  const fetchCategories = useCallback(async () => {
    try {
      const { data } = await api.get("/api/notes/categories");
      if (Array.isArray(data)) setCategories(data);
    } catch {
      // 카테고리 로드는 조용히 실패
    }
  }, []);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);
  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  // 검색 디바운스
  useEffect(() => {
    const timer = setTimeout(() => setSearchQuery(searchInput || ""), 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const resetModalForm = () => {
    setTitle("");
    setCategory("일반");
    setInputType("manual");
    setPdfFile(null);
    if (modalPdfInputRef.current) modalPdfInputRef.current.value = "";
  };

  const closeModal = () => {
    setIsModalOpen(false);
    resetModalForm();
  };

  const handleCreateNote = () => {
    if (inputType === "manual") {
      setIsModalOpen(false);
      navigate("/note/write", {
        state: { note: { title: title.trim() || "새 노트", content: "", category } },
      });
      resetModalForm();
      return;
    }

    if (!pdfFile) {
      toast("PDF 파일을 선택해 주세요.", "warning");
      return;
    }

    setIsModalOpen(false);
    navigate("/note/write", {
      state: { pdfFile, category, title: title.trim() },
    });
    resetModalForm();
  };

  const handleDelete = async (e, noteId) => {
    e.stopPropagation();
    if (!window.confirm("정말 삭제하시겠습니까?")) return;

    setDeletingId(noteId);
    try {
      await api.delete(`/api/notes/${noteId}`);
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
      toast("노트가 삭제되었습니다.", "success");
      fetchCategories();
    } catch {
      toast("삭제에 실패했습니다.", "error");
    } finally {
      setDeletingId(null);
    }
  };

  const PRESET_CATEGORIES = ["일반", "수학", "과학", "언어", "역사", "기술"];

  return (
    <>
      <div className="space-y-6 md:space-y-8">
        {/* 헤더 */}
        <section className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">노트 관리</h1>
            <p className="mt-1 text-sm text-slate-500">학습 자료를 작성하고 AI 요약을 받아보세요</p>
          </div>
          <button type="button" onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-slate-800 transition"
          >
            <Plus className="h-4 w-4" /><span>새 노트 작성</span>
          </button>
        </section>

        {/* 검색 / 필터 */}
        <section className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative w-full md:max-w-md">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchInput || ""}
              onChange={(e) => setSearchInput(e.target.value ?? "")}
              placeholder="제목 또는 내용 검색..."
              className="w-full rounded-full border border-slate-200 bg-white pl-11 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition"
            />
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowCategoryDropdown((p) => !p)}
              className="inline-flex w-full md:w-auto items-center justify-between gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition"
            >
              <span className="inline-flex items-center gap-2">
                <Filter className="h-4 w-4 text-slate-400" />
                <span>{selectedCategory || "모든 카테고리"}</span>
              </span>
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </button>

            {showCategoryDropdown && (
              <div className="absolute right-0 mt-2 w-44 rounded-xl border border-slate-200 bg-white shadow-lg z-10 py-1">
                <button type="button" onClick={() => { setSelectedCategory(""); setShowCategoryDropdown(false); }}
                  className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  모든 카테고리
                </button>
                {categories.map((cat) => (
                  <button key={cat} type="button"
                    onClick={() => { setSelectedCategory(cat); setShowCategoryDropdown(false); }}
                    className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* 노트 목록 */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          {loading && (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <p className="text-sm text-slate-500">노트를 불러오는 중입니다...</p>
            </div>
          )}

          {!loading && error && (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <p className="text-sm text-red-500">{error}</p>
            </div>
          )}

          {!loading && !error && notes.length === 0 && (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                <FileText className="h-7 w-7 text-slate-300" />
              </div>
              <p className="mt-4 text-sm md:text-base text-slate-500">
                {searchQuery || selectedCategory ? "검색 결과가 없습니다" : "아직 노트가 없습니다"}
              </p>
              {!searchQuery && !selectedCategory && (
                <button type="button" onClick={() => setIsModalOpen(true)}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-slate-800 transition"
                >
                  <Plus className="h-4 w-4" /><span>첫 노트 만들기</span>
                </button>
              )}
            </div>
          )}

          {!loading && !error && notes.length > 0 && (
            <div className="px-5 py-5 md:px-6 md:py-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
                {notes.map((note) => (
                  <article
                    key={note.id}
                    onClick={() => navigate(`/notes/${note.id}`, { state: { note } })}
                    className="group cursor-pointer rounded-lg border border-gray-100 bg-white p-6 shadow-md hover:-translate-y-1 hover:shadow-lg transition transform"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-base font-bold text-slate-900 line-clamp-2 flex-1">{note.title}</h3>
                      <button
                        type="button"
                        onClick={(e) => handleDelete(e, note.id)}
                        disabled={deletingId === note.id}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition disabled:opacity-40"
                        aria-label="노트 삭제"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {note.category && (
                      <span className="mt-2 inline-block rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-600">
                        {note.category}
                      </span>
                    )}

                    <p className="mt-3 text-xs text-slate-500 line-clamp-2">{note.content}</p>

                    <p className="mt-4 text-[11px] text-slate-400">
                      {new Date(note.created_at).toLocaleDateString("ko-KR")}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* 새 노트 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <button type="button" aria-label="모달 닫기" onClick={closeModal}
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
          />
          <div className="relative z-50 w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 px-6 py-6 md:px-8 md:py-7">
            <header className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg md:text-xl font-semibold text-slate-900">새 노트 작성</h2>
                <p className="mt-1 text-xs md:text-sm text-slate-500">
                  {inputType === "manual"
                    ? "제목과 카테고리를 설정하세요"
                    : "제목, PDF 파일, 카테고리를 설정하세요"}
                </p>
              </div>
              <button type="button" onClick={closeModal}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div
              className="mt-5 flex rounded-xl border border-slate-200 bg-slate-50/80 p-1"
              role="tablist"
              aria-label="노트 작성 방식"
            >
              <button
                type="button"
                role="tab"
                aria-selected={inputType === "manual"}
                onClick={() => {
                  setInputType("manual");
                  setPdfFile(null);
                  if (modalPdfInputRef.current) modalPdfInputRef.current.value = "";
                }}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  inputType === "manual"
                    ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                ✏️ 직접 작성
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={inputType === "pdf"}
                onClick={() => setInputType("pdf")}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  inputType === "pdf"
                    ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                📄 PDF 업로드
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div className="space-y-1">
                <label className="block text-xs md:text-sm font-medium text-slate-700">제목</label>
                <input
                  type="text"
                  value={title || ""}
                  onChange={(e) => setTitle(e.target.value ?? "")}
                  placeholder="노트 제목을 입력하세요"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition"
                />
              </div>

              {inputType === "pdf" && (
                <div className="space-y-1">
                  <label className="block text-xs md:text-sm font-medium text-slate-700">PDF 파일</label>
                  <input
                    ref={modalPdfInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    className="hidden"
                    onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
                  />
                  <button
                    type="button"
                    onClick={() => modalPdfInputRef.current?.click()}
                    className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center transition hover:border-slate-300 hover:bg-slate-100/80"
                  >
                    <FileText className="h-8 w-8 text-slate-400" />
                    <span className="text-sm font-medium text-slate-700">
                      {pdfFile ? pdfFile.name : "클릭하여 PDF 선택"}
                    </span>
                    <span className="text-xs text-slate-500">선택한 파일 이름이 위에 표시됩니다</span>
                  </button>
                </div>
              )}

              <div className="space-y-1">
                <label className="block text-xs md:text-sm font-medium text-slate-700">카테고리</label>
                <input
                  list="note-categories"
                  value={category || ""}
                  onChange={(e) => setCategory(e.target.value ?? "")}
                  placeholder="카테고리를 선택하거나 입력하세요"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition"
                />
                <datalist id="note-categories">
                  {PRESET_CATEGORIES.map((c) => <option key={c} value={c} />)}
                  {categories.filter((c) => !PRESET_CATEGORIES.includes(c)).map((c) => <option key={c} value={c} />)}
                </datalist>
              </div>
            </div>

            <div className="mt-6">
              <button type="button" onClick={handleCreateNote}
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
