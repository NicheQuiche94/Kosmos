"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useProfileStore } from "@/store/profileStore";
import { supabase } from "@/lib/supabase";
import { logHabit, completeAction } from "@/lib/data";
import {
  Dumbbell, Briefcase, PoundSterling, Heart,
  BookOpen, Music, Home, ArrowLeft, CheckCircle2,
  Circle, Target, ListTodo, Zap,
} from "lucide-react";

const AREA_ICONS: Record<string, React.ElementType> = {
  "Health & Fitness": Dumbbell,
  "Work": Briefcase,
  "Finances": PoundSterling,
  "Relationships": Heart,
  "Personal Development": BookOpen,
  "Hobbies & Creativity": Music,
  "Environment & Lifestyle": Home,
};

const QUARTER_COLORS: Record<string, string> = {
  Q1: "#2C5F8A",
  Q2: "#4A8C6F",
  Q3: "#7C3AED",
  Q4: "#D97706",
};

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  active: { bg: "#4A8C6F15", color: "#4A8C6F", label: "Active" },
  completed: { bg: "#2C5F8A15", color: "#2C5F8A", label: "Completed" },
  paused: { bg: "#D9770615", color: "#D97706", label: "Paused" },
  pending: { bg: "#F3F4F6", color: "#9CA3AF", label: "Pending" },
  in_progress: { bg: "#2C5F8A15", color: "#2C5F8A", label: "In progress" },
  missed: { bg: "#DC262615", color: "#DC2626", label: "Missed" },
};

const card: React.CSSProperties = {
  backgroundColor: "#fff",
  borderRadius: "16px",
  padding: "20px",
  marginBottom: "12px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.05)",
  border: "1px solid rgba(0,0,0,0.04)",
};

const sectionTitle: React.CSSProperties = {
  fontFamily: '"Cal Sans", Inter, sans-serif',
  fontSize: "16px",
  color: "#111827",
  marginBottom: "14px",
  display: "flex",
  alignItems: "center",
  gap: "8px",
};

export default function AreaDetail() {
  const { id } = useParams();
  const router = useRouter();
  const { activeProfile } = useProfileStore();
  const profileId = activeProfile?.id || "";

  const [area, setArea] = useState<any>(null);
  const [goals, setGoals] = useState<any[]>([]);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [habits, setHabits] = useState<any[]>([]);
  const [habitLogs, setHabitLogs] = useState<Set<string>>(new Set());
  const [actions, setActions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "habits" | "actions">("overview");

  const today = new Date().toISOString().split("T")[0];

  const loadData = useCallback(async () => {
    if (!profileId || !id) return;
    setLoading(true);

    const { data: goalIds } = await supabase
      .from("goals")
      .select("id")
      .eq("life_area_id", id)
      .eq("profile_id", profileId);

    const ids = goalIds?.map((g: any) => g.id) || [];

    const [
      { data: areaData },
      { data: goalsData },
      { data: milestonesData },
      { data: habitsData },
      { data: logsData },
      { data: actionsData },
    ] = await Promise.all([
      supabase.from("life_areas").select("*").eq("id", id).single(),
      supabase.from("goals").select("*").eq("life_area_id", id).eq("profile_id", profileId).eq("status", "active"),
      ids.length > 0
        ? supabase.from("milestones").select("*, goals(title)").eq("profile_id", profileId).in("goal_id", ids).order("quarter")
        : Promise.resolve({ data: [] }),
      supabase.from("habits").select("*").eq("life_area_id", id).eq("profile_id", profileId).eq("active", true).order("frequency"),
      supabase.from("habit_logs").select("habit_id").eq("profile_id", profileId).eq("logged_at", today),
      supabase.from("actions").select("*").eq("life_area_id", id).eq("profile_id", profileId).neq("status", "completed").order("due_date"),
    ]);

    setArea(areaData);
    setGoals(goalsData || []);
    setMilestones(milestonesData || []);
    setHabits(habitsData || []);
    setHabitLogs(new Set(logsData?.map((l: any) => l.habit_id) || []));
    setActions(actionsData || []);
    setLoading(false);
  }, [profileId, id, today]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleToggleHabit = async (habitId: string) => {
    if (habitLogs.has(habitId)) return;
    await logHabit(profileId, habitId);
    setHabitLogs(prev => new Set([...prev, habitId]));
  };

  const handleCompleteAction = async (actionId: string) => {
    await completeAction(actionId);
    setActions(prev => prev.filter(a => a.id !== actionId));
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
        <div style={{
          width: "32px", height: "32px", borderRadius: "50%",
          border: "2px solid #2C5F8A", borderTopColor: "transparent",
          animation: "spin 0.8s linear infinite",
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!area) return null;

  const Icon = AREA_ICONS[area.name] || Home;
  const dailyHabits = habits.filter(h => h.frequency === "daily");
  const weeklyHabits = habits.filter(h => h.frequency === "weekly");
  const monthlyHabits = habits.filter(h => h.frequency === "monthly");
  const dailyTotal = dailyHabits.length;
  const dailyCompleted = dailyHabits.filter(h => habitLogs.has(h.id)).length;
  const tabs = ["overview", "habits", "actions"] as const;

  return (
    <div style={{ padding: "24px", maxWidth: "720px", margin: "0 auto" }}>

      {/* Back button */}
      <button
        onClick={() => router.back()}
        style={{
          display: "flex", alignItems: "center", gap: "6px",
          background: "none", border: "none", cursor: "pointer",
          color: "#9CA3AF", fontSize: "13px", padding: 0, marginBottom: "20px",
        }}
      >
        <ArrowLeft size={15} />
        Back
      </button>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "20px" }}>
        <div style={{
          width: "48px", height: "48px", borderRadius: "14px",
          backgroundColor: `${area.color}18`,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <Icon size={22} color={area.color} />
        </div>
        <div>
          <h1 style={{
            fontFamily: '"Cal Sans", Inter, sans-serif',
            fontSize: "26px", fontWeight: 600, color: "#111827", lineHeight: 1.1,
          }}>
            {area.name}
          </h1>
          <p style={{ fontSize: "12px", color: "#9CA3AF", marginTop: "3px" }}>
            {goals.length} goals · {habits.length} actions · {actions.length} actions
          </p>
        </div>
      </div>

      {/* Daily progress bar */}
      {dailyTotal > 0 && (
        <div style={{ marginBottom: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
            <span style={{ fontSize: "11px", color: "#9CA3AF" }}>Today's actions</span>
            <span style={{ fontSize: "11px", fontWeight: 600, color: area.color }}>
              {dailyCompleted}/{dailyTotal}
            </span>
          </div>
          <div style={{ backgroundColor: "#F3F4F6", borderRadius: "99px", height: "4px" }}>
            <div style={{
              height: "4px", borderRadius: "99px",
              backgroundColor: area.color,
              width: dailyTotal > 0 ? `${Math.round((dailyCompleted / dailyTotal) * 100)}%` : "0%",
              transition: "width 0.5s ease",
            }} />
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{
        display: "flex", gap: "4px",
        backgroundColor: "#F3F4F6",
        borderRadius: "12px", padding: "4px",
        marginBottom: "20px",
      }}>
        {tabs.map((tab) => (
          <button key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1, padding: "8px",
              borderRadius: "9px", border: "none",
              cursor: "pointer", fontSize: "12px", fontWeight: 500,
              backgroundColor: activeTab === tab ? "#fff" : "transparent",
              color: activeTab === tab ? "#111827" : "#9CA3AF",
              boxShadow: activeTab === tab ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              transition: "all 0.15s ease",
              textTransform: "capitalize",
            }}>
            {tab}
          </button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === "overview" && (
        <>
          {/* Goals */}
          <div style={card}>
            <p style={sectionTitle}>
              <Target size={16} color={area.color} />
              Goals
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {goals.map((goal) => (
                <div key={goal.id} style={{
                  padding: "12px 14px",
                  backgroundColor: "#FAFAF8",
                  borderRadius: "10px",
                  borderLeft: `3px solid ${area.color}`,
                }}>
                  <p style={{ fontSize: "13px", color: "#111827", fontWeight: 500, lineHeight: 1.4 }}>
                    {goal.title}
                  </p>
                  {goal.description && (
                    <p style={{ fontSize: "11px", color: "#9CA3AF", marginTop: "4px", lineHeight: 1.4 }}>
                      {goal.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Milestones */}
          <div style={card}>
            <p style={sectionTitle}>
              <Target size={16} color={area.color} />
              Milestones
            </p>
            {["Q1", "Q2", "Q3", "Q4"].map((q) => {
              const qMilestones = milestones.filter(m => m.quarter === q);
              if (qMilestones.length === 0) return null;
              return (
                <div key={q} style={{ marginBottom: "16px" }}>
                  <div style={{ marginBottom: "8px" }}>
                    <div style={{
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                      width: "28px", height: "20px", borderRadius: "6px",
                      backgroundColor: `${QUARTER_COLORS[q]}20`,
                    }}>
                      <span style={{ fontSize: "10px", fontWeight: 700, color: QUARTER_COLORS[q] }}>{q}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {qMilestones.map((m) => {
                      const style = STATUS_STYLES[m.status] || STATUS_STYLES.pending;
                      return (
                        <div key={m.id} style={{
                          display: "flex", alignItems: "flex-start",
                          justifyContent: "space-between", gap: "12px",
                          padding: "10px 12px",
                          backgroundColor: "#FAFAF8", borderRadius: "10px",
                        }}>
                          <div style={{ flex: 1 }}>
                            <p style={{ fontSize: "12px", color: "#111827", fontWeight: 500, lineHeight: 1.4 }}>
                              {m.title}
                            </p>
                            {m.target_date && (
                              <p style={{ fontSize: "10px", color: "#9CA3AF", marginTop: "2px" }}>
                                Target: {new Date(m.target_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                              </p>
                            )}
                          </div>
                          <span style={{
                            fontSize: "10px", fontWeight: 600,
                            color: style.color, backgroundColor: style.bg,
                            padding: "2px 8px", borderRadius: "99px",
                            whiteSpace: "nowrap", flexShrink: 0,
                          }}>
                            {style.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* HABITS TAB */}
      {activeTab === "habits" && (
        <div style={card}>
          <p style={sectionTitle}>
            <Zap size={16} color={area.color} />
            Actions
          </p>

          {dailyHabits.length > 0 && (
            <>
              <p style={{ fontSize: "10px", fontWeight: 600, color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "10px" }}>
                Daily
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "20px" }}>
                {dailyHabits.map((habit) => {
                  const done = habitLogs.has(habit.id);
                  return (
                    <button key={habit.id}
                      onClick={() => handleToggleHabit(habit.id)}
                      style={{
                        display: "flex", alignItems: "center", gap: "12px",
                        padding: "12px 14px",
                        backgroundColor: done ? `${area.color}10` : "#FAFAF8",
                        borderRadius: "10px", border: "none", cursor: "pointer",
                        textAlign: "left", width: "100%",
                        transition: "all 0.15s ease",
                      }}>
                      {done
                        ? <CheckCircle2 size={20} color={area.color} />
                        : <Circle size={20} color="#D1D5DB" />
                      }
                      <div style={{ flex: 1 }}>
                        <p style={{
                          fontSize: "13px", fontWeight: 500,
                          color: done ? area.color : "#111827",
                          textDecoration: done ? "line-through" : "none",
                          lineHeight: 1.3,
                        }}>
                          {habit.title}
                        </p>
                        {habit.description && (
                          <p style={{ fontSize: "11px", color: "#9CA3AF", marginTop: "2px" }}>
                            {habit.description}
                          </p>
                        )}
                      </div>
                      {habit.input_type === "number" && (
                        <span style={{ fontSize: "11px", color: "#9CA3AF" }}>
                          {habit.unit}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {weeklyHabits.length > 0 && (
            <>
              <p style={{ fontSize: "10px", fontWeight: 600, color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "10px" }}>
                Weekly
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "20px" }}>
                {weeklyHabits.map((habit) => (
                  <div key={habit.id} style={{
                    display: "flex", alignItems: "center", gap: "12px",
                    padding: "12px 14px",
                    backgroundColor: "#FAFAF8", borderRadius: "10px",
                  }}>
                    <Circle size={20} color="#D1D5DB" />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: "13px", fontWeight: 500, color: "#111827", lineHeight: 1.3 }}>
                        {habit.title}
                      </p>
                      {habit.frequency_detail && (
                        <p style={{ fontSize: "11px", color: "#9CA3AF", marginTop: "2px" }}>
                          {habit.frequency_detail}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {monthlyHabits.length > 0 && (
            <>
              <p style={{ fontSize: "10px", fontWeight: 600, color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "10px" }}>
                Monthly
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {monthlyHabits.map((habit) => (
                  <div key={habit.id} style={{
                    display: "flex", alignItems: "center", gap: "12px",
                    padding: "12px 14px",
                    backgroundColor: "#FAFAF8", borderRadius: "10px",
                  }}>
                    <Circle size={20} color="#D1D5DB" />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: "13px", fontWeight: 500, color: "#111827" }}>
                        {habit.title}
                      </p>
                      {habit.frequency_detail && (
                        <p style={{ fontSize: "11px", color: "#9CA3AF", marginTop: "2px" }}>
                          {habit.frequency_detail}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ACTIONS TAB */}
      {activeTab === "actions" && (
        <div style={card}>
          <p style={sectionTitle}>
            <ListTodo size={16} color={area.color} />
            Actions
          </p>

          {actions.length === 0 ? (
            <p style={{ fontSize: "13px", color: "#9CA3AF", textAlign: "center", padding: "20px 0" }}>
              All actions complete
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {actions.map((action) => {
                const isOverdue = action.due_date && action.due_date < today;
                const priorityColor = action.priority === "high" ? "#DC2626" : action.priority === "medium" ? "#D97706" : "#9CA3AF";
                return (
                  <div key={action.id} style={{
                    display: "flex", alignItems: "flex-start", gap: "12px",
                    padding: "12px 14px",
                    backgroundColor: "#FAFAF8", borderRadius: "10px",
                  }}>
                    <button
                      onClick={() => handleCompleteAction(action.id)}
                      style={{ background: "none", border: "none", cursor: "pointer", padding: 0, marginTop: "1px", flexShrink: 0 }}
                    >
                      <Circle size={20} color="#D1D5DB" />
                    </button>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: "13px", fontWeight: 500, color: "#111827", lineHeight: 1.4 }}>
                        {action.title}
                      </p>
                      {action.description && (
                        <p style={{ fontSize: "11px", color: "#9CA3AF", marginTop: "3px", lineHeight: 1.4 }}>
                          {action.description}
                        </p>
                      )}
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "6px" }}>
                        <span style={{
                          fontSize: "10px", fontWeight: 600,
                          color: priorityColor,
                          backgroundColor: `${priorityColor}15`,
                          padding: "2px 7px", borderRadius: "99px",
                          textTransform: "capitalize",
                        }}>
                          {action.priority}
                        </span>
                        {action.due_date && (
                          <span style={{ fontSize: "10px", color: isOverdue ? "#DC2626" : "#9CA3AF" }}>
                            {isOverdue ? "Overdue" : "Due"} {new Date(action.due_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}