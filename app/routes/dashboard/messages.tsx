import { useState, useRef, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useDarkMode } from "../../hooks/useDarkMode";

// ─── Types ────────────────────────────────────────────────────────────────────
type Message = {
  id: number;
  from: "parent" | "teacher";
  text: string;
  time: string;
  date: string;
};

type Teacher = {
  user_id: string;
  name: string;
  subject: string;
  image: string;
  online: boolean;
};

type Conversation = {
  id: string;
  teacher: Teacher;
  unread: number;
  messages: Message[];
};

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function MessagesPage() {
  const { isDark } = useDarkMode();
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [input, setInput] = useState("");
  const [showList, setShowList] = useState(true);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<any>(null);
  const channelRef = useRef<any>(null);

  // ── Scroll ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConv?.messages]);

  // ── Load conversations ──────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!supabase) { setLoading(false); return; }

      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) { setLoading(false); return; }
      userRef.current = auth.user;
      const myId = auth.user.id;

      // 1. جلب الأبناء
      const { data: kids } = await supabase
        .from("students")
        .select("id")
        .eq("parent_id", myId);

      const childIds = (kids ?? []).map((k: any) => k.id);
      if (childIds.length === 0) { setLoading(false); return; }

      // 2. جلب المدرسين المسجلين من student_teachers
      const { data: stData } = await supabase
        .from("student_teachers")
        .select("teacher_id")
        .in("student_id", childIds);

      const teacherIds = Array.from(new Set((stData ?? []).map((e: any) => e.teacher_id)));
      if (teacherIds.length === 0) { setLoading(false); return; }

      // 3. جلب بيانات المدرسين من teachers + profiles
      const { data: teachers } = await supabase
        .from("teachers")
        .select("user_id, full_name, subjects, avatar_url, profiles!teachers_user_id_fkey(full_name)")
        .in("user_id", teacherIds);

      if (!teachers) { setLoading(false); return; }

      const result: Conversation[] = [];

      for (const t of teachers) {
        let msgs: Message[] = [];

        // جلب الرسائل بين ولي الأمر والمعلم
        if (t.user_id) {
          const { data: m, error: mErr } = await supabase
            .from("messages")
            .select("id, sender_id, receiver_id, body, created_at")
            .or(
              `and(sender_id.eq.${myId},receiver_id.eq.${t.user_id}),` +
                `and(sender_id.eq.${t.user_id},receiver_id.eq.${myId})`
            )
            .order("created_at", { ascending: true })
            .limit(100);

          if (!mErr && m) {
            msgs = m.map((x: any) => ({
              id: x.id,
              from: x.sender_id === myId ? "parent" : "teacher",
              text: x.body || x.content || "",
              time: new Date(x.created_at).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }),
              date: new Date(x.created_at).toLocaleDateString("ar-EG"),
            }));
          }
        }

        const teacherName = t.full_name || t.profiles?.full_name || "معلم";
        const teacherSubject = t.subjects?.[0] || "";

        result.push({
          id: t.user_id,
          teacher: {
            user_id: t.user_id,
            name: teacherName,
            subject: teacherSubject,
            image: t.avatar_url || "",
            online: false,
          },
          unread: 0,
          messages: msgs,
        });
      }

      if (!mounted) return;
      setConvs(result);
      setActiveConv(result[0] ?? null);
      setLoading(false);
    };

    load();
    return () => { mounted = false; };
  }, []);

  // ── Realtime ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!supabase || !userRef.current || convs.length === 0) return;
    const myId = userRef.current.id;

    channelRef.current?.unsubscribe();

    channelRef.current = supabase
      .channel(`messages-${myId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${myId}`,
        },
        (payload: any) => {
          const x = payload.new;
          const newMsg: Message = {
            id: x.id,
            from: "teacher",
            text: x.body || x.content || "",
            time: new Date(x.created_at).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }),
            date: new Date(x.created_at).toLocaleDateString("ar-EG"),
          };

          setConvs((prev) =>
            prev.map((c) =>
              c.teacher.user_id === x.sender_id
                ? { ...c, messages: [...c.messages, newMsg], unread: c.unread + 1 }
                : c
            )
          );

          setActiveConv((prev) => {
            if (!prev) return prev;
            if (prev.teacher.user_id === x.sender_id) {
              return { ...prev, messages: [...prev.messages, newMsg], unread: 0 };
            }
            return prev;
          });
        }
      )
      .subscribe();

    return () => { channelRef.current?.unsubscribe(); };
  }, [convs.length]);

  // ── Send message ────────────────────────────────────────────────────────────
  const sendMessage = async () => {
    if (!input.trim() || !activeConv || sending) return;

    const text = input.trim();
    setInput("");

    const optimistic: Message = {
      id: Date.now(),
      from: "parent",
      text,
      time: new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }),
      date: new Date().toLocaleDateString("ar-EG"),
    };

    setConvs((prev) =>
      prev.map((c) => (c.id === activeConv.id ? { ...c, messages: [...c.messages, optimistic] } : c))
    );
    setActiveConv((prev) => prev ? { ...prev, messages: [...prev.messages, optimistic] } : prev);

    if (!supabase || !userRef.current || !activeConv.teacher.user_id) return;

    setSending(true);
    const { error } = await supabase.from("messages").insert({
      sender_id: userRef.current.id,
      receiver_id: activeConv.teacher.user_id,
      subject: "رسالة جديدة",
      body: text,
    });
    setSending(false);

    if (error) {
      console.error("Send error:", error.message);
      setConvs((prev) =>
        prev.map((c) =>
          c.id === activeConv.id
            ? { ...c, messages: c.messages.filter((m) => m.id !== optimistic.id) }
            : c
        )
      );
      setActiveConv((prev) =>
        prev ? { ...prev, messages: prev.messages.filter((m) => m.id !== optimistic.id) } : prev
      );
    }
  };

  const openConv = (conv: Conversation) => {
    setConvs((prev) => prev.map((c) => (c.id === conv.id ? { ...c, unread: 0 } : c)));
    setActiveConv({ ...conv, unread: 0 });
    setShowList(false);
  };

  const totalUnread = convs.reduce((a, c) => a + (c.unread ?? 0), 0);

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center transition-colors duration-300"
        style={{ background: isDark ? "#0f1c2e" : "#ffffff" }}>
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded flex items-center justify-center text-2xl mx-auto animate-pulse"
            style={{ background: isDark ? "rgba(139,26,46,0.15)" : "rgba(139,26,46,0.08)", border: `1px solid ${isDark ? "rgba(139,26,46,0.3)" : "rgba(139,26,46,0.2)"}`, color: "#c9a84c" }}>💬</div>
          <p className="text-sm" style={{ color: isDark ? "rgba(255,255,255,0.6)" : "#666", fontFamily: "sans-serif" }}>جاري تحميل المحادثات...</p>
        </div>
      </div>
    );
  }

  // ── Empty ───────────────────────────────────────────────────────────────────
  if (convs.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center transition-colors duration-300"
        style={{ background: isDark ? "#0f1c2e" : "#ffffff", fontFamily: "Georgia, serif" }} dir="rtl">
        <div className="text-center space-y-3 px-6">
          <div className="text-5xl mb-2">💬</div>
          <h2 className="text-xl font-bold" style={{ color: isDark ? "#fff" : "#1a1a1a" }}>لا توجد محادثات</h2>
          <p className="text-sm max-w-xs mx-auto" style={{ color: isDark ? "rgba(255,255,255,0.55)" : "#666", fontFamily: "sans-serif" }}>
            سجّل أبناءك مع مدرسين أولاً حتى تظهر المحادثات هنا
          </p>
        </div>
      </div>
    );
  }

  // ── UI ──────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen transition-colors duration-300"
      style={{ background: isDark ? "#0f1c2e" : "#f5f4f2", fontFamily: "Georgia, serif", color: isDark ? "#fff" : "#1a1a1a" }}
      dir="rtl">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 h-[calc(100vh-4rem)]">
        {/* Header */}
        <div className="mb-5">
          <div className="inline-flex items-center gap-2 rounded px-3 py-1 text-xs mb-2"
            style={{ background: isDark ? "rgba(139,26,46,0.15)" : "rgba(139,26,46,0.08)", border: `1px solid ${isDark ? "rgba(139,26,46,0.4)" : "rgba(139,26,46,0.3)"}`, color: isDark ? "#f0b8be" : "#8b1a2e", fontFamily: "sans-serif" }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#c9a84c" }} />
            {totalUnread > 0 ? `${totalUnread} رسالة جديدة` : "الرسائل"}
          </div>
          <h1 className="text-2xl font-extrabold" style={{ color: isDark ? "#fff" : "#1a1a1a" }}>المحادثات</h1>
        </div>

        <div className="flex gap-4 h-[calc(100%-80px)]">
          {/* Sidebar */}
          <div className={`flex-shrink-0 w-full md:w-72 border rounded overflow-hidden flex flex-col ${!showList ? "hidden md:flex" : "flex"}`}
            style={{ background: isDark ? "rgba(255,255,255,0.03)" : "#ffffff", borderColor: isDark ? "rgba(255,255,255,0.1)" : "#e8e4de" }}>
            <div className="p-4 border-b" style={{ borderColor: isDark ? "rgba(255,255,255,0.05)" : "#e8e4de" }}>
              <p className="text-xs font-medium uppercase tracking-wider" style={{ color: isDark ? "rgba(255,255,255,0.4)" : "#888", fontFamily: "sans-serif" }}>
                المدرسين ({convs.length})
              </p>
            </div>
            <div className="flex-1 overflow-y-auto">
              {convs.map((conv) => (
                <button key={conv.id} onClick={() => openConv(conv)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 border-b hover:bg-white/5 transition-all text-right ${activeConv?.id === conv.id ? "border-r-2" : ""}`}
                  style={{ borderBottomColor: isDark ? "rgba(255,255,255,0.05)" : "#e8e4de", ...(activeConv?.id === conv.id && { background: isDark ? "rgba(139,26,46,0.1)" : "rgba(139,26,46,0.05)", borderRightColor: "#8b1a2e" }) }}>
                  <div className="relative flex-shrink-0">
                    {conv.teacher.image ? (
                      <img src={conv.teacher.image} alt="" className="w-11 h-11 rounded-full object-cover border"
                        style={{ borderColor: isDark ? "rgba(255,255,255,0.15)" : "#e8e4de" }} />
                    ) : (
                      <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold" style={{ background: "#8b1a2e" }}>
                        {conv.teacher.name?.charAt(0) || "؟"}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold truncate" style={{ color: isDark ? "#fff" : "#1a1a1a" }}>{conv.teacher.name}</p>
                      {conv.unread > 0 && (
                        <span className="text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "#8b1a2e" }}>{conv.unread}</span>
                      )}
                    </div>
                    <p className="text-xs" style={{ color: "#c9a84c" }}>{conv.teacher.subject}</p>
                    <p className="text-[11px] truncate mt-0.5" style={{ color: isDark ? "rgba(255,255,255,0.4)" : "#888" }}>
                      {conv.messages.at(-1)?.text ?? "—"}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Chat */}
          {activeConv ? (
            <div className={`flex-1 border rounded overflow-hidden flex flex-col ${showList ? "hidden md:flex" : "flex"}`}
              style={{ background: isDark ? "rgba(255,255,255,0.02)" : "#ffffff", borderColor: isDark ? "rgba(255,255,255,0.1)" : "#e8e4de", borderTop: "3px solid #8b1a2e" }}>
              {/* Chat header */}
              <div className="flex items-center gap-3 px-5 py-4 border-b"
                style={{ background: isDark ? "rgba(255,255,255,0.02)" : "#faf9f7", borderBottomColor: isDark ? "rgba(255,255,255,0.05)" : "#e8e4de" }}>
                <button onClick={() => setShowList(true)}
                  className="md:hidden w-8 h-8 rounded flex items-center justify-center"
                  style={{ background: isDark ? "rgba(255,255,255,0.05)" : "#f5f4f2", color: isDark ? "rgba(255,255,255,0.6)" : "#666" }}>←</button>
                <div className="relative">
                  {activeConv.teacher.image ? (
                    <img src={activeConv.teacher.image} alt="" className="w-10 h-10 rounded-full object-cover border"
                      style={{ borderColor: "rgba(139,26,46,0.5)" }} />
                  ) : (
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" style={{ background: "#8b1a2e" }}>
                      {activeConv.teacher.name?.charAt(0) || "؟"}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold" style={{ color: isDark ? "#fff" : "#1a1a1a" }}>{activeConv.teacher.name}</p>
                  <p className="text-xs" style={{ color: isDark ? "rgba(255,255,255,0.5)" : "#888" }}>{activeConv.teacher.subject}</p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                {activeConv.messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center space-y-2" style={{ color: isDark ? "rgba(255,255,255,0.4)" : "#aaa" }}>
                      <div className="text-3xl">💬</div>
                      <p className="text-sm">ابدأ المحادثة مع {activeConv.teacher.name}</p>
                    </div>
                  </div>
                ) : (
                  activeConv.messages.map((msg) => {
                    const isParent = msg.from === "parent";
                    return (
                      <div key={msg.id} className={`flex items-end gap-2 ${isParent ? "flex-row-reverse" : ""}`}>
                        {!isParent && (
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-[10px] flex-shrink-0 mb-1" style={{ background: "#8b1a2e" }}>
                            {activeConv.teacher.name?.charAt(0) || "؟"}
                          </div>
                        )}
                        <div className={`max-w-[70%] flex flex-col gap-1 ${isParent ? "items-end" : "items-start"}`}>
                          <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${isParent ? "rounded-tl-none" : "rounded-tr-none"}`}
                            style={isParent
                              ? { background: "#8b1a2e", color: "#fff" }
                              : { background: isDark ? "rgba(255,255,255,0.06)" : "#f5f4f2", border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "#e8e4de"}`, color: isDark ? "#e0e0e0" : "#1a1a1a" }}>
                            {msg.text}
                          </div>
                          <span className="text-[10px] px-1" style={{ color: isDark ? "rgba(255,255,255,0.35)" : "#aaa" }}>{msg.time}</span>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div className="px-4 py-3 border-t"
                style={{ background: isDark ? "rgba(255,255,255,0.02)" : "#faf9f7", borderTopColor: isDark ? "rgba(255,255,255,0.05)" : "#e8e4de" }}>
                <div className="flex items-center gap-2">
                  <input value={input} onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                    placeholder="اكتب رسالتك..." disabled={sending}
                    className="flex-1 rounded px-4 py-2.5 text-sm placeholder-gray-500 focus:outline-none transition-colors disabled:opacity-50"
                    style={{ background: isDark ? "rgba(255,255,255,0.05)" : "#ffffff", border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "#d0ccc4"}`, color: isDark ? "#fff" : "#1a1a1a" }} />
                  <button onClick={sendMessage} disabled={!input.trim() || sending}
                    className="w-10 h-10 rounded flex items-center justify-center text-base hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                    style={{ background: "#8b1a2e", color: "#fff" }}>
                    {sending ? "⏳" : "➤"}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 border rounded hidden md:flex items-center justify-center"
              style={{ background: isDark ? "rgba(255,255,255,0.02)" : "#ffffff", borderColor: isDark ? "rgba(255,255,255,0.1)" : "#e8e4de" }}>
              <div className="text-center space-y-2" style={{ color: isDark ? "rgba(255,255,255,0.35)" : "#aaa" }}>
                <div className="text-4xl">💬</div>
                <p className="text-sm">اختر محادثة للبدء</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}