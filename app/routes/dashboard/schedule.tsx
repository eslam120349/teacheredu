import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useDarkMode } from "../../hooks/useDarkMode";
import { FaUser, FaGraduationCap, FaPlus, FaTimes } from "react-icons/fa";

const DAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const HOURS = Array.from({ length: 14 }, (_, i) => i + 9); // 9 AM to 10 PM

type StudentType = { id: string; name: string; grade: string; avatar: string };
type ScheduleType = {
  id: string;
  student_id: string;
  student_name: string;
  student_grade: string;
  day_of_week: number;
  subject: string;
  start_time: string;
  end_time: string;
  color: string;
  status?: string;
};

type UnavailabilityType = {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_full_day: boolean;
  reason: string;
};

function SkeletonBlock({ className = "", isDark }: { className?: string; isDark: boolean }) {
  return (
    <div className={`relative overflow-hidden ${className}`}
      style={{ background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)", borderRadius: "2px" }}>
      <div className="absolute inset-0 -translate-x-full"
        style={{ background: isDark ? "linear-gradient(90deg, transparent, rgba(201,168,76,0.08), transparent)" : "linear-gradient(90deg, transparent, rgba(139,26,46,0.1), transparent)", animation: "shimmer 1.5s infinite" }} />
    </div>
  );
}

export default function TeacherSchedulePage() {
  const { isDark } = useDarkMode();
  const [students, setStudents] = useState<StudentType[]>([]);
  const [schedules, setSchedules] = useState<ScheduleType[]>([]);
  const [unavailability, setUnavailability] = useState<UnavailabilityType[]>([]);
  const [loading, setLoading] = useState(true);
  const [teacherName, setTeacherName] = useState("");
  const [pendingActions, setPendingActions] = useState<Set<string>>(new Set());

  // ─── Load Data ──────────────────────────────────────────────────────────────
  useEffect(() => { loadData(); }, []);

  async function loadData() {
    if (!supabase) { setLoading(false); return; }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      if (profile) setTeacherName(profile.full_name || "");

      // 🔥 جلب الطلاب المسجلين مع المعلم
      const { data: studentTeachersData } = await supabase
        .from("student_teachers")
        .select("*, students(full_name, grade, avatar_url)")
        .eq("teacher_id", user.id);

      if (studentTeachersData && studentTeachersData.length > 0) {
        setStudents(studentTeachersData.map(st => ({
          id: st.student_id,
          name: st.students?.full_name || "طالب",
          grade: st.students?.grade || "",
          avatar: st.students?.avatar_url || ""
        })));
      }

      const studentIds = (studentTeachersData || []).map(st => st.student_id);

      // 🔥 جلب الحصص - باستخدام student_id فقط وليس teacher_id
      // لأن teacher_id في جدول schedules هو user_id من profiles
      if (studentIds.length > 0) {
        const { data: schedulesData } = await supabase
          .from("schedules")
          .select("*, students!schedules_student_id_fkey(full_name, grade)")
          .in("student_id", studentIds)
          .eq("teacher_id", user.id)
          .eq("status", "scheduled")
          .order("day_of_week")
          .order("start_time");


        if (schedulesData) {
          const mapped: ScheduleType[] = schedulesData.map((s: any) => ({
            id: s.id,
            student_id: s.student_id,
            student_name: s.students?.full_name || "طالب",
            student_grade: s.students?.grade || "",
            day_of_week: s.day_of_week,
            subject: s.subject || "مادة",
            start_time: s.start_time?.slice(0, 5) || "",
            end_time: s.end_time?.slice(0, 5) || "",
            color: s.color || "#8b1a2e",
          }));
          setSchedules(mapped);
        }
      }

      // 🔥 جلب أوقات عدم التوفر
      const { data: unavailabilityData } = await supabase
        .from("teacher_unavailability")
        .select("*")
        .eq("teacher_id", user.id);

      setUnavailability(unavailabilityData || []);

    } catch (err) {
      console.error("Error loading schedule:", err);
    } finally {
      setLoading(false);
    }
  }

  // ─── Toggle Unavailability ──────────────────────────────────────────────────
  const toggleUnavailability = async (day: number, hour: number) => {
    if (!supabase) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const key = `${day}-${hour}`;
    if (pendingActions.has(key)) return;
    setPendingActions(prev => new Set(prev).add(key));

    const existing = unavailability.find(u => {
      if (u.is_full_day && u.day_of_week === day) return true;
      if (u.day_of_week === day && u.start_time) {
        const startHour = parseInt(u.start_time.split(':')[0]);
        return hour >= startHour && hour < startHour + 1;
      }
      return false;
    });

    // التحديث الفوري للواجهة
    if (existing) {
      setUnavailability(prev => prev.filter(u => u.id !== existing.id));
    } else {
      const newUnavailable: UnavailabilityType = {
        id: `temp-${Date.now()}`,
        day_of_week: day,
        start_time: `${String(hour).padStart(2, "0")}:00:00`,
        end_time: `${String(hour + 1).padStart(2, "0")}:00:00`,
        is_full_day: false,
        reason: "مشغول",
      };
      setUnavailability(prev => [...prev, newUnavailable]);
    }

    try {
      if (existing) {
        const { error } = await supabase
          .from("teacher_unavailability")
          .delete()
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const data: any = {
          teacher_id: user.id,
          day_of_week: day,
          is_full_day: false,
          reason: "مشغول",
          start_time: `${String(hour).padStart(2, "0")}:00:00`,
          end_time: `${String(hour + 1).padStart(2, "0")}:00:00`,
        };
        const { error } = await supabase
          .from("teacher_unavailability")
          .insert(data);
        if (error) throw error;
      }

      // إعادة تحميل البيانات
      const { data: freshData } = await supabase
        .from("teacher_unavailability")
        .select("*")
        .eq("teacher_id", user.id);
      if (freshData) setUnavailability(freshData);

    } catch (error) {
      console.error("Error toggling unavailability:", error);
      await loadData();
      alert("حدث خطأ، تم إعادة تحميل البيانات");
    } finally {
      setPendingActions(prev => {
        const newSet = new Set(prev);
        newSet.delete(key);
        return newSet;
      });
    }
  };

  // 🔥 دالة محسنة للحصول على الحصة في يوم وساعة معينة
  const getScheduleAt = (dayIndex: number, hour: number) => {
    // تحويل الساعة إلى صيغة HH:MM للمقارنة
    const hourStr = String(hour).padStart(2, "0");

    return schedules.find(s => {
      if (s.day_of_week !== dayIndex) return false;
      if (!s.start_time) return false;

      // استخراج الساعة من start_time (مثل "09:00" → 9)
      const scheduleHour = parseInt(s.start_time.split(':')[0]);
      return scheduleHour === hour;
    });
  };

  // 🔥 دالة محسنة للحصول على وقت غير متاح
  const getUnavailabilityAt = (dayIndex: number, hour: number) => {
    return unavailability.find(u => {
      if (u.is_full_day && u.day_of_week === dayIndex) return true;
      if (u.day_of_week === dayIndex && u.start_time) {
        const startHour = parseInt(u.start_time.split(':')[0]);
        return hour >= startHour && hour < startHour + 1;
      }
      return false;
    });
  };

  const isFullDayUnavailable = (dayIndex: number) => {
    return unavailability.some(u => u.is_full_day && u.day_of_week === dayIndex);
  };

  const today = new Date();
  const currentDay = today.getDay();
  const currentHour = today.getHours();

  // ترتيب الأيام بحيث يبدأ من اليوم الحالي
  const orderedDays = Array.from({ length: 7 }, (_, i) => {
    const dayIndex = (currentDay + i) % 7;
    return {
      name: DAYS[dayIndex],
      index: dayIndex,
      isToday: i === 0,
    };
  });

  if (loading) {
    return (
      <div className="min-h-screen transition-colors duration-300"
        style={{ background: isDark ? "#0f1c2e" : "#f5f4f2", color: isDark ? "#fff" : "#1a1a1a" }}
        dir="rtl">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <SkeletonBlock className="w-full h-96" isDark={isDark} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen transition-colors duration-300"
      style={{ background: isDark ? "#0f1c2e" : "#f5f4f2", color: isDark ? "#fff" : "#1a1a1a", fontFamily: "Georgia, serif" }}
      dir="rtl">

      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div style={{ position: "absolute", top: 0, right: "33%", width: 400, height: 250, background: isDark ? "rgba(139,26,46,0.12)" : "rgba(139,26,46,0.04)", filter: "blur(100px)", borderRadius: "50%" }} />
        <div style={{ position: "absolute", bottom: 0, left: "20%", width: 300, height: 200, background: isDark ? "rgba(201,168,76,0.05)" : "rgba(201,168,76,0.03)", filter: "blur(100px)", borderRadius: "50%" }} />
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* HEADER */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 text-sm mb-3"
            style={{ background: isDark ? "rgba(139,26,46,0.2)" : "rgba(139,26,46,0.08)", border: `1px solid ${isDark ? "rgba(139,26,46,0.5)" : "rgba(139,26,46,0.3)"}`, color: isDark ? "#f0b8be" : "#8b1a2e", letterSpacing: ".05em", borderRadius: "2px", fontFamily: "sans-serif" }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#c9a84c" }} />
            {teacherName ? `مرحباً، ${teacherName}` : "جدول الحصص"}
          </div>
          <h1 className="text-3xl font-extrabold" style={{ color: isDark ? "#fff" : "#1a1a1a" }}>
            جدول الحصص الأسبوعي
          </h1>
          <p className="text-sm mt-1" style={{ color: isDark ? "rgba(255,255,255,0.5)" : "#666", fontFamily: "sans-serif" }}>
            {students.length} طالب مسجل · {schedules.length} حصة أسبوعياً
            {unavailability.length > 0 && ` · ${unavailability.length} وقت غير متاح`}
          </p>
        </div>

        {/* STATS CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "الطلاب", value: students.length, color: "#8b1a2e" },
            { label: "الحصص", value: schedules.length, color: "#c9a84c" },
            { label: "غير متاح", value: unavailability.length, color: "#ef4444" },
            { label: "أيام", value: "7", color: "#3b82f6" },
          ].map((stat, i) => (
            <div key={i}
              className="p-4 rounded-2xl transition-all duration-300"
              style={{
                background: isDark ? "rgba(255,255,255,0.03)" : "#ffffff",
                border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "#e8e4de"}`,
                borderTop: `3px solid ${stat.color}`,
              }}
            >
              <div className="text-2xl font-extrabold" style={{ color: stat.color }}>
                {stat.value}
              </div>
              <div className="text-xs mt-1" style={{ color: isDark ? "rgba(255,255,255,0.4)" : "#888" }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* ─── WEEKLY GRID ────────────────────────────────────────────────── */}
        <div className="overflow-x-auto">
          <div className="min-w-[1000px]">
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background: isDark ? "rgba(255,255,255,0.02)" : "#ffffff",
                border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "#e8e4de"}`,
              }}
            >
              {/* Header - الساعات في الأعلى */}
              <div className="grid" style={{
                gridTemplateColumns: "repeat(14, 1fr) 100px",
                borderBottom: `2px solid ${isDark ? "rgba(255,255,255,0.1)" : "#e8e4de"}`,
                background: isDark ? "rgba(255,255,255,0.03)" : "#faf9f7",
              }}>
                <div className="p-2 flex items-center justify-center" style={{
                  borderLeft: `1px solid ${isDark ? "rgba(255,255,255,0.05)" : "#e8e4de"}`,
                  background: isDark ? "rgba(255,255,255,0.02)" : "#faf9f7",
                }}>
                  <span className="text-xs font-bold" style={{ color: isDark ? "rgba(255,255,255,0.3)" : "#aaa" }}>
                    اليوم
                  </span>
                </div>
                {HOURS.map((hour) => {
                  const timeLabel = hour >= 12
                    ? `${hour === 12 ? 12 : hour - 12} م`
                    : `${hour} ص`;
                  const isCurrentHour = currentHour === hour;
                  return (
                    <div
                      key={hour}
                      className="p-2 text-center"
                      style={{
                        borderLeft: `1px solid ${isDark ? "rgba(255,255,255,0.05)" : "#e8e4de"}`,
                        background: isCurrentHour
                          ? (isDark ? "rgba(201,168,76,0.1)" : "rgba(201,168,76,0.05)")
                          : "transparent",
                      }}
                    >
                      <div className="text-xs font-mono" style={{
                        color: isCurrentHour ? "#c9a84c" : (isDark ? "rgba(255,255,255,0.5)" : "#666"),
                        fontWeight: isCurrentHour ? "bold" : "normal"
                      }}>
                        {timeLabel}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* الصفوف - كل صف يمثل يوم */}
              {orderedDays.map((day) => {
                const isToday = day.isToday;
                const isFullDay = isFullDayUnavailable(day.index);
                const daySchedules = schedules.filter(s => s.day_of_week === day.index);

                return (
                  <div
                    key={day.index}
                    className="grid"
                    style={{
                      gridTemplateColumns: "repeat(14, 1fr) 100px",
                      borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.05)" : "#e8e4de"}`,
                      background: isToday
                        ? (isDark ? "rgba(139,26,46,0.05)" : "rgba(139,26,46,0.02)")
                        : "transparent",
                    }}
                  >
                    {/* عمود اليوم على اليمين */}
                    <div
                      className="p-2 flex flex-col items-center justify-center"
                      style={{
                        background: isToday
                          ? (isDark ? "rgba(201,168,76,0.08)" : "rgba(201,168,76,0.05)")
                          : (isDark ? "rgba(255,255,255,0.02)" : "#faf9f7"),
                        borderRight: `1px solid ${isDark ? "rgba(255,255,255,0.05)" : "#e8e4de"}`,
                        borderLeft: `1px solid ${isDark ? "rgba(255,255,255,0.05)" : "#e8e4de"}`,
                      }}
                    >
                      <div className="text-sm font-bold" style={{
                        color: isToday ? "#c9a84c" : (isDark ? "#fff" : "#1a1a1a")
                      }}>
                        {day.name}
                      </div>
                      {isToday && (
                        <div className="text-[10px] font-medium" style={{ color: "#c9a84c" }}>
                          ★ اليوم
                        </div>
                      )}
                      {daySchedules.length > 0 && (
                        <div className="text-[9px] mt-1" style={{ color: isDark ? "rgba(255,255,255,0.3)" : "#aaa" }}>
                          {daySchedules.length} حصة
                        </div>
                      )}
                      {isFullDay && (
                        <div className="text-[9px] mt-1" style={{ color: "#ef4444" }}>
                          ⛔ اليوم كامل
                        </div>
                      )}
                    </div>
                    {HOURS.map((hour) => {
                      const schedule = getScheduleAt(day.index, hour);
                      const unavailable = getUnavailabilityAt(day.index, hour);
                      const hasSchedule = !!schedule;
                      const isCurrentHour = currentHour === hour && isToday;
                      const key = `${day.index}-${hour}`;
                      const isPending = pendingActions.has(key);

                      return (
                        <div
                          key={hour}
                          className={`p-1 min-h-[60px] cursor-pointer transition-all duration-150 ${isPending ? 'opacity-50' : ''}`}
                          style={{
                            borderLeft: `1px solid ${isDark ? "rgba(255,255,255,0.05)" : "#e8e4de"}`,
                            background: unavailable
                              ? (isDark ? "rgba(239,68,68,0.2)" : "rgba(239,68,68,0.1)")
                              : hasSchedule
                                ? (isDark ? "rgba(139,26,46,0.15)" : "rgba(139,26,46,0.05)")
                                : isFullDay
                                  ? (isDark ? "rgba(239,68,68,0.05)" : "rgba(239,68,68,0.02)")
                                  : isCurrentHour
                                    ? (isDark ? "rgba(201,168,76,0.05)" : "rgba(201,168,76,0.03)")
                                    : "transparent",
                            border: unavailable
                              ? `2px solid ${isDark ? "rgba(239,68,68,0.4)" : "rgba(239,68,68,0.3)"}`
                              : "none",
                            opacity: isFullDay && !unavailable && !hasSchedule ? 0.3 : 1,
                          }}
                          onClick={() => {
                            if (!hasSchedule && !isPending) {
                              toggleUnavailability(day.index, hour);
                            }
                          }}
                        >
                          {hasSchedule && (
                            <div className="h-full w-full p-1.5 rounded-lg transition-all duration-200 hover:scale-105"
                              style={{
                                background: isDark ? `rgba(139,26,46,0.3)` : `rgba(139,26,46,0.08)`,
                                border: `1px solid ${isDark ? "rgba(139,26,46,0.4)" : "rgba(139,26,46,0.2)"}`,
                                borderTop: `3px solid ${schedule.color || "#8b1a2e"}`,
                              }}
                            >
                              <div className="text-[11px] font-bold leading-tight truncate" style={{ color: isDark ? "#f0b8be" : "#8b1a2e" }}>
                                {schedule.subject}
                              </div>
                              <div className="text-[9px] leading-tight truncate flex items-center gap-1" style={{ color: isDark ? "rgba(255,255,255,0.5)" : "#888" }}>
                                <FaUser style={{ fontSize: 8 }} />
                                {schedule.student_name}
                              </div>
                              <div className="text-[8px] leading-tight" style={{ color: "#c9a84c", fontFamily: "sans-serif" }}>
                                {schedule.start_time} - {schedule.end_time}
                              </div>
                            </div>
                          )}

                          {unavailable && !hasSchedule && (
                            <div className="h-full w-full flex flex-col items-center justify-center gap-0.5">
                              <div className="text-sm font-bold" style={{ color: "#ef4444" }}>
                                ❌
                              </div>
                              <div className="text-[8px]" style={{ color: isDark ? "rgba(255,255,255,0.3)" : "#999" }}>
                                مشغول
                              </div>
                              {unavailable.reason && (
                                <div className="text-[7px]" style={{ color: isDark ? "rgba(255,255,255,0.2)" : "#bbb" }}>
                                  {unavailable.reason}
                                </div>
                              )}
                            </div>
                          )}

                          {!hasSchedule && !unavailable && !isFullDay && (
                            <div className="h-full w-full flex flex-col items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                              <div className="text-lg" style={{ color: isDark ? "rgba(255,255,255,0.2)" : "#ccc" }}>
                                <FaPlus />
                              </div>
                              <div className="text-[8px]" style={{ color: isDark ? "rgba(255,255,255,0.15)" : "#ddd" }}>
                                غير متاح
                              </div>
                            </div>
                          )}

                          {isFullDay && !unavailable && !hasSchedule && (
                            <div className="h-full w-full flex items-center justify-center">
                              <div className="text-[9px]" style={{ color: isDark ? "rgba(255,255,255,0.15)" : "#ccc" }}>
                                ⛔ غير متاح
                              </div>
                            </div>
                          )}

                          {isPending && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/10 rounded-lg">
                              <div className="w-5 h-5 border-2 border-[#8b1a2e] border-t-transparent rounded-full animate-spin" />
                            </div>
                          )}
                        </div>
                      );
                    })}


                  </div>
                );
              })}

              {/* Legend */}
              <div className="p-4 flex flex-wrap items-center gap-4 border-t" style={{ borderColor: isDark ? "rgba(255,255,255,0.1)" : "#e8e4de" }}>
                <span className="text-xs font-semibold" style={{ color: isDark ? "rgba(255,255,255,0.5)" : "#888" }}>
                  📌 دليل الألوان:
                </span>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ background: isDark ? "rgba(139,26,46,0.3)" : "rgba(139,26,46,0.1)", border: "1px solid rgba(139,26,46,0.3)" }} />
                  <span className="text-xs" style={{ color: isDark ? "rgba(255,255,255,0.5)" : "#888" }}>📚 حصة</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ background: isDark ? "rgba(239,68,68,0.3)" : "rgba(239,68,68,0.15)", border: "2px solid #ef4444" }} />
                  <span className="text-xs" style={{ color: "#ef4444" }}>❌ غير متاح</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ background: isDark ? "rgba(201,168,76,0.1)" : "rgba(201,168,76,0.05)", border: "1px solid #c9a84c" }} />
                  <span className="text-xs" style={{ color: "#c9a84c" }}>⏰ الساعة الحالية</span>
                </div>
              </div>

              {/* قائمة الأوقات غير المتاحة */}
              {unavailability.length > 0 && (
                <div className="p-4 border-t" style={{ borderColor: isDark ? "rgba(255,255,255,0.1)" : "#e8e4de" }}>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-bold" style={{ color: isDark ? "#fff" : "#1a1a1a" }}>
                      🚫 الأوقات غير المتاحة ({unavailability.length})
                    </h4>
                    <button
                      onClick={async () => {
                        if (confirm("هل أنت متأكد من حذف جميع الأوقات غير المتاحة؟")) {
                          const { data: { user } } = await supabase.auth.getUser();
                          if (!user) return;
                          setUnavailability([]);
                          await supabase
                            .from("teacher_unavailability")
                            .delete()
                            .eq("teacher_id", user.id);
                        }
                      }}
                      className="text-xs px-3 py-1 rounded-lg transition-all hover:opacity-80"
                      style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}
                    >
                      حذف الكل
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {unavailability.map((u) => {
                      const dayName = DAYS[u.day_of_week];
                      const timeStr = u.is_full_day
                        ? "اليوم كامل"
                        : u.start_time?.slice(0, 5) || "";
                      return (
                        <div
                          key={u.id}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs"
                          style={{
                            background: isDark ? "rgba(239,68,68,0.15)" : "rgba(239,68,68,0.08)",
                            border: "1px solid rgba(239,68,68,0.2)",
                            color: "#ef4444",
                          }}
                        >
                          <span>{dayName}</span>
                          <span>{timeStr}</span>
                          {u.reason && <span className="text-[10px]">({u.reason})</span>}
                          <button
                            onClick={() => toggleUnavailability(u.day_of_week, parseInt(u.start_time?.slice(0, 2) || "0"))}
                            className="hover:text-red-700 transition-colors"
                          >
                            <FaTimes size={10} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* قائمة الطلاب المسجلين */}
        {students.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-bold mb-4" style={{ color: isDark ? "#fff" : "#1a1a1a" }}>
              طلابي المسجلين ({students.length})
            </h3>
            <div className="flex flex-wrap gap-3">
              {students.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center gap-3 px-4 py-2 rounded-2xl transition-all duration-200 hover:-translate-y-0.5"
                  style={{
                    background: isDark ? "rgba(255,255,255,0.05)" : "#ffffff",
                    border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "#e8e4de"}`,
                  }}
                >
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                    style={{ background: "linear-gradient(135deg, #8b1a2e, #1c0c14)" }}
                  >
                    {student.name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-sm font-medium" style={{ color: isDark ? "#fff" : "#1a1a1a" }}>
                      {student.name}
                    </div>
                    <div className="text-[10px]" style={{ color: isDark ? "rgba(255,255,255,0.3)" : "#888" }}>
                      <FaGraduationCap className="inline-block ml-1" style={{ fontSize: 8 }} />
                      {student.grade || "غير محدد"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* تعليمات */}
        <div className="mt-8 p-4 rounded-2xl text-xs"
          style={{
            background: isDark ? "rgba(201,168,76,0.05)" : "rgba(201,168,76,0.05)",
            border: `1px solid ${isDark ? "rgba(201,168,76,0.15)" : "rgba(201,168,76,0.15)"}`,
            color: isDark ? "rgba(255,255,255,0.5)" : "#666",
            fontFamily: "sans-serif",
          }}
        >
          💡 <span className="font-semibold">تعليمات:</span>
          <span className="mr-2">• اضغط على خلية <span className="text-[#8b1a2e] font-bold">فارغة</span> لتحديدها كـ <span className="text-red-500">غير متاح</span></span>
          <span className="mr-2">• اضغط على خلية <span className="text-red-500 font-bold">❌ غير متاح</span> لإزالة التحديد</span>
          <span className="mr-2">• الخلايا <span className="text-[#8b1a2e] font-bold">الملونة</span> تعرض الحصص والطلاب</span>
        </div>
      </div>
    </div>
  );
}