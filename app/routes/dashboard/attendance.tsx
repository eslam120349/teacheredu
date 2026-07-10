// app/routes/teacher/attendance.tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { supabase } from "../../lib/supabase";
import { useDarkMode } from "../../hooks/useDarkMode";
import { 
  FaClipboardCheck, FaSearch, FaUser, FaGraduationCap,
  FaCalendarAlt, FaClock, FaCheckCircle, FaTimesCircle,
  FaUserCheck, FaUserTimes, FaArrowLeft, FaSave,
  FaDownload, FaPrint, FaFilter, FaChartBar,
  FaCheck, FaTimes, FaHistory, FaEye, FaExclamationTriangle,
  FaInfoCircle,
  FaUsers
} from "react-icons/fa";

type Student = {
  id: string;
  name: string;
  grade: string;
  avatar_url: string;
  subject: string;
  schedule_id?: string;
  start_time?: string;
  end_time?: string;
  status?: 'present' | 'absent' | 'late' | 'excused';
  notes?: string;
};

type Schedule = {
  id: string;
  student_id: string;
  subject: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
};

type AttendanceRecord = {
  id: string;
  student_id: string;
  teacher_id: string;
  schedule_id: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  notes?: string;
  recorded_by: string;
  created_at: string;
};

export default function TeacherAttendance() {
  const navigate = useNavigate();
  const { isDark } = useDarkMode();
  const [students, setStudents] = useState<Student[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSubject, setSelectedSubject] = useState("الكل");
  const [attendanceMode, setAttendanceMode] = useState<"quick" | "detailed">("quick");
  const [saved, setSaved] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historyData, setHistoryData] = useState<AttendanceRecord[]>([]);
  const [existingAttendance, setExistingAttendance] = useState<Record<string, AttendanceRecord>>({});
  const [showAllStudents, setShowAllStudents] = useState(false);

  // قائمة المواد للفلتر
  const subjects = ["الكل", "الرياضيات", "الفيزياء", "الكيمياء", "الأحياء", "اللغة العربية", "اللغة الإنجليزية"];

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  async function loadData() {
    if (!supabase) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. جلب جميع الطلاب المسجلين مع المعلم
      const { data: studentTeachers } = await supabase
        .from("student_teachers")
        .select(`
          *,
          students!inner(
            id,
            full_name,
            grade,
            avatar_url
          )
        `)
        .eq("teacher_id", user.id);

      if (!studentTeachers) {
        setAllStudents([]);
        setStudents([]);
        setLoading(false);
        return;
      }

      const studentIds = studentTeachers.map((st: any) => st.student_id);

      // 2. جلب جدول الحصص لهذا اليوم
      const dayOfWeek = new Date(selectedDate).getDay();
      const { data: schedulesData } = await supabase
        .from("schedules")
        .select("*")
        .in("student_id", studentIds)
        .eq("teacher_id", user.id)
        .eq("day_of_week", dayOfWeek)
        .eq("status", "scheduled")
        .order("start_time");

      // 3. جلب سجلات الحضور لهذا التاريخ
      const { data: attendanceData } = await supabase
        .from("attendance")
        .select("*")
        .in("student_id", studentIds)
        .eq("teacher_id", user.id)
        .eq("date", selectedDate);

      // بناء خريطة للحضور الحالي
      const attendanceMap: Record<string, AttendanceRecord> = {};
      if (attendanceData) {
        attendanceData.forEach((a: any) => {
          attendanceMap[a.student_id] = a;
        });
      }
      setExistingAttendance(attendanceMap);

      // 4. دمج جميع الطلاب
      const allMappedStudents = studentTeachers.map((st: any) => {
        const student = st.students;
        const schedule = schedulesData?.find((s: any) => 
          s.student_id === st.student_id && 
          (!st.subject || !s.subject || s.subject.trim() === st.subject.trim())
        );
        const existing = attendanceMap[st.student_id];
        
        return {
          id: st.student_id,
          name: student?.full_name || "طالب",
          grade: student?.grade || "",
          avatar_url: student?.avatar_url || "",
          subject: st.subject || "مادة",
          schedule_id: schedule?.id,
          start_time: schedule?.start_time?.slice(0, 5) || "",
          end_time: schedule?.end_time?.slice(0, 5) || "",
          status: existing?.status || undefined,
          notes: existing?.notes || "",
        };
      });

      setAllStudents(allMappedStudents);

      // 🔥 جلب الطلاب الذين لديهم حصص في هذا اليوم فقط (أو الذين تم تسجيل حضورهم بالفعل)
      const studentsWithSchedule = allMappedStudents.filter(s => s.schedule_id);
      const studentsWithAttendance = allMappedStudents.filter(s => s.status);
      
      // دمج القائمتين معاً
      const mergedStudents = [...studentsWithSchedule];
      
      // إضافة الطلاب الذين لديهم حضور مسجل ولكن ليس لديهم حصة في هذا اليوم
      studentsWithAttendance.forEach(s => {
        if (!mergedStudents.find(m => m.id === s.id)) {
          mergedStudents.push(s);
        }
      });

      // ترتيب حسب وقت الحصة
      mergedStudents.sort((a, b) => {
        if (a.start_time && b.start_time) {
          return a.start_time.localeCompare(b.start_time);
        }
        if (a.start_time) return -1;
        if (b.start_time) return 1;
        return 0;
      });

      setStudents(mergedStudents);
      setSchedules(schedulesData || []);
      
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  }

  // ─── تسجيل الحضور ──────────────────────────────────────────────────────────
  const handleStatusChange = (studentId: string, status: 'present' | 'absent' | 'late' | 'excused') => {
    setStudents(prev => prev.map(s => 
      s.id === studentId ? { ...s, status: status } : s
    ));
  };

  const handleNotesChange = (studentId: string, notes: string) => {
    setStudents(prev => prev.map(s => 
      s.id === studentId ? { ...s, notes: notes } : s
    ));
  };

  const markAll = (status: 'present' | 'absent' | 'late' | 'excused') => {
    setStudents(prev => prev.map(s => ({ ...s, status: status })));
  };

  // ─── حفظ الحضور ────────────────────────────────────────────────────────────
  const saveAttendance = async () => {
    if (!supabase) return;
    
    const studentsWithStatus = students.filter(s => s.status);
    if (studentsWithStatus.length === 0) {
      alert("يرجى تحديد حالة الحضور لطلابك");
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. جلب السجلات القديمة للحصول على معرفات الحضور القديمة لحذف عمولاتها
      const { data: oldAttendances } = await supabase
        .from("attendance")
        .select("id")
        .eq("teacher_id", user.id)
        .eq("date", selectedDate);

      const oldAttendanceIds = oldAttendances?.map(a => a.id) || [];

      // 2. حذف العمولات القديمة المرتبطة بالحضور القديم
      if (oldAttendanceIds.length > 0) {
        await supabase
          .from("marketer_commissions")
          .delete()
          .in("attendance_id", oldAttendanceIds);
      }

      // 3. حذف سجلات الحضور القديمة لنفس التاريخ
      await supabase
        .from("attendance")
        .delete()
        .eq("teacher_id", user.id)
        .eq("date", selectedDate);

      // 4. إضافة السجلات الجديدة
      const attendanceRecords = studentsWithStatus.map(s => ({
        student_id: s.id,
        teacher_id: user.id,
        schedule_id: s.schedule_id || null,
        date: selectedDate,
        status: s.status,
        notes: s.notes || "",
        recorded_by: user.id,
      }));

      // إزالة السجلات المكررة لتفادي خطأ Unique Constraint (attendance_schedule_id_date_key)
      const uniqueRecordsMap = new Map<string, typeof attendanceRecords[0]>();
      attendanceRecords.forEach(record => {
        const key = record.schedule_id ? `sched-${record.schedule_id}` : `stud-${record.student_id}`;
        uniqueRecordsMap.set(key, record);
      });
      const finalRecords = Array.from(uniqueRecordsMap.values());

      // 5. إدخال سجلات الحضور واسترجاع المعطيات للحصول على معرفات الحضور الجديدة
      const { data: insertedAttendances, error } = await supabase
        .from("attendance")
        .insert(finalRecords)
        .select("*");

      if (error) throw error;

      // 6. حساب وإدخال عمولات الماركترز إذا كان الطالب حاضراً وضمن فترة الـ 3 أشهر من التسجيل
      if (insertedAttendances && insertedAttendances.length > 0) {
        // جلب تفاصيل الطلاب والأسعار والمسوقين لتسجيل العمولة
        const { data: studentTeachers } = await supabase
          .from("student_teachers")
          .select(`
            id,
            student_id,
            price,
            marketer_id,
            students!inner(
              created_at,
              parent_id
            )
          `)
          .eq("teacher_id", user.id);

        if (studentTeachers && studentTeachers.length > 0) {
          const parentIds = studentTeachers
            .map((st: any) => st.students?.parent_id)
            .filter(Boolean);

          const { data: parentsData } = parentIds.length > 0 ? await supabase
            .from("profiles")
            .select("id, marketer_id")
            .in("id", parentIds) : { data: [] };

          const commissionRecords = [];

          for (const att of insertedAttendances) {
            // العمولات تسجل فقط في حالة حضور الطالب
            if (att.status !== 'present') continue;

            const st = studentTeachers.find((item: any) => item.student_id === att.student_id);
            if (!st) continue;

            // التحقق من أن الطالب لا يزال في فترة الـ 3 شهور الأولى من التسجيل
            const regDate = new Date(st.students.created_at);
            const sessionDate = new Date(selectedDate);
            
            const maxCommissionDate = new Date(regDate);
            maxCommissionDate.setMonth(maxCommissionDate.getMonth() + 3);

            const isWithinThreeMonths = sessionDate <= maxCommissionDate;
            if (!isWithinThreeMonths) continue;

            // تحديد الـ marketer_id (من علاقة الطالب بالمعلم أو من الملف الشخصي لولي الأمر)
            let marketerId = st.marketer_id;
            if (!marketerId && st.students?.parent_id) {
              const parent = parentsData?.find((p: any) => p.id === st.students.parent_id);
              marketerId = parent?.marketer_id;
            }

            if (!marketerId) continue;

            const sessionPrice = st.price || 0;
            const commissionAmount = sessionPrice * 0.10; // نسبة 10%

            commissionRecords.push({
              marketer_id: marketerId,
              student_id: att.student_id,
              teacher_id: att.teacher_id,
              student_teacher_id: st.id,
              attendance_id: att.id,
              session_price: sessionPrice,
              commission_amount: commissionAmount,
              status: 'pending',
            });
          }

          if (commissionRecords.length > 0) {
            const { error: commError } = await supabase
              .from("marketer_commissions")
              .insert(commissionRecords);
            
            if (commError) {
              console.error("Error inserting marketer commissions:", commError);
            }
          }
        }
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      
      // إعادة تحميل البيانات
      await loadData();
    } catch (error) {
      console.error("Error saving attendance:", error);
      alert("حدث خطأ في حفظ الحضور: " + (error as any).message);
    } finally {
      setSaving(false);
    }
  };

  // ─── عرض سجل الحضور ──────────────────────────────────────────────────────
  const loadHistory = async () => {
    if (!supabase) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("attendance")
        .select(`
          *,
          students!attendance_student_id_fkey(
            id,
            full_name,
            grade
          )
        `)
        .eq("teacher_id", user.id)
        .order("date", { ascending: false })
        .limit(50);

      if (data) {
        setHistoryData(data);
        setShowHistory(true);
      }
    } catch (error) {
      console.error("Error loading history:", error);
    }
  };

  // ─── Toggle Show All Students ─────────────────────────────────────────────
  const toggleShowAllStudents = () => {
    if (showAllStudents) {
      // إظهار فقط الطلاب الذين لديهم حصص اليوم
      const studentsWithSchedule = allStudents.filter(s => s.schedule_id);
      setStudents(studentsWithSchedule);
    } else {
      // إظهار جميع الطلاب
      setStudents(allStudents);
    }
    setShowAllStudents(!showAllStudents);
  };

  // ─── Filtering ─────────────────────────────────────────────────────────────
  const filteredStudents = students.filter(s => {
    const matchSearch = s.name.includes(search);
    const matchSubject = selectedSubject === "الكل" || s.subject === selectedSubject;
    return matchSearch && matchSubject;
  });

  const stats = {
    total: students.length,
    withSchedule: students.filter(s => s.schedule_id).length,
    present: students.filter(s => s.status === 'present').length,
    absent: students.filter(s => s.status === 'absent').length,
    late: students.filter(s => s.status === 'late').length,
    excused: students.filter(s => s.status === 'excused').length,
  };

  // ─── Status Badge ──────────────────────────────────────────────────────────
  const StatusBadge = ({ status }: { status?: string }) => {
    if (!status) {
      return <span className="text-xs" style={{ color: isDark ? "rgba(255,255,255,0.3)" : "#aaa" }}>غير محدد</span>;
    }
    const config = {
      present: { bg: "rgba(74,222,128,0.15)", color: "#4ade80", label: "✅ حاضر", icon: FaCheckCircle },
      absent: { bg: "rgba(239,68,68,0.15)", color: "#ef4444", label: "❌ غائب", icon: FaTimesCircle },
      late: { bg: "rgba(251,191,36,0.15)", color: "#f59e0b", label: "⏰ متأخر", icon: FaClock },
      excused: { bg: "rgba(59,130,246,0.15)", color: "#3b82f6", label: "📝 معذور", icon: FaExclamationTriangle },
    };
    const c = config[status as keyof typeof config] || config.present;
    return (
      <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-lg" style={{
        background: c.bg,
        color: c.color,
      }}>
        <c.icon className="text-[10px]" /> {c.label}
      </span>
    );
  };

  // ─── Get day name in Arabic ──────────────────────────────────────────────
  const getDayName = (dateStr: string) => {
    const date = new Date(dateStr);
    return DAYS[date.getDay()];
  };

  const DAYS = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

  return (
    <div className="space-y-6">
      {/* ─── Header ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold" style={{ color: isDark ? "#fff" : "#1a1a1a" }}>
            تسجيل الحضور
          </h1>
          <p className="text-sm mt-1" style={{ color: isDark ? "rgba(255,255,255,0.5)" : "#666" }}>
            {getDayName(selectedDate)} - {new Date(selectedDate).toLocaleDateString('ar-EG')}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={toggleShowAllStudents}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-all hover:opacity-90"
            style={{
              background: showAllStudents 
                ? (isDark ? "rgba(59,130,246,0.2)" : "rgba(59,130,246,0.1)")
                : (isDark ? "rgba(255,255,255,0.05)" : "#f5f4f2"),
              border: `1px solid ${showAllStudents ? "#3b82f6" : (isDark ? "rgba(255,255,255,0.1)" : "#d0ccc4")}`,
              color: showAllStudents ? "#3b82f6" : (isDark ? "rgba(255,255,255,0.7)" : "#555"),
            }}
          >
            <FaUsers className={showAllStudents ? "text-blue-500" : ""} />
            {showAllStudents ? "عرض أصحاب الحصص فقط" : "عرض جميع الطلاب"}
          </button>
          <button
            onClick={() => setAttendanceMode(attendanceMode === "quick" ? "detailed" : "quick")}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-all hover:opacity-90"
            style={{
              background: isDark ? "rgba(255,255,255,0.05)" : "#f5f4f2",
              border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "#d0ccc4"}`,
              color: isDark ? "rgba(255,255,255,0.7)" : "#555",
            }}
          >
            {attendanceMode === "quick" ? "📝 وضع مفصل" : "⚡ وضع سريع"}
          </button>
          <button
            onClick={loadHistory}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-all hover:opacity-90"
            style={{
              background: isDark ? "rgba(255,255,255,0.05)" : "#f5f4f2",
              border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "#d0ccc4"}`,
              color: isDark ? "rgba(255,255,255,0.7)" : "#555",
            }}
          >
            <FaHistory /> السجل
          </button>
          <button
            onClick={() => navigate("/teacher/students")}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-xl transition-all hover:opacity-90"
            style={{ background: "#8b1a2e" }}
          >
            <FaArrowLeft /> رجوع
          </button>
        </div>
      </div>

      {/* ─── Quick Actions ───────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 p-4 rounded-2xl" style={{
        background: isDark ? "rgba(255,255,255,0.03)" : "#f5f4f2",
        border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "#e8e4de"}`,
      }}>
        <button
          onClick={() => markAll('present')}
          className="px-4 py-2 text-sm font-medium rounded-xl transition-all hover:opacity-90 flex items-center gap-2"
          style={{
            background: "rgba(74,222,128,0.15)",
            border: "1px solid rgba(74,222,128,0.3)",
            color: "#4ade80",
          }}
        >
          <FaCheckCircle /> تحديد الكل حاضر
        </button>
        <button
          onClick={() => markAll('absent')}
          className="px-4 py-2 text-sm font-medium rounded-xl transition-all hover:opacity-90 flex items-center gap-2"
          style={{
            background: "rgba(239,68,68,0.15)",
            border: "1px solid rgba(239,68,68,0.3)",
            color: "#ef4444",
          }}
        >
          <FaTimesCircle /> تحديد الكل غائب
        </button>
        <button
          onClick={() => markAll('late')}
          className="px-4 py-2 text-sm font-medium rounded-xl transition-all hover:opacity-90 flex items-center gap-2"
          style={{
            background: "rgba(251,191,36,0.15)",
            border: "1px solid rgba(251,191,36,0.3)",
            color: "#f59e0b",
          }}
        >
          <FaClock /> تحديد الكل متأخر
        </button>
        <button
          onClick={() => markAll('excused')}
          className="px-4 py-2 text-sm font-medium rounded-xl transition-all hover:opacity-90 flex items-center gap-2"
          style={{
            background: "rgba(59,130,246,0.15)",
            border: "1px solid rgba(59,130,246,0.3)",
            color: "#3b82f6",
          }}
        >
          <FaExclamationTriangle /> تحديد الكل معذور
        </button>
        <button
          onClick={() => setStudents(prev => prev.map(s => ({ ...s, status: undefined })))}
          className="px-4 py-2 text-sm font-medium rounded-xl transition-all hover:opacity-90"
          style={{
            background: isDark ? "rgba(255,255,255,0.05)" : "#ffffff",
            border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "#d0ccc4"}`,
            color: isDark ? "rgba(255,255,255,0.7)" : "#555",
          }}
        >
          مسح الكل
        </button>
      </div>

      {/* ─── Stats ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        <div className="p-4 text-center rounded-2xl" style={{
          background: isDark ? "rgba(255,255,255,0.03)" : "#ffffff",
          border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "#e8e4de"}`,
        }}>
          <div className="text-2xl font-bold" style={{ color: isDark ? "#fff" : "#1a1a1a" }}>{stats.total}</div>
          <div className="text-xs" style={{ color: isDark ? "rgba(255,255,255,0.3)" : "#aaa" }}>إجمالي</div>
        </div>
        <div className="p-4 text-center rounded-2xl" style={{
          background: isDark ? "rgba(74,222,128,0.05)" : "rgba(74,222,128,0.05)",
          border: "1px solid rgba(74,222,128,0.2)",
        }}>
          <div className="text-2xl font-bold" style={{ color: "#4ade80" }}>{stats.withSchedule}</div>
          <div className="text-xs" style={{ color: "rgba(74,222,128,0.7)" }}>حصص اليوم</div>
        </div>
        <div className="p-4 text-center rounded-2xl" style={{
          background: "rgba(74,222,128,0.05)",
          border: "1px solid rgba(74,222,128,0.2)",
        }}>
          <div className="text-2xl font-bold" style={{ color: "#4ade80" }}>{stats.present}</div>
          <div className="text-xs" style={{ color: "rgba(74,222,128,0.7)" }}>حاضر</div>
        </div>
        <div className="p-4 text-center rounded-2xl" style={{
          background: "rgba(239,68,68,0.05)",
          border: "1px solid rgba(239,68,68,0.2)",
        }}>
          <div className="text-2xl font-bold" style={{ color: "#ef4444" }}>{stats.absent}</div>
          <div className="text-xs" style={{ color: "rgba(239,68,68,0.7)" }}>غائب</div>
        </div>
        <div className="p-4 text-center rounded-2xl" style={{
          background: "rgba(251,191,36,0.05)",
          border: "1px solid rgba(251,191,36,0.2)",
        }}>
          <div className="text-2xl font-bold" style={{ color: "#f59e0b" }}>{stats.late}</div>
          <div className="text-xs" style={{ color: "rgba(251,191,36,0.7)" }}>متأخر</div>
        </div>
        <div className="p-4 text-center rounded-2xl" style={{
          background: "rgba(59,130,246,0.05)",
          border: "1px solid rgba(59,130,246,0.2)",
        }}>
          <div className="text-2xl font-bold" style={{ color: "#3b82f6" }}>{stats.excused}</div>
          <div className="text-xs" style={{ color: "rgba(59,130,246,0.7)" }}>معذور</div>
        </div>
      </div>

      {/* ─── Date Picker ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl" style={{
          background: isDark ? "rgba(255,255,255,0.03)" : "#f5f4f2",
          border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "#e8e4de"}`,
        }}>
          <FaCalendarAlt style={{ color: isDark ? "rgba(255,255,255,0.4)" : "#888" }} />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-transparent focus:outline-none text-sm"
            style={{ color: isDark ? "#fff" : "#1a1a1a" }}
          />
          <span className="text-xs mr-2" style={{ color: isDark ? "rgba(255,255,255,0.3)" : "#aaa" }}>
            ({getDayName(selectedDate)})
          </span>
        </div>

        <div className="relative flex-1">
          <FaSearch className="absolute right-4 top-1/2 -translate-y-1/2" style={{ color: isDark ? "rgba(255,255,255,0.3)" : "#aaa" }} />
          <input
            type="text"
            placeholder="ابحث عن طالب..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pr-12 pl-4 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#8b1a2e] transition-all"
            style={{
              background: isDark ? "rgba(255,255,255,0.05)" : "#ffffff",
              borderColor: isDark ? "rgba(255,255,255,0.1)" : "#d0ccc4",
              color: isDark ? "#ffffff" : "#1a1a1a",
            }}
          />
        </div>

        <select
          value={selectedSubject}
          onChange={(e) => setSelectedSubject(e.target.value)}
          className="px-4 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#8b1a2e] transition-all"
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
      </div>
      
      {/* ─── Students List ───────────────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="p-4 animate-pulse rounded-2xl" style={{
              background: isDark ? "rgba(255,255,255,0.03)" : "#ffffff",
              border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "#e8e4de"}`,
            }}>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl" style={{ background: isDark ? "rgba(255,255,255,0.05)" : "#f0f0f0" }} />
                <div className="flex-1">
                  <div className="h-4 w-32 rounded" style={{ background: isDark ? "rgba(255,255,255,0.05)" : "#f0f0f0" }} />
                  <div className="h-3 w-20 mt-2 rounded" style={{ background: isDark ? "rgba(255,255,255,0.05)" : "#f0f0f0" }} />
                </div>
                <div className="flex gap-2">
                  <div className="w-16 h-8 rounded" style={{ background: isDark ? "rgba(255,255,255,0.05)" : "#f0f0f0" }} />
                  <div className="w-16 h-8 rounded" style={{ background: isDark ? "rgba(255,255,255,0.05)" : "#f0f0f0" }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="text-center py-20" style={{ color: isDark ? "rgba(255,255,255,0.3)" : "#aaa" }}>
          <FaClipboardCheck className="text-5xl mx-auto mb-4" />
          <p className="text-lg font-bold" style={{ color: isDark ? "#fff" : "#1a1a1a" }}>لا يوجد طلاب</p>
          <p className="text-sm" style={{ fontFamily: "sans-serif" }}>
            {showAllStudents ? "لم يسجل أي طالب معك حتى الآن" : "لا يوجد حصص في هذا اليوم"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredStudents.map((student) => (
            <div
              key={student.id}
              className="p-4 rounded-2xl transition-all duration-200"
              style={{
                background: student.status === 'present' 
                  ? "rgba(74,222,128,0.05)" 
                  : student.status === 'absent' 
                    ? "rgba(239,68,68,0.05)" 
                    : student.status === 'late' 
                      ? "rgba(251,191,36,0.05)"
                      : student.status === 'excused' 
                        ? "rgba(59,130,246,0.05)" 
                        : isDark ? "rgba(255,255,255,0.03)" : "#ffffff",
                border: `1px solid ${
                  student.status === 'present' 
                    ? "rgba(74,222,128,0.2)" 
                    : student.status === 'absent' 
                      ? "rgba(239,68,68,0.2)" 
                      : student.status === 'late'
                        ? "rgba(251,191,36,0.2)"
                        : student.status === 'excused' 
                          ? "rgba(59,130,246,0.2)" 
                          : isDark ? "rgba(255,255,255,0.1)" : "#e8e4de"
                }`,
                borderRight: student.status ? `3px solid ${
                  student.status === 'present' ? "#4ade80" : 
                  student.status === 'absent' ? "#ef4444" : 
                  student.status === 'late' ? "#f59e0b" : "#3b82f6"
                }` : "3px solid transparent",
              }}
            >
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                  style={{ background: `linear-gradient(135deg, #8b1a2e, ${isDark ? "#1c0c14" : "#6b1522"})` }}
                >
                  {student.avatar_url ? (
                    <img src={student.avatar_url} alt={student.name} className="w-full h-full object-cover rounded-lg" />
                  ) : (
                    student.name.charAt(0)
                  )}
                </div>

                {/* Student Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-bold" style={{ color: isDark ? "#fff" : "#1a1a1a" }}>
                      {student.name}
                    </h3>
                    <span className="text-xs" style={{ color: isDark ? "rgba(255,255,255,0.4)" : "#888" }}>
                      <FaGraduationCap className="inline-block ml-1" /> {student.grade}
                    </span>
                    <span className="text-xs" style={{ color: "#8b1a2e" }}>{student.subject}</span>
                    {student.schedule_id ? (
                      <span className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1" style={{
                        background: isDark ? "rgba(74,222,128,0.15)" : "rgba(74,222,128,0.08)",
                        color: "#4ade80",
                      }}>
                        <FaClock className="text-[8px]" /> {student.start_time} - {student.end_time}
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{
                        background: isDark ? "rgba(251,191,36,0.1)" : "rgba(251,191,36,0.08)",
                        color: "#f59e0b",
                      }}>
                        لا توجد حصة اليوم
                      </span>
                    )}
                  </div>
                </div>

                {/* Status Buttons */}
                {attendanceMode === "quick" ? (
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleStatusChange(student.id, 'present')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                        student.status === 'present' ? 'text-white' : ''
                      }`}
                      style={{
                        background: student.status === 'present' ? "#4ade80" : isDark ? "rgba(255,255,255,0.05)" : "#f5f4f2",
                        border: `1px solid ${student.status === 'present' ? "#4ade80" : isDark ? "rgba(255,255,255,0.1)" : "#d0ccc4"}`,
                        color: student.status === 'present' ? "#fff" : isDark ? "rgba(255,255,255,0.7)" : "#555",
                      }}
                    >
                      ✅
                    </button>
                    <button
                      onClick={() => handleStatusChange(student.id, 'absent')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                        student.status === 'absent' ? 'text-white' : ''
                      }`}
                      style={{
                        background: student.status === 'absent' ? "#ef4444" : isDark ? "rgba(255,255,255,0.05)" : "#f5f4f2",
                        border: `1px solid ${student.status === 'absent' ? "#ef4444" : isDark ? "rgba(255,255,255,0.1)" : "#d0ccc4"}`,
                        color: student.status === 'absent' ? "#fff" : isDark ? "rgba(255,255,255,0.7)" : "#555",
                      }}
                    >
                      ❌
                    </button>
                    <button
                      onClick={() => handleStatusChange(student.id, 'late')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                        student.status === 'late' ? 'text-white' : ''
                      }`}
                      style={{
                        background: student.status === 'late' ? "#f59e0b" : isDark ? "rgba(255,255,255,0.05)" : "#f5f4f2",
                        border: `1px solid ${student.status === 'late' ? "#f59e0b" : isDark ? "rgba(255,255,255,0.1)" : "#d0ccc4"}`,
                        color: student.status === 'late' ? "#fff" : isDark ? "rgba(255,255,255,0.7)" : "#555",
                      }}
                    >
                      ⏰
                    </button>
                    <button
                      onClick={() => handleStatusChange(student.id, 'excused')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                        student.status === 'excused' ? 'text-white' : ''
                      }`}
                      style={{
                        background: student.status === 'excused' ? "#3b82f6" : isDark ? "rgba(255,255,255,0.05)" : "#f5f4f2",
                        border: `1px solid ${student.status === 'excused' ? "#3b82f6" : isDark ? "rgba(255,255,255,0.1)" : "#d0ccc4"}`,
                        color: student.status === 'excused' ? "#fff" : isDark ? "rgba(255,255,255,0.7)" : "#555",
                      }}
                    >
                      📝
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleStatusChange(student.id, 'present')}
                        className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                          student.status === 'present' ? 'text-white' : ''
                        }`}
                        style={{
                          background: student.status === 'present' ? "#4ade80" : isDark ? "rgba(255,255,255,0.05)" : "#f5f4f2",
                          border: `1px solid ${student.status === 'present' ? "#4ade80" : isDark ? "rgba(255,255,255,0.1)" : "#d0ccc4"}`,
                          color: student.status === 'present' ? "#fff" : isDark ? "rgba(255,255,255,0.7)" : "#555",
                        }}
                      >
                        ✅ حاضر
                      </button>
                      <button
                        onClick={() => handleStatusChange(student.id, 'absent')}
                        className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                          student.status === 'absent' ? 'text-white' : ''
                        }`}
                        style={{
                          background: student.status === 'absent' ? "#ef4444" : isDark ? "rgba(255,255,255,0.05)" : "#f5f4f2",
                          border: `1px solid ${student.status === 'absent' ? "#ef4444" : isDark ? "rgba(255,255,255,0.1)" : "#d0ccc4"}`,
                          color: student.status === 'absent' ? "#fff" : isDark ? "rgba(255,255,255,0.7)" : "#555",
                        }}
                      >
                        ❌ غائب
                      </button>
                      <button
                        onClick={() => handleStatusChange(student.id, 'late')}
                        className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                          student.status === 'late' ? 'text-white' : ''
                        }`}
                        style={{
                          background: student.status === 'late' ? "#f59e0b" : isDark ? "rgba(255,255,255,0.05)" : "#f5f4f2",
                          border: `1px solid ${student.status === 'late' ? "#f59e0b" : isDark ? "rgba(255,255,255,0.1)" : "#d0ccc4"}`,
                          color: student.status === 'late' ? "#fff" : isDark ? "rgba(255,255,255,0.7)" : "#555",
                        }}
                      >
                        ⏰ متأخر
                      </button>
                      <button
                        onClick={() => handleStatusChange(student.id, 'excused')}
                        className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                          student.status === 'excused' ? 'text-white' : ''
                        }`}
                        style={{
                          background: student.status === 'excused' ? "#3b82f6" : isDark ? "rgba(255,255,255,0.05)" : "#f5f4f2",
                          border: `1px solid ${student.status === 'excused' ? "#3b82f6" : isDark ? "rgba(255,255,255,0.1)" : "#d0ccc4"}`,
                          color: student.status === 'excused' ? "#fff" : isDark ? "rgba(255,255,255,0.7)" : "#555",
                        }}
                      >
                        📝 معذور
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="ملاحظات..."
                      value={student.notes || ""}
                      onChange={(e) => handleNotesChange(student.id, e.target.value)}
                      className="w-full px-3 py-1 text-xs rounded-lg border focus:outline-none focus:ring-1 focus:ring-[#8b1a2e] transition-all"
                      style={{
                        background: isDark ? "rgba(255,255,255,0.05)" : "#ffffff",
                        borderColor: isDark ? "rgba(255,255,255,0.1)" : "#d0ccc4",
                        color: isDark ? "#ffffff" : "#1a1a1a",
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── Save Button ──────────────────────────────────────────────────────── */}
      <div className="flex justify-end gap-3">
        {saved && (
          <span className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl" style={{
            background: "rgba(74,222,128,0.15)",
            border: "1px solid rgba(74,222,128,0.3)",
            color: "#4ade80",
          }}>
            ✅ تم الحفظ بنجاح!
          </span>
        )}
        <button
          onClick={saveAttendance}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 text-sm font-medium text-white rounded-xl transition-all hover:opacity-90 disabled:opacity-50"
          style={{ background: "#8b1a2e" }}
        >
          <FaSave />
          {saving ? "جاري الحفظ..." : "حفظ الحضور"}
        </button>
      </div>

      {/* ─── History Modal ───────────────────────────────────────────────────── */}
      {showHistory && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={() => setShowHistory(false)}
        >
          <div
            className="relative w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-2xl p-6"
            style={{
              background: isDark ? "#1a2a40" : "#ffffff",
              border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "#e8e4de"}`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowHistory(false)}
              className="absolute top-4 left-4 w-8 h-8 rounded-full flex items-center justify-center text-xl transition-colors"
              style={{
                background: isDark ? "rgba(255,255,255,0.05)" : "#f5f4f2",
                color: isDark ? "#fff" : "#1a1a1a",
              }}
            >
              ×
            </button>

            <h2 className="text-xl font-bold mb-4" style={{ color: isDark ? "#fff" : "#1a1a1a" }}>
              <FaHistory className="inline-block ml-2" /> سجل الحضور
            </h2>

            <div className="space-y-2">
              {historyData.length === 0 ? (
                <div className="text-center py-8" style={{ color: isDark ? "rgba(255,255,255,0.3)" : "#aaa" }}>
                  لا يوجد سجل حضور
                </div>
              ) : (
                historyData.map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center gap-4 p-3 rounded-xl"
                    style={{
                      background: isDark ? "rgba(255,255,255,0.03)" : "#f5f4f2",
                    }}
                  >
                    <div className="flex-1">
                      <div className="text-sm font-medium" style={{ color: isDark ? "#fff" : "#1a1a1a" }}>
                        {(record as any).students?.full_name || "طالب"}
                      </div>
                      <div className="text-xs" style={{ color: isDark ? "rgba(255,255,255,0.4)" : "#888" }}>
                        {new Date(record.date).toLocaleDateString('ar-EG')}
                      </div>
                    </div>
                    <StatusBadge status={record.status} />
                    {record.notes && (
                      <span className="text-xs" style={{ color: isDark ? "rgba(255,255,255,0.3)" : "#aaa" }}>
                        {record.notes}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}