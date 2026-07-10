import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useDarkMode } from "../../hooks/useDarkMode";
import { FaSave, FaDollarSign, FaChalkboardTeacher } from "react-icons/fa";

// ─── Section ─────────────────────────────────────────────────────────────────

function Section({ title, children, isDark }: { title: string; children: React.ReactNode; isDark: boolean }) {
  return (
    <div
      className="border rounded overflow-hidden"
      style={{
        background: isDark ? "rgba(255,255,255,0.03)" : "#ffffff",
        borderColor: isDark ? "rgba(255,255,255,0.1)" : "#e8e4de",
      }}
    >
      <div
        className="px-6 py-4 border-b"
        style={{ borderBottomColor: isDark ? "rgba(255,255,255,0.05)" : "#e8e4de" }}
      >
        <h3 className="text-sm font-semibold" style={{ color: isDark ? "rgba(255,255,255,0.7)" : "#1a1a1a" }}>
          {title}
        </h3>
      </div>
      <div
        className="divide-y"
        style={{ borderColor: isDark ? "rgba(255,255,255,0.05)" : "#e8e4de" }}
      >
        {children}
      </div>
    </div>
  );
}

function Row({
  label,
  desc = "",
  children,
  isDark,
}: {
  label: string;
  desc?: string;
  children: React.ReactNode;
  isDark: boolean;
}) {
  return (
    <div
      className="flex items-center justify-between gap-4 px-6 py-4 transition-colors"
      style={{ background: isDark ? "transparent" : "#ffffff" }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.05)" : "#f5f4f2";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
      }}
    >
      <div className="min-w-0">
        <p className="text-sm font-medium" style={{ color: isDark ? "#ffffff" : "#1a1a1a" }}>
          {label}
        </p>
        {desc && (
          <p className="text-xs mt-0.5" style={{ color: isDark ? "rgba(255,255,255,0.4)" : "#888888" }}>
            {desc}
          </p>
        )}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

// ─── Pricing Types ───────────────────────────────────────────────────────────
const PRICING_TYPES = [
  { key: "unified_private", label: "برايفت (فردي)", icon: "👤" },
  { key: "unified_group", label: "مجموعة (جماعي)", icon: "👥" },
  { key: "unified_center", label: "سنتر", icon: "🏫" },
  { key: "unified_online", label: "أونلاين", icon: "💻" },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function TeacherSettingsPage() {
  const { isDark } = useDarkMode();
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  // Account
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [photo, setPhoto] = useState("");
  const [phone, setPhone] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [teacherId, setTeacherId] = useState<string | null>(null);

  // Teacher Profile
  const [specialty, setSpecialty] = useState("");
  const [qualification, setQualification] = useState("");
  const [yearsOfExperience, setYearsOfExperience] = useState(0);
  const [bio, setBio] = useState("");
  const [subjects, setSubjects] = useState<string[]>([]);
  const [subjectInput, setSubjectInput] = useState("");

  // Pricing
  const [pricing, setPricing] = useState({
    unified_private: 0,
    unified_group: 0,
    unified_center: 0,
    unified_online: 0,
  });

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!supabase) { setLoading(false); return; }
      
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) { setLoading(false); return; }
      
      if (!mounted) return;
      setUserId(auth.user.id);
      setEmail(auth.user.email ?? "");

      // جلب بيانات الملف الشخصي
      const { data: prof } = await supabase
        .from("profiles")
        .select("full_name, phone, avatar_url")
        .eq("id", auth.user.id)
        .maybeSingle();
      
      if (prof && mounted) {
        setName(prof.full_name ?? "");
        setPhone(prof.phone ?? "");
        setPhoto(prof.avatar_url ?? "");
      }

      // جلب بيانات المعلم
      const { data: teacher } = await supabase
        .from("teachers")
        .select("*")
        .eq("user_id", auth.user.id)
        .maybeSingle();

      if (teacher && mounted) {
        setTeacherId(teacher.id);
        setSpecialty(teacher.specialty || "");
        setQualification(teacher.qualification || "");
        setYearsOfExperience(teacher.years_of_experience || 0);
        setBio(teacher.bio || "");
        setSubjects(teacher.subjects || []);
        
        // جلب الأسعار
        if (teacher.pricing) {
          setPricing({
            unified_private: teacher.pricing.unified_private || 0,
            unified_group: teacher.pricing.unified_group || 0,
            unified_center: teacher.pricing.unified_center || 0,
            unified_online: teacher.pricing.unified_online || 0,
          });
        }
      }
      
      setLoading(false);
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const addSubject = () => {
    if (subjectInput.trim() && !subjects.includes(subjectInput.trim())) {
      setSubjects([...subjects, subjectInput.trim()]);
      setSubjectInput("");
    }
  };

  const removeSubject = (subject: string) => {
    setSubjects(subjects.filter(s => s !== subject));
  };

  const saveChanges = async () => {
    if (!supabase || !userId) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      return;
    }

    setLoading(true);
    try {
      // 1. تحديث الملف الشخصي
      await supabase.from("profiles").upsert({ 
        id: userId, 
        full_name: name, 
        phone,
        updated_at: new Date().toISOString()
      });

      // 2. تحديث بيانات المعلم
      if (teacherId) {
        await supabase
          .from("teachers")
          .update({
            specialty: specialty,
            qualification: qualification,
            years_of_experience: yearsOfExperience,
            bio: bio,
            subjects: subjects,
            pricing: {
              unified: true,
              ...pricing
            },
            updated_at: new Date().toISOString()
          })
          .eq("id", teacherId);
      }

      // 3. تحديث البريد الإلكتروني إذا تغير
      const { data: auth } = await supabase.auth.getUser();
      if (auth?.user?.email !== email && email) {
        await supabase.auth.updateUser({ email });
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (error) {
      console.error("Error saving:", error);
      alert("حدث خطأ في حفظ التغييرات");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{
          background: isDark ? "#0f1c2e" : "#f5f4f2",
          color: isDark ? "#ffffff" : "#1a1a1a",
        }}
      >
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#8b1a2e] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm" style={{ color: isDark ? "rgba(255,255,255,0.5)" : "#666" }}>
            جاري التحميل...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen transition-colors duration-300"
      style={{
        background: isDark ? "#0f1c2e" : "#f5f4f2",
        fontFamily: "Georgia, serif",
        color: isDark ? "#ffffff" : "#1a1a1a",
      }}
      dir="rtl"
    >
      <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">
        {/* Header */}
        <div>
          <div
            className="inline-flex items-center gap-2 rounded px-3 py-1 text-xs mb-3"
            style={{
              background: isDark ? "rgba(139,26,46,0.15)" : "rgba(139,26,46,0.08)",
              border: `1px solid ${isDark ? "rgba(139,26,46,0.4)" : "rgba(139,26,46,0.3)"}`,
              color: isDark ? "#f0b8be" : "#8b1a2e",
              fontFamily: "sans-serif",
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#c9a84c" }} />
            إعدادات المعلم
          </div>
          <h1 className="text-3xl font-extrabold" style={{ color: isDark ? "#fff" : "#1a1a1a" }}>
            الإعدادات
          </h1>
          <p className="text-sm mt-1" style={{ color: isDark ? "rgba(255,255,255,0.5)" : "#666666", fontFamily: "sans-serif" }}>
            تحكم في حسابك وبياناتك المهنية وأسعارك
          </p>
        </div>

        {/* ─── ACCOUNT ── */}
        <div className="space-y-5">
          {/* Avatar */}
          <div
            className="border rounded-3xl p-6 flex items-center gap-5"
            style={{
              background: isDark ? "rgba(255,255,255,0.03)" : "#ffffff",
              borderColor: isDark ? "rgba(255,255,255,0.1)" : "#e8e4de",
            }}
          >
            <div className="relative w-12 h-12">
              {photo ? (
                <img
                  src={photo}
                  alt={name}
                  className="w-12 h-12 rounded-lg object-cover border"
                  style={{ borderColor: "rgba(139,26,46,0.4)" }}
                />
              ) : (
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-lg border"
                  style={{
                    background: "rgba(139,26,46,0.5)",
                    borderColor: "rgba(139,26,46,0.4)",
                  }}
                >
                  {name ? name.charAt(0).toUpperCase() : "؟"}
                </div>
              )}
              <button
                className="absolute -bottom-1 -left-1 w-7 h-7 rounded-xl flex items-center justify-center text-xs hover:scale-110 transition-transform"
                style={{ background: "#8b1a2e", color: "#fff" }}
              >
                ✏️
              </button>
            </div>
            <div>
              <h3 className="text-base font-bold" style={{ color: isDark ? "#fff" : "#1a1a1a" }}>
                {name || "معلم"}
              </h3>
              <p className="text-sm mt-0.5" style={{ color: isDark ? "rgba(255,255,255,0.5)" : "#666666" }}>
                {email}
              </p>
              <span
                className="text-xs px-2.5 py-0.5 rounded-full mt-1.5 inline-block"
                style={{
                  background: "rgba(139,26,46,0.15)",
                  border: "1px solid rgba(139,26,46,0.3)",
                  color: "#f0b8be",
                }}
              >
                <FaChalkboardTeacher className="inline-block ml-1" /> معلم
              </span>
            </div>
          </div>

          {/* المعلومات الشخصية */}
          <Section title="المعلومات الشخصية" isDark={isDark}>
            {[
              { label: "الاسم الكامل", value: name, setter: setName, type: "text", placeholder: "أدخل اسمك الكامل" },
              { label: "البريد الإلكتروني", value: email, setter: setEmail, type: "email", placeholder: "أدخل بريدك الإلكتروني" },
              { label: "رقم الهاتف", value: phone, setter: setPhone, type: "tel", placeholder: "أدخل رقم هاتفك" },
            ].map((f, i) => (
              <Row key={i} label={f.label} isDark={isDark}>
                <input
                  type={f.type}
                  value={f.value}
                  onChange={(e) => f.setter(e.target.value)}
                  placeholder={f.placeholder}
                  className="border rounded-xl px-3 py-2 text-sm text-left focus:outline-none focus:ring-1 transition-colors w-52 md:w-64"
                  style={{
                    background: isDark ? "rgba(255,255,255,0.05)" : "#ffffff",
                    borderColor: isDark ? "rgba(255,255,255,0.1)" : "#d0ccc4",
                    color: isDark ? "#fff" : "#1a1a1a",
                  }}
                  dir="ltr"
                />
              </Row>
            ))}
          </Section>

          {/* المعلومات المهنية */}
          <Section title="المعلومات المهنية" isDark={isDark}>
            <Row label="التخصص" isDark={isDark}>
              <input
                type="text"
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                placeholder="مثال: رياضيات"
                className="border rounded-xl px-3 py-2 text-sm text-left focus:outline-none focus:ring-1 transition-colors w-52 md:w-64"
                style={{
                  background: isDark ? "rgba(255,255,255,0.05)" : "#ffffff",
                  borderColor: isDark ? "rgba(255,255,255,0.1)" : "#d0ccc4",
                  color: isDark ? "#fff" : "#1a1a1a",
                }}
                dir="ltr"
              />
            </Row>
            <Row label="المؤهل العلمي" isDark={isDark}>
              <input
                type="text"
                value={qualification}
                onChange={(e) => setQualification(e.target.value)}
                placeholder="مثال: بكالوريوس رياضيات"
                className="border rounded-xl px-3 py-2 text-sm text-left focus:outline-none focus:ring-1 transition-colors w-52 md:w-64"
                style={{
                  background: isDark ? "rgba(255,255,255,0.05)" : "#ffffff",
                  borderColor: isDark ? "rgba(255,255,255,0.1)" : "#d0ccc4",
                  color: isDark ? "#fff" : "#1a1a1a",
                }}
                dir="ltr"
              />
            </Row>
            <Row label="سنوات الخبرة" isDark={isDark}>
              <input
                type="number"
                value={yearsOfExperience}
                onChange={(e) => setYearsOfExperience(Number(e.target.value))}
                min="0"
                className="border rounded-xl px-3 py-2 text-sm text-left focus:outline-none focus:ring-1 transition-colors w-24"
                style={{
                  background: isDark ? "rgba(255,255,255,0.05)" : "#ffffff",
                  borderColor: isDark ? "rgba(255,255,255,0.1)" : "#d0ccc4",
                  color: isDark ? "#fff" : "#1a1a1a",
                }}
                dir="ltr"
              />
            </Row>
            <Row label="السيرة الذاتية" desc="اختصار عن خبراتك" isDark={isDark}>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="اكتب عن خبراتك وطريقة تدريسك..."
                rows={2}
                className="border rounded-xl px-3 py-2 text-sm text-left focus:outline-none focus:ring-1 transition-colors w-52 md:w-64 resize-none"
                style={{
                  background: isDark ? "rgba(255,255,255,0.05)" : "#ffffff",
                  borderColor: isDark ? "rgba(255,255,255,0.1)" : "#d0ccc4",
                  color: isDark ? "#fff" : "#1a1a1a",
                }}
              />
            </Row>
          </Section>

          {/* الأسعار */}
          <Section title="أسعار الحصص" isDark={isDark}>
            {PRICING_TYPES.map(({ key, label, icon }) => (
              <Row key={key} label={label} desc="بالجنيه المصري" isDark={isDark}>
                <div className="flex items-center gap-2">
                  <span className="text-sm" style={{ color: isDark ? "rgba(255,255,255,0.4)" : "#888" }}>ج.م</span>
                  <input
                    type="number"
                    value={pricing[key as keyof typeof pricing]}
                    onChange={(e) => setPricing({
                      ...pricing,
                      [key]: Number(e.target.value)
                    })}
                    min="0"
                    step="5"
                    className="border rounded-xl px-3 py-2 text-sm text-center focus:outline-none focus:ring-1 transition-colors w-24"
                    style={{
                      background: isDark ? "rgba(255,255,255,0.05)" : "#ffffff",
                      borderColor: isDark ? "rgba(255,255,255,0.1)" : "#d0ccc4",
                      color: isDark ? "#fff" : "#1a1a1a",
                    }}
                  />
                </div>
              </Row>
            ))}
            <div
              className="px-6 py-3 text-xs"
              style={{
                background: isDark ? "rgba(201,168,76,0.05)" : "rgba(201,168,76,0.03)",
                color: isDark ? "rgba(255,255,255,0.4)" : "#888",
                fontFamily: "sans-serif",
              }}
            >
              <FaDollarSign className="inline-block ml-1" style={{ color: "#c9a84c" }} />
              هذه الأسعار تظهر للطلاب عند حجز حصة معك
            </div>
          </Section>

          {/* الأمان */}
          <Section title="الأمان" isDark={isDark}>
            <Row label="تغيير كلمة المرور" desc="آخر تغيير منذ 3 أشهر" isDark={isDark}>
              <button
                className="text-xs border px-4 py-2 rounded-xl transition-all hover:opacity-80"
                style={{
                  background: isDark ? "rgba(255,255,255,0.05)" : "#f5f4f2",
                  borderColor: isDark ? "rgba(255,255,255,0.1)" : "#d0ccc4",
                  color: isDark ? "rgba(255,255,255,0.7)" : "#666666",
                }}
              >
                تغيير
              </button>
            </Row>
            <Row label="التحقق بخطوتين" desc="تأمين إضافي لحسابك" isDark={isDark}>
              <button
                className="text-xs text-white px-4 py-2 rounded-xl hover:opacity-90 transition-all"
                style={{ background: "#8b1a2e" }}
              >
                تفعيل
              </button>
            </Row>
          </Section>

          {/* خطر */}
          <Section title="خطر" isDark={isDark}>
            <Row label="حذف الحساب" desc="هذا الإجراء لا يمكن التراجع عنه" isDark={isDark}>
              <button
                className="text-xs border px-4 py-2 rounded-xl transition-all hover:opacity-80"
                style={{
                  background: "rgba(255,80,80,0.1)",
                  borderColor: "rgba(255,80,80,0.2)",
                  color: "#ff7a7a",
                }}
              >
                حذف
              </button>
            </Row>
          </Section>
        </div>

        {/* Save button */}
        <div className="flex justify-end pb-4">
          <button
            onClick={saveChanges}
            disabled={loading}
            className={`flex items-center gap-2 px-8 py-3 rounded-2xl text-sm font-semibold transition-all duration-300 ${
              saved ? "border" : "hover:opacity-90"
            } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
            style={
              saved
                ? {
                    background: "rgba(201,168,76,0.15)",
                    borderColor: "rgba(201,168,76,0.4)",
                    color: "#c9a84c",
                  }
                : { background: "#8b1a2e", color: "#fff" }
            }
          >
            <FaSave />
            {loading ? "جاري الحفظ..." : saved ? "✅ تم الحفظ!" : "💾 حفظ التغييرات"}
          </button>
        </div>
      </div>
    </div>
  );
}