import { useState, useEffect } from "react";
import { useNavigate, redirect } from "react-router";
import { supabase } from "../../lib/supabase";
import { useDarkMode } from "../../hooks/useDarkMode";

export async function loader() {
  if (!supabase) return null;
  
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role === "teacher") {
      throw redirect("/teacher");
    } else if (profile?.role === "parent") {
      throw redirect("/dashboard");
    } else if (profile?.role === "admin") {
      throw redirect("/admin");
    }
  }

  return null;
}

export default function TeacherLogin() {
  const navigate = useNavigate();
  const { isDark, toggleDarkMode, mounted } = useDarkMode();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [showResendButton, setShowResendButton] = useState(false);

  useEffect(() => {
    const savedEmail = localStorage.getItem("teacher_remembered_email");
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setShowResendButton(false);
    
    if (!supabase) {
      setError("Supabase غير مهيّأ. الرجاء ضبط مفاتيح البيئة.");
      return;
    }
    
    setLoading(true);

    try {
      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        if (signInError.message.includes("Email not confirmed") || 
            signInError.message.includes("email not verified")) {
          setError("لم يتم تأكيد البريد الإلكتروني بعد. الرجاء التحقق من بريدك الإلكتروني.");
          setShowResendButton(true);
        } else if (signInError.message.includes("Invalid login credentials")) {
          setError("البريد الإلكتروني أو كلمة المرور غير صحيحة");
        } else {
          setError(signInError.message);
        }
        setLoading(false);
        return;
      }

      if (!authData.user) {
        setError("حدث خطأ في تسجيل الدخول");
        setLoading(false);
        return;
      }

      // جلب بيانات المستخدم من profiles
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, role, phone")
        .eq("id", authData.user.id)
        .single();

      if (profileError || !profile) {
        setError("لم يتم العثور على بيانات المستخدم");
        setLoading(false);
        return;
      }

      // 🔥 التحقق من الدور - يجب أن يكون teacher
      if (profile.role !== "teacher") {
        setError("هذا الحساب ليس حساب معلم");
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      // 🔥 التحقق من وجود المعلم في جدول teachers
      const { data: teacherData, error: teacherError } = await supabase
        .from("teachers")
        .select("id, is_active")
        .eq("user_id", authData.user.id)
        .single();

      if (teacherError || !teacherData) {
        setError("لم يتم العثور على بيانات المعلم. يرجى التواصل مع الدعم الفني.");
        setLoading(false);
        return;
      }

      if (!teacherData.is_active) {
        setError("حساب المعلم غير مفعل. يرجى التواصل مع الدعم الفني.");
        setLoading(false);
        return;
      }

      // حفظ بيانات الجلسة
      if (rememberMe) {
        localStorage.setItem("teacher_remembered_email", email);
        localStorage.setItem("teacher_id", profile.id);
        localStorage.setItem("teacher_name", profile.full_name);
        localStorage.setItem("teacher_phone", profile.phone || "");
        localStorage.setItem("teacher_role", profile.role);
      } else {
        sessionStorage.setItem("teacher_id", profile.id);
        sessionStorage.setItem("teacher_name", profile.full_name);
        sessionStorage.setItem("teacher_phone", profile.phone || "");
        sessionStorage.setItem("teacher_role", profile.role);
      }

      setSuccess("تم تسجيل الدخول بنجاح! جاري التوجيه...");
      
      setTimeout(() => {
        navigate("/dashboard");
      }, 1000);

    } catch (err: any) {
      setError("حدث خطأ غير متوقع: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // إعادة إرسال رابط التأكيد
  const handleResendConfirmation = async () => {
    if (!email) {
      setError("الرجاء إدخال البريد الإلكتروني أولاً");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/verify`,
        },
      });

      if (error) {
        setError(error.message);
      } else {
        setSuccess("✅ تم إرسال رابط التأكيد مرة أخرى. الرجاء التحقق من بريدك الإلكتروني.");
        setShowResendButton(false);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    if (!supabase) {
      setError("Supabase غير مهيّأ. الرجاء ضبط مفاتيح البيئة.");
      return;
    }
    
    setLoading(true);
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { 
        redirectTo: `${window.location.origin}/auth/verify`,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });

    if (error) {
      setLoading(false);
      setError(error.message);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError("الرجاء إدخال بريدك الإلكتروني أولاً");
      return;
    }

    if (!supabase) {
      setError("Supabase غير مهيّأ");
      return;
    }

    setLoading(true);
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/teacher/reset-password`,
      });

      if (error) {
        setError(error.message);
      } else {
        setSuccess("✅ تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) {
    return null;
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 transition-colors duration-300"
      style={{
        background: isDark
          ? "linear-gradient(150deg, #0f1c2e 0%, #1c0c14 60%, #0f1c2e 100%)"
          : "linear-gradient(150deg, #ffffff 0%, #f5f4f2 60%, #ffffff 100%)",
        color: isDark ? "#fff" : "#1a1a1a",
        fontFamily: "Georgia, serif",
      }}
      dir="rtl"
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] blur-[120px] rounded-full"
          style={{
            background: isDark
              ? "rgba(139, 26, 46, 0.15)"
              : "rgba(139, 26, 46, 0.06)",
          }}
        />
      </div>

      <div
        className="relative w-full max-w-md backdrop-blur-xl border rounded-3xl p-8 shadow-2xl transition-all duration-300"
        style={{
          background: isDark ? "rgba(255,255,255,0.03)" : "#ffffff",
          borderColor: isDark ? "rgba(255,255,255,0.1)" : "#e8e4de",
          boxShadow: isDark
            ? "0 20px 30px -10px rgba(0,0,0,0.5)"
            : "0 10px 25px -5px rgba(0,0,0,0.1)",
        }}
      >
        {/* Dark mode toggle */}
        <div className="absolute top-4 left-4">
          <button
            onClick={toggleDarkMode}
            className="w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200 hover:scale-105"
            style={{
              background: isDark ? "rgba(255,255,255,0.05)" : "#f5f4f2",
              border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "#e8e4de"}`,
              color: isDark ? "#c9a84c" : "#8b1a2e",
              fontSize: "20px",
            }}
            title={isDark ? "الوضع النهاري" : "الوضع الليلي"}
          >
            {isDark ? "☀️" : "🌙"}
          </button>
        </div>

        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-4 shadow-lg"
            style={{
              background: "#8b1a2e",
              color: "#fff",
              boxShadow: isDark
                ? "0 4px 12px rgba(139, 26, 46, 0.3)"
                : "0 4px 8px rgba(139, 26, 46, 0.15)",
            }}
          >
            👨‍🏫
          </div>
          <h2
            className="text-2xl font-bold"
            style={{
              color: isDark ? "#ffffff" : "#1a1a1a",
              fontFamily: "Georgia, serif",
            }}
          >
            تسجيل دخول معلم
          </h2>
          <p
            className="text-sm mt-1"
            style={{
              color: isDark ? "rgba(255,255,255,0.5)" : "#666666",
              fontFamily: "sans-serif",
            }}
          >
            سجل دخولك لإدارة طلابك وحصصك
          </p>
        </div>

        {/* Success Message */}
        {success && (
          <div
            className="text-sm text-center py-3 px-4 rounded mb-4"
            style={{
              background: "rgba(64, 145, 108, 0.15)",
              border: "1px solid rgba(64, 145, 108, 0.3)",
              color: "#d8f3dc",
              fontFamily: "sans-serif",
            }}
          >
            {success}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div
            className="text-sm text-center py-2 px-3 rounded mb-4"
            style={{
              background: "rgba(139, 26, 46, 0.15)",
              border: "1px solid rgba(139, 26, 46, 0.3)",
              color: "#f0b8be",
              fontFamily: "sans-serif",
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label
              className="block text-sm font-medium"
              style={{
                color: isDark ? "rgba(255,255,255,0.7)" : "#444444",
                fontFamily: "sans-serif",
              }}
            >
              البريد الإلكتروني
            </label>
            <input
              type="email"
              placeholder="أدخل بريدك الإلكتروني"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl focus:outline-none transition-all duration-200"
              style={{
                background: isDark ? "rgba(255,255,255,0.05)" : "#ffffff",
                border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "#d0ccc4"}`,
                color: isDark ? "#fff" : "#1a1a1a",
                fontFamily: "sans-serif",
              }}
              dir="ltr"
              required
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                className="block text-sm font-medium"
                style={{
                  color: isDark ? "rgba(255,255,255,0.7)" : "#444444",
                  fontFamily: "sans-serif",
                }}
              >
                كلمة المرور
              </label>
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-xs transition-colors hover:opacity-80"
                style={{ color: "#c9a84c", fontFamily: "sans-serif" }}
              >
                نسيت كلمة المرور؟
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="أدخل كلمة المرور"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl focus:outline-none transition-all duration-200 pr-11"
                style={{
                  background: isDark ? "rgba(255,255,255,0.05)" : "#ffffff",
                  border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "#d0ccc4"}`,
                  color: isDark ? "#fff" : "#1a1a1a",
                  fontFamily: "sans-serif",
                }}
                dir="ltr"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors text-sm"
                style={{ color: isDark ? "rgba(255,255,255,0.4)" : "#aaaaaa" }}
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          {/* زر إعادة إرسال التأكيد */}
          {showResendButton && (
            <button
              type="button"
              onClick={handleResendConfirmation}
              disabled={loading}
              className="w-full text-sm py-2 rounded-lg transition-all duration-200 hover:opacity-80 disabled:opacity-50"
              style={{
                background: "rgba(201, 168, 76, 0.15)",
                color: "#c9a84c",
                fontFamily: "sans-serif",
                border: "1px solid rgba(201, 168, 76, 0.3)",
              }}
            >
              {loading ? "جاري الإرسال..." : "📧 إعادة إرسال رابط التأكيد"}
            </button>
          )}

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded"
                style={{ accentColor: "#8b1a2e" }}
              />
              <span
                style={{
                  color: isDark ? "rgba(255,255,255,0.6)" : "#666666",
                  fontFamily: "sans-serif",
                }}
              >
                تذكرني
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full text-white py-3 rounded-xl font-semibold transition-all duration-300 hover:opacity-90 mt-2 disabled:opacity-50"
            style={{
              background: "#8b1a2e",
              fontFamily: "sans-serif",
            }}
          >
            {loading ? "جاري تسجيل الدخول..." : "دخول"}
          </button>
        </form>

        <div className="flex items-center gap-3 my-6">
          <div
            className="flex-1 h-px"
            style={{ background: isDark ? "rgba(255,255,255,0.1)" : "#e8e4de" }}
          />
          <span
            className="text-xs"
            style={{
              color: isDark ? "rgba(255,255,255,0.3)" : "#aaaaaa",
              fontFamily: "sans-serif",
            }}
          >
            أو
          </span>
          <div
            className="flex-1 h-px"
            style={{ background: isDark ? "rgba(255,255,255,0.1)" : "#e8e4de" }}
          />
        </div>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 border rounded-xl py-3 text-sm font-medium transition-all duration-200 disabled:opacity-50"
          style={{
            background: isDark ? "rgba(255,255,255,0.03)" : "#ffffff",
            borderColor: isDark ? "rgba(255,255,255,0.1)" : "#d0ccc4",
            color: isDark ? "rgba(255,255,255,0.8)" : "#444444",
            fontFamily: "sans-serif",
          }}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          {loading ? "جاري..." : "الدخول بحساب Google"}
        </button>

        <p
          className="text-center text-sm mt-6"
          style={{
            color: isDark ? "rgba(255,255,255,0.4)" : "#888888",
            fontFamily: "sans-serif",
          }}
        >
          ليس لديك حساب معلم؟{" "}
          <button
            type="button"
            onClick={() => navigate("/register")}
            className="font-medium transition-colors hover:opacity-80"
            style={{ color: "#c9a84c" }}
          >
            إنشاء حساب معلم
          </button>
        </p>
      </div>
    </div>
  );
}