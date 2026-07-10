// app/routes/teacher/students.tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { supabase } from "../../lib/supabase";
import { useDarkMode } from "../../hooks/useDarkMode";
import { 
  FaUsers, FaSearch, FaUser, FaGraduationCap, 
  FaStar, FaCalendarAlt, FaFileAlt, FaEnvelope,
  FaPhone, FaChartLine, FaClock, FaCheckCircle,
  FaTimesCircle, FaUserPlus, FaFilter, FaArrowLeft,
  FaEye, FaChartBar, FaDownload, FaPrint,
  FaClipboardCheck  // ✅ تمت الإضافة
} from "react-icons/fa";

type Student = {
  id: string;
  name: string;
  grade: string;
  parent_name: string;
  parent_phone: string;
  parent_email: string;
  subject: string;
  sessions: number;
  attendance: number;
  attendance_count: number;
  total_sessions: number;
  rating: number;
  joined_at: string;
  avatar_url: string;
};

type StudentDetail = Student & {
  sessions_list: any[];
  attendance_list: any[];
  reports: any[];
  progress: {
    subject: string;
    score: number;
    date: string;
  }[];
};

export default function TeacherStudents() {
  const navigate = useNavigate();
  const { isDark } = useDarkMode();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<StudentDetail | null>(null);
  const [filterSubject, setFilterSubject] = useState("الكل");
  const [sortBy, setSortBy] = useState<"name" | "sessions" | "attendance" | "rating">("name");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  
  // قائمة المواد للفلتر
  const subjects = ["الكل", "الرياضيات", "الفيزياء", "الكيمياء", "الأحياء", "اللغة العربية", "اللغة الإنجليزية"];

  useEffect(() => {
    loadStudents();
  }, []);

  async function loadStudents() {
    if (!supabase) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // جلب الطلاب المسجلين مع المعلم
      const { data: studentTeachers } = await supabase
        .from("student_teachers")
        .select(`
          *,
          students!inner(
            id,
            full_name,
            grade,
            avatar_url,
            parent_id,
            profiles:parent_id(full_name, phone, email)
          )
        `)
        .eq("teacher_id", user.id);

      if (!studentTeachers) {
        setStudents([]);
        setLoading(false);
        return;
      }

      // جلب الحضور لكل طالب
      const studentIds = studentTeachers.map(st => st.student_id);
      const { data: attendanceData } = await supabase
        .from("attendance")
        .select("*")
        .in("student_id", studentIds)
        .eq("teacher_id", user.id);

      // جلب الجدول لكل طالب
      const { data: schedulesData } = await supabase
        .from("schedules")
        .select("*")
        .in("student_id", studentIds)
        .eq("teacher_id", user.id);

      const mapped = studentTeachers.map((st: any) => {
        const student = st.students;
        const studentAttendance = attendanceData?.filter(a => a.student_id === st.student_id) || [];
        const studentSchedules = schedulesData?.filter(s => s.student_id === st.student_id) || [];
        
        const presentCount = studentAttendance.filter(a => a.status === 'present').length;
        const totalSessions = studentSchedules.length;
        const attendanceRate = totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : 0;

        return {
          id: st.student_id,
          name: student?.full_name || "طالب",
          grade: student?.grade || "",
          parent_name: student?.profiles?.full_name || "ولي أمر",
          parent_phone: student?.profiles?.phone || "",
          parent_email: student?.profiles?.email || "",
          subject: st.subject || "مادة",
          sessions: totalSessions,
          attendance: attendanceRate,
          attendance_count: presentCount,
          total_sessions: totalSessions,
          rating: 4.5 + Math.random() * 0.5,
          joined_at: st.created_at || new Date().toISOString(),
          avatar_url: student?.avatar_url || "",
        };
      });

      setStudents(mapped);
    } catch (error) {
      console.error("Error loading students:", error);
    } finally {
      setLoading(false);
    }
  }

  // ─── Student Detail Modal ──────────────────────────────────────────────────
  async function loadStudentDetail(studentId: string) {
    if (!supabase) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // جلب الحصص
      const { data: sessions } = await supabase
        .from("schedules")
        .select("*")
        .eq("student_id", studentId)
        .eq("teacher_id", user.id)
        .order("created_at", { ascending: false });

      // جلب الحضور
      const { data: attendance } = await supabase
        .from("attendance")
        .select("*")
        .eq("student_id", studentId)
        .eq("teacher_id", user.id)
        .order("date", { ascending: false });

      // جلب التقارير
      const { data: reports } = await supabase
        .from("teacher_reports")
        .select("*")
        .eq("student_id", studentId)
        .eq("teacher_id", user.id)
        .order("created_at", { ascending: false });

      // جلب التقدم
      const progress = [
        { subject: "رياضيات", score: 85, date: "2026-06-20" },
        { subject: "فيزياء", score: 72, date: "2026-06-19" },
        { subject: "كيمياء", score: 90, date: "2026-06-18" },
      ];

      const student = students.find(s => s.id === studentId);
      if (student) {
        setSelectedStudent({
          ...student,
          sessions_list: sessions || [],
          attendance_list: attendance || [],
          reports: reports || [],
          progress: progress,
        });
      }
    } catch (error) {
      console.error("Error loading student detail:", error);
    }
  }

  // ─── Filter & Sort ──────────────────────────────────────────────────────────
  const filteredStudents = students.filter(s => {
    const matchSearch = s.name.includes(search) || s.subject.includes(search);
    const matchSubject = filterSubject === "الكل" || s.subject === filterSubject;
    return matchSearch && matchSubject;
  });

  const sortedStudents = [...filteredStudents].sort((a, b) => {
    switch (sortBy) {
      case "name": return a.name.localeCompare(b.name);
      case "sessions": return b.sessions - a.sessions;
      case "attendance": return b.attendance - a.attendance;
      case "rating": return b.rating - a.rating;
      default: return 0;
    }
  });

  return (
    <div className="space-y-6">
      {/* ─── Header ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold" style={{ color: isDark ? "#fff" : "#1a1a1a" }}>
            طلابي
          </h1>
          <p className="text-sm mt-1" style={{ color: isDark ? "rgba(255,255,255,0.5)" : "#666" }}>
            {students.length} طالب مسجل
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate("/teacher/attendance")}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-all hover:opacity-90"
            style={{
              background: isDark ? "rgba(255,255,255,0.05)" : "#f5f4f2",
              border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "#d0ccc4"}`,
              color: isDark ? "rgba(255,255,255,0.7)" : "#555",
            }}
          >
            <FaClipboardCheck /> تسجيل حضور
          </button>
          <button
            onClick={() => navigate("/teacher/reports")}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-xl transition-all hover:opacity-90"
            style={{ background: "#8b1a2e" }}
          >
            <FaFileAlt /> تقارير
          </button>
        </div>
      </div>

      {/* ─── Search & Filters ────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <FaSearch className="absolute right-4 top-1/2 -translate-y-1/2" style={{ color: isDark ? "rgba(255,255,255,0.3)" : "#aaa" }} />
          <input
            type="text"
            placeholder="ابحث عن طالب..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pr-12 pl-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#8b1a2e] transition-all"
            style={{
              background: isDark ? "rgba(255,255,255,0.05)" : "#ffffff",
              borderColor: isDark ? "rgba(255,255,255,0.1)" : "#d0ccc4",
              color: isDark ? "#ffffff" : "#1a1a1a",
            }}
          />
        </div>

        <select
          value={filterSubject}
          onChange={(e) => setFilterSubject(e.target.value)}
          className="px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#8b1a2e] transition-all"
          style={{
            background: isDark ? "rgba(255,255,255,0.05)" : "#ffffff",
            borderColor: isDark ? "rgba(255,255,255,0.1)" : "#d0ccc4",
            color: isDark ? "#ffffff" : "#1a1a1a",
          }}
        >
          {subjects.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#8b1a2e] transition-all"
          style={{
            background: isDark ? "rgba(255,255,255,0.05)" : "#ffffff",
            borderColor: isDark ? "rgba(255,255,255,0.1)" : "#d0ccc4",
            color: isDark ? "#ffffff" : "#1a1a1a",
          }}
        >
          <option value="name">الاسم</option>
          <option value="sessions">عدد الحصص</option>
          <option value="attendance">الحضور</option>
          <option value="rating">التقييم</option>
        </select>

        <div className="flex gap-1 p-1 rounded-xl border" style={{
          borderColor: isDark ? "rgba(255,255,255,0.1)" : "#d0ccc4",
        }}>
          <button
            onClick={() => setViewMode("grid")}
            className={`p-2 rounded-lg transition-all ${viewMode === "grid" ? "text-white" : ""}`}
            style={viewMode === "grid" ? { background: "#8b1a2e" } : { background: "transparent", color: isDark ? "rgba(255,255,255,0.5)" : "#888" }}
          >
            ⊞
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`p-2 rounded-lg transition-all ${viewMode === "list" ? "text-white" : ""}`}
            style={viewMode === "list" ? { background: "#8b1a2e" } : { background: "transparent", color: isDark ? "rgba(255,255,255,0.5)" : "#888" }}
          >
            ☰
          </button>
        </div>
      </div>

      {/* ─── Students Grid ───────────────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="p-6 animate-pulse rounded-2xl" style={{
              background: isDark ? "rgba(255,255,255,0.03)" : "#ffffff",
              border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "#e8e4de"}`,
            }}>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl" style={{ background: isDark ? "rgba(255,255,255,0.05)" : "#f0f0f0" }} />
                <div className="flex-1">
                  <div className="h-4 w-32 rounded" style={{ background: isDark ? "rgba(255,255,255,0.05)" : "#f0f0f0" }} />
                  <div className="h-3 w-20 mt-2 rounded" style={{ background: isDark ? "rgba(255,255,255,0.05)" : "#f0f0f0" }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : sortedStudents.length === 0 ? (
        <div className="text-center py-20" style={{ color: isDark ? "rgba(255,255,255,0.3)" : "#aaa" }}>
          <FaUsers className="text-5xl mx-auto mb-4" />
          <p className="text-lg font-bold" style={{ color: isDark ? "#fff" : "#1a1a1a" }}>لا يوجد طلاب</p>
          <p className="text-sm" style={{ fontFamily: "sans-serif" }}>لم يسجل أي طالب معك حتى الآن</p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedStudents.map((student) => (
            <div
              key={student.id}
              className="p-6 rounded-2xl transition-all duration-300 hover:-translate-y-1 cursor-pointer"
              style={{
                background: isDark ? "rgba(255,255,255,0.03)" : "#ffffff",
                border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "#e8e4de"}`,
                borderTop: `3px solid #8b1a2e`,
                boxShadow: isDark ? "none" : "0 2px 8px rgba(0,0,0,0.04)",
              }}
              onClick={() => loadStudentDetail(student.id)}
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center text-xl font-bold text-white flex-shrink-0"
                  style={{ background: `linear-gradient(135deg, #8b1a2e, ${isDark ? "#1c0c14" : "#6b1522"})` }}
                >
                  {student.avatar_url ? (
                    <img src={student.avatar_url} alt={student.name} className="w-full h-full object-cover rounded-xl" />
                  ) : (
                    student.name.charAt(0)
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold truncate" style={{ color: isDark ? "#fff" : "#1a1a1a" }}>
                    {student.name}
                  </h3>
                  <p className="text-xs" style={{ color: isDark ? "rgba(255,255,255,0.4)" : "#888" }}>
                    <FaGraduationCap className="inline-block ml-1" /> {student.grade}
                  </p>
                </div>
                <div className="text-left flex-shrink-0">
                  <div className="text-sm font-bold" style={{ color: "#c9a84c" }}>
                    {student.subject}
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-2" style={{
                borderColor: isDark ? "rgba(255,255,255,0.05)" : "#e8e4de",
              }}>
                <div className="text-center">
                  <div className="text-sm font-bold" style={{ color: isDark ? "#fff" : "#1a1a1a" }}>{student.sessions}</div>
                  <div className="text-[10px]" style={{ color: isDark ? "rgba(255,255,255,0.3)" : "#aaa" }}>حصة</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-bold" style={{ color: student.attendance >= 80 ? "#4ade80" : student.attendance >= 50 ? "#f59e0b" : "#ef4444" }}>
                    {student.attendance}%
                  </div>
                  <div className="text-[10px]" style={{ color: isDark ? "rgba(255,255,255,0.3)" : "#aaa" }}>حضور</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-0.5 text-sm font-bold" style={{ color: "#c9a84c" }}>
                    <FaStar className="text-xs" /> {student.rating.toFixed(1)}
                  </div>
                  <div className="text-[10px]" style={{ color: isDark ? "rgba(255,255,255,0.3)" : "#aaa" }}>تقييم</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {sortedStudents.map((student) => (
            <div
              key={student.id}
              className="flex items-center gap-4 p-4 rounded-2xl transition-all duration-200 hover:-translate-y-0.5 cursor-pointer"
              style={{
                background: isDark ? "rgba(255,255,255,0.03)" : "#ffffff",
                border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "#e8e4de"}`,
                borderRight: `3px solid #8b1a2e`,
              }}
              onClick={() => loadStudentDetail(student.id)}
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                style={{ background: `linear-gradient(135deg, #8b1a2e, ${isDark ? "#1c0c14" : "#6b1522"})` }}
              >
                {student.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold truncate" style={{ color: isDark ? "#fff" : "#1a1a1a" }}>{student.name}</h3>
                <p className="text-xs" style={{ color: isDark ? "rgba(255,255,255,0.4)" : "#888" }}>{student.grade}</p>
              </div>
              <div className="text-xs px-2 py-1 rounded-lg" style={{
                background: isDark ? "rgba(139,26,46,0.2)" : "rgba(139,26,46,0.08)",
                color: "#8b1a2e",
              }}>
                {student.subject}
              </div>
              <div className="text-xs font-bold" style={{ color: student.attendance >= 80 ? "#4ade80" : student.attendance >= 50 ? "#f59e0b" : "#ef4444" }}>
                {student.attendance}%
              </div>
              <div className="flex items-center gap-0.5 text-xs font-bold" style={{ color: "#c9a84c" }}>
                <FaStar className="text-[10px]" /> {student.rating.toFixed(1)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── Student Detail Modal ────────────────────────────────────────────── */}
      {selectedStudent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={() => setSelectedStudent(null)}
        >
          <div
            className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl p-6"
            style={{
              background: isDark ? "#1a2a40" : "#ffffff",
              border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "#e8e4de"}`,
              scrollbarWidth: "thin",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedStudent(null)}
              className="absolute top-4 left-4 w-8 h-8 rounded-full flex items-center justify-center text-xl transition-colors"
              style={{
                background: isDark ? "rgba(255,255,255,0.05)" : "#f5f4f2",
                color: isDark ? "#fff" : "#1a1a1a",
              }}
            >
              ×
            </button>

            {/* Student Header */}
            <div className="flex items-center gap-6 mb-6">
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-bold text-white"
                style={{ background: `linear-gradient(135deg, #8b1a2e, ${isDark ? "#1c0c14" : "#6b1522"})` }}
              >
                {selectedStudent.name.charAt(0)}
              </div>
              <div>
                <h2 className="text-2xl font-bold" style={{ color: isDark ? "#fff" : "#1a1a1a" }}>
                  {selectedStudent.name}
                </h2>
                <p className="text-sm" style={{ color: isDark ? "rgba(255,255,255,0.5)" : "#666" }}>
                  {selectedStudent.grade} · {selectedStudent.subject}
                </p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs px-3 py-1 rounded-full" style={{
                    background: isDark ? "rgba(139,26,46,0.2)" : "rgba(139,26,46,0.08)",
                    color: "#8b1a2e",
                  }}>
                    انضم {new Date(selectedStudent.joined_at).toLocaleDateString('ar-EG')}
                  </span>
                  <div className="flex items-center gap-1 text-xs" style={{ color: "#c9a84c" }}>
                    <FaStar /> {selectedStudent.rating.toFixed(1)}
                  </div>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-3 mb-6">
              {[
                { label: "الحصص", value: selectedStudent.sessions },
                { label: "الحضور", value: `${selectedStudent.attendance}%` },
                { label: "حضر", value: selectedStudent.attendance_count },
                { label: "غاب", value: selectedStudent.total_sessions - selectedStudent.attendance_count },
              ].map((stat, i) => (
                <div key={i} className="p-3 text-center rounded-xl" style={{
                  background: isDark ? "rgba(255,255,255,0.03)" : "#f5f4f2",
                }}>
                  <div className="text-lg font-bold" style={{ color: isDark ? "#fff" : "#1a1a1a" }}>{stat.value}</div>
                  <div className="text-[10px]" style={{ color: isDark ? "rgba(255,255,255,0.3)" : "#aaa" }}>{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Parent Info */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="p-3 rounded-xl" style={{
                background: isDark ? "rgba(255,255,255,0.03)" : "#f5f4f2",
              }}>
                <p className="text-xs" style={{ color: isDark ? "rgba(255,255,255,0.3)" : "#aaa" }}>ولي الأمر</p>
                <p className="text-sm font-medium" style={{ color: isDark ? "#fff" : "#1a1a1a" }}>{selectedStudent.parent_name}</p>
              </div>
              <div className="p-3 rounded-xl" style={{
                background: isDark ? "rgba(255,255,255,0.03)" : "#f5f4f2",
              }}>
                <p className="text-xs" style={{ color: isDark ? "rgba(255,255,255,0.3)" : "#aaa" }}>رقم الهاتف</p>
                <p className="text-sm font-medium" style={{ color: isDark ? "#fff" : "#1a1a1a" }}>{selectedStudent.parent_phone || "غير مسجل"}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => navigate(`/teacher/reports?student=${selectedStudent.id}`)}
                className="flex-1 py-2.5 text-sm font-medium text-white rounded-xl transition-all hover:opacity-90"
                style={{ background: "#8b1a2e" }}
              >
                <FaFileAlt className="inline-block ml-2" /> إرسال تقرير
              </button>
              <button
                className="px-4 py-2.5 text-sm font-medium rounded-xl transition-all"
                style={{
                  background: isDark ? "rgba(255,255,255,0.05)" : "#f5f4f2",
                  border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "#d0ccc4"}`,
                  color: isDark ? "rgba(255,255,255,0.7)" : "#555",
                }}
              >
                <FaChartBar className="inline-block" />
              </button>
              <button
                className="px-4 py-2.5 text-sm font-medium rounded-xl transition-all"
                style={{
                  background: isDark ? "rgba(255,255,255,0.05)" : "#f5f4f2",
                  border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "#d0ccc4"}`,
                  color: isDark ? "rgba(255,255,255,0.7)" : "#555",
                }}
              >
                <FaEnvelope className="inline-block" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}