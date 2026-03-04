import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Brain, LayoutDashboard, FileText, CalendarDays, BarChart3, Users, LogOut } from "lucide-react";

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const isDashboard = location.pathname.startsWith("/dashboard");
  const isNotes = location.pathname.startsWith("/notes");

  const tabBase =
    "inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-slate-600 hover:bg-slate-100 transition";
  const tabActive =
    "inline-flex items-center gap-2 rounded-full bg-slate-900 text-white px-3.5 py-1.5 font-medium shadow-sm";

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* 상단 네비게이션 바 */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between gap-6">
          {/* 좌측: 로고 + 메뉴 */}
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500 text-white shadow-sm">
                <Brain className="h-5 w-5" />
              </div>
              <span className="text-sm md:text-base font-semibold text-slate-900">
                AI 학습 보조
              </span>
            </div>

            <nav className="hidden md:flex items-center gap-2 text-sm">
              <button
                type="button"
                onClick={() => navigate("/dashboard")}
                className={isDashboard ? tabActive : tabBase}
              >
                <LayoutDashboard className="h-4 w-4" />
                <span>대시보드</span>
              </button>
              <button
                type="button"
                onClick={() => navigate("/notes")}
                className={isNotes ? tabActive : tabBase}
              >
                <FileText className="h-4 w-4" />
                <span>노트</span>
              </button>
              <button type="button" className={tabBase}>
                <BarChart3 className="h-4 w-4" />
                <span>퀴즈</span>
              </button>
              <button type="button" className={tabBase}>
                <CalendarDays className="h-4 w-4" />
                <span>캘린더</span>
              </button>
              <button type="button" className={tabBase}>
                <Users className="h-4 w-4" />
                <span>친구</span>
              </button>
            </nav>
          </div>

          {/* 우측: 프로필 + 로그아웃 */}
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center">
                <span className="text-xs font-semibold text-slate-600">홍</span>
              </div>
              <span className="text-sm font-medium text-slate-800">홍길동</span>
            </div>
            <button className="inline-flex items-center gap-1.5 text-xs md:text-sm text-slate-600 hover:text-slate-900">
              <LogOut className="h-4 w-4" />
              <span>로그아웃</span>
            </button>
          </div>
        </div>
      </header>

      {/* 콘텐츠 영역 */}
      <main className="flex-1 bg-slate-100">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

