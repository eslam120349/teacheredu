// app/routes/auth/verify-email.tsx
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { supabase } from "../../lib/supabase";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("جاري تأكيد البريد الإلكتروني...");
  const [email, setEmail] = useState("");
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [role, setRole] = useState<string | null>(null);

  // ─── 🔥 مواقع مختلفة حسب الدور ──────────────────────────────────────────────
  const getRedirectUrl = (userRole: string) => {
    switch (userRole) {
      case "admin":
        return "https://teache-three.vercel.app/dashboard/teacher";
      case "teacher":
        return "https://teache-three.vercel.app/dashboard/teacher";
      case "parent":
        return "https://perantedupatform.vercel.app/dashboard/parent";
      default:
        return "https://educonnect.com/login";
    }
  };

  // ─── 🔥 أو استخدم مواقع مختلفة تماماً ──────────────────────────────────────
  // const getRedirectUrl = (userRole: string) => {
  //   switch (userRole) {
  //     case "admin":
  //       return "https://admin-platform.com/dashboard";
  //     case "teacher":
  //       return "https://teacher-platform.com/dashboard";
  //     case "parent":
  //       return "https://parent-platform.com/dashboard";
  //     default:
  //       return "https://main-platform.com/login";
  //   }
  // };

  // ─── جلب دور المستخدم ──────────────────────────────────────────────────────
  const getUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("Error fetching user role:", error);
        return null;
      }

      return data?.role || null;
    } catch (err) {
      console.error("Error:", err);
      return null;
    }
  };

  useEffect(() => {
    async function handleVerification() {
      try {
        // 1. التحقق من وجود Session
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

        if (sessionData?.session) {
          const userRole = await getUserRole(sessionData.session.user.id);
          setRole(userRole);

          setStatus("success");
          setMessage(`✅ تم تأكيد البريد الإلكتروني بنجاح! جاري التوجيه...`);

          // 🔥 التوجيه إلى الموقع المناسب حسب الدور
          const redirectUrl = getRedirectUrl(userRole || "parent");
          setTimeout(() => {
            window.location.href = redirectUrl;
          }, 2000);
          return;
        }

        // 2. محاولة تبادل الـ Code
        const code = searchParams.get("code");
        if (code) {
          const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

          if (exchangeError) {
            console.error("Exchange error:", exchangeError);
            throw exchangeError;
          }

          if (exchangeData?.session) {
            const userRole = await getUserRole(exchangeData.session.user.id);
            setRole(userRole);

            setStatus("success");
            setMessage(`✅ تم تأكيد البريد الإلكتروني بنجاح! جاري التوجيه...`);

            // 🔥 التوجيه إلى الموقع المناسب حسب الدور
            const redirectUrl = getRedirectUrl(userRole || "parent");
            setTimeout(() => {
              window.location.href = redirectUrl;
            }, 2000);
            return;
          }
        }

        // 3. لو مفيش حاجة - الرابط منتهي الصلاحية
        const type = searchParams.get("type");
        if (type === "signup" || type === "email_change") {
          setStatus("error");
          setMessage("انتهت صلاحية رابط التأكيد. يمكنك طلب رابط جديد.");
        } else {
          setStatus("error");
          setMessage("رابط التأكيد غير صالح أو تم استخدامه من قبل.");
        }

      } catch (err: any) {
        console.error("Verification error:", err);
        setStatus("error");
        setMessage("انتهت صلاحية رابط التأكيد. يمكنك طلب رابط جديد.");
      }
    }

    handleVerification();
  }, [searchParams, navigate]);

  // ─── إعادة إرسال رابط التأكيد ──────────────────────────────────────────────
  const handleResendEmail = async () => {
    if (!email) {
      setMessage("الرجاء إدخال البريد الإلكتروني أولاً");
      return;
    }

    setResending(true);
    setResendSuccess(false);
    setMessage("");

    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/verify`,
        },
      });

      if (error) {
        setMessage("❌ " + error.message);
      } else {
        setResendSuccess(true);
        setMessage("✅ تم إرسال رابط تأكيد جديد إلى بريدك الإلكتروني. الرجاء التحقق منه.");
      }
    } catch (err: any) {
      setMessage("❌ حدث خطأ: " + err.message);
    } finally {
      setResending(false);
    }
  };

  // ─── Go to Login ──────────────────────────────────────────────────────────────
  const goToLogin = () => {
    navigate("/login");
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: "linear-gradient(150deg, #0f1c2e 0%, #1c0c14 60%, #0f1c2e 100%)",
        fontFamily: "Georgia, serif",
      }}
      dir="rtl"
    >
      <div
        className="w-full max-w-md backdrop-blur-xl border rounded-3xl p-8 shadow-2xl text-center"
        style={{
          background: "rgba(255,255,255,0.03)",
          borderColor: "rgba(255,255,255,0.1)",
        }}
      >
        {/* Icon */}
        <div className="text-5xl mb-6">
          {status === "loading" ? "⏳" : status === "success" ? "✅" : "📧"}
        </div>

        {/* Title */}
        <h2
          className="text-2xl font-bold mb-4"
          style={{ color: "#ffffff" }}
        >
          {status === "loading" ? "جاري تأكيد البريد..." :
            status === "success" ? "تم التأكيد!" : "انتهت صلاحية الرابط"}
        </h2>

        {/* Message */}
        <p
          className="text-base mb-6"
          style={{ color: "rgba(255,255,255,0.6)" }}
        >
          {message}
        </p>

        {/* Loading Spinner */}
        {status === "loading" && (
          <div className="mt-4">
            <div
              className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin mx-auto"
              style={{ borderColor: "#8b1a2e", borderTopColor: "transparent" }}
            />
          </div>
        )}

        {/* 🔥 عرض الدور والمكان الذي سيتم التوجيه إليه */}
        {status === "success" && role && (
          <div
            className="mt-4 p-3 rounded-lg text-sm"
            style={{
              background: "rgba(139,26,46,0.15)",
              border: "1px solid rgba(139,26,46,0.3)",
              color: "#f0b8be",
            }}
          >
            🔄 جاري التوجيه إلى:
            <br />
            <span style={{ fontSize: "12px", color: "#c9a84c" }}>
              {role === "admin" && "👑 لوحة الإدارة"}
              {role === "teacher" && "👨‍🏫 لوحة المعلم"}
              {role === "parent" && "👨‍👧 لوحة ولي الأمر"}
            </span>
            <br />
            <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)" }}>
              {getRedirectUrl(role)}
            </span>
          </div>
        )}

        {/* 🔥 نموذج إعادة إرسال التأكيد */}
        {status === "error" && !resendSuccess && (
          <div className="mt-6 space-y-4">
            <div className="text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
              أدخل بريدك الإلكتروني لإرسال رابط تأكيد جديد:
            </div>

            <input
              type="email"
              placeholder="example@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl focus:outline-none transition-all duration-200"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#fff",
                fontFamily: "sans-serif",
              }}
              dir="ltr"
            />

            <button
              onClick={handleResendEmail}
              disabled={resending}
              className="w-full px-6 py-3 rounded-xl font-semibold transition-all duration-300 hover:opacity-90 disabled:opacity-50"
              style={{ background: "#8b1a2e", color: "#fff" }}
            >
              {resending ? "⏳ جاري الإرسال..." : "📧 إرسال رابط تأكيد جديد"}
            </button>
          </div>
        )}

        {/* رسالة نجاح إعادة الإرسال */}
        {resendSuccess && (
          <div
            className="mt-4 p-3 rounded-lg text-sm"
            style={{
              background: "rgba(64, 145, 108, 0.15)",
              border: "1px solid rgba(64, 145, 108, 0.3)",
              color: "#d8f3dc",
            }}
          >
            {message}
          </div>
        )}

        {/* ─── أزرار التنقل ────────────────────────────────────────────────────── */}
        <div className="mt-6 space-y-3">
          {status === "success" ? (
            <button
              onClick={goToLogin}
              className="w-full px-8 py-3 rounded-xl font-semibold transition-all duration-300 hover:opacity-90"
              style={{ background: "#8b1a2e", color: "#fff" }}
            >
              الذهاب لتسجيل الدخول
            </button>
          ) : (
            <>
              <button
                onClick={goToLogin}
                className="w-full px-8 py-3 rounded-xl font-semibold transition-all duration-300 hover:opacity-90"
                style={{ background: "#8b1a2e", color: "#fff" }}
              >
                الذهاب لتسجيل الدخول
              </button>

              <button
                onClick={() => navigate("/register")}
                className="w-full px-8 py-3 rounded-xl font-semibold transition-all duration-300 hover:opacity-90"
                style={{
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.2)",
                  color: "rgba(255,255,255,0.7)",
                }}
              >
                إنشاء حساب جديد
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}