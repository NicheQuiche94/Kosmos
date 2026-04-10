"use client";

import { useState, useEffect, useCallback } from "react";
import { useProfileStore } from "@/store/profileStore";
import { supabase } from "@/lib/supabase";
import { User, Bell, Clock, CalendarCheck, Moon, Info, Target, CheckSquare, Cpu } from "lucide-react";
import { Profile } from "@/types";

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

function Toggle({ enabled, onToggle, disabled }: { enabled: boolean; onToggle: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={disabled ? undefined : onToggle}
      style={{
        width: "44px", height: "24px", borderRadius: "99px", border: "none",
        cursor: disabled ? "default" : "pointer",
        background: disabled ? "#E5E7EB" : enabled ? GRADIENT : "#D1D5DB",
        position: "relative", transition: "background 0.2s ease",
        flexShrink: 0, padding: 0,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <div style={{
        width: "18px", height: "18px", borderRadius: "50%",
        backgroundColor: "#fff",
        position: "absolute", top: "3px",
        left: enabled ? "23px" : "3px",
        transition: "left 0.2s ease",
        boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
      }} />
    </button>
  );
}

export default function ProfilePage() {
  const { activeProfile, setActiveProfile } = useProfileStore();
  const profileId = activeProfile?.id || "";

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [switchedTo, setSwitchedTo] = useState<string | null>(null);
  const [totalGoals, setTotalGoals] = useState(0);
  const [totalHabits, setTotalHabits] = useState(0);
  const [aiConnected, setAiConnected] = useState<boolean | null>(null);

  // Settings toggles (local state only)
  const [morningNotif, setMorningNotif] = useState(true);
  const [habitReminders, setHabitReminders] = useState(true);
  const [weeklySummary, setWeeklySummary] = useState(false);

  const loadData = useCallback(async () => {
    const [
      { data: profilesData },
      { data: goalsData },
      { data: habitsData },
    ] = await Promise.all([
      supabase.from("profiles").select("*"),
      profileId ? supabase.from("goals").select("id").eq("profile_id", profileId) : Promise.resolve({ data: [] }),
      profileId ? supabase.from("habits").select("id").eq("profile_id", profileId).eq("active", true) : Promise.resolve({ data: [] }),
    ]);
    setProfiles((profilesData as Profile[]) || []);
    setTotalGoals(goalsData?.length || 0);
    setTotalHabits(habitsData?.length || 0);
  }, [profileId]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", content: "ping" }], system: "Reply with pong only.", max_tokens: 10 }),
    })
      .then(r => r.json())
      .then(d => setAiConnected(d.content?.[0]?.text?.includes("pong") || false))
      .catch(() => setAiConnected(false));
  }, []);

  const handleSwitchProfile = (profile: Profile) => {
    if (profile.id === profileId) return;
    setActiveProfile(profile);
    setSwitchedTo(profile.name);
    setTimeout(() => setSwitchedTo(null), 2000);
  };

  const settingsRows = [
    { label: "Morning notifications", description: "Daily reminder at 7am", icon: <Bell size={16} color="#2C5F8A" />, enabled: morningNotif, onToggle: () => setMorningNotif(!morningNotif) },
    { label: "Action reminders", description: "Nudge when actions are incomplete by 8pm", icon: <Clock size={16} color="#D97706" />, enabled: habitReminders, onToggle: () => setHabitReminders(!habitReminders) },
    { label: "Weekly summary", description: "Sunday evening review prompt", icon: <CalendarCheck size={16} color="#4A8C6F" />, enabled: weeklySummary, onToggle: () => setWeeklySummary(!weeklySummary) },
    { label: "Dark mode", description: "Coming soon", icon: <Moon size={16} color="#9CA3AF" />, enabled: false, onToggle: () => {}, disabled: true },
  ];

  return (
    <div style={{ maxWidth: "860px", margin: "0 auto", padding: "0 0 140px 0", minHeight: "100vh" }}>

      {/* Switched confirmation toast */}
      {switchedTo && (
        <div style={{
          position: "fixed", top: "20px", left: "50%", transform: "translateX(-50%)",
          background: GRADIENT, color: "#fff", padding: "10px 20px",
          borderRadius: "99px", fontSize: "13px", fontWeight: 600, zIndex: 100,
          boxShadow: "0 4px 16px rgba(44,95,138,0.3)",
        }}>
          Switched to {switchedTo}
        </div>
      )}

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
            <User size={22} color="#fff" />
          </div>
          <div>
            <h1 style={{
              fontFamily: '"Cal Sans", Inter, sans-serif',
              fontSize: "28px", fontWeight: 600, color: "#fff", margin: 0, lineHeight: 1.1,
            }}>
              Profile
            </h1>
            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.65)", marginTop: "4px" }}>
              {activeProfile?.name || "No profile selected"}
            </p>
          </div>
        </div>
      </div>

      <div style={{ padding: "0 20px", display: "flex", flexDirection: "column", gap: "16px" }}>

        {/* Section 1: User Switcher */}
        <GradientCard>
          <CardHeader title="Who's Using Kosmos?" icon={<User size={14} color="#fff" />} />
          <div style={{ padding: "24px 16px" }}>
            <div style={{ display: "flex", gap: "20px", justifyContent: "center", flexWrap: "wrap" }}>
              {profiles.map((p) => {
                const isActive = p.id === profileId;
                return (
                  <button
                    key={p.id}
                    onClick={() => handleSwitchProfile(p)}
                    style={{
                      display: "flex", flexDirection: "column", alignItems: "center", gap: "8px",
                      background: "none", border: "none", cursor: "pointer",
                      padding: "4px", transition: "transform 0.15s ease",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.05)")}
                    onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
                  >
                    <div style={{
                      width: "72px", height: "72px", borderRadius: "50%",
                      background: `linear-gradient(135deg, ${p.avatar_color_from}, ${p.avatar_color_to})`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      boxShadow: isActive
                        ? "0 0 0 3px #fff, 0 0 0 5px #2C5F8A"
                        : "0 2px 8px rgba(0,0,0,0.1)",
                      transition: "box-shadow 0.2s ease",
                    }}>
                      <span style={{
                        fontFamily: '"Cal Sans", Inter, sans-serif',
                        fontSize: "24px", fontWeight: 600, color: "#fff",
                      }}>
                        {p.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span style={{
                      fontSize: "13px",
                      fontWeight: isActive ? 700 : 500,
                      color: isActive ? "#2C5F8A" : "#6B7280",
                    }}>
                      {p.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </GradientCard>

        {/* Section 2: App Settings */}
        <GradientCard>
          <CardHeader title="Settings" icon={<Bell size={14} color="#fff" />} />
          <div style={{ padding: "4px 0" }}>
            {settingsRows.map((row, i) => (
              <div key={row.label} style={{
                display: "flex", alignItems: "center", gap: "12px",
                padding: "14px 16px",
                borderBottom: i < settingsRows.length - 1 ? "1px solid #F9FAFB" : "none",
                opacity: row.disabled ? 0.5 : 1,
              }}>
                <div style={{
                  width: "36px", height: "36px", borderRadius: "10px",
                  backgroundColor: "#F3F4F6",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  {row.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "#374151" }}>{row.label}</div>
                  <div style={{ fontSize: "12px", color: "#9CA3AF", marginTop: "1px" }}>{row.description}</div>
                </div>
                <Toggle enabled={row.enabled} onToggle={row.onToggle} disabled={row.disabled} />
              </div>
            ))}
          </div>
        </GradientCard>

        {/* Section 3: Integrations */}
        <GradientCard>
          <CardHeader title="Integrations" icon={<Cpu size={14} color="#fff" />} />
          <div style={{ padding: "4px 0" }}>
            <div style={{
              display: "flex", alignItems: "center", gap: "12px",
              padding: "14px 16px",
            }}>
              <div style={{
                width: "36px", height: "36px", borderRadius: "10px",
                backgroundColor: "#F3F4F6",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                <Cpu size={16} color="#2C5F8A" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "14px", fontWeight: 600, color: "#374151" }}>Anthropic Claude</div>
                <div style={{ fontSize: "12px", color: "#9CA3AF", marginTop: "1px" }}>AI features powered by Anthropic Claude. API key configured server-side.</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                <div style={{
                  width: "8px", height: "8px", borderRadius: "50%",
                  backgroundColor: aiConnected === null ? "#D1D5DB" : aiConnected ? "#4A8C6F" : "#DC2626",
                }} />
                <span style={{
                  fontSize: "12px", fontWeight: 500,
                  color: aiConnected === null ? "#9CA3AF" : aiConnected ? "#4A8C6F" : "#DC2626",
                }}>
                  {aiConnected === null ? "Checking..." : aiConnected ? "Connected" : "Not configured"}
                </span>
              </div>
            </div>
          </div>
        </GradientCard>

        {/* Section 4: About Kosmos */}
        <GradientCard>
          <CardHeader title="About" icon={<Info size={14} color="#fff" />} />
          <div style={{ padding: "24px 16px", textAlign: "center" }}>
            <h3 style={{
              fontFamily: '"Cal Sans", Inter, sans-serif',
              fontSize: "32px", fontWeight: 600, color: "#111827", margin: "0 0 6px",
            }}>
              KosmOS
            </h3>
            <p style={{ fontSize: "13px", color: "#9CA3AF", marginBottom: "16px" }}>
              v0.1.0 -- Early Access
            </p>
            <p style={{ fontSize: "14px", color: "#6B7280", lineHeight: 1.6, maxWidth: "400px", margin: "0 auto 20px" }}>
              Your personal operating system. Built around your life, not around a template.
            </p>

            <div style={{
              display: "flex", justifyContent: "center", gap: "24px",
              padding: "16px 0 0",
              borderTop: "1px solid #F3F4F6",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{
                  width: "32px", height: "32px", borderRadius: "8px",
                  backgroundColor: "#2C5F8A15",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Target size={14} color="#2C5F8A" />
                </div>
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontSize: "18px", fontWeight: 700, color: "#111827" }}>
                    {totalGoals}
                  </div>
                  <div style={{ fontSize: "11px", color: "#9CA3AF" }}>Goals</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{
                  width: "32px", height: "32px", borderRadius: "8px",
                  backgroundColor: "#4A8C6F15",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <CheckSquare size={14} color="#4A8C6F" />
                </div>
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontSize: "18px", fontWeight: 700, color: "#111827" }}>
                    {totalHabits}
                  </div>
                  <div style={{ fontSize: "11px", color: "#9CA3AF" }}>Actions</div>
                </div>
              </div>
            </div>
          </div>
        </GradientCard>

      </div>
    </div>
  );
}