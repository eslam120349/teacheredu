import { useState } from "react";
import { useDarkMode } from "../hooks/useDarkMode";

export default function ContactPage() {
  const { isDark } = useDarkMode();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // هنا ممكن تضيف logic لإرسال الإيميل
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  };

  return (
    <div
      className="min-h-screen py-20 px-6"
      style={{
        background: isDark ? "#0f1c2e" : "#f5f4f2",
        color: isDark ? "#ffffff" : "#1a1a1a",
        fontFamily: "Georgia, serif",
        transition: "background 0.3s ease, color 0.3s ease",
      }}
      dir="rtl"
    >
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-extrabold mb-6" style={{ color: "#8b1a2e" }}>
          تواصل معنا
        </h1>
        <div
          className="p-8 rounded-2xl"
          style={{
            background: isDark ? "rgba(255,255,255,0.03)" : "#ffffff",
            border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "#e8e4de"}`,
          }}
        >
          <p className="text-lg mb-6" style={{ color: isDark ? "#cccccc" : "#555555" }}>
            لديك سؤال أو استفسار؟ تواصل معنا وسنرد عليك في أقرب وقت.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: isDark ? "#cccccc" : "#555555" }}>
                الاسم الكامل
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#8b1a2e] transition-all"
                style={{
                  background: isDark ? "rgba(255,255,255,0.05)" : "#ffffff",
                  borderColor: isDark ? "rgba(255,255,255,0.1)" : "#d0ccc4",
                  color: isDark ? "#ffffff" : "#1a1a1a",
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: isDark ? "#cccccc" : "#555555" }}>
                البريد الإلكتروني
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#8b1a2e] transition-all"
                style={{
                  background: isDark ? "rgba(255,255,255,0.05)" : "#ffffff",
                  borderColor: isDark ? "rgba(255,255,255,0.1)" : "#d0ccc4",
                  color: isDark ? "#ffffff" : "#1a1a1a",
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: isDark ? "#cccccc" : "#555555" }}>
                الرسالة
              </label>
              <textarea
                required
                rows={5}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#8b1a2e] transition-all resize-none"
                style={{
                  background: isDark ? "rgba(255,255,255,0.05)" : "#ffffff",
                  borderColor: isDark ? "rgba(255,255,255,0.1)" : "#d0ccc4",
                  color: isDark ? "#ffffff" : "#1a1a1a",
                }}
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 text-white font-semibold rounded-xl transition-all hover:opacity-90"
              style={{ background: "#8b1a2e" }}
            >
              {submitted ? "✅ تم الإرسال!" : "إرسال الرسالة"}
            </button>
          </form>

          {/* معلومات التواصل الإضافية */}
          <div className="mt-8 pt-6 border-t" style={{ borderColor: isDark ? "rgba(255,255,255,0.1)" : "#e8e4de" }}>
            <div className="flex flex-col gap-2">
              <p style={{ color: isDark ? "#aaaaaa" : "#666666" }}>
                📧 البريد الإلكتروني: <span style={{ color: "#8b1a2e" }}>support@educonnect.com</span>
              </p>
              <p style={{ color: isDark ? "#aaaaaa" : "#666666" }}>
                📞 الهاتف: <span style={{ color: "#8b1a2e" }}>+20 123 456 789</span>
              </p>
              <p style={{ color: isDark ? "#aaaaaa" : "#666666" }}>
                🕐 ساعات العمل: الأحد - الخميس من 9 صباحاً إلى 5 مساءً
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}