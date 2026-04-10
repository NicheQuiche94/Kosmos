"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useProfileStore } from "@/store/profileStore";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Send, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const SYSTEM_PROMPT = `You are Kosmos, a personal life operating system assistant. You help the user log their daily habits, metrics, workouts, food, and actions.

When the user tells you something they've done or logged, you should:
1. Acknowledge what they said warmly and briefly
2. Identify what can be logged from their message
3. Confirm what you are logging
4. Offer encouragement or a relevant insight if appropriate

The user's profile:
- Name: Andre
- Daily habits to track: Morning mobility, Log protein intake, No fizzy drinks, Take supplements, Log food, Evening dog walk, Hit 10000 steps, Set top 3 daily priorities, End of day review, MakersForge daily check-in, Rule of 100 actions, Phone down during family time, Intentional moment with kids, Daily learning input, Complete morning routine, 10pm bedtime, Get out of the house, Self-presentation standard, Evening wind-down, No unnecessary spending, Log expenses
- Weekly habits: Weight training 4x, Cardio 2x, Weekly weigh-in, Weekly planning session, MakersForge BD outreach, Content batch session, Cofounder sync, Weekly financial review, Date night, Partner check-in, Family contact, Publish YouTube video, Marketing deep dive, Review own camera performance, Gaming session, Monthly gig, Weekly environment reset, Thursday pre-plan
- Key metrics: Weight (kg), Body fat (%), Daily protein (g), Daily steps, Sleep hours, 5k run time (mins), MakersForge MRR, Shiftly MRR, Rule of 100 count, YouTube subscribers

When logging, respond in this JSON format at the end of your message (after your conversational response), wrapped in <log> tags:

<log>
{
  "logs": [
    {
      "type": "habit",
      "name": "habit name here",
      "value": "true",
      "note": "optional note"
    },
    {
      "type": "metric", 
      "name": "metric name here",
      "value": 123,
      "note": "optional note"
    }
  ]
}
</log>

If nothing can be logged, still respond helpfully and include <log>{"logs":[]}</log>.

Keep responses concise, warm, and direct. No em-dashes. Use the user's name occasionally. Never use emojis.`;

export default function ChatLog() {
  const router = useRouter();
  const { activeProfile } = useProfileStore();
  const profileId = activeProfile?.id || "";
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "What have you done today? Tell me anything — a workout, what you ate, habits you've ticked off, how many steps you got, your Rule of 100 count. I'll log it all.",
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [habits, setHabits] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const loadContext = async () => {
      const [{ data: habitsData }, { data: metricsData }] = await Promise.all([
        supabase.from("habits").select("*").eq("profile_id", profileId).eq("active", true),
        supabase.from("metrics").select("*").eq("profile_id", profileId).eq("active", true),
      ]);
      setHabits(habitsData || []);
      setMetrics(metricsData || []);
    };
    if (profileId) loadContext();
  }, [profileId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const processLogs = async (logData: any) => {
    if (!logData?.logs?.length) return;
    const today = format(new Date(), "yyyy-MM-dd");

    for (const log of logData.logs) {
      if (log.type === "habit") {
        const habit = habits.find(h =>
          h.title.toLowerCase().includes(log.name.toLowerCase()) ||
          log.name.toLowerCase().includes(h.title.toLowerCase())
        );
        if (habit) {
          await supabase.from("habit_logs").upsert({
            profile_id: profileId,
            habit_id: habit.id,
            logged_at: today,
            value: log.value || "true",
            note: log.note || null,
            source: "chat",
          }, { onConflict: "habit_id,logged_at" });
        }
      }

      if (log.type === "metric") {
        const metric = metrics.find(m =>
          m.name.toLowerCase().includes(log.name.toLowerCase()) ||
          log.name.toLowerCase().includes(m.name.toLowerCase())
        );
        if (metric) {
          await supabase.from("metric_logs").upsert({
            profile_id: profileId,
            metric_id: metric.id,
            value: log.value,
            logged_at: today,
            note: log.note || null,
            source: "chat",
          }, { onConflict: "metric_id,logged_at" });
        }
      }
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const stripTags = (content: string) =>
        content
          .replace(/<log>[\s\S]*?<\/log>/g, "")
          .replace(/<action>[\s\S]*?<\/action>/g, "")
          .replace(/<journal>[\s\S]*?<\/journal>/g, "")
          .trim();

      const conversationHistory = messages
        .filter(m => m.id !== "welcome")
        .map(m => ({
          role: m.role,
          content: typeof m.content === "string" ? stripTags(m.content) : m.content,
        }))
        .filter(m => typeof m.content === "string" ? m.content.length > 0 : true);

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: SYSTEM_PROMPT,
          messages: [
            ...conversationHistory,
            { role: "user", content: input.trim() },
          ],
        }),
      });

      const data = await response.json();
      const rawContent = data.content?.[0]?.text || "Sorry, I could not process that.";

      // Extract log data
      const logMatch = rawContent.match(/<log>([\s\S]*?)<\/log>/);
      let logData = null;
      if (logMatch) {
        try {
          logData = JSON.parse(logMatch[1].trim());
        } catch (e) {
          console.error("Failed to parse log data", e);
        }
      }

      // Clean display content — remove log tags
      const displayContent = rawContent.replace(/<log>[\s\S]*?<\/log>/g, "").trim();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: displayContent,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Process and save logs
      if (logData) {
        await processLogs(logData);
      }

    } catch (error) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Something went wrong. Please try again.",
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      height: "100vh", maxWidth: "720px", margin: "0 auto",
      backgroundColor: "#FAFAF8",
    }}>

      {/* Header */}
      <div style={{
        backgroundColor: "#fff",
        borderBottom: "1px solid #F3F4F6",
        padding: "16px 20px",
        display: "flex", alignItems: "center", gap: "12px",
        flexShrink: 0,
      }}>
        <button
          onClick={() => router.back()}
          style={{
            background: "none", border: "none", cursor: "pointer",
            color: "#9CA3AF", padding: 0, display: "flex", alignItems: "center",
          }}
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: "17px", fontWeight: 700, color: "#111827", lineHeight: 1,
          }}>
            Log with Kosmos
          </h1>
          <p style={{ fontSize: "11px", color: "#9CA3AF", marginTop: "2px" }}>
            Tell me what you have done today
          </p>
        </div>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1, overflowY: "auto",
        padding: "20px 20px 8px",
        display: "flex", flexDirection: "column", gap: "12px",
      }}>
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
              lineHeight: 1.5,
              boxShadow: message.role === "assistant"
                ? "0 1px 3px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.04)"
                : "none",
              border: message.role === "assistant" ? "1px solid rgba(0,0,0,0.04)" : "none",
            }}>
              {message.content}
            </div>
          </div>
        ))}

        {loading && (
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
              <span style={{ fontSize: "13px", color: "#9CA3AF" }}>Logging...</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Quick prompts */}
      {messages.length === 1 && (
        <div style={{
          padding: "0 20px 12px",
          display: "flex", gap: "8px", flexWrap: "wrap",
        }}>
          {[
            "Just did my morning mobility",
            "No fizzy drinks today",
            "Hit 180g protein",
            "Completed upper body session",
            "Did my evening dog walk",
            "10pm bedtime done",
          ].map((prompt) => (
            <button key={prompt}
              onClick={() => setInput(prompt)}
              style={{
                backgroundColor: "#fff",
                border: "1px solid #E5E7EB",
                borderRadius: "99px",
                padding: "6px 12px",
                fontSize: "12px",
                color: "#6B7280",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.borderColor = "#2C5F8A";
                (e.currentTarget as HTMLElement).style.color = "#2C5F8A";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.borderColor = "#E5E7EB";
                (e.currentTarget as HTMLElement).style.color = "#6B7280";
              }}
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{
        backgroundColor: "#fff",
        borderTop: "1px solid #F3F4F6",
        padding: "12px 16px",
        display: "flex", alignItems: "flex-end", gap: "10px",
        flexShrink: 0,
        paddingBottom: "calc(12px + env(safe-area-inset-bottom))",
      }}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Tell me what you have done..."
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
          onInput={e => {
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

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}