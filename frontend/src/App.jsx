import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AuthLayout from "./layouts/AuthLayout";
import MainLayout from "./layouts/MainLayout";
import Login from "./components/Login";
import Signup from "./components/Signup";
import Dashboard from "./components/Dashboard";
import NoteList from "./components/NoteList";
import NoteEditor from "./components/NoteEditor";
import QuizPage from "./components/QuizPage";
import CalendarPage from "./components/CalendarPage";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            {/* 인증 레이아웃 */}
            <Route path="/" element={<AuthLayout />}>
              <Route index element={<Navigate to="login" replace />} />
              <Route path="login" element={<Login />} />
              <Route path="signup" element={<Signup />} />
            </Route>

            {/* 메인 레이아웃 (인증 필요) */}
            <Route
              path="/dashboard"
              element={<ProtectedRoute><MainLayout /></ProtectedRoute>}
            >
              <Route index element={<Dashboard />} />
            </Route>

            <Route
              path="/notes"
              element={<ProtectedRoute><MainLayout /></ProtectedRoute>}
            >
              <Route index element={<NoteList />} />
              <Route path=":id" element={<NoteEditor />} />
            </Route>

            <Route
              path="/note/write"
              element={<ProtectedRoute><MainLayout /></ProtectedRoute>}
            >
              <Route index element={<NoteEditor />} />
            </Route>

            <Route
              path="/quiz"
              element={<ProtectedRoute><MainLayout /></ProtectedRoute>}
            >
              <Route index element={<QuizPage />} />
            </Route>

            <Route
              path="/calendar"
              element={<ProtectedRoute><MainLayout /></ProtectedRoute>}
            >
              <Route index element={<CalendarPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
