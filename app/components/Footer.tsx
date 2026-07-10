import { useDarkMode } from "../hooks/useDarkMode";

export default function Footer() {
  const { isDark } = useDarkMode();

  return (
    <footer
      style={{
        background: isDark ? "#0f1c2e" : "#ffffff",
        borderTop: "3px solid #8b1a2e",
        fontFamily: "sans-serif",
        transition: "background 0.3s ease, color 0.3s ease",
      }}
    >
      <div
        className="max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4"
        style={{
          fontSize: "14px",
          color: isDark ? "#cccccc" : "#888888",
          transition: "color 0.3s ease",
        }}
        dir="rtl"
      >
        {/* Logo + copyright */}
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 flex items-center justify-center text-xs font-bold text-white"
            style={{
              background: "#8b1a2e",
              borderRadius: "2px",
              fontFamily: "Georgia, serif",
            }}
          >
            E
          </div>
          <span
            style={{
              color: isDark ? "#ffffff" : "#555555",
              transition: "color 0.3s ease",
            }}
          >
            EduConnect © 2025
          </span>
        </div>

        {/* Links */}
      <div className="flex gap-6">
  <a
    href="/privacy"
    className="transition-colors duration-200"
    style={{
      color: isDark ? "#aaaaaa" : "#888888",
      textDecoration: "none",
    }}
    onMouseEnter={(e) => (e.currentTarget.style.color = "#8b1a2e")}
    onMouseLeave={(e) =>
      (e.currentTarget.style.color = isDark ? "#aaaaaa" : "#888888")
    }
  >
    Privacy
  </a>
  <a
    href="/terms"
    className="transition-colors duration-200"
    style={{
      color: isDark ? "#aaaaaa" : "#888888",
      textDecoration: "none",
    }}
    onMouseEnter={(e) => (e.currentTarget.style.color = "#8b1a2e")}
    onMouseLeave={(e) =>
      (e.currentTarget.style.color = isDark ? "#aaaaaa" : "#888888")
    }
  >
    Terms
  </a>
  <a
    href="/contact"
    className="transition-colors duration-200"
    style={{
      color: isDark ? "#aaaaaa" : "#888888",
      textDecoration: "none",
    }}
    onMouseEnter={(e) => (e.currentTarget.style.color = "#8b1a2e")}
    onMouseLeave={(e) =>
      (e.currentTarget.style.color = isDark ? "#aaaaaa" : "#888888")
    }
  >
    Contact
  </a>
</div>
      </div>
    </footer>
  );
}