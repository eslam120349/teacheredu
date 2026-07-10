import { useDarkMode } from "../hooks/useDarkMode";

export default function PrivacyPage() {
  const { isDark } = useDarkMode();

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
          سياسة الخصوصية
        </h1>
        <div
          className="p-8 rounded-2xl"
          style={{
            background: isDark ? "rgba(255,255,255,0.03)" : "#ffffff",
            border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "#e8e4de"}`,
          }}
        >
          <p className="text-lg mb-4" style={{ color: isDark ? "#cccccc" : "#555555" }}>
            نحن في EduConnect نهتم بخصوصية بياناتك.
          </p>
          <p className="mb-4" style={{ color: isDark ? "#aaaaaa" : "#666666" }}>
            يتم جمع بياناتك فقط لتحسين تجربتك على المنصة. لن يتم مشاركة بياناتك مع أطراف ثالثة دون موافقتك.
          </p>
          <p style={{ color: isDark ? "#aaaaaa" : "#666666" }}>
            تاريخ آخر تحديث: 20 يونيو 2026
          </p>
        </div>
      </div>
    </div>
  );
}