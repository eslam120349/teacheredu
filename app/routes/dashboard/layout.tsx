import { Outlet, useNavigate } from "react-router";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function DashboardLayout() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      if (!supabase) {
        navigate("/login", { replace: true });
        return;
      }
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      if (!data.session) {
        navigate("/login", { replace: true });
        return;
      }
      setReady(true);
    };
    init();
    const { data: sub } = supabase?.auth.onAuthStateChange((_e, session) => {
      if (!session) {
        navigate("/login", { replace: true });
      }
    }) ?? { data: { subscription: { unsubscribe() {} } } };
    return () => {
      mounted = false;
      sub.subscription?.unsubscribe?.();
    };
  }, [navigate]);

  return <Outlet />;
}
