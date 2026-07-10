import { Outlet, useLocation } from "react-router";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export default function MainLayout() {
  const location = useLocation();
  const hideChrome = ["/login", "/register"].includes(location.pathname);
  return (
    <div className="min-h-screen flex flex-col bg-gray-950 text-white">
      {!hideChrome && <Navbar />}

      <main className="flex-1">
        <Outlet />
      </main>

      {!hideChrome && <Footer />}
    </div>
  );
}
