"use client";

import { useProfileStore } from "@/store/profileStore";
import { useEffect, useState, useCallback, useRef } from "react";
import { format, addDays, parseISO } from "date-fns";
import {
  Dumbbell, Briefcase, PoundSterling, Heart,
  BookOpen, Music, Home, Send, Camera,
  CheckCircle2, MessageCircle, Loader2, Plus, ChevronRight,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { logHabit, completeAction } from "@/lib/data";

const AREA_COLORS: Record<string, string> = {
  "Health & Fitness": "#4A8C6F",
  "Work": "#2C5F8A",
  "Finances": "#D97706",
  "Relationships": "#DC2626",
  "Personal Development": "#7C3AED",
  "Hobbies & Creativity": "#0891B2",
  "Environment & Lifestyle": "#65A30D",
  "All": "#2C5F8A",
};

const AREA_ICONS: Record<string, React.ElementType> = {
  "Health & Fitness": Dumbbell,
  "Work": Briefcase,
  "Finances": PoundSterling,
  "Relationships": Heart,
  "Personal Development": BookOpen,
  "Hobbies & Creativity": Music,
  "Environment & Lifestyle": Home,
};

const GRADIENT = "linear-gradient(135deg, #2C5F8A 0%, #3B7FAD 50%, #4A9B8E 100%)";

// Frosted card — white with subtle gradient tint
const CARD_BG = "rgba(255,255,255,0.92)";
const CARD_BORDER = "rgba(255,255,255,0.6)";
const CARD_SHADOW = "0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)";

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
};

interface ScheduleBlock {
  id: string;
  time: string;
  title: string;
  type: "fixed" | "work" | "habit" | "personal" | "focus_block" | "action" | "external";
  protected?: boolean;
  color: string;
}

const EVENT_TYPE_COLORS: Record<string, string> = {
  focus_block: "#2C5F8A",
  habit: "#4A8C6F",
  personal: "#DC2626",
  action: "#D97706",
  external: "#6B7280",
};

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const WEEKLY_TEMPLATE: Record<number, ScheduleBlock[]> = {
  0: [ // Sunday -- rest day
    { id: "s1", time: "7:00", title: "Morning routine + mobility", type: "habit", protected: true, color: "#65A30D" },
    { id: "s2", time: "7:30", title: "Breakfast -- log your meal", type: "habit", color: "#4A8C6F" },
    { id: "s3", time: "10:00", title: "Rest + family day", type: "personal", protected: true, color: "#DC2626" },
    { id: "s4", time: "12:30", title: "Lunch -- log your meal", type: "habit", color: "#4A8C6F" },
    { id: "s5", time: "17:30", title: "Dinner -- log your meal", type: "habit", color: "#4A8C6F" },
    { id: "s6", time: "19:00", title: "Dog walk + audiobook", type: "habit", protected: true, color: "#4A8C6F" },
    { id: "s7", time: "20:00", title: "Weekly planning session", type: "action", color: "#D97706" },
    { id: "s8", time: "21:30", title: "Wind down", type: "habit", protected: true, color: "#6B7280" },
  ],
  1: [ // Monday -- upper body + content
    { id: "m1", time: "6:00", title: "Morning routine + mobility", type: "habit", protected: true, color: "#65A30D" },
    { id: "m2", time: "6:30", title: "Upper body training", type: "habit", color: "#4A8C6F" },
    { id: "m3", time: "7:30", title: "Breakfast + supplements -- log your meal", type: "habit", color: "#4A8C6F" },
    { id: "m4", time: "8:00", title: "Content + video creation", type: "focus_block", color: "#2C5F8A" },
    { id: "m5", time: "12:00", title: "Lunch -- log your meal", type: "habit", color: "#4A8C6F" },
    { id: "m6", time: "13:00", title: "MakersForge BD + sales", type: "focus_block", color: "#7C3AED" },
    { id: "m7", time: "17:30", title: "Family time", type: "personal", protected: true, color: "#DC2626" },
    { id: "m8", time: "17:30", title: "Dinner -- log your meal", type: "habit", color: "#4A8C6F" },
    { id: "m9", time: "19:00", title: "Dog walk + audiobook", type: "habit", protected: true, color: "#4A8C6F" },
    { id: "m10", time: "21:30", title: "Wind down", type: "habit", protected: true, color: "#6B7280" },
  ],
  2: [ // Tuesday -- lower body + deep work
    { id: "t1", time: "6:00", title: "Morning routine + mobility", type: "habit", protected: true, color: "#65A30D" },
    { id: "t2", time: "6:30", title: "Lower body training", type: "habit", color: "#4A8C6F" },
    { id: "t3", time: "7:30", title: "Breakfast + supplements -- log your meal", type: "habit", color: "#4A8C6F" },
    { id: "t4", time: "8:30", title: "Deep work -- Strategy + Product", type: "focus_block", color: "#2C5F8A" },
    { id: "t5", time: "12:00", title: "Lunch -- log your meal", type: "habit", color: "#4A8C6F" },
    { id: "t6", time: "13:00", title: "Writing + copy + marketing", type: "focus_block", color: "#0891B2" },
    { id: "t7", time: "17:30", title: "Dinner -- log your meal", type: "habit", color: "#4A8C6F" },
    { id: "t8", time: "17:30", title: "Family time", type: "personal", protected: true, color: "#DC2626" },
    { id: "t9", time: "19:00", title: "Dog walk + audiobook", type: "habit", protected: true, color: "#4A8C6F" },
    { id: "t10", time: "21:30", title: "Wind down", type: "habit", protected: true, color: "#6B7280" },
  ],
  3: [ // Wednesday -- cardio run + deep work
    { id: "w1", time: "6:00", title: "Morning routine + mobility", type: "habit", protected: true, color: "#65A30D" },
    { id: "w2", time: "6:30", title: "Run -- track your 5k time", type: "habit", color: "#4A8C6F" },
    { id: "w3", time: "7:30", title: "Breakfast + supplements -- log your meal", type: "habit", color: "#4A8C6F" },
    { id: "w4", time: "8:30", title: "Deep work -- Strategy + Product", type: "focus_block", color: "#2C5F8A" },
    { id: "w5", time: "12:00", title: "Lunch -- log your meal", type: "habit", color: "#4A8C6F" },
    { id: "w6", time: "13:00", title: "Writing + copy + marketing", type: "focus_block", color: "#0891B2" },
    { id: "w7", time: "17:30", title: "Dinner -- log your meal", type: "habit", color: "#4A8C6F" },
    { id: "w8", time: "17:30", title: "Family time", type: "personal", protected: true, color: "#DC2626" },
    { id: "w9", time: "19:00", title: "Dog walk + audiobook", type: "habit", protected: true, color: "#4A8C6F" },
    { id: "w10", time: "21:30", title: "Wind down", type: "habit", protected: true, color: "#6B7280" },
  ],
  4: [ // Thursday -- admin day + upper body
    { id: "th1", time: "6:00", title: "Morning routine + mobility", type: "habit", protected: true, color: "#65A30D" },
    { id: "th2", time: "6:30", title: "Upper body training", type: "habit", color: "#4A8C6F" },
    { id: "th3", time: "7:30", title: "Breakfast + supplements -- log your meal", type: "habit", color: "#4A8C6F" },
    { id: "th4", time: "9:00", title: "Admin + async comms", type: "focus_block", color: "#D97706" },
    { id: "th5", time: "9:00", title: "Cofounder sync", type: "action", color: "#7C3AED" },
    { id: "th6", time: "12:00", title: "Lunch -- log your meal", type: "habit", color: "#4A8C6F" },
    { id: "th7", time: "17:30", title: "Dinner -- log your meal", type: "habit", color: "#4A8C6F" },
    { id: "th8", time: "17:30", title: "Family time", type: "personal", protected: true, color: "#DC2626" },
    { id: "th9", time: "19:00", title: "Dog walk + audiobook", type: "habit", protected: true, color: "#4A8C6F" },
    { id: "th10", time: "21:30", title: "Wind down", type: "habit", protected: true, color: "#6B7280" },
  ],
  5: [ // Friday -- lower body + content
    { id: "f1", time: "6:00", title: "Morning routine + mobility", type: "habit", protected: true, color: "#65A30D" },
    { id: "f2", time: "6:30", title: "Lower body training", type: "habit", color: "#4A8C6F" },
    { id: "f3", time: "7:30", title: "Breakfast + supplements -- log your meal", type: "habit", color: "#4A8C6F" },
    { id: "f4", time: "8:00", title: "Content + video creation", type: "focus_block", color: "#2C5F8A" },
    { id: "f5", time: "12:00", title: "Lunch -- log your meal", type: "habit", color: "#4A8C6F" },
    { id: "f6", time: "13:00", title: "MakersForge BD + sales", type: "focus_block", color: "#7C3AED" },
    { id: "f7", time: "17:00", title: "Weekly review + planning", type: "action", color: "#D97706" },
    { id: "f8", time: "17:30", title: "Dinner -- log your meal", type: "habit", color: "#4A8C6F" },
    { id: "f9", time: "17:30", title: "Family time", type: "personal", protected: true, color: "#DC2626" },
    { id: "f10", time: "19:00", title: "Dog walk + audiobook", type: "habit", protected: true, color: "#4A8C6F" },
    { id: "f11", time: "21:30", title: "Wind down", type: "habit", protected: true, color: "#6B7280" },
  ],
  6: [ // Saturday -- full body + run
    { id: "sa1", time: "7:00", title: "Morning routine + mobility", type: "habit", protected: true, color: "#65A30D" },
    { id: "sa2", time: "8:00", title: "Full body training", type: "habit", color: "#4A8C6F" },
    { id: "sa3", time: "9:15", title: "Run -- track your 5k time", type: "habit", color: "#4A8C6F" },
    { id: "sa4", time: "10:15", title: "Breakfast + supplements -- log your meal", type: "habit", color: "#4A8C6F" },
    { id: "sa5", time: "11:00", title: "Family day", type: "personal", protected: true, color: "#DC2626" },
    { id: "sa6", time: "12:30", title: "Lunch -- log your meal", type: "habit", color: "#4A8C6F" },
    { id: "sa7", time: "17:30", title: "Dinner -- log your meal", type: "habit", color: "#4A8C6F" },
    { id: "sa8", time: "19:00", title: "Dog walk + audiobook", type: "habit", protected: true, color: "#4A8C6F" },
    { id: "sa9", time: "20:00", title: "Weekly planning session", type: "action", color: "#D97706" },
  ],
};

const SYSTEM_PROMPT = `You are Kosmos, Andre's personal life operating system. You can log data AND take actions inside the app. You are warm, direct, and efficient. No em-dashes. No emojis.

Andre's profile:
- Self-employed, building MakersForge (recruitment), Seedcraft (venture studio: Shiftly, Smokeless, Escapage, Vent), Harika Labs (HiddenGem, Playfeed)
- Lives in Auchterarder, Scotland with partner Amy and two young kids
- Goals: 13-15% body fat, 70kg lean mass, 5k sub 25 mins, 150-200g protein daily, eliminate fizzy drinks, 10pm bedtime, 10k steps, YouTube channel, Rule of 100 marketing actions daily

WHAT YOU CAN DO:
1. Log habits, metrics, food -- use <log> tag
2. Create calendar events -- use <action> tag
3. Complete or dismiss actions -- use <action> tag
4. Answer questions about today's schedule, habits, progress
5. Move/reschedule calendar blocks -- use <action> tag
6. Capture journal/sentiment -- use <journal> tag

LOGGING -- always end response with <log> tag:
<log>{"logs": [{"type": "habit", "name": "...", "value": "true"}, {"type": "metric", "name": "...", "value": 123}, {"type": "food", "name": "...", "calories": 0, "protein": 0, "carbs": 0, "fat": 0}]}</log>
If nothing to log: <log>{"logs": []}</log>

ACTIONS -- when user asks to create, move, complete or dismiss something, include <action> tag:
<action>
{
  "type": "create_event|complete_action|dismiss_action|reschedule_event|create_action",
  "data": {
    "title": "event or action title",
    "date": "yyyy-MM-dd",
    "start_time": "HH:mm",
    "end_time": "HH:mm",
    "event_type": "focus_block|habit|personal|action|external",
    "action_id": "uuid if completing/dismissing existing action",
    "event_id": "uuid if rescheduling existing event",
    "priority": "high|medium|low",
    "life_area": "area name"
  }
}
</action>

JOURNAL -- only when genuine emotion or reflection is present:
<journal>{"content": "...", "sentiment": "positive|neutral|negative|mixed", "energy_level": 1-10 or null, "related_area": "area name or null", "tags": []}</journal>

Daily habits to track: Morning mobility, Log protein intake, No fizzy drinks, Take supplements, Log food, Evening dog walk, Hit 10000 steps, Set top 3 daily priorities, End of day review, MakersForge daily check-in, Rule of 100 actions, Phone down during family time, Intentional moment with kids, Daily learning input, Complete morning routine, 10pm bedtime, Get out of the house, Self-presentation standard, Evening wind-down, No unnecessary spending, Log expenses

Key metrics: Weight (kg), Body fat (%), Daily protein (g), Daily steps, Sleep hours, 5k run time (mins), MakersForge MRR (GBP), Shiftly MRR (GBP), Rule of 100 count, YouTube subscribers

Examples of what you can handle:
- "Schedule a call with my cofounder tomorrow at 9am" -> create_event
- "Move my deep work to 3pm" -> reschedule_event
- "Mark the MakersForge client action as done" -> complete_action
- "Add an action to chase leads by Friday" -> create_action
- "Did my morning mobility" -> log habit
- "What does my afternoon look like?" -> answer from context, no tags needed
- "I weigh 87.5kg" -> log metric`;

// Frosted card wrapper
function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      backgroundColor: CARD_BG,
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      border: `1px solid ${CARD_BORDER}`,
      borderRadius: "18px",
      boxShadow: CARD_SHADOW,
      overflow: "hidden",
      ...style,
    }}>
      {children}
    </div>
  );
}

// Card header — solid gradient
function CardHeader({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <div style={{
      background: GRADIENT,
      padding: "11px 14px",
      display: "flex", alignItems: "center", justifyContent: "space-between",
    }}>
      <h2 style={{ fontFamily: '"Cal Sans", Inter, sans-serif', fontSize: "13px", fontWeight: 600, color: "#fff", margin: 0 }}>
        {title}
      </h2>
      {right}
    </div>
  );
}

export default function Dashboard() {
  const { activeProfile } = useProfileStore();
  const profileId = activeProfile?.id || "";
  const today = format(new Date(), "EEEE, d MMMM");

  const [schedule, setSchedule] = useState<ScheduleBlock[]>(WEEKLY_TEMPLATE[new Date().getDay()] || WEEKLY_TEMPLATE[1]);

  const [habits, setHabits] = useState<any[]>([]);
  const [habitLogs, setHabitLogs] = useState<Set<string>>(new Set());
  const [allHabits, setAllHabits] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any[]>([]);
  const [areas, setAreas] = useState<any[]>([]);
  const [todayActions, setTodayActions] = useState<any[]>([]);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [selectedArea, setSelectedArea] = useState("All");
  const [loading, setLoading] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const loadData = useCallback(async () => {
    if (!profileId) return;
    const todayStr = format(new Date(), "yyyy-MM-dd");
    const tomorrowStr = format(addDays(new Date(), 1), "yyyy-MM-dd");
    const [
      { data: habitsData },
      { data: logsData },
      { data: areasData },
      { data: metricsData },
      { data: calendarData },
      { data: actionsData },
    ] = await Promise.all([
      supabase.from("habits").select("*, life_areas(name, color)").eq("profile_id", profileId).eq("active", true).eq("frequency", "daily"),
      supabase.from("habit_logs").select("habit_id").eq("profile_id", profileId).eq("logged_at", todayStr),
      supabase.from("life_areas").select("*").eq("profile_id", profileId).order("order_index"),
      supabase.from("metrics").select("*").eq("profile_id", profileId).eq("active", true),
      supabase.from("calendar_events").select("*").eq("profile_id", profileId).gte("start_time", `${todayStr}T00:00:00`).lt("start_time", `${tomorrowStr}T00:00:00`).order("start_time"),
      supabase.from("actions").select("*, life_areas(name, color, icon)").eq("profile_id", profileId).neq("status", "completed").neq("status", "dismissed").lte("due_date", todayStr).order("priority", { ascending: false }),
    ]);
    setHabits(habitsData || []);
    setAllHabits(habitsData || []);
    setHabitLogs(new Set(logsData?.map((l: any) => l.habit_id) || []));
    setAreas(areasData || []);
    setMetrics(metricsData || []);
    setTodayActions(actionsData || []);

    // Map calendar events to schedule blocks, fall back to weekly template
    const mapped: ScheduleBlock[] = (calendarData || []).map((e: any) => ({
      id: e.id,
      time: format(parseISO(e.start_time), "H:mm"),
      title: e.title,
      type: e.event_type as any,
      protected: e.event_type === "personal" && e.title.toLowerCase().includes("family"),
      color: e.color || EVENT_TYPE_COLORS[e.event_type] || "#2C5F8A",
    }));

    if (mapped.length > 0) {
      setSchedule(mapped);
    } else {
      const dayOfWeek = new Date().getDay();
      setSchedule(WEEKLY_TEMPLATE[dayOfWeek] || WEEKLY_TEMPLATE[1]);
    }
  }, [profileId]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleToggleHabit = async (habitId: string) => {
    if (habitLogs.has(habitId)) return;
    await logHabit(profileId, habitId);
    setHabitLogs(prev => new Set([...prev, habitId]));
  };

  const handleCompleteAction = async (actionId: string) => {
    await completeAction(actionId);
    setTodayActions(prev => prev.filter(a => a.id !== actionId));
  };

  const processLogs = async (logData: any) => {
    if (!logData?.logs?.length) return;
    const todayStr = format(new Date(), "yyyy-MM-dd");
    for (const log of logData.logs) {
      if (log.type === "habit") {
        const habit = allHabits.find((h: any) =>
          h.title.toLowerCase().includes(log.name.toLowerCase()) ||
          log.name.toLowerCase().includes(h.title.toLowerCase())
        );
        if (habit) {
          await supabase.from("habit_logs").upsert({
            profile_id: profileId, habit_id: habit.id,
            logged_at: todayStr, value: log.value || "true",
            note: log.note || null, source: "chat",
          }, { onConflict: "habit_id,logged_at" });
          setHabitLogs(prev => new Set([...prev, habit.id]));
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
  };

  const processAction = async (actionData: any) => {
    const { type, data } = actionData;
    const todayStr = format(new Date(), "yyyy-MM-dd");

    if (type === "create_event") {
      const date = data.date || todayStr;
      const startTime = new Date(`${date}T${data.start_time || "09:00"}:00`);
      const endTime = new Date(`${date}T${data.end_time || "10:00"}:00`);

      await supabase.from("calendar_events").insert({
        profile_id: profileId,
        title: data.title,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        event_type: data.event_type || "action",
        source: "internal",
        color: null,
      });
      loadData();
    }

    if (type === "complete_action") {
      if (data.action_id) {
        await supabase.from("actions")
          .update({ status: "completed", completed_at: new Date().toISOString() })
          .eq("id", data.action_id);
        setTodayActions(prev => prev.filter(a => a.id !== data.action_id));
      }
    }

    if (type === "dismiss_action") {
      if (data.action_id) {
        await supabase.from("actions")
          .update({ status: "dismissed" })
          .eq("id", data.action_id);
        setTodayActions(prev => prev.filter(a => a.id !== data.action_id));
      }
    }

    if (type === "create_action") {
      const lifeArea = areas.find((a: any) =>
        a.name.toLowerCase().includes((data.life_area || "").toLowerCase())
      );
      await supabase.from("actions").insert({
        profile_id: profileId,
        life_area_id: lifeArea?.id || null,
        title: data.title,
        due_date: data.date || todayStr,
        status: "pending",
        priority: data.priority || "medium",
        recurring: false,
      });
      loadData();
    }

    if (type === "reschedule_event") {
      if (data.event_id && data.date && data.start_time && data.end_time) {
        const startTime = new Date(`${data.date}T${data.start_time}:00`);
        const endTime = new Date(`${data.date}T${data.end_time}:00`);
        await supabase.from("calendar_events")
          .update({
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
          })
          .eq("id", data.event_id);
        loadData();
      }
    }
  };

  const processJournal = async (rawContent: string) => {
    const journalMatch = rawContent.match(/<journal>([\s\S]*?)<\/journal>/);
    if (journalMatch) {
      try {
        const journalData = JSON.parse(journalMatch[1].trim());
        if (journalData.content) {
          await supabase.from("journal_entries").insert({
            profile_id: profileId,
            content: journalData.content,
            sentiment: journalData.sentiment || "neutral",
            energy_level: journalData.energy_level || null,
            source: "chat",
            related_area: journalData.related_area || null,
            tags: journalData.tags || [],
            logged_at: format(new Date(), "yyyy-MM-dd"),
          });
        }
      } catch (e) {
        console.error("Failed to parse journal data", e);
      }
    }
  };

  const sendMessage = async (messageText?: string, imageBase64?: string) => {
    const text = messageText || input.trim();
    if (!text && !imageBase64) return;
    if (loading) return;
    const areaContext = selectedArea !== "All" ? `[Context: ${selectedArea}] ` : "";
    const userMessage: Message = { id: Date.now().toString(), role: "user", content: text || "Food photo uploaded" };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setLoading(true);
    if (inputRef.current) inputRef.current.style.height = "auto";

    try {
      const history = messages.slice(-10).map(m => ({ role: m.role, content: m.content }));
      const userContent: any = imageBase64
        ? [
            { type: "image", source: { type: "base64", media_type: "image/jpeg", data: imageBase64 } },
            { type: "text", text: areaContext + (text || "Log the nutritional info from this food photo.") },
          ]
        : areaContext + text;

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1500,
          system: SYSTEM_PROMPT,
          messages: [...history, { role: "user", content: userContent }],
        }),
      });

      const data = await response.json();
      const rawContent = data.content?.[0]?.text || "Sorry, something went wrong.";
      const logMatch = rawContent.match(/<log>([\s\S]*?)<\/log>/);
      let logData = null;
      if (logMatch) { try { logData = JSON.parse(logMatch[1].trim()); } catch (e) {} }
      const displayContent = rawContent
        .replace(/<log>[\s\S]*?<\/log>/g, "")
        .replace(/<action>[\s\S]*?<\/action>/g, "")
        .replace(/<journal>[\s\S]*?<\/journal>/g, "")
        .trim();
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content: displayContent }]);
      if (logData) await processLogs(logData);
      const actionMatch = rawContent.match(/<action>([\s\S]*?)<\/action>/);
      if (actionMatch) {
        try {
          const actionData = JSON.parse(actionMatch[1].trim());
          await processAction(actionData);
        } catch (e) {
          console.error("Failed to parse action data", e);
        }
      }
      await processJournal(rawContent);
    } catch {
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content: "Something went wrong. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { const base64 = (reader.result as string).split(",")[1]; sendMessage("", base64); };
    reader.readAsDataURL(file);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const remainingHabits = habits.filter(h => !habitLogs.has(h.id));
  const completedCount = habitLogs.size;
  const totalCount = habits.length;
  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const areaOptions = ["All", ...areas.map((a: any) => a.name)];

  return (
    <div style={{ maxWidth: "860px", margin: "0 auto", padding: "0 0 140px 0", minHeight: "100vh" }}>

      {/* Header */}
      <div style={{ padding: "36px 24px 28px", position: "relative" }}>
        <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.55)", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "8px" }}>
          {today}
        </p>
        <h1 style={{
          fontFamily: '"Cal Sans", Inter, sans-serif',
          fontSize: "38px", fontWeight: 600, color: "#fff",
          lineHeight: 1.1, marginBottom: "24px",
        }}>
          {greeting()}, {activeProfile?.name}
        </h1>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{ flex: 1, backgroundColor: "rgba(255,255,255,0.18)", borderRadius: "99px", height: "5px" }}>
            <div style={{
              height: "5px", borderRadius: "99px",
              backgroundColor: "#fff",
              width: `${pct}%`, transition: "width 0.6s ease",
            }} />
          </div>
          <span style={{ fontSize: "12px", fontWeight: 600, color: "rgba(255,255,255,0.9)", whiteSpace: "nowrap" }}>
            {completedCount}/{totalCount} actions
          </span>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "0 20px" }}>

        {/* CHAT */}
        <div style={{ marginBottom: "16px" }}>

          {/* Messages */}
          {messages.length > 0 && (
            <div style={{
              backgroundColor: CARD_BG,
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: `1px solid ${CARD_BORDER}`,
              borderBottom: "none",
              borderRadius: "18px 18px 0 0",
              padding: "18px 20px 14px",
              display: "flex", flexDirection: "column", gap: "10px",
              maxHeight: "400px", overflowY: "auto",
              boxShadow: "0 -2px 20px rgba(0,0,0,0.06)",
            }}>
              {messages.map((message) => (
                <div key={message.id} style={{ display: "flex", justifyContent: message.role === "user" ? "flex-end" : "flex-start" }}>
                  <div style={{
                    maxWidth: "84%",
                    background: message.role === "user" ? GRADIENT : "rgba(255,255,255,0.7)",
                    color: message.role === "user" ? "#fff" : "#111827",
                    borderRadius: message.role === "user" ? "14px 14px 3px 14px" : "14px 14px 14px 3px",
                    padding: "11px 15px", fontSize: "13px", lineHeight: 1.55,
                    border: message.role === "assistant" ? "1px solid rgba(255,255,255,0.6)" : "none",
                  }}>
                    {message.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div style={{ display: "flex", justifyContent: "flex-start" }}>
                  <div style={{ backgroundColor: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.6)", borderRadius: "14px 14px 14px 3px", padding: "10px 14px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <Loader2 size={13} color="#6B7280" style={{ animation: "spin 1s linear infinite" }} />
                    <span style={{ fontSize: "12px", color: "#6B7280" }}>Logging...</span>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}

          {/* Input card */}
          <div style={{
            backgroundColor: CARD_BG,
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: `1px solid ${CARD_BORDER}`,
            borderRadius: messages.length > 0 ? "0 0 18px 18px" : "18px",
            overflow: "hidden",
            boxShadow: CARD_SHADOW,
          }}>

            {/* Empty state */}
            {messages.length === 0 && (
              <div style={{
                padding: "32px 24px 20px",
                textAlign: "center",
                position: "relative", overflow: "hidden",
              }}>
                <div style={{ position: "absolute", top: "-20px", right: "-20px", width: "140px", height: "140px", borderRadius: "50%", backgroundColor: "rgba(44,95,138,0.05)" }} />
                <h2 style={{ fontFamily: '"Cal Sans", Inter, sans-serif', fontSize: "24px", color: "#111827", marginBottom: "6px", position: "relative" }}>
                  What have you done today?
                </h2>
                <p style={{ fontSize: "13px", color: "#6B7280", position: "relative" }}>
                  Tell me anything and I'll log it automatically
                </p>
              </div>
            )}

            {/* Area selector */}
            <div style={{
              padding: "12px 16px 10px",
              display: "flex", gap: "7px", overflowX: "auto",
              scrollbarWidth: "none",
              borderBottom: "1px solid rgba(0,0,0,0.06)",
            }}>
              {areaOptions.map((area) => {
                const active = selectedArea === area;
                const color = AREA_COLORS[area] || "#2C5F8A";
                const label = area === "All" ? "All areas" : area.split(" & ")[0].split(" ")[0];
                return (
                  <button key={area} onClick={() => setSelectedArea(area)} style={{
                    padding: "5px 13px", borderRadius: "99px",
                    border: `1.5px solid ${active ? color : "rgba(0,0,0,0.1)"}`,
                    background: active ? `${color}18` : "rgba(255,255,255,0.5)",
                    color: active ? color : "#6B7280",
                    fontSize: "11px", fontWeight: active ? 600 : 400,
                    cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
                    transition: "all 0.15s ease",
                  }}>
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Input row */}
            <div style={{ padding: "14px 16px", display: "flex", alignItems: "flex-end", gap: "10px" }}>
              <button
                onClick={() => fileRef.current?.click()}
                style={{
                  width: "42px", height: "42px", borderRadius: "12px",
                  backgroundColor: "rgba(0,0,0,0.06)", border: "none", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}
              >
                <Camera size={17} color="#6B7280" />
              </button>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handlePhotoUpload} />

              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={selectedArea !== "All" ? `Log something in ${selectedArea.split(" ")[0]}...` : "Log a workout, food, habit, metric..."}
                rows={2}
                style={{
                  flex: 1, backgroundColor: "rgba(0,0,0,0.05)",
                  border: "1px solid rgba(0,0,0,0.08)", borderRadius: "12px",
                  padding: "12px 14px", fontSize: "14px", color: "#111827",
                  resize: "none", outline: "none",
                  fontFamily: "Inter, sans-serif",
                  lineHeight: 1.55, maxHeight: "140px", overflowY: "auto",
                }}
                onInput={e => {
                  const t = e.target as HTMLTextAreaElement;
                  t.style.height = "auto";
                  t.style.height = `${Math.min(t.scrollHeight, 140)}px`;
                }}
              />

              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || loading}
                style={{
                  width: "42px", height: "42px", borderRadius: "12px",
                  background: input.trim() && !loading ? GRADIENT : "rgba(0,0,0,0.06)",
                  border: "none", cursor: input.trim() && !loading ? "pointer" : "default",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  transition: "all 0.15s ease",
                  boxShadow: input.trim() && !loading ? "0 2px 10px rgba(44,95,138,0.4)" : "none",
                }}
              >
                <Send size={16} color={input.trim() && !loading ? "#fff" : "#9CA3AF"} />
              </button>
            </div>

          </div>
        </div>

        {/* Current Task Bar */}
        {(() => {
          const now = new Date();
          const currentBlock = schedule.find((b, i) => {
            const [h, m] = b.time.split(":").map(Number);
            const blockStart = h * 60 + (m || 0);
            const next = schedule[i + 1];
            const blockEnd = next ? next.time.split(":").map(Number).reduce((hr, mn) => hr * 60 + (mn || 0)) : 24 * 60;
            const nowMins = now.getHours() * 60 + now.getMinutes();
            return nowMins >= blockStart && nowMins < blockEnd;
          });
          const nextBlock = schedule.find(b => {
            const [h, m] = b.time.split(":").map(Number);
            return (h * 60 + (m || 0)) > now.getHours() * 60 + now.getMinutes();
          });

          return (
            <div style={{
              backgroundColor: "rgba(255,255,255,0.85)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              borderRadius: "12px",
              border: "1px solid rgba(255,255,255,0.5)",
              padding: "10px 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "16px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{
                  width: "8px", height: "8px", borderRadius: "50%",
                  backgroundColor: currentBlock?.color || "#9CA3AF",
                }} />
                <span style={{ fontSize: "13px", fontWeight: 600, color: "#111827" }}>
                  {currentBlock ? currentBlock.title : "No active block -- free time"}
                </span>
              </div>
              {nextBlock && (
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <span style={{ fontSize: "11px", color: "#9CA3AF" }}>
                    Next: {nextBlock.time} {nextBlock.title}
                  </span>
                  <ChevronRight size={12} color="#9CA3AF" />
                </div>
              )}
            </div>
          );
        })()}

        {/* Area Kanban */}
        {(() => {
          // Group remaining habits by area
          const areaMap: Record<string, { name: string; color: string; habits: any[]; actions: any[] }> = {};

          for (const habit of remainingHabits) {
            const areaName = habit.life_areas?.name || "Other";
            const areaColor = habit.life_areas?.color || "#6B7280";
            if (!areaMap[areaName]) areaMap[areaName] = { name: areaName, color: areaColor, habits: [], actions: [] };
            areaMap[areaName].habits.push(habit);
          }

          for (const action of todayActions) {
            const areaName = action.life_areas?.name || "Other";
            const areaColor = action.life_areas?.color || "#6B7280";
            if (!areaMap[areaName]) areaMap[areaName] = { name: areaName, color: areaColor, habits: [], actions: [] };
            areaMap[areaName].actions.push(action);
          }

          const areaEntries = Object.entries(areaMap);

          if (areaEntries.length === 0 && completedCount === totalCount && todayActions.length === 0) {
            return (
              <Card style={{ padding: "32px 20px", textAlign: "center" }}>
                <CheckCircle2 size={28} color="#4A8C6F" style={{ margin: "0 auto 10px" }} />
                <p style={{ fontSize: "15px", fontWeight: 600, color: "#111827", fontFamily: '"Cal Sans", Inter, sans-serif' }}>All clear today. Great work.</p>
              </Card>
            );
          }

          return (
            <div style={{
              display: "flex",
              gap: "12px",
              overflowX: "auto",
              paddingBottom: "8px",
              scrollbarWidth: "none",
            }}>
              {areaEntries.map(([areaName, areaData]) => {
                const AreaIcon = AREA_ICONS[areaName] || Briefcase;
                const itemCount = areaData.habits.length + areaData.actions.length;

                return (
                  <Card key={areaName} style={{ minWidth: "220px", maxWidth: "220px", flexShrink: 0 }}>
                    <div style={{
                      background: GRADIENT,
                      padding: "10px 12px",
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                        <AreaIcon size={14} color="#fff" />
                        <span style={{ fontFamily: '"Cal Sans", Inter, sans-serif', fontSize: "12px", fontWeight: 600, color: "#fff" }}>
                          {areaName.split(" & ")[0].split(" ")[0]}
                        </span>
                      </div>
                      <span style={{
                        fontSize: "10px", fontWeight: 700, color: "#fff",
                        backgroundColor: "rgba(255,255,255,0.2)",
                        padding: "2px 8px", borderRadius: "99px",
                      }}>
                        {itemCount}
                      </span>
                    </div>

                    <div style={{ overflowY: "auto", maxHeight: "240px" }}>
                      {/* Habits (daily actions) */}
                      {areaData.habits.map((habit: any) => (
                        <div
                          key={habit.id}
                          style={{
                            display: "flex", alignItems: "center", justifyContent: "space-between",
                            padding: "8px 12px",
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: "11px", color: "#111827", fontWeight: 500, lineHeight: 1.3, margin: 0 }}>{habit.title}</p>
                          </div>
                          <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                            <button
                              title="Mark complete"
                              onClick={() => handleToggleHabit(habit.id)}
                              style={{
                                background: "none", border: "none", cursor: "pointer",
                                padding: "4px", borderRadius: "6px", display: "flex", alignItems: "center",
                                transition: "color 0.15s", color: "#9CA3AF",
                              }}
                              onMouseEnter={e => (e.currentTarget.style.color = "#4A8C6F")}
                              onMouseLeave={e => (e.currentTarget.style.color = "#9CA3AF")}
                            >
                              <CheckCircle2 size={18} />
                            </button>
                            <button
                              title="Log in chat"
                              onClick={() => {
                                setSelectedArea(areaName);
                                inputRef.current?.focus();
                              }}
                              style={{
                                background: "none", border: "none", cursor: "pointer",
                                padding: "4px", borderRadius: "6px", display: "flex", alignItems: "center",
                                transition: "color 0.15s", color: "#9CA3AF",
                              }}
                              onMouseEnter={e => (e.currentTarget.style.color = "#2C5F8A")}
                              onMouseLeave={e => (e.currentTarget.style.color = "#9CA3AF")}
                            >
                              <MessageCircle size={18} />
                            </button>
                          </div>
                        </div>
                      ))}

                      {/* Due actions */}
                      {areaData.actions.map((action: any) => (
                        <div
                          key={action.id}
                          style={{
                            display: "flex", alignItems: "center", justifyContent: "space-between",
                            padding: "8px 12px",
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: "11px", color: "#111827", fontWeight: 500, lineHeight: 1.3, margin: 0 }}>{action.title}</p>
                            {action.priority === "high" && (
                              <span style={{
                                fontSize: "8px", fontWeight: 700, color: "#DC2626",
                                letterSpacing: "0.04em", textTransform: "uppercase",
                              }}>
                                High
                              </span>
                            )}
                          </div>
                          <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                            <button
                              title="Mark complete"
                              onClick={() => handleCompleteAction(action.id)}
                              style={{
                                background: "none", border: "none", cursor: "pointer",
                                padding: "4px", borderRadius: "6px", display: "flex", alignItems: "center",
                                transition: "color 0.15s", color: "#9CA3AF",
                              }}
                              onMouseEnter={e => (e.currentTarget.style.color = "#4A8C6F")}
                              onMouseLeave={e => (e.currentTarget.style.color = "#9CA3AF")}
                            >
                              <CheckCircle2 size={18} />
                            </button>
                            <button
                              title="Log in chat"
                              onClick={() => {
                                setSelectedArea(areaName);
                                inputRef.current?.focus();
                              }}
                              style={{
                                background: "none", border: "none", cursor: "pointer",
                                padding: "4px", borderRadius: "6px", display: "flex", alignItems: "center",
                                transition: "color 0.15s", color: "#9CA3AF",
                              }}
                              onMouseEnter={e => (e.currentTarget.style.color = "#2C5F8A")}
                              onMouseLeave={e => (e.currentTarget.style.color = "#9CA3AF")}
                            >
                              <MessageCircle size={18} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* + shortcut */}
                    <button
                      onClick={() => {
                        setSelectedArea(areaName);
                        inputRef.current?.focus();
                      }}
                      style={{
                        width: "100%", padding: "8px 12px",
                        background: "none", border: "none", borderTop: "1px solid rgba(0,0,0,0.05)",
                        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px",
                        transition: "background-color 0.15s",
                      }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(0,0,0,0.03)")}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
                    >
                      <Plus size={12} color="#9CA3AF" />
                      <span style={{ fontSize: "10px", color: "#9CA3AF" }}>Log something</span>
                    </button>
                  </Card>
                );
              })}
            </div>
          );
        })()}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        ::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}