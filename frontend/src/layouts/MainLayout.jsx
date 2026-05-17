import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Brain, LayoutDashboard, FileText, BarChart3, CalendarDays, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const toast = useToast();

  const isDashboard = location.pathname.startsWith("/dashboard");
  const isNotes = location.pathname.startsWith("/notes");
  const isQuiz = location.pathname.startsWith("/quiz");
  const isCalendar = location.pathname.startsWith("/calendar");

  const tabBase = "inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-slate-600 hover:bg-slate-100 transition text-sm";
  const tabActive = "inline-flex items-center gap-2 rounded-full bg-slate-900 text-white px-3.5 py-1.5 font-medium shadow-sm text-sm";

  const handleLogout = () => {
    logout();
    toast("로그아웃 되었습니다.", "info");
    navigate("/login");
  };

  const initials = user?.name ? user.name.charAt(0) : "?";

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between gap-6">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500 text-white shadow-sm">
                <Brain className="h-5 w-5" />
              </div>
              <span className="text-sm md:text-base font-semibold text-slate-900">AI 학습 보조</span>
            </div>

            <nav className="hidden md:flex items-center gap-2">
              <button type="button" onClick={() => navigate("/dashboard")} className={isDashboard ? tabActive : tabBase}>
                <LayoutDashboard className="h-4 w-4" /><span>대시보드</span>
              </button>
              <button type="button" onClick={() => navigate("/notes")} className={isNotes ? tabActive : tabBase}>
                <FileText className="h-4 w-4" /><span>노트</span>
              </button>
              <button type="button" onClick={() => navigate("/quiz")} className={isQuiz ? tabActive : tabBase}>
                <BarChart3 className="h-4 w-4" /><span>퀴즈</span>
              </button>
              <button type="button" onClick={() => navigate("/calendar")} className={isCalendar ? tabActive : tabBase}>
                <CalendarDays className="h-4 w-4" /><span>캘린더</span>
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            {user && (
              <div className="hidden md:flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center">
                  <span className="text-xs font-semibold text-indigo-700">{initials}</span>
                </div>
                <span className="text-sm font-medium text-slate-800">{user.name}</span>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 text-xs md:text-sm text-slate-600 hover:text-slate-900 transition"
            >
              <LogOut className="h-4 w-4" />
              <span>로그아웃</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 bg-slate-100">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
