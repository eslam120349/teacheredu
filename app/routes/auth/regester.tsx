import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import { supabase } from "../../lib/supabase";
import { useDarkMode } from "../../hooks/useDarkMode";
import { FaUpload, FaTimes, FaChalkboardTeacher, FaUserGraduate, FaClock } from "react-icons/fa";

// ─── Subjects List ────────────────────────────────────────────────────────────
const ALL_SUBJECTS = [
  "الرياضيات",
  "الفيزياء",
  "الكيمياء",
  "الأحياء",
  "اللغة العربية",
  "اللغة الإنجليزية",
  "الدراسات الاجتماعية",
  "التاريخ",
  "الجغرافيا",
  "التربية الإسلامية",
  "الحاسب الآلي",
  "التربية الفنية",
  "الفلسفة",
  "علم النفس",
  "المنطق",
  "الإحصاء",
  "التفاضل والتكامل",
  "الميكانيكا",
  "الكهرباء",
  "المغناطيسية"
];

// ─── Pricing Types ───────────────────────────────────────────────────────────
const PRICING_TYPES = [
  { key: "unified_private", label: "برايفت (فردي)", icon: "👤" },
  { key: "unified_group", label: "مجموعة (جماعي)", icon: "👥" },
  { key: "unified_center", label: "سنتر", icon: "🏫" },
  { key: "unified_online", label: "أونلاين", icon: "💻" },
];

export default function TeacherRegister() {
  const navigate = useNavigate();
  const { isDark, toggleDarkMode, mounted } = useDarkMode();
  const [step, setStep] = useState(1);

  // ─── Step 1: Basic Info ──────────────────────────────────────────────────
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // ─── Step 2: Profile ─────────────────────────────────────────────────────
  const [specialty, setSpecialty] = useState("");
  const [qualification, setQualification] = useState("");
  const [yearsOfExperience, setYearsOfExperience] = useState(0);
  const [bio, setBio] = useState("");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Step 3: Pricing ─────────────────────────────────────────────────────
  const [pricing, setPricing] = useState({
    unified_private: 120,
    unified_group: 40,
    unified_center: 60,
    unified_online: 80,
  });

  // ─── General ─────────────────────────────────────────────────────────────
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const isSubmitting = useRef(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [waitTime, setWaitTime] = useState(0);
  const [showResend, setShowResend] = useState(false);

  // ─── عداد تنازلي لإعادة الإرسال ──────────────────────────────────────────
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (waitTime > 0) {
      timer = setTimeout(() => {
        setWaitTime(waitTime - 1);
      }, 1000);
    } else if (waitTime === 0 && showResend) {
      setShowResend(false);
    }
    return () => clearTimeout(timer);
  }, [waitTime, showResend]);

  // ─── Handle Avatar Upload ────────────────────────────────────────────────
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError("الصورة كبيرة جداً (الحد الأقصى 2 ميجابايت)");
      return;
    }

    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setAvatarPreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // ─── Toggle Subject ──────────────────────────────────────────────────────
  const toggleSubject = (subject: string) => {
    setSelectedSubjects(prev =>
      prev.includes(subject)
        ? prev.filter(s => s !== subject)
        : [...prev, subject]
    );
  };

  // ─── Upload Avatar to Supabase Storage ──────────────────────────────────
  const uploadAvatar = async (userId: string): Promise<string | null> => {
    if (!avatarFile || !supabase) return null;

    setUploading(true);
    try {
      const fileExt = avatarFile.name.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { data: buckets } = await supabase.storage.listBuckets();
      const bucketExists = buckets?.some(b => b.name === 'avatars');

      if (!bucketExists) {
        await supabase.storage.createBucket('avatars', {
          public: true,
        });
      }

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, avatarFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error("Error uploading avatar:", error);
      return null;
    } finally {
      setUploading(false);
    }
  };

  // ─── إعادة إرسال رابط التأكيد ──────────────────────────────────────────
  const resendVerification = async () => {
    if (!email) return;
    setResendLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/verify`,
        },
      });
      if (error) {
        if (error.message.includes('rate limit')) {
          setWaitTime(60); // انتظار 60 ثانية
          setShowResend(true);
          setError("⚠️ تم إرسال العديد من الطلبات. يرجى الانتظار 60 ثانية ثم المحاولة مرة أخرى.");
        } else {
          setError(error.message);
        }
        return;
      }
      setError("✅ تم إعادة إرسال رابط التأكيد إلى بريدك الإلكتروني. يرجى التحقق من صندوق الوارد (أو spam).");
      setWaitTime(30); // انتظار 30 ثانية قبل إعادة الإرسال مرة أخرى
      setShowResend(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setResendLoading(false);
    }
  };

  // ─── Handle Submit ──────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting.current) return;
    isSubmitting.current = true;

    setError(null);
    setSuccess(false);

    if (!supabase) {
      setError("Supabase غير مهيّأ");
      isSubmitting.current = false;
      return;
    }

    // ─── Step 1: Create User & Profile ────────────────────────────────────
    if (step === 1) {
      if (password !== confirm) {
        setError("كلمتا المرور غير متطابقتين");
        isSubmitting.current = false;
        return;
      }
      if (password.length < 6) {
        setError("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
        isSubmitting.current = false;
        return;
      }

      setLoading(true);
      try {
        // 1. إنشاء المستخدم
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              phone: phone,
              role: "teacher",
            },
            emailRedirectTo: `${window.location.origin}/auth/verify`,
          },
        });

        if (signUpError) {
          // 🔥 التعامل مع أخطاء البريد الإلكتروني
          if (signUpError.message.includes('email rate limit exceeded')) {
            setError("⚠️ لقد تجاوزت عدد محاولات التسجيل. يرجى الانتظار 10 دقائق ثم المحاولة مرة أخرى.");
            setWaitTime(600); // 10 دقائق
            setShowResend(true);
          } else if (signUpError.message.includes('already registered')) {
            setError("هذا البريد الإلكتروني مسجل بالفعل. يرجى تسجيل الدخول.");
          } else {
            setError(signUpError.message);
          }
          isSubmitting.current = false;
          return;
        }

        if (!authData.user) {
          setError("حدث خطأ في إنشاء الحساب");
          isSubmitting.current = false;
          return;
        }

        const newUserId = authData.user.id;
        setUserId(newUserId);


        // 2. التحقق من وجود profile
        const { data: existingProfile, error: checkError } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", newUserId)
          .maybeSingle();


        if (!existingProfile) {
          // 3. إنشاء profile جديد
          const { error: createError } = await supabase
            .from("profiles")
            .insert({
              id: newUserId,
              full_name: fullName,
              phone: phone,
              role: "teacher",
            });

          if (createError) {
            console.error("❌ Create profile error:", createError);
            setError("حدث خطأ في إنشاء الملف الشخصي: " + createError.message);
            isSubmitting.current = false;
            return;
          }

        } else {
          // 4. تحديث profile موجود
          const { error: updateError } = await supabase
            .from("profiles")
            .update({
              full_name: fullName,
              phone: phone,
              role: "teacher",
            })
            .eq("id", newUserId);

          if (updateError) {
            console.error("❌ Update profile error:", updateError);
            setError("حدث خطأ في تحديث الملف الشخصي: " + updateError.message);
            isSubmitting.current = false;
            return;
          }

        }

        // 🔥 عرض رسالة تأكيد مع زر إعادة الإرسال
        setError("✅ تم إرسال رابط التأكيد إلى بريدك الإلكتروني. يرجى التحقق من صندوق الوارد.");
        setShowResend(true);
        setWaitTime(30);

        setStep(2);
      } catch (err: any) {
        console.error("❌ Unexpected error:", err);
        setError(err.message || "حدث خطأ غير متوقع");
      } finally {
        setLoading(false);
        isSubmitting.current = false;
      }
      return;
    }

    // ─── Step 2: Save Teacher Profile ─────────────────────────────────────
    if (step === 2) {
      if (selectedSubjects.length === 0) {
        setError("يرجى اختيار مادة واحدة على الأقل");
        isSubmitting.current = false;
        return;
      }

      setLoading(true);
      try {
        const { data: profile, error: profileCheckError } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", userId)
          .maybeSingle();

        if (profileCheckError || !profile) {
          console.error("❌ Profile not found for user:", userId);
          setError("الملف الشخصي غير موجود. يرجى إعادة المحاولة.");
          isSubmitting.current = false;
          return;
        }

        let avatarUrl = null;
        if (avatarFile && userId) {
          avatarUrl = await uploadAvatar(userId);
        }

        const { error: teacherError } = await supabase
          .from("teachers")
          .insert({
            user_id: userId,
            full_name: fullName,
            email: email,
            phone: phone,
            specialty: specialty,
            subjects: selectedSubjects,
            bio: bio,
            qualification: qualification,
            years_of_experience: yearsOfExperience,
            avatar_url: avatarUrl,
            is_active: true,
          });

        if (teacherError) {
          console.error("❌ Teacher error:", teacherError);
          setError("حدث خطأ في إنشاء حساب المعلم: " + teacherError.message);
          isSubmitting.current = false;
          return;
        }

        setStep(3);
        setError(null);
      } catch (err: any) {
        console.error("❌ Unexpected error:", err);
        setError(err.message || "حدث خطأ غير متوقع");
      } finally {
        setLoading(false);
        isSubmitting.current = false;
      }
      return;
    }

    // ─── Step 3: Save Pricing ─────────────────────────────────────────────
    if (step === 3) {
      setLoading(true);
      try {
        const pricingData = {
          unified: true,
          ...pricing
        };

        const { error: pricingError } = await supabase
          .from("teachers")
          .update({
            pricing: pricingData,
          })
          .eq("user_id", userId);

        if (pricingError) {
          console.error("❌ Pricing error:", pricingError);
          setError("حدث خطأ في حفظ الأسعار: " + pricingError.message);
          isSubmitting.current = false;
          return;
        }

        setSuccess(true);
        setError(null);
      } catch (err: any) {
        console.error("❌ Unexpected error:", err);
        setError(err.message || "حدث خطأ غير متوقع");
      } finally {
        setLoading(false);
        isSubmitting.current = false;
      }
    }
  };

  // ─── Go Back ─────────────────────────────────────────────────────────────
  const goBack = () => {
    if (step > 1) {
      setStep(step - 1);
      setError(null);
    }
  };

  if (!mounted) return null;

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
      {/* Background Effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[350px] blur-[130px] rounded-full"
          style={{
            background: isDark
              ? "rgba(139, 26, 46, 0.15)"
              : "rgba(139, 26, 46, 0.06)",
          }}
        />
      </div>

      <div
        className="relative w-full max-w-2xl backdrop-blur-xl border rounded-3xl p-8 shadow-2xl my-8 transition-all duration-300"
        style={{
          background: isDark ? "rgba(255,255,255,0.03)" : "#ffffff",
          borderColor: isDark ? "rgba(255,255,255,0.1)" : "#e8e4de",
          boxShadow: isDark
            ? "0 20px 30px -10px rgba(0,0,0,0.5)"
            : "0 10px 25px -5px rgba(0,0,0,0.1)",
        }}
      >
        {/* Dark Mode Toggle */}
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
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-bold mb-4 shadow-lg"
            style={{
              background: "#8b1a2e",
              color: "#fff",
              boxShadow: isDark
                ? "0 4px 12px rgba(139, 26, 46, 0.3)"
                : "0 4px 8px rgba(139, 26, 46, 0.15)",
            }}
          >
            <FaChalkboardTeacher />
          </div>
          <h2 className="text-2xl font-bold" style={{ color: isDark ? "#ffffff" : "#1a1a1a" }}>
            {step === 1 && "تسجيل معلم"}
            {step === 2 && "الملف الشخصي"}
            {step === 3 && "تحديد الأسعار"}
          </h2>
          <p className="text-sm" style={{ color: isDark ? "rgba(255,255,255,0.5)" : "#666666", fontFamily: "sans-serif" }}>
            {step === 1 && "أنشئ حسابك كمعلم"}
            {step === 2 && "أكمل بياناتك المهنية"}
            {step === 3 && "حدد أسعار حصصك"}
          </p>

          {/* Steps Progress */}
          <div className="flex items-center gap-3 mt-4 w-full max-w-xs">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center flex-1">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300"
                  style={{
                    background: s <= step ? "#8b1a2e" : isDark ? "rgba(255,255,255,0.1)" : "#e8e4de",
                    color: s <= step ? "#fff" : isDark ? "rgba(255,255,255,0.3)" : "#999",
                  }}
                >
                  {s}
                </div>
                {s < 3 && (
                  <div
                    className="flex-1 h-0.5 mx-1 transition-all duration-300"
                    style={{
                      background: s < step ? "#8b1a2e" : isDark ? "rgba(255,255,255,0.1)" : "#e8e4de",
                    }}
                  />
                )}
              </div>
            ))}
          </div>
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
            ✅ تم إنشاء حساب المعلم بنجاح!
            <br />
            <button
              onClick={() => navigate("/login")}
              className="mt-2 px-4 py-1 rounded-lg font-semibold"
              style={{ background: "#8b1a2e", color: "#fff" }}
            >
              الذهاب لتسجيل الدخول
            </button>
          </div>
        )}

        {/* Error Message with Resend Button */}
        {error && (
          <div
            className="text-sm text-center py-2 px-3 rounded mb-4"
            style={{
              background: error.includes("✅")
                ? "rgba(64, 145, 108, 0.15)"
                : "rgba(139, 26, 46, 0.15)",
              border: error.includes("✅")
                ? "1px solid rgba(64, 145, 108, 0.3)"
                : "1px solid rgba(139, 26, 46, 0.3)",
              color: error.includes("✅") ? "#d8f3dc" : "#f0b8be",
              fontFamily: "sans-serif",
            }}
          >
            {error}

            {/* زر إعادة الإرسال */}
            {showResend && !success && (
              <div className="mt-2 flex flex-col items-center gap-2">
                {waitTime > 0 && (
                  <div className="flex items-center gap-2 text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
                    <FaClock />
                    <span>انتظر {waitTime} ثانية قبل إعادة المحاولة</span>
                  </div>
                )}
                <button
                  onClick={resendVerification}
                  disabled={resendLoading || waitTime > 0}
                  className="text-xs font-medium underline transition-colors hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ color: "#c9a84c" }}
                >
                  {resendLoading
                    ? "جاري..."
                    : waitTime > 0
                      ? `⏳ انتظر ${waitTime}s`
                      : "🔄 إعادة إرسال رابط التأكيد"}
                </button>
              </div>
            )}
          </div>
        )}

        {!success && (
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* ─── STEP 1: Basic Info ──────────────────────────────────────── */}
            {step === 1 && (
              <>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium" style={{ color: isDark ? "rgba(255,255,255,0.7)" : "#444444", fontFamily: "sans-serif" }}>
                    الاسم الكامل *
                  </label>
                  <input
                    type="text"
                    placeholder="أدخل اسمك الكامل"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl focus:outline-none transition-all duration-200"
                    style={{
                      background: isDark ? "rgba(255,255,255,0.05)" : "#ffffff",
                      border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "#d0ccc4"}`,
                      color: isDark ? "#fff" : "#1a1a1a",
                      fontFamily: "sans-serif",
                    }}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium" style={{ color: isDark ? "rgba(255,255,255,0.7)" : "#444444", fontFamily: "sans-serif" }}>
                    رقم الهاتف *
                  </label>
                  <div className="flex gap-2">
                    <div className="flex items-center gap-1.5 px-3 border rounded-xl text-sm whitespace-nowrap"
                      style={{
                        background: isDark ? "rgba(255,255,255,0.05)" : "#ffffff",
                        borderColor: isDark ? "rgba(255,255,255,0.1)" : "#d0ccc4",
                        color: isDark ? "rgba(255,255,255,0.6)" : "#666666",
                        fontFamily: "sans-serif"
                      }}>
                      🇪🇬 +20
                    </div>
                    <input
                      type="tel"
                      placeholder="01xxxxxxxxx"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="flex-1 px-4 py-3 rounded-xl focus:outline-none transition-all duration-200"
                      style={{
                        background: isDark ? "rgba(255,255,255,0.05)" : "#ffffff",
                        border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "#d0ccc4"}`,
                        color: isDark ? "#fff" : "#1a1a1a",
                        fontFamily: "sans-serif",
                      }}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium" style={{ color: isDark ? "rgba(255,255,255,0.7)" : "#444444", fontFamily: "sans-serif" }}>
                    البريد الإلكتروني *
                  </label>
                  <input
                    type="email"
                    placeholder="example@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl focus:outline-none transition-all duration-200"
                    dir="ltr"
                    style={{
                      background: isDark ? "rgba(255,255,255,0.05)" : "#ffffff",
                      border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "#d0ccc4"}`,
                      color: isDark ? "#fff" : "#1a1a1a",
                      fontFamily: "sans-serif",
                    }}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium" style={{ color: isDark ? "rgba(255,255,255,0.7)" : "#444444", fontFamily: "sans-serif" }}>
                    كلمة المرور *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="أنشئ كلمة مرور (6 أحرف على الأقل)"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 pr-11 rounded-xl focus:outline-none transition-all duration-200"
                      dir="ltr"
                      style={{
                        background: isDark ? "rgba(255,255,255,0.05)" : "#ffffff",
                        border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "#d0ccc4"}`,
                        color: isDark ? "#fff" : "#1a1a1a",
                        fontFamily: "sans-serif",
                      }}
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

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium" style={{ color: isDark ? "rgba(255,255,255,0.7)" : "#444444", fontFamily: "sans-serif" }}>
                    تأكيد كلمة المرور *
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirm ? "text" : "password"}
                      placeholder="أعد كتابة كلمة المرور"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      className="w-full px-4 py-3 pr-11 rounded-xl focus:outline-none transition-all duration-200"
                      dir="ltr"
                      style={{
                        background: isDark ? "rgba(255,255,255,0.05)" : "#ffffff",
                        border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "#d0ccc4"}`,
                        color: isDark ? "#fff" : "#1a1a1a",
                        fontFamily: "sans-serif",
                      }}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors text-sm"
                      style={{ color: isDark ? "rgba(255,255,255,0.4)" : "#aaaaaa" }}
                    >
                      {showConfirm ? "🙈" : "👁️"}
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* ─── STEP 2: Profile ──────────────────────────────────────────── */}
            {step === 2 && (
              <>
                {/* Avatar Upload */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium" style={{ color: isDark ? "rgba(255,255,255,0.7)" : "#444444", fontFamily: "sans-serif" }}>
                    الصورة الشخصية (اختياري)
                  </label>
                  <div className="flex items-center gap-4">
                    <div
                      className="w-20 h-20 rounded-xl flex items-center justify-center overflow-hidden border-2 transition-all duration-200"
                      style={{
                        background: isDark ? "rgba(255,255,255,0.05)" : "#f5f4f2",
                        borderColor: avatarPreview ? "#8b1a2e" : isDark ? "rgba(255,255,255,0.1)" : "#d0ccc4",
                      }}
                    >
                      {avatarPreview ? (
                        <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <FaUserGraduate style={{ fontSize: "2rem", color: isDark ? "rgba(255,255,255,0.3)" : "#aaa" }} />
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200"
                        style={{
                          background: isDark ? "rgba(139,26,46,0.2)" : "rgba(139,26,46,0.08)",
                          border: `1px solid ${isDark ? "rgba(139,26,46,0.3)" : "rgba(139,26,46,0.2)"}`,
                          color: "#8b1a2e",
                        }}
                      >
                        <FaUpload className="inline-block ml-1" /> رفع صورة
                      </button>
                      {avatarPreview && (
                        <button
                          type="button"
                          onClick={removeAvatar}
                          className="px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200"
                          style={{
                            background: "rgba(229,57,53,0.1)",
                            border: "1px solid rgba(229,57,53,0.2)",
                            color: "#e53935",
                          }}
                        >
                          <FaTimes />
                        </button>
                      )}
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
                  </div>
                  <p className="text-[10px]" style={{ color: isDark ? "rgba(255,255,255,0.3)" : "#aaa" }}>
                    الصيغ المدعومة: JPG, PNG, GIF (الحد الأقصى 2 ميجابايت)
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium" style={{ color: isDark ? "rgba(255,255,255,0.7)" : "#444444", fontFamily: "sans-serif" }}>
                    التخصص *
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: رياضيات, فيزياء..."
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl focus:outline-none transition-all duration-200"
                    style={{
                      background: isDark ? "rgba(255,255,255,0.05)" : "#ffffff",
                      border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "#d0ccc4"}`,
                      color: isDark ? "#fff" : "#1a1a1a",
                      fontFamily: "sans-serif",
                    }}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium" style={{ color: isDark ? "rgba(255,255,255,0.7)" : "#444444", fontFamily: "sans-serif" }}>
                    المواد التي تدرسها *
                  </label>
                  <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 border rounded-xl"
                    style={{
                      borderColor: isDark ? "rgba(255,255,255,0.1)" : "#d0ccc4",
                      background: isDark ? "rgba(255,255,255,0.05)" : "#ffffff",
                    }}
                  >
                    {ALL_SUBJECTS.map((subject) => (
                      <button
                        key={subject}
                        type="button"
                        onClick={() => toggleSubject(subject)}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200"
                        style={{
                          background: selectedSubjects.includes(subject)
                            ? "#8b1a2e"
                            : isDark ? "rgba(255,255,255,0.05)" : "#f5f4f2",
                          color: selectedSubjects.includes(subject)
                            ? "#fff"
                            : isDark ? "rgba(255,255,255,0.6)" : "#555",
                          border: `1px solid ${selectedSubjects.includes(subject)
                              ? "#8b1a2e"
                              : isDark ? "rgba(255,255,255,0.1)" : "#d0ccc4"
                            }`,
                        }}
                      >
                        {subject}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px]" style={{ color: isDark ? "rgba(255,255,255,0.3)" : "#aaa" }}>
                    اختر مادة واحدة على الأقل
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium" style={{ color: isDark ? "rgba(255,255,255,0.7)" : "#444444", fontFamily: "sans-serif" }}>
                      المؤهل العلمي
                    </label>
                    <input
                      type="text"
                      placeholder="مثال: بكالوريوس رياضيات"
                      value={qualification}
                      onChange={(e) => setQualification(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl focus:outline-none transition-all duration-200"
                      style={{
                        background: isDark ? "rgba(255,255,255,0.05)" : "#ffffff",
                        border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "#d0ccc4"}`,
                        color: isDark ? "#fff" : "#1a1a1a",
                        fontFamily: "sans-serif",
                      }}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium" style={{ color: isDark ? "rgba(255,255,255,0.7)" : "#444444", fontFamily: "sans-serif" }}>
                      سنوات الخبرة
                    </label>
                    <input
                      type="number"
                      placeholder="0"
                      min="0"
                      value={yearsOfExperience}
                      onChange={(e) => setYearsOfExperience(Number(e.target.value))}
                      className="w-full px-4 py-3 rounded-xl focus:outline-none transition-all duration-200"
                      style={{
                        background: isDark ? "rgba(255,255,255,0.05)" : "#ffffff",
                        border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "#d0ccc4"}`,
                        color: isDark ? "#fff" : "#1a1a1a",
                        fontFamily: "sans-serif",
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium" style={{ color: isDark ? "rgba(255,255,255,0.7)" : "#444444", fontFamily: "sans-serif" }}>
                    السيرة الذاتية (اختياري)
                  </label>
                  <textarea
                    placeholder="اكتب عن خبراتك وطريقة تدريسك..."
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl focus:outline-none transition-all duration-200 resize-none"
                    style={{
                      background: isDark ? "rgba(255,255,255,0.05)" : "#ffffff",
                      border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "#d0ccc4"}`,
                      color: isDark ? "#fff" : "#1a1a1a",
                      fontFamily: "sans-serif",
                    }}
                  />
                </div>
              </>
            )}

            {/* ─── STEP 3: Pricing ──────────────────────────────────────────── */}
            {step === 3 && (
              <>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium" style={{ color: isDark ? "rgba(255,255,255,0.7)" : "#444444", fontFamily: "sans-serif" }}>
                    أسعار الحصص (بالجنيه المصري)
                  </label>
                  <p className="text-xs mb-2" style={{ color: isDark ? "rgba(255,255,255,0.3)" : "#aaa" }}>
                    حدد السعر المناسب لكل نوع من الحصص
                  </p>

                  <div className="space-y-3">
                    {PRICING_TYPES.map(({ key, label, icon }) => (
                      <div key={key} className="flex items-center gap-4">
                        <div className="flex-1">
                          <span className="text-sm" style={{ color: isDark ? "rgba(255,255,255,0.7)" : "#444" }}>
                            {icon} {label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm" style={{ color: isDark ? "rgba(255,255,255,0.4)" : "#888" }}>ج.م</span>
                          <input
                            type="number"
                            min="0"
                            step="5"
                            value={pricing[key as keyof typeof pricing]}
                            onChange={(e) => setPricing({
                              ...pricing,
                              [key]: Number(e.target.value)
                            })}
                            className="w-24 px-3 py-2 rounded-xl text-center focus:outline-none transition-all duration-200"
                            style={{
                              background: isDark ? "rgba(255,255,255,0.05)" : "#f5f4f2",
                              border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "#d0ccc4"}`,
                              color: isDark ? "#fff" : "#1a1a1a",
                              fontFamily: "sans-serif",
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div
                  className="p-4 rounded-xl text-sm mt-2"
                  style={{
                    background: isDark ? "rgba(201,168,76,0.08)" : "rgba(201,168,76,0.05)",
                    border: `1px solid ${isDark ? "rgba(201,168,76,0.2)" : "rgba(201,168,76,0.2)"}`,
                    color: isDark ? "rgba(255,255,255,0.6)" : "#555",
                    fontFamily: "sans-serif",
                  }}
                >
                  💡 يمكنك تعديل هذه الأسعار لاحقاً من خلال الملف الشخصي
                </div>
              </>
            )}

            {/* ─── Navigation Buttons ────────────────────────────────────────── */}
            <div className="flex gap-3 mt-4">
              {step > 1 && (
                <button
                  type="button"
                  onClick={goBack}
                  className="flex-1 py-3 rounded-xl font-semibold transition-all duration-300"
                  style={{
                    background: isDark ? "rgba(255,255,255,0.05)" : "#f5f4f2",
                    border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "#d0ccc4"}`,
                    color: isDark ? "rgba(255,255,255,0.7)" : "#555",
                    fontFamily: "sans-serif",
                  }}
                >
                  السابق
                </button>
              )}
              <button
                type="submit"
                disabled={loading}
                className={`${step > 1 ? 'flex-1' : 'w-full'} py-3 rounded-xl font-semibold text-white transition-all duration-300 hover:opacity-90 disabled:opacity-50`}
                style={{ background: "#8b1a2e", fontFamily: "sans-serif" }}
              >
                {loading
                  ? "جاري..."
                  : step === 1
                    ? "متابعة →"
                    : step === 2
                      ? "متابعة →"
                      : "إنشاء حساب المعلم 🚀"}
              </button>
            </div>
          </form>
        )}

        {/* ─── Login Link ──────────────────────────────────────────────────────── */}
        {!success && (
          <p className="text-center text-sm mt-5" style={{ color: isDark ? "rgba(255,255,255,0.4)" : "#888888", fontFamily: "sans-serif" }}>
            لديك حساب بالفعل؟{" "}
            <button type="button" onClick={() => navigate("/login")}
              className="font-medium transition-colors hover:opacity-80"
              style={{ color: "#c9a84c" }}>
              تسجيل الدخول
            </button>
          </p>
        )}
      </div>
    </div>
  );
}