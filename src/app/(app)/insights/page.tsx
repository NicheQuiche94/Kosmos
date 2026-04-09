"use client";

import { useProfileStore } from "@/store/profileStore";
import { useEffect, useState, useCallback } from "react";
import { format, subDays, parseISO } from "date-fns";
import { Lightbulb, RefreshCw, Loader2, TrendingUp, AlertTriangle, Award, GitBranch } from "lucide-react";
import { supabase } from "@/lib/supabase";

const GRADIENT = "linear-gradient(135deg, #2C5F8A 0%, #3B7FAD 50%, #4A9B8E 100%)";
const CARD_BG = "rgba(255,255,255,0.92)";
const CARD_BORDER = "rgba(255,255,255,0.6)";
const CARD_SHADOW = "0 4px 24px rgba(0,0,0,0.08)";

const AREA_COLORS: Record<string, string> = {
  "Health & Fitness": "#4A8C6F",
  "Work": "#2C5F8A",
  "Finances": "#D97706",
  "Relationships": "#DC2626",
  "Personal Development": "#7C3AED",
  "Hobbies & Creativity": "#0891B2",
  "Environment & Lifestyle": "#65A30D",
  "General": "#6B7280",
};

const SENTIMENT_COLORS: Record<string, string> = {
  positive: "#4A8C6F",
  neutral: "#9CA3AF",
  negative: "#DC2626",
  mixed: "#D97706",
};

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  correlation: { bg: "#2C5F8A18", text: "#2C5F8A" },
  trend: { bg: "#4A8C6F18", text: "#4A8C6F" },
  warning: { bg: "#DC262618", text: "#DC2626" },
  achievement: { bg: "#D9770618", text: "#D97706" },
};

const TYPE_ICONS: Record<string, typeof TrendingUp> = {
  correlation: GitBranch,
  trend: TrendingUp,
  warning: AlertTriangle,
  achievement: Award,
};

interface Insight {
  title: string;
  description: string;
  confidence: "High" | "Medium" | "Low";
  area: string;
  type: "correlation" | "trend" | "warning" | "achievement";
}

interface InsightsResult {
  insights: Insight[];
  data_quality: "strong" | "moderate" | "limited";
  data_quality_note: string;
}

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

export default function InsightsPage() {
  const { activeProfile } = useProfileStore();
  const profileId = activeProfile?.id || "";

  const [sentimentData, setSentimentData] = useState<any[]>([]);
  const [insights, setInsights] = useState<InsightsResult | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [correlations, setCorrelations] = useState<{ habitA: string; habitB: string; pct: number }[]>([]);
  const [energyData, setEnergyData] = useState<{ date: string; level: number }[]>([]);
  const [journalFeed, setJournalFeed] = useState<any[]>([]);
  const [diaryEntries, setDiaryEntries] = useState<any[]>([]);

  const loadData = useCallback(async () => {
    if (!profileId) return;

    const sevenDaysAgo = format(subDays(new Date(), 7), "yyyy-MM-dd");
    const fourteenDaysAgo = format(subDays(new Date(), 14), "yyyy-MM-dd");
    const thirtyDaysAgo = format(subDays(new Date(), 30), "yyyy-MM-dd");

    const [
      { data: sentimentWeek },
      { data: energyEntries },
      { data: journalRecent },
      { data: habitLogsMonth },
      { data: habitsAll },
    ] = await Promise.all([
      supabase.from("journal_entries").select("sentiment, energy_level, logged_at, related_area").eq("profile_id", profileId).gte("logged_at", sevenDaysAgo).order("logged_at", { ascending: false }),
      supabase.from("journal_entries").select("logged_at, energy_level").eq("profile_id", profileId).gte("logged_at", fourteenDaysAgo).not("energy_level", "is", null).order("logged_at"),
      supabase.from("journal_entries").select("*").eq("profile_id", profileId).order("created_at", { ascending: false }).limit(10),
      supabase.from("habit_logs").select("habit_id, logged_at").eq("profile_id", profileId).gte("logged_at", thirtyDaysAgo),
      supabase.from("habits").select("id, title").eq("profile_id", profileId).eq("active", true).eq("frequency", "daily"),
    ]);

    setSentimentData(sentimentWeek || []);
    setJournalFeed(journalRecent || []);

    const { data: diaryData } = await supabase
      .from("diary_entries")
      .select("*")
      .eq("profile_id", profileId)
      .gte("date", thirtyDaysAgo)
      .order("date", { ascending: false });
    setDiaryEntries(diaryData || []);

    // Energy trend
    const energyPoints = (energyEntries || [])
      .filter((e: any) => e.energy_level != null)
      .map((e: any) => ({ date: e.logged_at, level: e.energy_level }));
    setEnergyData(energyPoints);

    // Habit correlations
    if (habitLogsMonth && habitsAll && habitsAll.length > 1) {
      const logsByDate: Record<string, Set<string>> = {};
      for (const log of habitLogsMonth) {
        if (!logsByDate[log.logged_at]) logsByDate[log.logged_at] = new Set();
        logsByDate[log.logged_at].add(log.habit_id);
      }

      const dates = Object.keys(logsByDate);
      const pairs: { habitA: string; habitB: string; pct: number }[] = [];

      for (let i = 0; i < habitsAll.length; i++) {
        for (let j = i + 1; j < habitsAll.length; j++) {
          const a = habitsAll[i];
          const b = habitsAll[j];
          let aDays = 0;
          let bothDays = 0;

          for (const date of dates) {
            const daySet = logsByDate[date];
            if (daySet.has(a.id)) {
              aDays++;
              if (daySet.has(b.id)) bothDays++;
            }
          }

          if (aDays >= 5) {
            const pct = Math.round((bothDays / aDays) * 100);
            if (pct > 60) {
              pairs.push({ habitA: a.title, habitB: b.title, pct });
            }
          }
        }
      }

      pairs.sort((a, b) => b.pct - a.pct);
      setCorrelations(pairs.slice(0, 5));
    }
  }, [profileId]);

  useEffect(() => { loadData(); }, [loadData]);

  const generateInsights = async () => {
    if (!profileId) return;
    setInsightsLoading(true);

    try {
      const thirtyDaysAgo = format(subDays(new Date(), 30), "yyyy-MM-dd");

      const [
        { data: habitLogs },
        { data: habits },
        { data: journals },
        { data: metricLogs },
        { data: metrics },
        { data: summaries },
      ] = await Promise.all([
        supabase.from("habit_logs").select("habit_id, logged_at, value").eq("profile_id", profileId).gte("logged_at", thirtyDaysAgo),
        supabase.from("habits").select("id, title").eq("profile_id", profileId).eq("active", true).eq("frequency", "daily"),
        supabase.from("journal_entries").select("*").eq("profile_id", profileId).gte("logged_at", thirtyDaysAgo).order("logged_at"),
        supabase.from("metric_logs").select("value, logged_at, metric_id").eq("profile_id", profileId).gte("logged_at", thirtyDaysAgo),
        supabase.from("metrics").select("id, name, unit").eq("profile_id", profileId).eq("active", true),
        supabase.from("daily_summary").select("*").eq("profile_id", profileId).gte("date", thirtyDaysAgo).order("date"),
      ]);

      // Build habit completion rates
      const habitMap = new Map((habits || []).map((h: any) => [h.id, h.title]));
      const habitCounts: Record<string, number> = {};
      for (const log of (habitLogs || [])) {
        const title = habitMap.get(log.habit_id);
        if (title) habitCounts[title] = (habitCounts[title] || 0) + 1;
      }
      const totalDays = 30;
      const habitRates = Object.entries(habitCounts).map(([name, count]) => `${name}: ${Math.round((count / totalDays) * 100)}% (${count}/${totalDays} days)`);

      // Build metric summary
      const metricMap = new Map((metrics || []).map((m: any) => [m.id, m]));
      const metricSummary: Record<string, { values: number[]; unit: string }> = {};
      for (const log of (metricLogs || [])) {
        const m = metricMap.get(log.metric_id);
        if (m) {
          if (!metricSummary[m.name]) metricSummary[m.name] = { values: [], unit: m.unit || "" };
          metricSummary[m.name].values.push(log.value);
        }
      }
      const metricLines = Object.entries(metricSummary).map(([name, { values, unit }]) => {
        const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
        return `${name}: avg ${avg}${unit}, ${values.length} entries`;
      });

      // Build journal summary
      const journalLines = (journals || []).map((j: any) =>
        `[${j.logged_at}] ${j.sentiment}, energy:${j.energy_level || "?"} - ${j.content}`
      );

      // Build daily summary
      const summaryLines = (summaries || []).map((s: any) =>
        `[${s.date}] habits:${s.habits_completed}/${s.habits_total}, rule100:${s.rule_of_100_count || 0}, mood:${s.mood_rating || "?"}, energy:${s.energy_rating || "?"}`
      );

      const dataSummary = [
        "HABIT COMPLETION RATES (last 30 days):",
        ...habitRates,
        "",
        "METRICS:",
        ...metricLines,
        "",
        "JOURNAL ENTRIES:",
        ...journalLines.slice(0, 30),
        "",
        "DAILY SUMMARIES:",
        ...summaryLines,
      ].join("\n");

      const systemPrompt = `You are an intelligent personal insights engine for Andre's life operating system called KosmOS. Analyse the provided data and extract genuine, specific insights and correlations.

Rules:
- Be specific, not generic. "You complete more habits when you log getting out of the house" is good. "Keep up the good work" is not.
- Find correlations between behaviours, mood, energy and outcomes
- Be honest including about gaps or concerning patterns
- Maximum 5 insights, minimum 3
- Each insight should have: a clear title, 1-2 sentence explanation, and a confidence level (High/Medium/Low based on data volume)
- No em-dashes. No emojis.
- Format as JSON only, no other text

Response format:
{
  "insights": [
    {
      "title": "insight title",
      "description": "1-2 sentence explanation with specific observations",
      "confidence": "High|Medium|Low",
      "area": "Health & Fitness|Work|Finances|Relationships|Personal Development|Hobbies & Creativity|Environment & Lifestyle|General",
      "type": "correlation|trend|warning|achievement"
    }
  ],
  "data_quality": "strong|moderate|limited",
  "data_quality_note": "brief note on how much data exists and what would improve insights"
}`;

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1500,
          system: systemPrompt,
          messages: [{ role: "user", content: dataSummary }],
        }),
      });

      const data = await response.json();
      const rawText = data.content?.[0]?.text || "";
      const parsed = JSON.parse(rawText);
      setInsights(parsed);
    } catch (e) {
      console.error("Failed to generate insights", e);
    } finally {
      setInsightsLoading(false);
    }
  };

  // Sentiment bar
  const sentimentCounts = { positive: 0, neutral: 0, negative: 0, mixed: 0 };
  for (const entry of sentimentData) {
    if (entry.sentiment in sentimentCounts) {
      sentimentCounts[entry.sentiment as keyof typeof sentimentCounts]++;
    }
  }
  const totalSentiment = sentimentData.length;

  // Energy averages
  const now = new Date();
  const thisWeekEnergy = energyData.filter(e => {
    const d = parseISO(e.date);
    return d >= subDays(now, 7);
  });
  const lastWeekEnergy = energyData.filter(e => {
    const d = parseISO(e.date);
    return d < subDays(now, 7) && d >= subDays(now, 14);
  });
  const avgThisWeek = thisWeekEnergy.length > 0
    ? (thisWeekEnergy.reduce((a, b) => a + b.level, 0) / thisWeekEnergy.length).toFixed(1)
    : null;
  const avgLastWeek = lastWeekEnergy.length > 0
    ? (lastWeekEnergy.reduce((a, b) => a + b.level, 0) / lastWeekEnergy.length).toFixed(1)
    : null;

  // SVG sparkline
  const sparklineWidth = 400;
  const sparklineHeight = 60;
  const sparklinePoints = energyData.map((e, i) => {
    const x = energyData.length > 1 ? (i / (energyData.length - 1)) * sparklineWidth : sparklineWidth / 2;
    const y = sparklineHeight - ((e.level - 1) / 9) * sparklineHeight;
    return `${x},${y}`;
  }).join(" ");

  return (
    <div style={{ maxWidth: "860px", margin: "0 auto", padding: "0 0 140px 0", minHeight: "100vh" }}>

      {/* Hero header */}
      <div style={{ padding: "36px 24px 28px" }}>
        <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.55)", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "8px" }}>
          Insights
        </p>
        <h1 style={{
          fontFamily: '"Cal Sans", Inter, sans-serif',
          fontSize: "38px", fontWeight: 600, color: "#fff",
          lineHeight: 1.1, marginBottom: "8px",
        }}>
          Your Patterns
        </h1>
        <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.7)", lineHeight: 1.4 }}>
          AI analysis of your habits, mood, and progress over time
        </p>
      </div>

      <div style={{ padding: "0 20px", display: "flex", flexDirection: "column", gap: "16px" }}>

        {/* Section 1: Weekly Sentiment Summary */}
        <Card>
          <CardHeader title="Weekly Sentiment Summary" />
          <div style={{ padding: "18px 16px" }}>
            {totalSentiment === 0 ? (
              <div style={{ textAlign: "center", padding: "16px 0" }}>
                <p style={{ fontSize: "13px", color: "#6B7280", lineHeight: 1.5 }}>
                  Start logging to build your insight picture. The more you log, the smarter this gets.
                </p>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", height: "14px", borderRadius: "99px", overflow: "hidden", marginBottom: "14px" }}>
                  {(["positive", "neutral", "negative", "mixed"] as const).map(s => {
                    const count = sentimentCounts[s];
                    if (count === 0) return null;
                    return (
                      <div key={s} style={{
                        width: `${(count / totalSentiment) * 100}%`,
                        backgroundColor: SENTIMENT_COLORS[s],
                        transition: "width 0.3s ease",
                      }} />
                    );
                  })}
                </div>
                <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                  {(["positive", "neutral", "negative", "mixed"] as const).map(s => (
                    <div key={s} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: SENTIMENT_COLORS[s] }} />
                      <span style={{ fontSize: "12px", color: "#374151", textTransform: "capitalize" }}>{s}: {sentimentCounts[s]}</span>
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: "11px", color: "#9CA3AF", marginTop: "10px" }}>
                  {totalSentiment} journal {totalSentiment === 1 ? "entry" : "entries"} this week
                </p>
              </>
            )}
          </div>
        </Card>

        {/* Section 2: Generate Insights */}
        <Card>
          <CardHeader title="AI Insights" />
          <div style={{ padding: "18px 16px" }}>
            {!insights && !insightsLoading && (
              <div style={{ textAlign: "center", padding: "12px 0" }}>
                <p style={{ fontSize: "13px", color: "#6B7280", marginBottom: "14px", lineHeight: 1.5 }}>
                  Analyse your last 30 days of data for patterns, correlations, and actionable insights.
                </p>
                <button
                  onClick={generateInsights}
                  style={{
                    background: GRADIENT,
                    color: "#fff",
                    border: "none",
                    borderRadius: "12px",
                    padding: "12px 28px",
                    fontSize: "14px",
                    fontWeight: 600,
                    fontFamily: '"Cal Sans", Inter, sans-serif',
                    cursor: "pointer",
                    boxShadow: "0 2px 12px rgba(44,95,138,0.35)",
                    transition: "transform 0.15s ease",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.02)")}
                  onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
                >
                  Generate Insights
                </button>
              </div>
            )}

            {insightsLoading && (
              <div style={{ textAlign: "center", padding: "28px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
                <Loader2 size={24} color="#2C5F8A" style={{ animation: "spin 1s linear infinite" }} />
                <p style={{ fontSize: "13px", color: "#6B7280" }}>Analysing your data...</p>
              </div>
            )}

            {insights && (
              <div>
                {/* Data quality badge */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{
                      fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em",
                      padding: "3px 10px", borderRadius: "99px",
                      backgroundColor: insights.data_quality === "strong" ? "#4A8C6F18" : insights.data_quality === "moderate" ? "#D9770618" : "#DC262618",
                      color: insights.data_quality === "strong" ? "#4A8C6F" : insights.data_quality === "moderate" ? "#D97706" : "#DC2626",
                    }}>
                      {insights.data_quality} data
                    </span>
                    <span style={{ fontSize: "11px", color: "#9CA3AF" }}>{insights.data_quality_note}</span>
                  </div>
                  <button
                    onClick={generateInsights}
                    style={{
                      display: "flex", alignItems: "center", gap: "5px",
                      background: "none", border: "1px solid rgba(0,0,0,0.1)",
                      borderRadius: "8px", padding: "5px 10px",
                      fontSize: "11px", color: "#6B7280", cursor: "pointer",
                      fontWeight: 500,
                    }}
                  >
                    <RefreshCw size={12} />
                    Regenerate
                  </button>
                </div>

                {/* Insight cards */}
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {insights.insights.map((insight, i) => {
                    const areaColor = AREA_COLORS[insight.area] || "#6B7280";
                    const typeStyle = TYPE_COLORS[insight.type] || TYPE_COLORS.trend;
                    const TypeIcon = TYPE_ICONS[insight.type] || TrendingUp;

                    return (
                      <div key={i} style={{
                        borderLeft: `3px solid ${areaColor}`,
                        backgroundColor: "rgba(0,0,0,0.02)",
                        borderRadius: "0 10px 10px 0",
                        padding: "12px 14px",
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px", flexWrap: "wrap" }}>
                          <span style={{
                            display: "inline-flex", alignItems: "center", gap: "4px",
                            fontSize: "10px", fontWeight: 600, textTransform: "uppercase",
                            padding: "2px 8px", borderRadius: "99px",
                            backgroundColor: typeStyle.bg, color: typeStyle.text,
                          }}>
                            <TypeIcon size={10} />
                            {insight.type}
                          </span>
                          <span style={{
                            fontSize: "10px", fontWeight: 600,
                            padding: "2px 8px", borderRadius: "99px",
                            backgroundColor: insight.confidence === "High" ? "#4A8C6F18" : insight.confidence === "Medium" ? "#D9770618" : "#9CA3AF18",
                            color: insight.confidence === "High" ? "#4A8C6F" : insight.confidence === "Medium" ? "#D97706" : "#9CA3AF",
                          }}>
                            {insight.confidence}
                          </span>
                        </div>
                        <h3 style={{
                          fontFamily: '"Cal Sans", Inter, sans-serif',
                          fontSize: "14px", fontWeight: 600, color: "#111827",
                          margin: "0 0 4px 0",
                        }}>
                          {insight.title}
                        </h3>
                        <p style={{ fontSize: "12px", color: "#374151", lineHeight: 1.5, margin: 0 }}>
                          {insight.description}
                        </p>
                        <p style={{ fontSize: "10px", color: areaColor, fontWeight: 500, marginTop: "6px" }}>
                          {insight.area}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Section 3: Habit Correlation Grid */}
        <Card>
          <CardHeader title="Habit Correlations" />
          <div style={{ padding: "18px 16px" }}>
            {correlations.length === 0 ? (
              <p style={{ fontSize: "13px", color: "#6B7280", textAlign: "center", padding: "12px 0" }}>
                Not enough data yet. Keep logging daily habits to reveal correlations.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {correlations.map((c, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: "10px",
                    padding: "8px 12px",
                    backgroundColor: "rgba(0,0,0,0.02)",
                    borderRadius: "10px",
                  }}>
                    <div style={{
                      width: "32px", height: "32px", borderRadius: "8px",
                      backgroundColor: "#2C5F8A18",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0,
                    }}>
                      <span style={{ fontSize: "12px", fontWeight: 700, color: "#2C5F8A" }}>{c.pct}%</span>
                    </div>
                    <p style={{ fontSize: "12px", color: "#374151", lineHeight: 1.4, margin: 0 }}>
                      When you complete <span style={{ fontWeight: 600 }}>{c.habitA}</span>, you also complete <span style={{ fontWeight: 600 }}>{c.habitB}</span> {c.pct}% of the time.
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Section 4: Energy and Mood Trend */}
        <Card>
          <CardHeader title="Energy Trend" />
          <div style={{ padding: "18px 16px" }}>
            {energyData.length < 2 ? (
              <p style={{ fontSize: "13px", color: "#6B7280", textAlign: "center", padding: "12px 0" }}>
                Not enough energy data yet. Log how you feel in chat to build your trend.
              </p>
            ) : (
              <>
                <div style={{ width: "100%", overflow: "hidden" }}>
                  <svg viewBox={`0 0 ${sparklineWidth} ${sparklineHeight}`} style={{ width: "100%", height: "60px" }} preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="energyGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#2C5F8A" />
                        <stop offset="100%" stopColor="#4A9B8E" />
                      </linearGradient>
                    </defs>
                    <polyline
                      points={sparklinePoints}
                      fill="none"
                      stroke="url(#energyGradient)"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {energyData.map((e, i) => {
                      const x = energyData.length > 1 ? (i / (energyData.length - 1)) * sparklineWidth : sparklineWidth / 2;
                      const y = sparklineHeight - ((e.level - 1) / 9) * sparklineHeight;
                      return <circle key={i} cx={x} cy={y} r="3" fill="#2C5F8A" />;
                    })}
                  </svg>
                </div>
                <div style={{ display: "flex", gap: "24px", marginTop: "12px" }}>
                  {avgThisWeek && (
                    <div>
                      <p style={{ fontSize: "11px", color: "#9CA3AF", marginBottom: "2px" }}>This week avg</p>
                      <p style={{ fontSize: "16px", fontWeight: 700, color: "#2C5F8A", fontFamily: '"Cal Sans", Inter, sans-serif' }}>{avgThisWeek}/10</p>
                    </div>
                  )}
                  {avgLastWeek && (
                    <div>
                      <p style={{ fontSize: "11px", color: "#9CA3AF", marginBottom: "2px" }}>Last week avg</p>
                      <p style={{ fontSize: "16px", fontWeight: 700, color: "#6B7280", fontFamily: '"Cal Sans", Inter, sans-serif' }}>{avgLastWeek}/10</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </Card>

        {/* Section 6: Daily Diary */}
        <Card>
          <CardHeader title="Daily Diary" />
          <div style={{ padding: "10px 0" }}>
            {diaryEntries.length === 0 ? (
              <p style={{ fontSize: "13px", color: "#6B7280", textAlign: "center", padding: "18px 16px" }}>
                Your diary will appear here after your first debrief. Start tonight.
              </p>
            ) : (
              diaryEntries.map((entry: any, i: number) => {
                const moodColor =
                  entry.mood === "positive" ? "#4A8C6F"
                  : entry.mood === "negative" ? "#DC2626"
                  : entry.mood === "mixed" ? "#D97706"
                  : "#9CA3AF";
                return (
                  <div key={entry.id || i} style={{
                    padding: "14px 16px",
                    borderBottom: i < diaryEntries.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                      <div style={{
                        width: "10px", height: "10px", borderRadius: "50%",
                        backgroundColor: moodColor, flexShrink: 0,
                      }} />
                      <h3 style={{
                        fontFamily: '"Cal Sans", Inter, sans-serif',
                        fontSize: "14px", fontWeight: 600, color: "#111827", margin: 0, flex: 1,
                      }}>
                        {format(parseISO(entry.date), "EEEE, d MMMM")}
                      </h3>
                      {entry.energy != null && (
                        <span style={{
                          fontSize: "10px", fontWeight: 600,
                          padding: "2px 8px", borderRadius: "99px",
                          backgroundColor: "#2C5F8A18", color: "#2C5F8A",
                        }}>
                          Energy: {entry.energy}/10
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: "12px", color: "#374151", lineHeight: 1.5, margin: "0 0 8px" }}>
                      {entry.summary}
                    </p>
                    {(entry.highlights?.length > 0 || entry.challenges?.length > 0) && (
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                        {(entry.highlights || []).map((h: string, j: number) => (
                          <span key={`h-${j}`} style={{
                            fontSize: "10px", fontWeight: 500,
                            padding: "3px 9px", borderRadius: "99px",
                            backgroundColor: "#4A8C6F18", color: "#4A8C6F",
                          }}>
                            {h}
                          </span>
                        ))}
                        {(entry.challenges || []).map((c: string, j: number) => (
                          <span key={`c-${j}`} style={{
                            fontSize: "10px", fontWeight: 500,
                            padding: "3px 9px", borderRadius: "99px",
                            backgroundColor: "#DC262618", color: "#DC2626",
                          }}>
                            {c}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </Card>

        {/* Section 5: Journaling Feed */}
        <Card>
          <CardHeader title="Journal Feed" />
          <div style={{ padding: "10px 0" }}>
            {journalFeed.length === 0 ? (
              <p style={{ fontSize: "13px", color: "#6B7280", textAlign: "center", padding: "18px 16px" }}>
                No journal entries yet. Chat with Kosmos about how you feel to start building your feed.
              </p>
            ) : (
              journalFeed.map((entry: any, i: number) => (
                <div key={entry.id || i} style={{
                  display: "flex", alignItems: "flex-start", gap: "12px",
                  padding: "10px 16px",
                  borderBottom: i < journalFeed.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none",
                }}>
                  <div style={{ flexShrink: 0, paddingTop: "3px" }}>
                    <div style={{
                      width: "8px", height: "8px", borderRadius: "50%",
                      backgroundColor: SENTIMENT_COLORS[entry.sentiment] || "#9CA3AF",
                    }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: "12px", color: "#374151", lineHeight: 1.5, margin: 0 }}>
                      {entry.content}
                    </p>
                    <div style={{ display: "flex", gap: "8px", marginTop: "4px", alignItems: "center" }}>
                      <span style={{ fontSize: "10px", color: "#9CA3AF" }}>
                        {entry.logged_at ? format(parseISO(entry.logged_at), "d MMM") : ""}
                      </span>
                      {entry.related_area && (
                        <span style={{ fontSize: "10px", color: AREA_COLORS[entry.related_area] || "#9CA3AF" }}>
                          {entry.related_area}
                        </span>
                      )}
                      {entry.energy_level && (
                        <span style={{ fontSize: "10px", color: "#9CA3AF" }}>
                          Energy: {entry.energy_level}/10
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
