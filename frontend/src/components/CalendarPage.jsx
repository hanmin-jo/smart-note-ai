import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Loader2,
  X,
} from "lucide-react";
import api from "../api";
import { useToast } from "../context/ToastContext";

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];
const MONTH_LABELS = [
  "1월",
  "2월",
  "3월",
  "4월",
  "5월",
  "6월",
  "7월",
  "8월",
  "9월",
  "10월",
  "11월",
  "12월",
];

function toDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function getMonthGrid(year, monthIndex) {
  const first = new Date(year, monthIndex, 1);
  const gridStart = addDays(first, -first.getDay());
  return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
}

function getYearWeeks(year) {
  const first = new Date(year, 0, 1);
  const last = new Date(year, 11, 31);
  const start = addDays(first, -first.getDay());
  const end = addDays(last, 6 - last.getDay());
  const weeks = [];
  let cursor = start;

  while (cursor <= end) {
    weeks.push(Array.from({ length: 7 }, (_, i) => addDays(cursor, i)));
    cursor = addDays(cursor, 7);
  }

  return weeks;
}

function getActivityColor(count) {
  if (!count) return "bg-slate-100";
  if (count <= 1) return "bg-blue-100";
  if (count <= 3) return "bg-blue-300";
  if (count <= 6) return "bg-blue-500";
  return "bg-blue-700";
}

export default function CalendarPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const today = useMemo(() => new Date(), []);
  const [viewDate, setViewDate] = useState(() => new Date());
  const [schedules, setSchedules] = useState([]);
  const [activities, setActivities] = useState([]);
  const [isLoadingSchedules, setIsLoadingSchedules] = useState(false);
  const [isLoadingHeatmap, setIsLoadingHeatmap] = useState(false);
  const [selectedDateKey, setSelectedDateKey] = useState(null);
  const [draggingScheduleId, setDraggingScheduleId] = useState(null);
  const [memos, setMemos] = useState([]);
  const [memoInput, setMemoInput] = useState("");
  const [isAddingMemo, setIsAddingMemo] = useState(false);

  const year = viewDate.getFullYear();
  const monthIndex = viewDate.getMonth();
  const month = monthIndex + 1;

  const fetchSchedules = useCallback(async () => {
    setIsLoadingSchedules(true);
    try {
      const { data } = await api.get(`/api/calendar/schedules?year=${year}&month=${month}`);
      setSchedules(Array.isArray(data) ? data : []);
    } catch (e) {
      toast(e?.message || "캘린더 일정을 불러오지 못했습니다.", "error");
    } finally {
      setIsLoadingSchedules(false);
    }
  }, [month, toast, year]);

  const fetchHeatmap = useCallback(async () => {
    setIsLoadingHeatmap(true);
    try {
      const { data } = await api.get(`/api/calendar/heatmap?year=${year}`);
      setActivities(Array.isArray(data) ? data : []);
    } catch (e) {
      toast(e?.message || "학습 히트맵을 불러오지 못했습니다.", "error");
    } finally {
      setIsLoadingHeatmap(false);
    }
  }, [toast, year]);

  const fetchMemos = useCallback(async () => {
    try {
      const { data } = await api.get(`/api/calendar/memos?year=${year}&month=${month}`);
      setMemos(Array.isArray(data) ? data : []);
    } catch (e) {
      toast(e?.message || "캘린더 메모를 불러오지 못했습니다.", "error");
    }
  }, [month, toast, year]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  useEffect(() => {
    fetchMemos();
  }, [fetchMemos]);

  useEffect(() => {
    fetchHeatmap();
  }, [fetchHeatmap]);

  const schedulesByDate = useMemo(() => {
    return schedules.reduce((acc, schedule) => {
      const key = schedule.scheduled_date;
      acc[key] = [...(acc[key] || []), schedule];
      return acc;
    }, {});
  }, [schedules]);

  const activityByDate = useMemo(() => {
    return activities.reduce((acc, activity) => {
      acc[activity.date] = activity.activity_count;
      return acc;
    }, {});
  }, [activities]);

  const memosByDate = useMemo(() => {
    return memos.reduce((acc, memo) => {
      const key = memo.date;
      acc[key] = [...(acc[key] || []), memo];
      return acc;
    }, {});
  }, [memos]);

  const monthDays = useMemo(() => getMonthGrid(year, monthIndex), [monthIndex, year]);
  const yearWeeks = useMemo(() => getYearWeeks(year), [year]);

  const selectedSchedules = selectedDateKey ? schedulesByDate[selectedDateKey] || [] : [];
  const selectedMemos = selectedDateKey ? memosByDate[selectedDateKey] || [] : [];

  const openDateModal = (dateKey) => {
    setSelectedDateKey(dateKey);
    setMemoInput("");
  };

  const closeDateModal = () => {
    setSelectedDateKey(null);
    setMemoInput("");
  };

  const addMemo = async () => {
    if (!selectedDateKey) return;
    const content = memoInput.trim();
    if (!content) {
      toast("메모 내용을 입력해 주세요.", "warning");
      return;
    }

    setIsAddingMemo(true);
    try {
      const { data } = await api.post("/api/calendar/memos", {
        date: selectedDateKey,
        content,
      });
      setMemos((prev) => [...prev, data]);
      setMemoInput("");
    } catch (e) {
      toast(e?.message || "메모를 추가하지 못했습니다.", "error");
    } finally {
      setIsAddingMemo(false);
    }
  };

  const deleteMemo = async (memoId) => {
    try {
      await api.delete(`/api/calendar/memos/${memoId}`);
      setMemos((prev) => prev.filter((memo) => memo.id !== memoId));
    } catch (e) {
      toast(e?.message || "메모를 삭제하지 못했습니다.", "error");
    }
  };

  const patchSchedule = async (scheduleId, payload) => {
    const { data } = await api.patch(`/api/calendar/schedules/${scheduleId}`, payload);
    setSchedules((prev) => prev.map((item) => (item.id === scheduleId ? data : item)));
    return data;
  };

  const toggleScheduleComplete = async (schedule) => {
    try {
      await patchSchedule(schedule.id, { is_completed: !schedule.is_completed });
    } catch (e) {
      toast(e?.message || "일정 상태를 변경하지 못했습니다.", "error");
    }
  };

  const moveSchedule = async (dateKey) => {
    if (!draggingScheduleId) return;
    try {
      await patchSchedule(draggingScheduleId, { scheduled_date: dateKey });
      toast("일정 날짜가 변경되었습니다.", "success");
    } catch (e) {
      toast(e?.message || "일정 날짜를 변경하지 못했습니다.", "error");
    } finally {
      setDraggingScheduleId(null);
    }
  };

  const goToPrevMonth = () => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setViewDate(new Date());
  };

  return (
    <div className="space-y-6 md:space-y-8">
      <header className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
            학습 캘린더
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            복습 일정과 학습 활동을 한눈에 확인하세요
          </p>
        </div>
        <button
          type="button"
          onClick={goToToday}
          className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
        >
          <CalendarDays className="h-4 w-4" />
          오늘로 이동
        </button>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">학습 히트맵</h2>
            <p className="mt-1 text-xs text-slate-500">
              {year}년 활동 기록 · 노트 생성 + 퀴즈 풀이
            </p>
          </div>
          {isLoadingHeatmap && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
        </div>

        <div className="overflow-x-auto pb-2">
          <div className="inline-block min-w-max">
            <div className="mb-1 flex gap-2">
              <div className="w-6 shrink-0" />
              <div className="grid grid-flow-col auto-cols-[0.75rem] gap-1">
                {yearWeeks.map((week, idx) => {
                  const firstInMonth = week.find(
                    (day) => day.getFullYear() === year && day.getDate() <= 7
                  );
                  const showLabel =
                    firstInMonth &&
                    (idx === 0 || yearWeeks[idx - 1][6].getMonth() !== firstInMonth.getMonth());
                  return (
                    <span key={idx} className="h-4 whitespace-nowrap text-xs leading-4 text-gray-400">
                      {showLabel ? MONTH_LABELS[firstInMonth.getMonth()] : ""}
                    </span>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-2">
              <div className="grid w-6 shrink-0 grid-rows-7 gap-1 text-xs text-gray-400">
                {DAY_LABELS.map((label, idx) => (
                  <span key={label} className="flex h-3 items-center justify-end leading-none">
                    {idx === 1 || idx === 3 || idx === 5 ? label : ""}
                  </span>
                ))}
              </div>
              <div className="grid grid-flow-col grid-rows-7 gap-1">
                {yearWeeks.flat().map((day) => {
                  const dateKey = toDateKey(day);
                  const inYear = day.getFullYear() === year;
                  const count = inYear ? activityByDate[dateKey] || 0 : 0;
                  return (
                    <div
                      key={dateKey}
                      title={`${dateKey}: ${count}개의 학습 활동`}
                      className={`h-3 w-3 rounded-[3px] ${inYear ? getActivityColor(count) : "bg-transparent"}`}
                    />
                  );
                })}
              </div>
            </div>

            <div className="mt-3 flex items-center justify-end gap-1 text-[11px] text-slate-400">
              <span>적음</span>
              {[0, 1, 3, 6, 8].map((count) => (
                <span key={count} className={`h-3 w-3 rounded-[3px] ${getActivityColor(count)}`} />
              ))}
              <span>많음</span>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-100 px-4 py-4 md:flex-row md:items-center md:px-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {year}년 {month}월
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              날짜를 클릭하면 일정과 메모를 확인할 수 있습니다
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goToPrevMonth}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition"
              aria-label="이전 달"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={goToNextMonth}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition"
              aria-label="다음 달"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            {isLoadingSchedules && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
          </div>
        </div>

        <div className="grid grid-cols-7 border-b border-gray-300 bg-slate-50/90">
          {DAY_LABELS.map((label) => (
            <div key={label} className="px-2 py-2.5 text-center text-sm font-bold text-slate-700">
              {label}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 border-l border-gray-300">
          {monthDays.map((day) => {
            const dateKey = toDateKey(day);
            const daySchedules = schedulesByDate[dateKey] || [];
            const dayMemos = memosByDate[dateKey] || [];
            const dayItems = [
              ...daySchedules.map((schedule) => ({ type: "schedule", data: schedule })),
              ...dayMemos.map((memo) => ({ type: "memo", data: memo })),
            ];
            const visibleItems = dayItems.slice(0, 3);
            const hiddenCount = Math.max(dayItems.length - visibleItems.length, 0);
            const inMonth = day.getMonth() === monthIndex;
            const isToday = dateKey === toDateKey(today);

            return (
              <button
                key={dateKey}
                type="button"
                onClick={() => openDateModal(dateKey)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  moveSchedule(dateKey);
                }}
                className={`relative min-h-[138px] border-b border-r border-gray-300 p-2.5 text-left transition hover:bg-blue-50/40 ${
                  inMonth ? "bg-white" : "bg-gray-50 text-slate-400"
                }`}
              >
                <div className="absolute left-2 top-2 flex items-center gap-1">
                  {dayItems.length > 0 && (
                    <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
                      {dayItems.length}
                    </span>
                  )}
                  <span
                    className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-extrabold ${
                      isToday ? "bg-blue-600 text-white shadow-md ring-2 ring-blue-100" : "text-slate-900"
                    }`}
                  >
                    {day.getDate()}
                  </span>
                </div>

                <div className="mt-11 space-y-1">
                  {visibleItems.map((item) => {
                    if (item.type === "schedule") {
                      const schedule = item.data;
                      return (
                        <div
                          key={`schedule-${schedule.id}`}
                          draggable
                          onDragStart={(e) => {
                            e.stopPropagation();
                            setDraggingScheduleId(schedule.id);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className={`cursor-grab truncate rounded-full px-2.5 py-1 text-xs font-semibold active:cursor-grabbing ${
                            schedule.is_completed
                              ? "bg-emerald-100 text-emerald-700 line-through"
                              : "bg-blue-100 text-blue-800"
                          }`}
                          title="드래그해서 다른 날짜로 이동"
                        >
                          {schedule.title}
                        </div>
                      );
                    }

                    const memo = item.data;
                    return (
                      <div
                        key={`memo-${memo.id}`}
                        className="truncate rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800"
                        title={memo.content}
                      >
                        {memo.content}
                      </div>
                    );
                  })}
                  {hiddenCount > 0 && (
                    <p className="px-1 text-[11px] font-semibold text-slate-500">+ {hiddenCount} 더보기</p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {selectedDateKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <button
            type="button"
            aria-label="모달 닫기"
            onClick={closeDateModal}
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
          />
          <div className="relative z-50 w-full max-w-lg rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-2xl md:px-6">
            <header className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{selectedDateKey}</h3>
                <p className="mt-1 text-xs text-slate-500">
                  복습 일정 {selectedSchedules.length}개 · 메모 {selectedMemos.length}개
                </p>
              </div>
              <button
                type="button"
                onClick={closeDateModal}
                className="rounded-full px-2 py-1 text-sm text-slate-500 hover:bg-slate-100"
              >
                닫기
              </button>
            </header>

            <div className="mt-4 space-y-2">
              {selectedSchedules.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                  예정된 복습 일정이 없습니다.
                </div>
              ) : (
                selectedSchedules.map((schedule) => (
                  <div
                    key={schedule.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2"
                  >
                    <label className="flex min-w-0 flex-1 items-center gap-2">
                      <input
                        type="checkbox"
                        checked={schedule.is_completed}
                        onChange={() => toggleScheduleComplete(schedule)}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span
                        className={`truncate text-sm ${
                          schedule.is_completed ? "text-slate-400 line-through" : "text-slate-800"
                        }`}
                      >
                        {schedule.title}
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={() => navigate(`/notes/${schedule.note_id}`)}
                      className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-blue-700 shadow-sm ring-1 ring-blue-100 hover:bg-blue-50 transition"
                    >
                      노트
                      <ExternalLink className="h-3 w-3" />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="mt-5 space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-700">메모 목록</label>
                <span className="text-[11px] text-slate-400">추가/삭제 즉시 저장됩니다</span>
              </div>

              {selectedMemos.length === 0 ? (
                <div className="rounded-xl border border-dashed border-amber-200 bg-amber-50/60 px-4 py-4 text-center text-sm text-amber-700">
                  아직 등록된 메모가 없습니다.
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedMemos.map((memo) => (
                    <div
                      key={memo.id}
                      className="flex items-center justify-between gap-2 rounded-xl bg-amber-100 px-3 py-2 text-sm text-amber-900"
                    >
                      <span className="min-w-0 flex-1 break-words">{memo.content}</span>
                      <button
                        type="button"
                        onClick={() => deleteMemo(memo.id)}
                        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-amber-700 hover:bg-amber-200 transition"
                        aria-label="메모 삭제"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <input
                  type="text"
                  value={memoInput}
                  onChange={(e) => setMemoInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addMemo();
                  }}
                  placeholder="메모 입력 예: 수학 복습"
                  className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition"
                />
                <button
                  type="button"
                  onClick={addMemo}
                  disabled={isAddingMemo}
                  className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 transition disabled:opacity-60"
                >
                  {isAddingMemo ? "추가 중..." : "추가"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
