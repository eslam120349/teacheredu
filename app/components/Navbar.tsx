import { Link, useLocation, useNavigate } from "react-router";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useDarkMode } from "../hooks/useDarkMode";

// استيراد أيقونات
import {
  FaTh,                // ⊞   (الرئيسية)
  FaChalkboardTeacher, // 👨‍🏫 (المدرسين)
  FaChild,             // 👦   (الطلاب)
  FaCalendarAlt,       // 📅   (الجدول)
  FaClipboardCheck,    // ✅   (الحضور)
  FaFileAlt,           // 📄   (التقارير)
  FaCog,               // ⚙️   (الإعدادات)
  FaSun,               // ☀️
  FaMoon,              // 🌙
  FaBell,              // 🔔
  FaSignOutAlt         // تسجيل الخروج
} from "react-icons/fa";

// ─── Nav Items للمعلم ─────────────────────────────────────────
const navItems = [
  { to: "/dashboard/teacher", icon: FaTh, label: "الرئيسية" },
  { to: "dashboard/schedule", icon: FaCalendarAlt, label: "الجدول" },
  { to: "dashboard/students", icon: FaChild, label: "الطلاب" },
  { to: "dashboard/attendance", icon: FaClipboardCheck, label: "الحضور" },
  { to: "dashboard/settings", icon: FaCog, label: "الإعدادات" },
];

// ─── Helpers ─────────────────────────────────────────
function getInitial(name: string) {
  return name?.charAt(0)?.toUpperCase() || "؟";
}

// ─── Skeleton ─────────────────────────────────────────
function NavbarSkeleton() {
  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5"
      style={{ background: "rgba(139,26,46,0.08)", border: "1px solid rgba(139,26,46,0.2)", borderRadius: "2px" }}
    >
      <div className="w-7 h-7 rounded animate-pulse" style={{ background: "rgba(139,26,46,0.15)" }} />
      <div className="w-20 h-3 rounded animate-pulse" style={{ background: "rgba(139,26,46,0.15)" }} />
    </div>
  );
}

// ─── Component ─────────────────────────────────────────
export default function TeacherNavbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isDark, toggleDarkMode } = useDarkMode();

  const [menuOpen, setMenuOpen] = useState(false);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [userData, setUserData] = useState<{
    name: string;
    avatar: string;
  } | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // ─── Load user data ───────────────────────────────────
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      if (!supabase) {
        setAuthed(false);
        setLoadingUser(false);
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;

      if (!user) {
        setAuthed(false);
        setLoadingUser(false);
        return;
      }

      setAuthed(true);

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("Profile error:", error);
      }

      if (mounted) {
        setUserData({
          name: profile?.full_name || "مستخدم",
          avatar: profile?.avatar_url || "",
        });
        setLoadingUser(false);
      }
    };

    init();

    const { data: sub } =
      supabase?.auth.onAuthStateChange((_e, session) => {
        setAuthed(!!session);
      }) ?? { subscription: { unsubscribe() { } } as any };

    return () => {
      mounted = false;
      // @ts-ignore
      sub.subscription?.unsubscribe?.();
    };
  }, []);

  // ─── UI ──────────────────────────────────────────────
  return (
    <nav
      dir="rtl"
      className="sticky top-0 z-50 transition-colors duration-300"
      style={{
        background: isDark ? "#0f1c2e" : "#ffffff",
        borderBottom: `3px solid #8b1a2e`,
        fontFamily: "Georgia, serif",
      }}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-16 gap-6">

        {/* ── Logo ── */}
        <Link to="/teacher" className="flex items-center gap-2 flex-shrink-0 no-underline">
          <div
            className="w-9 h-9 flex items-center justify-center text-sm font-bold text-white"
            style={{ background: "#8b1a2e", borderRadius: "2px" }}
          >
            E
          </div>
          <span className="text-base font-bold transition-colors" style={{ color: isDark ? "#ffffff" : "#8b1a2e", fontFamily: "Georgia, serif" }}>
            EduConnect
          </span>
          <span className="text-xs mr-1 px-2 py-0.5 rounded" style={{ background: "#c9a84c", color: "#fff" }}>
            معلم
          </span>
        </Link>

        {/* ── Desktop Nav Links ── */}
        <div className="hidden md:flex items-center gap-1 flex-1 justify-center">
          {authed ? (
            navItems.map(({ to, icon: Icon, label }) => {
              const isActive = location.pathname === to;
              return (
                <Link
                  key={to}
                  to={to}
                  className="relative flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium no-underline transition-all duration-200"
                  style={{
                    color: isActive ? "#8b1a2e" : isDark ? "#cccccc" : "#444444",
                    borderBottom: isActive ? "2px solid #8b1a2e" : "2px solid transparent",
                    fontFamily: "sans-serif",
                  }}
                >
                  <Icon style={{ fontSize: "1rem" }} />
                  <span>{label}</span>
                </Link>
              );
            })
          ) : (
            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="text-sm font-medium no-underline"
                style={{ color: isDark ? "#cccccc" : "#444444", fontFamily: "sans-serif" }}
              >
                دخول
              </Link>
              <Link
                to="/register"
                className="text-sm font-medium text-white no-underline px-4 py-2 transition-opacity hover:opacity-90"
                style={{ background: "#8b1a2e", borderRadius: "2px", fontFamily: "sans-serif" }}
              >
                إنشاء حساب معلم
              </Link>
            </div>
          )}
        </div>

        {/* ── Right Side ── */}
        <div className="hidden md:flex items-center gap-3">

          {/* Theme Toggle Button (شمس/قمر) */}
          <button
            onClick={toggleDarkMode}
            className="relative w-9 h-9 flex items-center justify-center transition-colors"
            style={{
              border: `1px solid ${isDark ? "rgba(255,255,255,0.2)" : "#e8e4de"}`,
              borderRadius: "2px",
              background: isDark ? "rgba(255,255,255,0.03)" : "#ffffff",
              color: isDark ? "#c9a84c" : "#8b1a2e",
              fontSize: "18px",
            }}
            title={isDark ? "الوضع النهاري" : "الوضع الليلي"}
          >
            {isDark ? <FaSun /> : <FaMoon />}
          </button>

          {/* Notifications */}
          <button
            className="relative w-9 h-9 flex items-center justify-center transition-colors hover:bg-gray-100 dark:hover:bg-white/5"
            style={{
              border: `1px solid ${isDark ? "rgba(255,255,255,0.2)" : "#e8e4de"}`,
              borderRadius: "2px",
              background: isDark ? "rgba(255, 0, 0, 0.03)" : "#ffffff",
            }}
          >
            <FaBell style={{ fontSize: "15px", color: isDark ? "#ffffff" : "#8b1a2e" }} />
            <span
              className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full animate-pulse"
              style={{ background: "#ef4444" }}
            />
          </button>

          {/* User / Loading */}
          {loadingUser ? (
            <NavbarSkeleton />
          ) : authed && userData ? (
            <>
              <button
                onClick={() => navigate("/teacher/profile")}
                className="flex items-center gap-2 px-3 py-1.5 transition-colors hover:bg-gray-50 dark:hover:bg-white/5"
                style={{
                  border: `1px solid ${isDark ? "rgba(255,255,255,0.2)" : "#e8e4de"}`,
                  borderRadius: "2px",
                  background: isDark ? "rgba(255,255,255,0.03)" : "#ffffff",
                }}
              >
                {userData.avatar ? (
                  <img
                    src={userData.avatar}
                    alt={userData.name}
                    className="w-7 h-7 object-cover"
                    style={{ borderRadius: "2px", border: "1px solid rgba(139,26,46,0.3)" }}
                  />
                ) : (
                  <div
                    className="w-7 h-7 flex items-center justify-center text-xs font-bold text-white"
                    style={{ background: "#8b1a2e", borderRadius: "2px" }}
                  >
                    {getInitial(userData.name)}
                  </div>
                )}
                <span className="text-sm transition-colors" style={{ color: isDark ? "#ffffff" : "#1a1a1a", fontFamily: "sans-serif" }}>
                  {userData.name}
                </span>
              </button>

              <button
                onClick={async () => {
                  if (supabase) await supabase.auth.signOut();
                  navigate("/login");
                }}
                className="flex items-center gap-2 px-3 py-1.5 text-sm transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
                style={{
                  border: `1px solid ${isDark ? "rgba(255,255,255,0.2)" : "#e8e4de"}`,
                  borderRadius: "2px",
                  color: isDark ? "#cccccc" : "#666666",
                  fontFamily: "sans-serif",
                  background: isDark ? "rgba(255,255,255,0.03)" : "#ffffff",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "#8b1a2e";
                  e.currentTarget.style.borderColor = "rgba(139,26,46,0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = isDark ? "#cccccc" : "#666666";
                  e.currentTarget.style.borderColor = isDark ? "rgba(255,255,255,0.2)" : "#e8e4de";
                }}
              >
                <FaSignOutAlt />
                <span>تسجيل الخروج</span>
              </button>
            </>
          ) : null}
        </div>

        {/* ── Mobile Hamburger ── */}
        <button
          className="md:hidden flex items-center justify-center w-9 h-9 transition-colors"
          style={{
            border: `1px solid ${isDark ? "rgba(255,255,255,0.2)" : "#e8e4de"}`,
            borderRadius: "2px",
            background: isDark ? "rgba(255,255,255,0.03)" : "#ffffff",
            color: "#8b1a2e",
            fontSize: "18px",
          }}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? "✕" : "☰"}
        </button>
      </div>

      {/* ── Mobile Menu ── */}
      {menuOpen && (
        <div
          className="md:hidden px-4 py-3 space-y-1 transition-colors"
          style={{
            background: isDark ? "#0f1c2e" : "#ffffff",
            borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "#e8e4de"}`,
          }}
        >
          {/* Theme toggle in mobile */}
          <button
            onClick={toggleDarkMode}
            className="flex items-center gap-2 w-full px-3 py-2.5 text-sm font-medium transition-colors"
            style={{
              color: isDark ? "#c9a84c" : "#8b1a2e",
              background: "transparent",
              border: "none",
              fontFamily: "sans-serif",
            }}
          >
            <span>{isDark ? <FaSun /> : <FaMoon />}</span>
            <span>{isDark ? "الوضع النهاري" : "الوضع الليلي"}</span>
          </button>

          {authed && navItems.map((item) => {
            const isActive = location.pathname === item.to;
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium no-underline transition-colors"
                style={{
                  color: isActive ? "#8b1a2e" : isDark ? "#cccccc" : "#444444",
                  background: isActive ? "rgba(139,26,46,0.06)" : "transparent",
                  borderRight: isActive ? "3px solid #8b1a2e" : "3px solid transparent",
                  fontFamily: "sans-serif",
                }}
              >
                <Icon style={{ fontSize: "1rem" }} />
                <span>{item.label}</span>
              </Link>
            );
          })}

          {authed && (
            <button
              onClick={async () => {
                if (supabase) await supabase.auth.signOut();
                navigate("/login");
                setMenuOpen(false);
              }}
              className="w-full flex items-center gap-2 text-right px-3 py-2.5 text-sm transition-colors"
              style={{
                color: "#8b1a2e",
                fontFamily: "sans-serif",
                background: "transparent",
                border: "none",
                borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "#e8e4de"}`,
                marginTop: "4px",
                paddingTop: "12px",
              }}
            >
              <FaSignOutAlt />
              <span>تسجيل الخروج</span>
            </button>
          )}
        </div>
      )}
    </nav>
  );
}