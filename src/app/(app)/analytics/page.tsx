"use client";

import { useState, useEffect, useCallback } from "react";
import { useProfileStore } from "@/store/profileStore";
import { supabase } from "@/lib/supabase";
import { format, subDays, startOfMonth, getDaysInMonth } from "date-fns";
import { getFoodLogs } from "@/lib/conversations";
import {
  BarChart2, Flame, Beef, Wheat, Droplets,
  Activity, Footprints, Moon, Scale,
  Zap, TrendingUp, Play, Pencil, Trash2, Check, X,
} from "lucide-react";

const GRADIENT = "linear-gradient(135deg, #2C5F8A 0%, #3B7FAD 50%, #4A9B8E 100%)";

function GradientCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: GRADIENT, borderRadius: "18px", padding: "1.5px", ...style }}>
      <div style={{ backgroundColor: "#fff", borderRadius: "16.5px", overflow: "hidden", height: "100%" }}>
        {children}
      </div>
    </div>
  );
}

function CardHeader({ title, icon }: { title: string; icon?: React.ReactNode }) {
  return (
    <div style={{
      background: GRADIENT, padding: "12px 16px",
      display: "flex", alignItems: "center", gap: "8px",
    }}>
      {icon}
      <h2 style={{ fontFamily: 'Inter, sans-serif', fontSize: "14px", fontWeight: 700, color: "#fff", margin: 0 }}>
        {title}
      </h2>
    </div>
  );
}

function StatBox({ label, value, target, unit, color, icon }: {
  label: string; value: number; target: number; unit: string; color: string; icon: React.ReactNode;
}) {
  const pct = target > 0 ? Math.min((value / target) * 100, 100) : 0;
  return (
    <div style={{ flex: 1, minWidth: "0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "4px" }}>
        {icon}
        <span style={{ fontSize: "11px", fontWeight: 600, color: "#6B7280" }}>{label}</span>
      </div>
      <div style={{ fontSize: "22px", fontWeight: 700, color: "#111827", fontFamily: '"Cal Sans", Inter, sans-serif', lineHeight: 1.2 }}>
        {value}<span style={{ fontSize: "12px", fontWeight: 500, color: "#9CA3AF", marginLeft: "2px" }}>{unit}</span>
      </div>
      <div style={{ fontSize: "11px", color: "#9CA3AF", marginBottom: "6px" }}>of {target}{unit}</div>
      <div style={{ height: "4px", borderRadius: "99px", backgroundColor: "#F3F4F6" }}>
        <div style={{ height: "4px", borderRadius: "99px", backgroundColor: color, width: `${pct}%`, transition: "width 0.4s ease" }} />
      </div>
    </div>
  );
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length === 0) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: "3px", height: "32px" }}>
      {values.map((v, i) => {
        const h = ((v - min) / range) * 28 + 4;
        return (
          <div key={i} style={{
            width: "6px", height: `${h}px`, borderRadius: "3px",
            backgroundColor: i === values.length - 1 ? color : `${color}60`,
            transition: "height 0.3s ease",
          }} />
        );
      })}
    </div>
  );
}

function StreakDots({ days, color }: { days: boolean[]; color: string }) {
  return (
    <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
      {days.map((filled, i) => (
        <div key={i} style={{
          width: "8px", height: "8px", borderRadius: "50%",
          backgroundColor: filled ? color : "#E5E7EB",
        }} />
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  const { activeProfile } = useProfileStore();
  const profileId = activeProfile?.id || "";
  const today = format(new Date(), "yyyy-MM-dd");
  const monthYear = format(new Date(), "MMMM yyyy");

  const [foodLogs, setFoodLogs] = useState<any[]>([]);
  const [allFoodLogs, setAllFoodLogs] = useState<any[]>([]);
  const [nutritionDate, setNutritionDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [nutritionView, setNutritionView] = useState<"day" | "week" | "month">("day");
  const [editingFood, setEditingFood] = useState<any>(null);
  const [bodyMetrics, setBodyMetrics] = useState<any[]>([]);
  const [weightTrend, setWeightTrend] = useState<number[]>([]);
  const [bodyFatTrend, setBodyFatTrend] = useState<number[]>([]);
  const [habitStreaks, setHabitStreaks] = useState<any[]>([]);
  const [workMetrics, setWorkMetrics] = useState<any[]>([]);

  const loadData = useCallback(async () => {
    if (!profileId) return;

    const thirtyDaysAgo = format(subDays(new Date(), 30), "yyyy-MM-dd");
    const sevenDaysAgo = format(subDays(new Date(), 7), "yyyy-MM-dd");

    // Parallel queries
    const [
      { data: foodData },
      { data: metricsData },
      { data: metricLogsData },
      { data: habitsData },
      { data: habitLogsData },
    ] = await Promise.all([
      supabase.from("food_logs").select("*").eq("profile_id", profileId).eq("logged_at", today),
      supabase.from("metrics").select("*").eq("profile_id", profileId).eq("active", true),
      supabase.from("metric_logs").select("*, metrics(name, unit, target_value)").eq("profile_id", profileId).gte("logged_at", thirtyDaysAgo).order("logged_at", { ascending: false }),
      supabase.from("habits").select("*, life_areas(name, color)").eq("profile_id", profileId).eq("active", true).eq("frequency", "daily"),
      supabase.from("habit_logs").select("habit_id, logged_at").eq("profile_id", profileId).gte("logged_at", thirtyDaysAgo).order("logged_at", { ascending: false }),
    ]);

    setFoodLogs(foodData || []);

    // Load nutrition logbook data
    const allFoodData = await getFoodLogs(profileId, 60);
    setAllFoodLogs(allFoodData);

    // Body metrics - latest value per metric
    const metrics = metricsData || [];
    const logs = metricLogsData || [];
    const bodyNames = ["Weight", "Body fat", "Daily steps", "Sleep hours"];
    const bodyResults: any[] = [];
    for (const name of bodyNames) {
      const metric = metrics.find((m: any) => m.name.toLowerCase().includes(name.toLowerCase()));
      if (metric) {
        const latestLog = logs.find((l: any) => l.metrics?.name?.toLowerCase().includes(name.toLowerCase()));
        bodyResults.push({
          name: metric.name,
          unit: metric.unit || "",
          target: metric.target_value || 0,
          value: latestLog?.value || 0,
          metricId: metric.id,
        });
      }
    }
    setBodyMetrics(bodyResults);

    // Weight and body fat 7-day trends
    const weightMetric = metrics.find((m: any) => m.name.toLowerCase().includes("weight"));
    const fatMetric = metrics.find((m: any) => m.name.toLowerCase().includes("body fat"));
    if (weightMetric) {
      const wLogs = logs
        .filter((l: any) => l.metrics?.name?.toLowerCase().includes("weight") && l.logged_at >= sevenDaysAgo)
        .map((l: any) => l.value)
        .reverse();
      setWeightTrend(wLogs);
    }
    if (fatMetric) {
      const fLogs = logs
        .filter((l: any) => l.metrics?.name?.toLowerCase().includes("body fat") && l.logged_at >= sevenDaysAgo)
        .map((l: any) => l.value)
        .reverse();
      setBodyFatTrend(fLogs);
    }

    // Habit streaks
    const allHabits = habitsData || [];
    const allLogs = habitLogsData || [];
    const streakData: any[] = [];

    for (const habit of allHabits) {
      const habitLogDates = new Set(
        allLogs.filter((l: any) => l.habit_id === habit.id).map((l: any) => l.logged_at)
      );

      // Calculate streak
      let streak = 0;
      let checkDate = new Date();
      while (true) {
        const dateStr = format(checkDate, "yyyy-MM-dd");
        if (habitLogDates.has(dateStr)) {
          streak++;
          checkDate = subDays(checkDate, 1);
        } else {
          break;
        }
      }

      // Last 7 days
      const last7: boolean[] = [];
      for (let d = 6; d >= 0; d--) {
        const dateStr = format(subDays(new Date(), d), "yyyy-MM-dd");
        last7.push(habitLogDates.has(dateStr));
      }

      streakData.push({
        id: habit.id,
        title: habit.title,
        streak,
        last7,
        color: habit.life_areas?.color || "#2C5F8A",
      });
    }

    streakData.sort((a, b) => b.streak - a.streak);
    setHabitStreaks(streakData.slice(0, 5));

    // Work metrics
    const workNames = [
      { name: "MakersForge MRR", target: 10000, icon: "makers" },
      { name: "Shiftly MRR", target: 30000, icon: "shiftly" },
      { name: "Rule of 100", target: 100, icon: "rule" },
      { name: "YouTube subscribers", target: 1000, icon: "youtube" },
    ];
    const workResults: any[] = [];
    for (const w of workNames) {
      const metric = metrics.find((m: any) => m.name.toLowerCase().includes(w.name.toLowerCase()));
      if (metric) {
        const latestLog = logs.find((l: any) => l.metrics?.name?.toLowerCase().includes(w.name.toLowerCase()));
        workResults.push({
          name: metric.name,
          unit: metric.unit || "",
          target: metric.target_value || w.target,
          value: latestLog?.value || 0,
          icon: w.icon,
          hasBar: w.name.includes("MRR"),
        });
      }
    }
    setWorkMetrics(workResults);
  }, [profileId, today]);

  useEffect(() => { loadData(); }, [loadData]);

  // Nutrition totals
  const totalCalories = foodLogs.reduce((sum, f) => sum + (f.calories || 0), 0);
  const totalProtein = foodLogs.reduce((sum, f) => sum + (f.protein_g || f.protein || 0), 0);
  const totalCarbs = foodLogs.reduce((sum, f) => sum + (f.carbs_g || f.carbs || 0), 0);
  const totalFat = foodLogs.reduce((sum, f) => sum + (f.fat_g || f.fat || 0), 0);

  const getBodyIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes("weight")) return <Scale size={14} color="#2C5F8A" />;
    if (n.includes("fat")) return <Activity size={14} color="#DC2626" />;
    if (n.includes("step")) return <Footprints size={14} color="#4A8C6F" />;
    if (n.includes("sleep")) return <Moon size={14} color="#7C3AED" />;
    return <Activity size={14} color="#6B7280" />;
  };

  const getWorkIcon = (icon: string) => {
    if (icon === "makers") return <TrendingUp size={14} color="#2C5F8A" />;
    if (icon === "shiftly") return <TrendingUp size={14} color="#4A8C6F" />;
    if (icon === "rule") return <Zap size={14} color="#D97706" />;
    if (icon === "youtube") return <Play size={14} color="#DC2626" />;
    return <BarChart2 size={14} color="#6B7280" />;
  };

  return (
    <div style={{ maxWidth: "860px", margin: "0 auto", padding: "0 0 140px 0", minHeight: "100vh" }}>

      {/* Hero header */}
      <div style={{
        background: GRADIENT,
        margin: "20px",
        padding: "28px",
        borderRadius: "24px",
        position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: "-40px", right: "-40px", width: "180px", height: "180px", borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.06)" }} />
        <div style={{ position: "absolute", bottom: "-60px", right: "80px", width: "140px", height: "140px", borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.04)" }} />

        <div style={{ display: "flex", alignItems: "center", gap: "12px", position: "relative" }}>
          <div style={{
            width: "44px", height: "44px", borderRadius: "14px",
            backgroundColor: "rgba(255,255,255,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <BarChart2 size={22} color="#fff" />
          </div>
          <div>
            <h1 style={{
              fontFamily: '"Cal Sans", Inter, sans-serif',
              fontSize: "28px", fontWeight: 600, color: "#fff", margin: 0, lineHeight: 1.1,
            }}>
              Analytics
            </h1>
            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.65)", marginTop: "4px" }}>
              {monthYear}
            </p>
          </div>
        </div>
      </div>

      <div style={{ padding: "0 20px", display: "flex", flexDirection: "column", gap: "16px" }}>

        {/* Section 1: Today's Nutrition */}
        <GradientCard>
          <CardHeader title="Today's Nutrition" icon={<Flame size={14} color="#fff" />} />
          <div style={{ padding: "16px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
              <StatBox label="Calories" value={totalCalories} target={2200} unit="kcal" color="#D97706" icon={<Flame size={12} color="#D97706" />} />
              <StatBox label="Protein" value={totalProtein} target={175} unit="g" color="#DC2626" icon={<Beef size={12} color="#DC2626" />} />
              <StatBox label="Carbs" value={totalCarbs} target={200} unit="g" color="#D97706" icon={<Wheat size={12} color="#D97706" />} />
              <StatBox label="Fat" value={totalFat} target={70} unit="g" color="#2C5F8A" icon={<Droplets size={12} color="#2C5F8A" />} />
            </div>

            {foodLogs.length > 0 && (
              <>
                <div style={{ height: "1px", backgroundColor: "#F3F4F6", margin: "0 0 12px" }} />
                <p style={{ fontSize: "11px", fontWeight: 600, color: "#6B7280", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Entries today
                </p>
                {foodLogs.map((f, i) => (
                  <div key={f.id || i} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "8px 0",
                    borderBottom: i < foodLogs.length - 1 ? "1px solid #F9FAFB" : "none",
                  }}>
                    <span style={{ fontSize: "13px", color: "#374151", fontWeight: 500 }}>{f.food_name || f.name}</span>
                    <div style={{ display: "flex", gap: "12px", fontSize: "12px", color: "#9CA3AF" }}>
                      <span>{f.calories || 0} kcal</span>
                      <span>{f.protein_g || f.protein || 0}p</span>
                      <span>{f.carbs_g || f.carbs || 0}c</span>
                      <span>{f.fat_g || f.fat || 0}f</span>
                    </div>
                  </div>
                ))}
              </>
            )}

            {foodLogs.length === 0 && (
              <p style={{ fontSize: "13px", color: "#9CA3AF", textAlign: "center", padding: "8px 0" }}>
                No food logged today yet
              </p>
            )}
          </div>
        </GradientCard>

        {/* Section 2: Body Metrics */}
        <GradientCard>
          <CardHeader title="Body Metrics" icon={<Activity size={14} color="#fff" />} />
          <div style={{ padding: "16px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              {bodyMetrics.map((m) => {
                const isWeight = m.name.toLowerCase().includes("weight");
                const isFat = m.name.toLowerCase().includes("body fat");
                const trend = isWeight ? weightTrend : isFat ? bodyFatTrend : [];
                const pct = m.target > 0 ? Math.min((m.value / m.target) * 100, 100) : 0;
                return (
                  <div key={m.name} style={{ padding: "12px", backgroundColor: "#FAFAF8", borderRadius: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                      {getBodyIcon(m.name)}
                      <span style={{ fontSize: "11px", fontWeight: 600, color: "#6B7280" }}>{m.name}</span>
                    </div>
                    <div style={{ fontSize: "24px", fontWeight: 700, color: "#111827", fontFamily: '"Cal Sans", Inter, sans-serif', lineHeight: 1.2 }}>
                      {m.value}{m.unit ? <span style={{ fontSize: "12px", fontWeight: 500, color: "#9CA3AF", marginLeft: "2px" }}>{m.unit}</span> : null}
                    </div>
                    {m.target > 0 && (
                      <div style={{ fontSize: "11px", color: "#9CA3AF", marginBottom: "8px" }}>Target: {m.target}{m.unit}</div>
                    )}
                    {trend.length > 0 && (
                      <div style={{ marginTop: "4px" }}>
                        <Sparkline values={trend} color={isWeight ? "#2C5F8A" : "#DC2626"} />
                        <p style={{ fontSize: "10px", color: "#9CA3AF", marginTop: "4px" }}>Last 7 entries</p>
                      </div>
                    )}
                    {!trend.length && m.target > 0 && (
                      <div style={{ height: "4px", borderRadius: "99px", backgroundColor: "#F3F4F6", marginTop: "4px" }}>
                        <div style={{ height: "4px", borderRadius: "99px", backgroundColor: "#2C5F8A", width: `${pct}%` }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {bodyMetrics.length === 0 && (
              <p style={{ fontSize: "13px", color: "#9CA3AF", textAlign: "center", padding: "8px 0" }}>
                No body metrics tracked yet
              </p>
            )}
          </div>
        </GradientCard>

        {/* Section 3: Habit Streaks */}
        <GradientCard>
          <CardHeader title="Action Streaks" icon={<Zap size={14} color="#fff" />} />
          <div style={{ padding: "16px" }}>
            {habitStreaks.map((h, i) => (
              <div key={h.id} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "10px 0",
                borderBottom: i < habitStreaks.length - 1 ? "1px solid #F9FAFB" : "none",
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "4px" }}>{h.title}</div>
                  <StreakDots days={h.last7} color={h.color} />
                </div>
                <div style={{
                  backgroundColor: `${h.color}15`, borderRadius: "99px",
                  padding: "4px 12px", marginLeft: "12px", flexShrink: 0,
                }}>
                  <span style={{ fontSize: "13px", fontWeight: 700, color: h.color }}>
                    {h.streak}d
                  </span>
                </div>
              </div>
            ))}

            {habitStreaks.length === 0 && (
              <p style={{ fontSize: "13px", color: "#9CA3AF", textAlign: "center", padding: "8px 0" }}>
                No action data yet. Start logging to see streaks.
              </p>
            )}
          </div>
        </GradientCard>

        {/* Section 4: Work Metrics */}
        <GradientCard>
          <CardHeader title="Work Metrics" icon={<TrendingUp size={14} color="#fff" />} />
          <div style={{ padding: "16px" }}>
            {workMetrics.map((w, i) => {
              const pct = w.target > 0 ? Math.min((w.value / w.target) * 100, 100) : 0;
              return (
                <div key={w.name} style={{
                  padding: "12px 0",
                  borderBottom: i < workMetrics.length - 1 ? "1px solid #F9FAFB" : "none",
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      {getWorkIcon(w.icon)}
                      <span style={{ fontSize: "13px", fontWeight: 600, color: "#374151" }}>{w.name}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
                      <span style={{ fontSize: "18px", fontWeight: 700, color: "#111827" }}>
                        {w.unit === "GBP" ? "\u00A3" : ""}{w.value.toLocaleString()}
                      </span>
                      {w.target > 0 && (
                        <span style={{ fontSize: "12px", color: "#9CA3AF" }}>
                          / {w.unit === "GBP" ? "\u00A3" : ""}{w.target.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                  {w.hasBar && (
                    <div style={{ height: "6px", borderRadius: "99px", backgroundColor: "#F3F4F6", marginTop: "6px" }}>
                      <div style={{
                        height: "6px", borderRadius: "99px",
                        background: GRADIENT,
                        width: `${pct}%`, transition: "width 0.4s ease",
                      }} />
                    </div>
                  )}
                </div>
              );
            })}

            {workMetrics.length === 0 && (
              <p style={{ fontSize: "13px", color: "#9CA3AF", textAlign: "center", padding: "8px 0" }}>
                No work metrics tracked yet
              </p>
            )}
          </div>
        </GradientCard>

        {/* Section 5: Nutrition Logbook */}
        <GradientCard>
          {/* Custom header with toggle */}
          <div style={{
            background: GRADIENT, padding: "12px 16px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Beef size={14} color="#fff" />
              <h2 style={{ fontFamily: 'Inter, sans-serif', fontSize: "14px", fontWeight: 700, color: "#fff", margin: 0 }}>
                Nutrition Logbook
              </h2>
            </div>
            <div style={{ display: "flex", gap: "4px", backgroundColor: "rgba(255,255,255,0.2)", borderRadius: "8px", padding: "3px" }}>
              {(["day", "week", "month"] as const).map(v => (
                <button key={v} onClick={() => setNutritionView(v)} style={{
                  padding: "4px 12px", borderRadius: "6px", border: "none",
                  cursor: "pointer", fontSize: "11px", fontWeight: 500,
                  backgroundColor: nutritionView === v ? "#fff" : "transparent",
                  color: nutritionView === v ? "#2C5F8A" : "rgba(255,255,255,0.8)",
                  transition: "all 0.15s",
                  textTransform: "capitalize",
                }}>
                  {v}
                </button>
              ))}
            </div>
          </div>

          <div style={{ padding: "16px" }}>
            {nutritionView === "day" && (
              <>
                {/* Day navigation */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                  <button onClick={() => {
                    const d = new Date(nutritionDate + "T12:00:00");
                    d.setDate(d.getDate() - 1);
                    setNutritionDate(format(d, "yyyy-MM-dd"));
                  }} style={{ background: "none", border: "none", cursor: "pointer", color: "#2C5F8A", fontSize: "13px", fontWeight: 500 }}>
                    Previous day
                  </button>
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: "14px", fontWeight: 700, color: "#111827" }}>
                    {format(new Date(nutritionDate + "T12:00:00"), "EEEE, d MMMM")}
                  </span>
                  <button onClick={() => {
                    const d = new Date(nutritionDate + "T12:00:00");
                    d.setDate(d.getDate() + 1);
                    setNutritionDate(format(d, "yyyy-MM-dd"));
                  }} style={{ background: "none", border: "none", cursor: "pointer", color: "#2C5F8A", fontSize: "13px", fontWeight: 500 }}>
                    Next day
                  </button>
                </div>

                {(() => {
                  const dayFoodLogs = allFoodLogs.filter(f => f.logged_at === nutritionDate);
                  const dayTotals = dayFoodLogs.reduce((acc, f) => ({
                    calories: acc.calories + (f.calories || 0),
                    protein_g: acc.protein_g + (f.protein_g || 0),
                    carbs_g: acc.carbs_g + (f.carbs_g || 0),
                    fat_g: acc.fat_g + (f.fat_g || 0),
                  }), { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 });

                  if (dayFoodLogs.length === 0) {
                    return (
                      <p style={{ fontSize: "13px", color: "#9CA3AF", textAlign: "center", padding: "16px 0" }}>
                        No food logged for this day. Log meals in the Health chat.
                      </p>
                    );
                  }

                  return (
                    <>
                      {/* Day totals */}
                      <div style={{
                        display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "8px",
                        padding: "10px 12px", backgroundColor: "#FAFAF8", borderRadius: "10px", marginBottom: "12px",
                      }}>
                        {[
                          { label: "Cal", value: Math.round(dayTotals.calories), color: "#2C5F8A" },
                          { label: "Pro", value: `${Math.round(dayTotals.protein_g)}g`, color: "#4A8C6F" },
                          { label: "Carbs", value: `${Math.round(dayTotals.carbs_g)}g`, color: "#D97706" },
                          { label: "Fat", value: `${Math.round(dayTotals.fat_g)}g`, color: "#7C3AED" },
                        ].map(t => (
                          <div key={t.label} style={{ textAlign: "center" }}>
                            <div style={{ fontSize: "16px", fontWeight: 700, color: t.color }}>{t.value}</div>
                            <div style={{ fontSize: "9px", color: "#9CA3AF", fontWeight: 600, textTransform: "uppercase" }}>{t.label}</div>
                          </div>
                        ))}
                      </div>

                      {/* Individual entries */}
                      {dayFoodLogs.map((f, i) => (
                        editingFood?.id === f.id ? (
                          <div key={f.id} style={{
                            padding: "10px 0",
                            borderBottom: i < dayFoodLogs.length - 1 ? "1px solid #F9FAFB" : "none",
                          }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                              <input
                                value={editingFood.food_name}
                                onChange={e => setEditingFood({ ...editingFood, food_name: e.target.value })}
                                style={{
                                  width: "100%", padding: "6px 10px", fontSize: "13px", fontWeight: 500,
                                  border: "1px solid rgba(0,0,0,0.1)", borderRadius: "8px",
                                  backgroundColor: "rgba(0,0,0,0.02)", outline: "none", boxSizing: "border-box",
                                  fontFamily: "Inter, sans-serif", color: "#374151",
                                }}
                              />
                              <div style={{ display: "flex", gap: "6px" }}>
                                {[
                                  { key: "calories", label: "Cal", type: "number" },
                                  { key: "protein_g", label: "Pro", type: "number" },
                                  { key: "carbs_g", label: "Carbs", type: "number" },
                                  { key: "fat_g", label: "Fat", type: "number" },
                                ].map(field => (
                                  <div key={field.key} style={{ flex: 1 }}>
                                    <div style={{ fontSize: "9px", color: "#9CA3AF", fontWeight: 600, textTransform: "uppercase", marginBottom: "2px" }}>{field.label}</div>
                                    <input
                                      type="number"
                                      value={editingFood[field.key] || ""}
                                      onChange={e => setEditingFood({ ...editingFood, [field.key]: Number(e.target.value) || 0 })}
                                      style={{
                                        width: "100%", padding: "5px 8px", fontSize: "12px",
                                        border: "1px solid rgba(0,0,0,0.1)", borderRadius: "6px",
                                        backgroundColor: "rgba(0,0,0,0.02)", outline: "none", boxSizing: "border-box",
                                        fontFamily: "Inter, sans-serif", color: "#374151",
                                      }}
                                    />
                                  </div>
                                ))}
                              </div>
                              <select
                                value={editingFood.meal_type || ""}
                                onChange={e => setEditingFood({ ...editingFood, meal_type: e.target.value || null })}
                                style={{
                                  width: "100%", padding: "6px 10px", fontSize: "12px",
                                  border: "1px solid rgba(0,0,0,0.1)", borderRadius: "8px",
                                  backgroundColor: "rgba(0,0,0,0.02)", outline: "none",
                                  fontFamily: "Inter, sans-serif", color: "#374151",
                                }}
                              >
                                <option value="">No meal type</option>
                                <option value="breakfast">Breakfast</option>
                                <option value="lunch">Lunch</option>
                                <option value="dinner">Dinner</option>
                                <option value="snack">Snack</option>
                              </select>
                              <div style={{ display: "flex", gap: "6px", marginTop: "2px" }}>
                                <button
                                  onClick={() => setEditingFood(null)}
                                  style={{
                                    flex: 1, padding: "6px", border: "none", borderRadius: "6px",
                                    backgroundColor: "rgba(0,0,0,0.05)", fontSize: "11px", color: "#6B7280",
                                    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px",
                                  }}
                                >
                                  <X size={12} /> Cancel
                                </button>
                                <button
                                  onClick={async () => {
                                    await supabase.from("food_logs").update({
                                      food_name: editingFood.food_name,
                                      calories: editingFood.calories,
                                      protein_g: editingFood.protein_g,
                                      carbs_g: editingFood.carbs_g,
                                      fat_g: editingFood.fat_g,
                                      meal_type: editingFood.meal_type,
                                    }).eq("id", editingFood.id);
                                    setAllFoodLogs(prev => prev.map(fl => fl.id === editingFood.id ? { ...fl, ...editingFood } : fl));
                                    setFoodLogs(prev => prev.map(fl => fl.id === editingFood.id ? { ...fl, ...editingFood } : fl));
                                    setEditingFood(null);
                                  }}
                                  style={{
                                    flex: 2, padding: "6px", border: "none", borderRadius: "6px",
                                    background: GRADIENT, fontSize: "11px", color: "#fff",
                                    fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px",
                                  }}
                                >
                                  <Check size={12} /> Save
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div key={f.id || i} style={{
                            display: "flex", justifyContent: "space-between", alignItems: "center",
                            padding: "8px 0",
                            borderBottom: i < dayFoodLogs.length - 1 ? "1px solid #F9FAFB" : "none",
                          }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: 0 }}>
                              <span style={{ fontSize: "13px", color: "#374151", fontWeight: 500 }}>{f.food_name}</span>
                              {f.meal_type && (
                                <span style={{
                                  fontSize: "9px", fontWeight: 600, color: "#6B7280",
                                  backgroundColor: "#F3F4F6", padding: "2px 7px", borderRadius: "99px",
                                  textTransform: "capitalize",
                                }}>
                                  {f.meal_type}
                                </span>
                              )}
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <div style={{ display: "flex", gap: "10px", fontSize: "11px", color: "#9CA3AF" }}>
                                <span>{f.calories || 0} kcal</span>
                                <span>{f.protein_g || 0}p</span>
                                <span>{f.carbs_g || 0}c</span>
                                <span>{f.fat_g || 0}f</span>
                              </div>
                              <button
                                title="Edit"
                                onClick={() => setEditingFood({ ...f })}
                                style={{ background: "none", border: "none", cursor: "pointer", padding: "3px", color: "#9CA3AF", transition: "color 0.15s" }}
                                onMouseEnter={e => (e.currentTarget.style.color = "#2C5F8A")}
                                onMouseLeave={e => (e.currentTarget.style.color = "#9CA3AF")}
                              >
                                <Pencil size={13} />
                              </button>
                              <button
                                title="Delete"
                                onClick={async () => {
                                  await supabase.from("food_logs").delete().eq("id", f.id);
                                  setAllFoodLogs(prev => prev.filter(fl => fl.id !== f.id));
                                  setFoodLogs(prev => prev.filter(fl => fl.id !== f.id));
                                }}
                                style={{ background: "none", border: "none", cursor: "pointer", padding: "3px", color: "#9CA3AF", transition: "color 0.15s" }}
                                onMouseEnter={e => (e.currentTarget.style.color = "#DC2626")}
                                onMouseLeave={e => (e.currentTarget.style.color = "#9CA3AF")}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        )
                      ))}
                    </>
                  );
                })()}
              </>
            )}

            {nutritionView === "month" && (() => {
              const refDate = new Date(nutritionDate + "T12:00:00");
              const monthStart = startOfMonth(refDate);
              const numDays = getDaysInMonth(refDate);

              const monthDays: { date: string; display: Date }[] = [];
              for (let i = 0; i < numDays; i++) {
                const d = new Date(monthStart);
                d.setDate(monthStart.getDate() + i);
                monthDays.push({ date: format(d, "yyyy-MM-dd"), display: d });
              }

              const dayData = monthDays.map(day => {
                const logs = allFoodLogs.filter(f => f.logged_at === day.date);
                const totals = logs.reduce((acc, f) => ({
                  calories: acc.calories + (f.calories || 0),
                  protein_g: acc.protein_g + (f.protein_g || 0),
                }), { calories: 0, protein_g: 0 });
                return { ...day, totals, count: logs.length };
              });

              const daysWithLogs = dayData.filter(d => d.count > 0);
              const totalDaysLogged = daysWithLogs.length;
              const avgCalories = totalDaysLogged > 0 ? Math.round(daysWithLogs.reduce((s, d) => s + d.totals.calories, 0) / totalDaysLogged) : 0;
              const avgProtein = totalDaysLogged > 0 ? Math.round(daysWithLogs.reduce((s, d) => s + d.totals.protein_g, 0) / totalDaysLogged) : 0;
              const proteinTargetHits = daysWithLogs.filter(d => d.totals.protein_g >= 150).length;
              const bestProteinDay = daysWithLogs.reduce<{ label: string; protein: number } | null>((best, d) =>
                !best || d.totals.protein_g > best.protein
                  ? { label: format(d.display, "EEE d"), protein: Math.round(d.totals.protein_g) }
                  : best,
                null
              );

              const proteinDotColor = (p: number) => {
                if (p >= 150) return "#4A8C6F";
                if (p >= 100) return "#D97706";
                return "#DC2626";
              };

              return (
                <>
                  {/* Month navigation */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
                    <button onClick={() => {
                      const d = new Date(nutritionDate + "T12:00:00");
                      d.setMonth(d.getMonth() - 1);
                      setNutritionDate(format(d, "yyyy-MM-dd"));
                    }} style={{ background: "none", border: "none", cursor: "pointer", color: "#2C5F8A", fontSize: "13px", fontWeight: 500 }}>
                      Previous month
                    </button>
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: "13px", fontWeight: 700, color: "#111827" }}>
                      {format(refDate, "MMMM yyyy")}
                    </span>
                    <button onClick={() => {
                      const d = new Date(nutritionDate + "T12:00:00");
                      d.setMonth(d.getMonth() + 1);
                      setNutritionDate(format(d, "yyyy-MM-dd"));
                    }} style={{ background: "none", border: "none", cursor: "pointer", color: "#2C5F8A", fontSize: "13px", fontWeight: 500 }}>
                      Next month
                    </button>
                  </div>

                  {totalDaysLogged === 0 ? (
                    <p style={{ fontSize: "13px", color: "#9CA3AF", textAlign: "center", padding: "20px 0" }}>
                      No food logged this month. Log meals in the Health chat.
                    </p>
                  ) : (
                    <>
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        {dayData.map(d => (
                          <div key={d.date} style={{
                            display: "flex", alignItems: "center", gap: "8px",
                            padding: "6px 10px", backgroundColor: d.count > 0 ? "#FAFAF8" : "transparent", borderRadius: "8px",
                            opacity: d.count > 0 ? 1 : 0.4,
                          }}>
                            <div style={{
                              width: "8px", height: "8px", borderRadius: "50%",
                              backgroundColor: d.count > 0 ? proteinDotColor(d.totals.protein_g) : "#E5E7EB",
                              flexShrink: 0,
                            }} />
                            <span style={{ fontSize: "11px", fontWeight: 600, color: "#374151", minWidth: "55px" }}>
                              {format(d.display, "EEE d")}
                            </span>
                            {d.count > 0 ? (
                              <div style={{ flex: 1, display: "flex", justifyContent: "space-between", fontSize: "10px", color: "#6B7280" }}>
                                <span>{Math.round(d.totals.calories)} kcal</span>
                                <span>{Math.round(d.totals.protein_g)}g protein</span>
                              </div>
                            ) : (
                              <span style={{ flex: 1, fontSize: "10px", color: "#D1D5DB" }}>--</span>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Monthly summary */}
                      <div style={{ height: "1px", backgroundColor: "#F3F4F6", margin: "16px 0 12px" }} />
                      <p style={{ fontSize: "11px", fontWeight: 600, color: "#6B7280", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                        Monthly summary
                      </p>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                        <div style={{ padding: "10px 12px", backgroundColor: "#FAFAF8", borderRadius: "10px" }}>
                          <div style={{ fontSize: "10px", color: "#9CA3AF", fontWeight: 600, textTransform: "uppercase" }}>Days logged</div>
                          <div style={{ fontSize: "18px", fontWeight: 700, color: "#2C5F8A" }}>
                            {totalDaysLogged}/{numDays}
                          </div>
                        </div>
                        <div style={{ padding: "10px 12px", backgroundColor: "#FAFAF8", borderRadius: "10px" }}>
                          <div style={{ fontSize: "10px", color: "#9CA3AF", fontWeight: 600, textTransform: "uppercase" }}>Avg daily calories</div>
                          <div style={{ fontSize: "18px", fontWeight: 700, color: "#2C5F8A" }}>
                            {avgCalories.toLocaleString()}
                          </div>
                        </div>
                        <div style={{ padding: "10px 12px", backgroundColor: "#FAFAF8", borderRadius: "10px" }}>
                          <div style={{ fontSize: "10px", color: "#9CA3AF", fontWeight: 600, textTransform: "uppercase" }}>Avg daily protein</div>
                          <div style={{ fontSize: "18px", fontWeight: 700, color: "#4A8C6F" }}>
                            {avgProtein}g
                          </div>
                        </div>
                        <div style={{ padding: "10px 12px", backgroundColor: "#FAFAF8", borderRadius: "10px" }}>
                          <div style={{ fontSize: "10px", color: "#9CA3AF", fontWeight: 600, textTransform: "uppercase" }}>Protein target hit</div>
                          <div style={{ fontSize: "18px", fontWeight: 700, color: "#D97706" }}>
                            {proteinTargetHits} days
                          </div>
                        </div>
                        <div style={{ padding: "10px 12px", backgroundColor: "#FAFAF8", borderRadius: "10px", gridColumn: "1 / -1" }}>
                          <div style={{ fontSize: "10px", color: "#9CA3AF", fontWeight: 600, textTransform: "uppercase" }}>Best protein day</div>
                          <div style={{ fontSize: "18px", fontWeight: 700, color: "#4A8C6F" }}>
                            {bestProteinDay ? `${bestProteinDay.label} -- ${bestProteinDay.protein}g` : "--"}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </>
              );
            })()}

            {nutritionView === "week" && (() => {
              // Calculate Monday of the week containing nutritionDate
              const refDate = new Date(nutritionDate + "T12:00:00");
              const dow = refDate.getDay(); // 0 = Sunday
              const daysFromMonday = dow === 0 ? 6 : dow - 1;
              const monday = new Date(refDate);
              monday.setDate(refDate.getDate() - daysFromMonday);

              const days: { date: string; display: Date; dayName: string }[] = [];
              for (let i = 0; i < 7; i++) {
                const d = new Date(monday);
                d.setDate(monday.getDate() + i);
                days.push({
                  date: format(d, "yyyy-MM-dd"),
                  display: d,
                  dayName: format(d, "EEE d MMM"),
                });
              }

              const dayData = days.map(day => {
                const logs = allFoodLogs.filter(f => f.logged_at === day.date);
                const totals = logs.reduce((acc, f) => ({
                  calories: acc.calories + (f.calories || 0),
                  protein_g: acc.protein_g + (f.protein_g || 0),
                  carbs_g: acc.carbs_g + (f.carbs_g || 0),
                  fat_g: acc.fat_g + (f.fat_g || 0),
                }), { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 });
                return { ...day, totals, count: logs.length };
              });

              const weekHasData = dayData.some(d => d.count > 0);
              const totalCal = dayData.reduce((s, d) => s + d.totals.calories, 0);
              const daysWithLogs = dayData.filter(d => d.count > 0);
              const avgProtein = daysWithLogs.length > 0
                ? Math.round(daysWithLogs.reduce((s, d) => s + d.totals.protein_g, 0) / daysWithLogs.length)
                : 0;
              const bestProteinDay = daysWithLogs.reduce<{ dayName: string; protein: number } | null>((best, d) =>
                !best || d.totals.protein_g > best.protein
                  ? { dayName: format(d.display, "EEE"), protein: Math.round(d.totals.protein_g) }
                  : best,
                null
              );
              const proteinTargetHits = dayData.filter(d => d.totals.protein_g >= 150).length;

              const proteinDotColor = (p: number) => {
                if (p >= 150) return "#4A8C6F";
                if (p >= 100) return "#D97706";
                return "#DC2626";
              };

              return (
                <>
                  {/* Week navigation */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
                    <button onClick={() => {
                      const d = new Date(nutritionDate + "T12:00:00");
                      d.setDate(d.getDate() - 7);
                      setNutritionDate(format(d, "yyyy-MM-dd"));
                    }} style={{ background: "none", border: "none", cursor: "pointer", color: "#2C5F8A", fontSize: "13px", fontWeight: 500 }}>
                      Previous week
                    </button>
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: "13px", fontWeight: 700, color: "#111827" }}>
                      {format(monday, "d MMM")} – {format(days[6].display, "d MMM")}
                    </span>
                    <button onClick={() => {
                      const d = new Date(nutritionDate + "T12:00:00");
                      d.setDate(d.getDate() + 7);
                      setNutritionDate(format(d, "yyyy-MM-dd"));
                    }} style={{ background: "none", border: "none", cursor: "pointer", color: "#2C5F8A", fontSize: "13px", fontWeight: 500 }}>
                      Next week
                    </button>
                  </div>

                  {!weekHasData ? (
                    <p style={{ fontSize: "13px", color: "#9CA3AF", textAlign: "center", padding: "20px 0" }}>
                      No food logged this week. Log meals in the Health chat.
                    </p>
                  ) : (
                    <>
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {dayData.map(d => (
                          <div key={d.date} style={{
                            display: "flex", alignItems: "center", gap: "10px",
                            padding: "10px 12px", backgroundColor: "#FAFAF8", borderRadius: "10px",
                          }}>
                            <div style={{
                              width: "10px", height: "10px", borderRadius: "50%",
                              backgroundColor: d.count > 0 ? proteinDotColor(d.totals.protein_g) : "#E5E7EB",
                              flexShrink: 0,
                            }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: "12px", fontWeight: 700, color: "#111827" }}>
                                {d.dayName}
                              </div>
                              <div style={{ fontSize: "10px", color: "#9CA3AF", marginTop: "2px" }}>
                                {d.count > 0
                                  ? `${Math.round(d.totals.calories)} kcal · ${Math.round(d.totals.protein_g)}p · ${Math.round(d.totals.carbs_g)}c · ${Math.round(d.totals.fat_g)}f`
                                  : "No food logged"}
                              </div>
                            </div>
                            <div style={{ fontSize: "10px", color: "#6B7280", flexShrink: 0 }}>
                              {d.count} {d.count === 1 ? "entry" : "entries"}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Weekly summary */}
                      <div style={{ height: "1px", backgroundColor: "#F3F4F6", margin: "16px 0 12px" }} />
                      <p style={{ fontSize: "11px", fontWeight: 600, color: "#6B7280", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                        Weekly summary
                      </p>
                      <div style={{
                        display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px",
                      }}>
                        <div style={{ padding: "10px 12px", backgroundColor: "#FAFAF8", borderRadius: "10px" }}>
                          <div style={{ fontSize: "10px", color: "#9CA3AF", fontWeight: 600, textTransform: "uppercase" }}>Total calories</div>
                          <div style={{ fontSize: "18px", fontWeight: 700, color: "#2C5F8A" }}>
                            {Math.round(totalCal).toLocaleString()}
                          </div>
                        </div>
                        <div style={{ padding: "10px 12px", backgroundColor: "#FAFAF8", borderRadius: "10px" }}>
                          <div style={{ fontSize: "10px", color: "#9CA3AF", fontWeight: 600, textTransform: "uppercase" }}>Avg daily protein</div>
                          <div style={{ fontSize: "18px", fontWeight: 700, color: "#4A8C6F" }}>
                            {avgProtein}g
                          </div>
                        </div>
                        <div style={{ padding: "10px 12px", backgroundColor: "#FAFAF8", borderRadius: "10px" }}>
                          <div style={{ fontSize: "10px", color: "#9CA3AF", fontWeight: 600, textTransform: "uppercase" }}>Best protein day</div>
                          <div style={{ fontSize: "18px", fontWeight: 700, color: "#4A8C6F" }}>
                            {bestProteinDay ? `${bestProteinDay.dayName} ${bestProteinDay.protein}g` : "—"}
                          </div>
                        </div>
                        <div style={{ padding: "10px 12px", backgroundColor: "#FAFAF8", borderRadius: "10px" }}>
                          <div style={{ fontSize: "10px", color: "#9CA3AF", fontWeight: 600, textTransform: "uppercase" }}>Protein target hit</div>
                          <div style={{ fontSize: "18px", fontWeight: 700, color: "#D97706" }}>
                            {proteinTargetHits}/7 days
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </>
              );
            })()}
          </div>
        </GradientCard>

      </div>
    </div>
  );
}