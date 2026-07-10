// routes.ts
import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  route("/", "routes/layout.tsx", [
    // الصفحة الرئيسية
    index("routes/home.tsx"),

    // صفحات تسجيل الدخول
    route("login", "routes/auth/login.tsx"),

    // صفحات التسجيل
    route("register", "routes/auth/regester.tsx"),

    // 🔥 صفحة تأكيد البريد الإلكتروني
    route("auth/verify", "routes/auth/verify-email.tsx"),

    route("privacy", "routes/privacy.tsx"),
    route("terms", "routes/terms.tsx"),
    route("contact", "routes/contact.tsx"),

    // Dashboard للـ parent
    route("dashboard", "routes/dashboard/layout.tsx", [
      index("routes/dashboard/teacher-index.tsx"),
      route("teacher", "routes/dashboard/teacher.tsx"),
      route("students", "routes/dashboard/students.tsx"),
      route("attendance", "routes/dashboard/attendance.tsx"),
      route("schedule", "routes/dashboard/schedule.tsx"),
      route("messages", "routes/dashboard/messages.tsx"),
      route("settings", "routes/dashboard/settings.tsx"),
    ]),
  ]),
] satisfies RouteConfig;