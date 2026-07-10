"use client";
import { useState } from "react";
import { useNavigate } from "react-router";
import { useDarkMode } from "../hooks/useDarkMode";

import { 
  FaChalkboardTeacher, FaUsers, FaCalendarAlt, FaClipboardCheck,
  FaMoneyBillWave, FaClock, FaGraduationCap, FaStar,
  FaCheckCircle, FaArrowLeft, FaArrowRight, FaUserPlus
} from "react-icons/fa";

// ─── Stats ────────────────────────────────────────────────────────────────────
const stats = [
  { value: "500+", label: "معلم نشط", icon: FaChalkboardTeacher },
  { value: "2,000+", label: "طالب", icon: FaUsers },
  { value: "15,000+", label: "حصة شهرياً", icon: FaCalendarAlt },
  { value: "95%", label: "نسبة رضا", icon: FaStar },
];

// ─── Features ─────────────────────────────────────────────────────────────────
const features = [
  {
    icon: FaUsers,
    title: "وصول لآلاف الطلاب",
    desc: "واصل مع طلاب جدد من كل أنحاء مصر بسهولة وسرعة"
  },
  {
    icon: FaMoneyBillWave,
    title: "زيادة الدخل",
    desc: "حدد أسعارك بنفسك وابدأ في تحقيق دخل إضافي"
  },
  {
    icon: FaClock,
    title: "مرونة في المواعيد",
    desc: "حدد مواعيدك بنفسك وفقاً لجدولك الشخصي"
  },
  {
    icon: FaClipboardCheck,
    title: "إدارة سهلة",
    desc: "تابع طلابك وحضورهم وتقاريرهم من مكان واحد"
  },
];

// ─── How It Works ─────────────────────────────────────────────────────────────
const steps = [
  { step: "01", title: "سجل كمعلم", desc: "أنشئ حسابك واملأ بياناتك المهنية", icon: "📝" },
  { step: "02", title: "أنشئ ملفك", desc: "أضف تخصصك وخبراتك وسعرك", icon: "📋" },
  { step: "03", title: "استقبل الطلاب", desc: "ابدأ في استقبال الطلاب وجدول حصصك", icon: "🎯" },
];

// ─── Testimonials ─────────────────────────────────────────────────────────────
const testimonials = [
  { 
    name: "أحمد محمد", 
    role: "معلم رياضيات", 
    text: "المنصة غيرت حياتي المهنية. وصلت لأكثر من 100 طالب في أول 3 شهور!",
    avatar: "https://i.pravatar.cc/150?img=33",
    rating: 5
  },
  { 
    name: "سارة علي", 
    role: "معلمة إنجليزي", 
    text: "سهولة الاستخدام والوصول للطلاب جعلتني أتفرغ للتدريس بشكل كامل.",
    avatar: "https://i.pravatar.cc/150?img=45",
    rating: 5
  },
  { 
    name: "محمود إبراهيم", 
    role: "معلم فيزياء", 
    text: "المنصة منظمة وتوفر كل الأدوات اللي يحتاجها المعلم لإدارة طلابه.",
    avatar: "https://i.pravatar.cc/150?img=52",
    rating: 5
  },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <svg key={s} className="w-3.5 h-3.5"
          style={{ color: s <= rating ? "#c9a84c" : "#d4cfc8" }}
          fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

function SectionLabel({ text, onDark = false }: { text: string; onDark?: boolean }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.15em] mb-2"
      style={{ color: onDark ? "rgba(255,255,255,0.55)" : "#8b1a2e", fontFamily: "sans-serif" }}>{text}</p>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function TeacherLandingPage() {
  const navigate = useNavigate();
  const { isDark } = useDarkMode();
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  return (
    <div className="min-h-screen transition-colors duration-300"
      style={{ background: isDark ? "#0f1c2e" : "#ffffff", fontFamily: "Georgia, serif", color: isDark ? "#fff" : "#1a1a1a" }}>

      {/* ─── HERO ────────────────────────────────────────────────────────────── */}
      <section className="relative text-center px-6 pt-20 pb-24 overflow-hidden transition-all duration-300"
        style={{ 
          background: isDark 
            ? "linear-gradient(150deg, #0f1c2e 0%, #1c0c14 60%, #0f1c2e 100%)" 
            : "linear-gradient(150deg, #ffffff 0%, #f5f4f2 60%, #ffffff 100%)", 
          borderBottom: "4px solid #8b1a2e" 
        }}>
        
        <div className="absolute inset-0 pointer-events-none"
          style={{ 
            background: isDark 
              ? "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(139,26,46,0.2) 0%, transparent 70%)" 
              : "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(139,26,46,0.05) 0%, transparent 70%)" 
          }} />

        <div className="inline-flex items-center gap-2 px-4 py-1.5 text-sm mb-6"
          style={{ 
            background: isDark ? "rgba(139,26,46,0.2)" : "rgba(139,26,46,0.08)", 
            border: isDark ? "1px solid rgba(139,26,46,0.5)" : "1px solid rgba(139,26,46,0.3)", 
            color: isDark ? "#f0b8be" : "#8b1a2e", 
            letterSpacing: ".05em", 
            borderRadius: "2px", 
            fontFamily: "sans-serif" 
          }}>
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#c9a84c" }} />
          انضم لأكبر منصة تعليمية في مصر
        </div>

        <h1 className="text-5xl md:text-7xl font-Georgia leading-tight mb-6" style={{ color: isDark ? "#fff" : "#1a1a1a" }}>
          <FaChalkboardTeacher className="inline-block ml-3" style={{ color: "#c9a84c" }} />
          <span style={{ color: "#c9a84c" }}>علم</span> و<span style={{ color: "#8b1a2e" }}>اكسب</span>
          <br />
          مع <span style={{ color: isDark ? "#f0e8d0" : "#8b1a2e" }}>EduConnect</span>
        </h1>

        <p className="text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed"
          style={{ color: isDark ? "rgba(255,255,255,0.6)" : "#666", fontFamily: "sans-serif" }}>
          انضم لأكبر مجتمع تعليمي في مصر. واصل مع آلاف الطلاب، حدد أسعارك، 
          <br /> وابني مستقبلك المهني مع EduConnect.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button onClick={() => navigate("/register")}
            className="flex items-center gap-2 px-8 py-3.5 font-semibold text-base text-white transition-all duration-200 hover:opacity-90"
            style={{ background: "#8b1a2e", borderRadius: "2px", fontFamily: "sans-serif" }}>
            <FaUserPlus />
            انضم كمعلم — مجاناً
          </button>
          <button onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}
            className="px-8 py-3.5 font-semibold text-base transition-all duration-200"
            style={{ 
              background: "transparent", 
              border: isDark ? "1px solid rgba(255,255,255,0.3)" : "1px solid #8b1a2e", 
              color: isDark ? "#fff" : "#8b1a2e", 
              borderRadius: "2px", 
              fontFamily: "sans-serif" 
            }}>
            شوف كيف بتشتغل ▶
          </button>
        </div>

        {/* Trust Badge */}
        <div className="mt-10 flex items-center justify-center gap-6 text-sm flex-wrap">
          <span className="flex items-center gap-2" style={{ color: isDark ? "rgba(255,255,255,0.4)" : "#888" }}>
            <FaCheckCircle style={{ color: "#4ade80" }} /> دعم فني 24/7
          </span>
          <span className="flex items-center gap-2" style={{ color: isDark ? "rgba(255,255,255,0.4)" : "#888" }}>
            <FaCheckCircle style={{ color: "#4ade80" }} /> آمن ومضمون
          </span>
        </div>
      </section>

      {/* ─── STATS ────────────────────────────────────────────────────────────── */}
      <section className="grid grid-cols-2 md:grid-cols-4 transition-colors"
        style={{ 
          borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "#e8e4de"}`, 
          background: isDark ? "#0f1c2e" : "#ffffff" 
        }}>
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="text-center py-10 px-4 transition-colors"
              style={{ borderRight: i < 3 ? `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "#e8e4de"}` : "none" }}>
              <Icon className="mx-auto text-3xl mb-2" style={{ color: "#8b1a2e" }} />
              <div className="text-4xl font-extrabold mb-1" style={{ color: "#c9a84c", fontFamily: "Georgia, serif" }}>{s.value}</div>
              <div className="text-sm" style={{ color: isDark ? "rgba(255,255,255,0.6)" : "#888", fontFamily: "sans-serif" }}>{s.label}</div>
            </div>
          );
        })}
      </section>

      {/* ─── FEATURES ────────────────────────────────────────────────────────── */}
      <section className="px-6 py-16 transition-colors"
        style={{ background: isDark ? "#1a2a40" : "#f5f4f2" }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <SectionLabel text="مميزات المنصة" />
            <h2 className="text-3xl font-bold" style={{ color: isDark ? "#fff" : "#1a1a1a" }}>
              ليه تختار <span style={{ color: "#8b1a2e" }}>EduConnect</span>؟
            </h2>
            <p className="mt-2" style={{ color: isDark ? "rgba(255,255,255,0.5)" : "#666", fontFamily: "sans-serif" }}>
              كل الأدوات اللي تحتاجها في مكان واحد
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <div key={i} 
                  className="p-6 text-center transition-all duration-300 hover:-translate-y-1"
                  style={{ 
                    background: isDark ? "rgba(255,255,255,0.03)" : "#ffffff", 
                    border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "#e8e4de"}`, 
                    borderTop: "3px solid #8b1a2e", 
                    borderRadius: "2px" 
                  }}>
                  <div className="w-14 h-14 mx-auto flex items-center justify-center text-2xl mb-4"
                    style={{ background: isDark ? "rgba(139,26,46,0.2)" : "rgba(139,26,46,0.08)", borderRadius: "2px", color: "#8b1a2e" }}>
                    <Icon />
                  </div>
                  <h3 className="text-lg font-bold mb-2" style={{ color: isDark ? "#fff" : "#1a1a1a" }}>{feature.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: isDark ? "rgba(255,255,255,0.5)" : "#666", fontFamily: "sans-serif" }}>
                    {feature.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ───────────────────────────────────────────────────── */}
      <section id="how-it-works" className="px-6 py-16" style={{ background: "#8b1a2e" }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <SectionLabel text="الطريقة" onDark />
            <h2 className="text-3xl font-bold text-white">ابدأ في 3 خطوات بسيطة</h2>
            <p className="mt-2" style={{ color: "rgba(255,255,255,0.6)", fontFamily: "sans-serif" }}>
              من التسجيل لاستقبال أول طالب في دقائق
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((item) => (
              <div key={item.step} className="flex flex-col items-center text-center p-8 transition-all duration-200 hover:-translate-y-1"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "2px" }}>
                <div className="w-16 h-16 flex items-center justify-center text-3xl mb-4"
                  style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "2px" }}>{item.icon}</div>
                <div className="text-xs font-mono tracking-widest mb-2" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "sans-serif" }}>{item.step}</div>
                <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.65)", fontFamily: "sans-serif" }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── TESTIMONIALS ───────────────────────────────────────────────────── */}
      <section id="testimonials" className="px-6 py-16 transition-colors"
        style={{ background: isDark ? "#1a2a40" : "#f5f4f2" }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10">
            <SectionLabel text="آراء المعلمين" />
            <h2 className="text-3xl font-bold" style={{ color: isDark ? "#fff" : "#1a1a1a" }}>
              ماذا يقول <span style={{ color: "#8b1a2e" }}>المعلمون</span> عنا؟
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <div key={i} className="p-6 transition-all duration-300 hover:-translate-y-1"
                style={{ 
                  background: isDark ? "#0f1c2e" : "#fff", 
                  border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "#e8e4de"}`, 
                  borderLeft: "3px solid #8b1a2e", 
                  borderRadius: "2px", 
                  boxShadow: isDark ? "none" : "0 2px 8px rgba(0,0,0,0.04)" 
                }}>
                <div className="flex items-center gap-3 mb-4">
                  <img src={t.avatar} alt={t.name} className="w-10 h-10 rounded-full object-cover" style={{ border: "2px solid #8b1a2e" }} />
                  <div>
                    <div className="text-sm font-bold" style={{ color: isDark ? "#fff" : "#1a1a1a" }}>{t.name}</div>
                    <div className="text-xs" style={{ color: "#8b1a2e", fontFamily: "sans-serif" }}>{t.role}</div>
                  </div>
                  <div className="ml-auto"><StarRating rating={t.rating} /></div>
                </div>
                <p className="text-sm leading-relaxed italic" style={{ color: isDark ? "#ddd" : "#555", fontFamily: "sans-serif" }}>"{t.text}"</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ────────────────────────────────────────────────────────────── */}
      <section className="relative text-center px-8 py-20 overflow-hidden" style={{ background: "#0f1c2e" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "4px", background: "#8b1a2e" }} />
        <p className="text-xs font-semibold uppercase tracking-[0.15em] mb-3" style={{ color: "#c9a84c", fontFamily: "sans-serif" }}>ابدأ الآن</p>
        <h2 className="text-4xl font-extrabold mb-4 text-white">كن جزء من نجاح EduConnect</h2>
        <p className="mb-8 max-w-xl mx-auto" style={{ color: "rgba(255,255,255,0.55)", fontFamily: "sans-serif" }}>
          انضم لأكثر من 500 معلم بيقدموا تعليم متميز لأكثر من 2,000 طالب على المنصة.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button onClick={() => navigate("/register")}
            className="px-10 py-4 font-semibold text-base transition-all duration-200 hover:opacity-90"
            style={{ background: "#8b1a2e", color: "#fff", borderRadius: "2px", fontFamily: "sans-serif", fontWeight: 600 }}>
            سجل كمعلم الآن
          </button>
          <button onClick={() => navigate("/login")}
            className="px-10 py-4 font-semibold text-base transition-all duration-200"
            style={{ 
              background: "transparent", 
              border: "1px solid rgba(255,255,255,0.3)", 
              color: "#fff", 
              borderRadius: "2px", 
              fontFamily: "sans-serif" 
            }}>
            تسجيل الدخول
          </button>
        </div>
      </section>
    </div>
  );
}