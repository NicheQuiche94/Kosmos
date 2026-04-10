"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useProfileStore } from "@/store/profileStore";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Moon, Send, Loader2, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import ReactMarkdown from "react-markdown";

const GRADIENT = "linear-gradient(135deg, #2C5F8A 0%, #3B7FAD 50%, #4A9B8E 100%)";

const SYSTEM_PROMPT = `You are Kosmos running Andre's end-of-day debrief. Your tone is warm, curious, and direct. No em-dashes. No emojis.

DEBRIEF STRUCTURE -- follow this order strictly:

1. OPEN QUESTION (always first, regardless of data)
   Start with: "How was your day, Andre? Anything stand out across any of your life areas -- work, health, relationships, anything?"
   Wait for their response. Listen genuinely. Acknowledge what they share.

2. FOLLOW UP (based on their response)
   Ask one specific follow-up based on what they said. Keep it natural, not clinical.

3. LOGGING GAPS (after the open conversation)
   Now review what wasn't logged today. Ask about 2-3 missed items at a time, not all at once.

4. CLOSE
   Brief encouraging close. Reference something specific they mentioned.
   Remind them: 10pm bedtime.

JOURNAL CAPTURE
After the open conversation section (steps 1-2), extract a diary entry from what the user shared. Include this at the end of your response using a <diary> tag:

<diary>
{
  "date": "yyyy-MM-dd",
  "summary": "2-3 sentence narrative summary of how the day went, in third person as if written about Andre",
  "highlights": ["thing that went well", "thing that stood out"],
  "challenges": ["anything difficult or missed"],
  "mood": "positive|neutral|negative|mixed",
  "energy": 1-10
}
</diary>

Only include the diary tag after the user has responded to the open question -- not on the first message. Strip the diary tag from display.

LOGGING -- use <log> tag when logging missed items:
<log>{"logs": [{"type": "habit", "name": "...", "value": "true"}]}</log>

If nothing to log, include <log>{"logs":[]}</log>.

The user's daily habits are: Morning mobility, Log protein intake, No fizzy drinks, Take supplements, Log food, Evening dog walk, Hit 10000 steps, Set top 3 daily priorities, End of day review, MakersForge daily check-in, Rule of 100 actions, Phone down during family time, Intentional moment with kids, Daily learning input, Complete morning routine, 10pm bedtime, Get out of the house, Self-presentation standard, Evening wind-down, No unnecessary spending, Log expenses`;

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface DaySummary {
  habitsCompleted: string[];
  habitsMissed: string[];
  metricsLogged: string[];
  metricsMissed: string[];
  foodLogged: boolean;
  rule100Logged: boolean;
  sleepLogged: boolean;
}

export default function DebriefPage() {
  const router = useRouter();
  const { activeProfile } = useProfileStore();
  const profileId = activeProfile?.id || "";
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const todayDisplay = format(new Date(), "EEEE, d MMMM");

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [habits, setHabits] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any[]>([]);
  const [dayMarked, setDayMarked] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const debriefStarted = useRef(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const processLogs = useCallback(async (logData: any) => {
    if (!logData?.logs?.length) return;
    for (const log of logData.logs) {
      if (log.type === "habit") {
        const habit = habits.find((h: any) =>
          h.title.toLowerCase().includes(log.name.toLowerCase()) ||
          log.name.toLowerCase().includes(h.title.toLowerCase())
        );
        if (habit) {
          await supabase.from("habit_logs").upsert({
            profile_id: profileId, habit_id: habit.id,
            logged_at: todayStr, value: log.value || "true",
            note: log.note || null, source: "chat",
          }, { onConflict: "habit_id,logged_at" });
        }
      }
      if (log.type === "metric") {
        const metric = metrics.find((m: any) =>
          m.name.toLowerCase().includes(log.name.toLowerCase()) ||
          log.name.toLowerCase().includes(m.name.toLowerCase())
        );
        if (metric) {
          await supabase.from("metric_logs").upsert({
            profile_id: profileId, metric_id: metric.id,
            value: log.value, logged_at: todayStr,
            note: log.note || null, source: "chat",
          }, { onConflict: "metric_id,logged_at" });
        }
      }
    }
  }, [habits, metrics, profileId, todayStr]);

  const callAI = useCallback(async (history: { role: string; content: string }[]) => {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: SYSTEM_PROMPT,
        messages: history,
      }),
    });
    const data = await response.json();
    return data.content?.[0]?.text || "Sorry, something went wrong. Please try again.";
  }, []);

  // Load data and auto-start debrief
  useEffect(() => {
    if (!profileId || debriefStarted.current) return;
    debriefStarted.current = true;

    const startDebrief = async () => {
      // Fetch today's data
      const [
        { data: habitsData },
        { data: habitLogsData },
        { data: metricsData },
        { data: metricLogsData },
        { data: foodData },
        { data: summaryData },
      ] = await Promise.all([
        supabase.from("habits").select("*, life_areas(name, color)").eq("profile_id", profileId).eq("active", true).eq("frequency", "daily"),
        supabase.from("habit_logs").select("habit_id").eq("profile_id", profileId).eq("logged_at", todayStr),
        supabase.from("metrics").select("*").eq("profile_id", profileId).eq("active", true),
        supabase.from("metric_logs").select("*, metrics(name)").eq("profile_id", profileId).eq("logged_at", todayStr),
        supabase.from("food_logs").select("id").eq("profile_id", profileId).eq("logged_at", todayStr),
        supabase.from("daily_summary").select("*").eq("profile_id", profileId).eq("date", todayStr).single(),
      ]);

      const allHabits = habitsData || [];
      const allMetrics = metricsData || [];
      setHabits(allHabits);
      setMetrics(allMetrics);

      const loggedHabitIds = new Set(habitLogsData?.map((l: any) => l.habit_id) || []);
      const loggedMetricNames = new Set((metricLogsData || []).map((l: any) => l.metrics?.name?.toLowerCase()));

      const habitsCompleted = allHabits.filter((h: any) => loggedHabitIds.has(h.id)).map((h: any) => h.title);
      const habitsMissed = allHabits.filter((h: any) => !loggedHabitIds.has(h.id)).map((h: any) => h.title);

      const checkMetrics = ["Weight", "Daily protein", "Daily steps", "Sleep hours"];
      const metricsLogged = checkMetrics.filter((name) =>
        loggedMetricNames.has(name.toLowerCase()) ||
        Array.from(loggedMetricNames).some((ln) => ln && ln.includes(name.toLowerCase()))
      );
      const metricsMissed = checkMetrics.filter((name) => !metricsLogged.includes(name));

      const foodLogged = (foodData?.length || 0) > 0;
      const rule100Logged = !!summaryData?.rule_of_100_count;
      const sleepLogged = metricsLogged.some((m) => m.toLowerCase().includes("sleep"));

      const summary: DaySummary = {
        habitsCompleted,
        habitsMissed,
        metricsLogged,
        metricsMissed,
        foodLogged,
        rule100Logged,
        sleepLogged,
      };

      const initialUserMessage = `Starting debrief. Today's data context (use this for the logging gaps section later, not now): Completed habits: ${summary.habitsCompleted.join(", ") || "none"}. Missed habits: ${summary.habitsMissed.join(", ") || "none"}. Metrics logged: ${summary.metricsLogged.join(", ") || "none"}. Metrics not logged: ${summary.metricsMissed.join(", ") || "none"}. Food logged: ${summary.foodLogged ? "yes" : "no"}. Rule of 100: ${summary.rule100Logged ? "logged" : "not logged"}. Please start with the open question.`;

      // Call AI with the initial user message
      setLoading(true);
      try {
        const rawContent = await callAI([{ role: "user", content: initialUserMessage }]);
        const logMatch = rawContent.match(/<log>([\s\S]*?)<\/log>/);
        let logData = null;
        if (logMatch) { try { logData = JSON.parse(logMatch[1].trim()); } catch (e) {} }

        const diaryMatch = rawContent.match(/<diary>([\s\S]*?)<\/diary>/);
        if (diaryMatch) {
          try {
            const diaryData = JSON.parse(diaryMatch[1].trim());
            await supabase.from("diary_entries").upsert({
              profile_id: profileId,
              date: diaryData.date || todayStr,
              summary: diaryData.summary,
              highlights: diaryData.highlights || [],
              challenges: diaryData.challenges || [],
              mood: diaryData.mood || "neutral",
              energy: diaryData.energy || null,
            }, { onConflict: "profile_id,date" });
          } catch (e) {
            console.error("Failed to parse diary entry", e);
          }
        }

        const displayContent = rawContent
          .replace(/<log>[\s\S]*?<\/log>/g, "")
          .replace(/<action>[\s\S]*?<\/action>/g, "")
          .replace(/<journal>[\s\S]*?<\/journal>/g, "")
          .replace(/<diary>[\s\S]*?<\/diary>/g, "")
          .trim();

        setMessages([{ id: "debrief-1", role: "assistant", content: displayContent }]);
        if (logData) await processLogs(logData);
      } catch {
        setMessages([{ id: "debrief-1", role: "assistant", content: "I was not able to start the debrief. Please try refreshing the page." }]);
      } finally {
        setLoading(false);
        setInitialLoading(false);
      }
    };

    startDebrief();
  }, [profileId, todayStr, callAI, processLogs]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);
    if (inputRef.current) inputRef.current.style.height = "auto";

    try {
      const stripTags = (content: string) =>
        content
          .replace(/<log>[\s\S]*?<\/log>/g, "")
          .replace(/<action>[\s\S]*?<\/action>/g, "")
          .replace(/<journal>[\s\S]*?<\/journal>/g, "")
          .replace(/<diary>[\s\S]*?<\/diary>/g, "")
          .trim();
      const history = messages
        .slice(-10)
        .map((m) => ({
          role: m.role,
          content: typeof m.content === "string" ? stripTags(m.content) : m.content,
        }))
        .filter((m) => typeof m.content === "string" ? m.content.length > 0 : true);
      history.push({ role: "user", content: input.trim() });

      const rawContent = await callAI(history);
      const logMatch = rawContent.match(/<log>([\s\S]*?)<\/log>/);
      let logData = null;
      if (logMatch) { try { logData = JSON.parse(logMatch[1].trim()); } catch (e) {} }

      const diaryMatch = rawContent.match(/<diary>([\s\S]*?)<\/diary>/);
      if (diaryMatch) {
        try {
          const diaryData = JSON.parse(diaryMatch[1].trim());
          await supabase.from("diary_entries").upsert({
            profile_id: profileId,
            date: diaryData.date || todayStr,
            summary: diaryData.summary,
            highlights: diaryData.highlights || [],
            challenges: diaryData.challenges || [],
            mood: diaryData.mood || "neutral",
            energy: diaryData.energy || null,
          }, { onConflict: "profile_id,date" });
        } catch (e) {
          console.error("Failed to parse diary entry", e);
        }
      }

      const displayContent = rawContent
        .replace(/<log>[\s\S]*?<\/log>/g, "")
        .replace(/<action>[\s\S]*?<\/action>/g, "")
        .replace(/<journal>[\s\S]*?<\/journal>/g, "")
        .replace(/<diary>[\s\S]*?<\/diary>/g, "")
        .trim();

      setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content: displayContent }]);
      if (logData) await processLogs(logData);
    } catch {
      setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content: "Something went wrong. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkDayComplete = async () => {
    if (dayMarked) return;

    // Get current counts
    const [{ data: logsData }, { data: habitsData }] = await Promise.all([
      supabase.from("habit_logs").select("habit_id").eq("profile_id", profileId).eq("logged_at", todayStr),
      supabase.from("habits").select("id").eq("profile_id", profileId).eq("active", true).eq("frequency", "daily"),
    ]);

    const completed = logsData?.length || 0;
    const total = habitsData?.length || 0;

    await supabase.from("daily_summary").upsert({
      profile_id: profileId,
      date: todayStr,
      habits_completed: completed,
      habits_total: total,
    }, { onConflict: "profile_id,date" });

    setDayMarked(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      height: "100vh", maxWidth: "720px", margin: "0 auto",
      backgroundColor: "#FAFAF8",
    }}>

      {/* Hero header */}
      <div style={{
        background: GRADIENT,
        margin: "16px 16px 0",
        padding: "24px",
        borderRadius: "24px",
        position: "relative", overflow: "hidden",
        flexShrink: 0,
      }}>
        <div style={{ position: "absolute", top: "-40px", right: "-40px", width: "180px", height: "180px", borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.06)" }} />
        <div style={{ position: "absolute", bottom: "-60px", right: "80px", width: "140px", height: "140px", borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.04)" }} />

        <div style={{ display: "flex", alignItems: "center", gap: "12px", position: "relative" }}>
          <button
            onClick={() => router.back()}
            style={{
              background: "rgba(255,255,255,0.15)", border: "none", cursor: "pointer",
              color: "#fff", padding: "8px", borderRadius: "10px", display: "flex", alignItems: "center",
            }}
          >
            <ArrowLeft size={18} />
          </button>
          <div style={{
            width: "40px", height: "40px", borderRadius: "12px",
            backgroundColor: "rgba(255,255,255,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Moon size={20} color="#fff" />
          </div>
          <div>
            <h1 style={{
              fontFamily: '"Cal Sans", Inter, sans-serif',
              fontSize: "22px", fontWeight: 600, color: "#fff", margin: 0, lineHeight: 1.1,
            }}>
              Daily Debrief
            </h1>
            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.65)", marginTop: "3px" }}>
              {todayDisplay}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1, overflowY: "auto",
        padding: "20px 20px 8px",
        display: "flex", flexDirection: "column", gap: "12px",
      }}>
        {initialLoading && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <div style={{
              backgroundColor: "#fff",
              borderRadius: "18px 18px 18px 4px",
              padding: "14px 18px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              border: "1px solid rgba(0,0,0,0.04)",
              display: "flex", alignItems: "center", gap: "10px",
            }}>
              <Loader2 size={16} color="#2C5F8A" style={{ animation: "spin 1s linear infinite" }} />
              <span style={{ fontSize: "14px", color: "#6B7280" }}>Reviewing your day...</span>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div key={message.id} style={{
            display: "flex",
            justifyContent: message.role === "user" ? "flex-end" : "flex-start",
          }}>
            <div style={{
              maxWidth: "85%",
              backgroundColor: message.role === "user" ? "#2C5F8A" : "#fff",
              color: message.role === "user" ? "#fff" : "#111827",
              borderRadius: message.role === "user"
                ? "18px 18px 4px 18px"
                : "18px 18px 18px 4px",
              padding: "12px 16px",
              fontSize: "14px",
              lineHeight: 1.6,
              boxShadow: message.role === "assistant"
                ? "0 1px 3px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.04)"
                : "none",
              border: message.role === "assistant" ? "1px solid rgba(0,0,0,0.04)" : "none",
              whiteSpace: "pre-wrap",
            }}>
              {message.role === "assistant" ? (
                <ReactMarkdown
                  components={{
                    p: ({ children }) => <p style={{ margin: "0 0 8px 0" }}>{children}</p>,
                    ul: ({ children }) => <ul style={{ margin: "4px 0 8px 16px", padding: 0 }}>{children}</ul>,
                    ol: ({ children }) => <ol style={{ margin: "4px 0 8px 16px", padding: 0 }}>{children}</ol>,
                    li: ({ children }) => <li style={{ margin: "2px 0", fontSize: "14px" }}>{children}</li>,
                    strong: ({ children }) => <strong style={{ fontWeight: 600, color: "#111827" }}>{children}</strong>,
                    h1: ({ children }) => <h1 style={{ fontFamily: '"Cal Sans", Inter, sans-serif', fontSize: "16px", margin: "8px 0 6px" }}>{children}</h1>,
                    h2: ({ children }) => <h2 style={{ fontFamily: '"Cal Sans", Inter, sans-serif', fontSize: "14px", margin: "8px 0 4px" }}>{children}</h2>,
                    h3: ({ children }) => <h3 style={{ fontFamily: '"Cal Sans", Inter, sans-serif', fontSize: "13px", margin: "6px 0 4px" }}>{children}</h3>,
                    code: ({ children }) => <code style={{ backgroundColor: "rgba(0,0,0,0.06)", padding: "1px 5px", borderRadius: "4px", fontSize: "12px" }}>{children}</code>,
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              ) : message.content}
            </div>
          </div>
        ))}

        {loading && !initialLoading && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <div style={{
              backgroundColor: "#fff",
              borderRadius: "18px 18px 18px 4px",
              padding: "12px 16px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              border: "1px solid rgba(0,0,0,0.04)",
              display: "flex", alignItems: "center", gap: "8px",
            }}>
              <Loader2 size={14} color="#9CA3AF" style={{ animation: "spin 1s linear infinite" }} />
              <span style={{ fontSize: "13px", color: "#9CA3AF" }}>Thinking...</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Mark day complete + Input */}
      <div style={{ flexShrink: 0 }}>
        {/* Mark day complete button */}
        {messages.length > 0 && !initialLoading && (
          <div style={{ padding: "0 16px 8px" }}>
            <button
              onClick={handleMarkDayComplete}
              disabled={dayMarked}
              style={{
                width: "100%", padding: "10px", borderRadius: "12px",
                border: "none", fontSize: "13px", fontWeight: 700, cursor: "pointer",
                fontFamily: 'Inter, sans-serif',
                background: dayMarked ? "#ECFDF5" : "linear-gradient(135deg, #2C5F8A18, #4A9B8E18)",
                color: dayMarked ? "#059669" : "#2C5F8A",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                transition: "all 0.15s ease",
              }}
            >
              <CheckCircle2 size={16} />
              {dayMarked ? "Day marked complete" : "Mark day complete"}
            </button>
          </div>
        )}

        {/* Input */}
        <div style={{
          backgroundColor: "#fff",
          borderTop: "1px solid #F3F4F6",
          padding: "12px 16px",
          display: "flex", alignItems: "flex-end", gap: "10px",
          paddingBottom: "calc(12px + env(safe-area-inset-bottom))",
        }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Reply to Kosmos..."
            rows={1}
            style={{
              flex: 1,
              backgroundColor: "#F3F4F6",
              border: "none", borderRadius: "12px",
              padding: "10px 14px",
              fontSize: "14px", color: "#111827",
              resize: "none", outline: "none",
              fontFamily: "Inter, sans-serif",
              lineHeight: 1.5,
              maxHeight: "120px",
              overflowY: "auto",
            }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = "auto";
              target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
            }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            style={{
              width: "40px", height: "40px", borderRadius: "12px",
              background: input.trim() && !loading
                ? "linear-gradient(135deg, #2C5F8A, #4A9B8E)"
                : "#F3F4F6",
              border: "none", cursor: input.trim() && !loading ? "pointer" : "default",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.15s ease", flexShrink: 0,
            }}
          >
            <Send size={17} color={input.trim() && !loading ? "#fff" : "#9CA3AF"} />
          </button>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}