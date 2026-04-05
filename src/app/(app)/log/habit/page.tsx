"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useProfileStore } from "@/store/profileStore";
import { supabase } from "@/lib/supabase";
import { logHabit } from "@/lib/data";
import { ArrowLeft, CheckSquare, FileText, Check, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Habit } from "@/types";

const GRADIENT = "linear-gradient(135deg, #2C5F8A 0%, #3B7FAD 50%, #4A9B8E 100%)";

export default function LogHabitPage() {
  const router = useRouter();
  const { activeProfile } = useProfileStore();
  const profileId = activeProfile?.id || "";

  const [habits, setHabits] = useState<Habit[]>([]);
  const [todayLogs, setTodayLogs] = useState<Set<string>>(new Set());
  const [selectedHabit, setSelectedHabit] = useState<string>("");
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!profileId) return;
    const today = format(new Date(), "yyyy-MM-dd");

    Promise.all([
      supabase
        .from("habits")
        .select("*")
        .eq("profile_id", profileId)
        .eq("active", true)
        .order("title"),
      supabase
        .from("habit_logs")
        .select("habit_id")
        .eq("profile_id", profileId)
        .eq("logged_at", today),
    ]).then(([{ data: habitsData }, { data: logsData }]) => {
      setHabits((habitsData as Habit[]) || []);
      setTodayLogs(new Set(logsData?.map((l) => l.habit_id) || []));
    });
  }, [profileId]);

  const selected = habits.find((h) => h.id === selectedHabit);
  const needsValue = selected?.input_type === "number" || selected?.input_type === "text";

  const handleSave = async () => {
    if (!selectedHabit || saving) return;
    if (needsValue && !value) return;
    setSaving(true);

    try {
      const logValue = needsValue ? value : "true";
      await logHabit(profileId, selectedHabit, logValue);

      // Save note separately if provided
      if (note) {
        const today = format(new Date(), "yyyy-MM-dd");
        await supabase
          .from("habit_logs")
          .update({ note })
          .eq("profile_id", profileId)
          .eq("habit_id", selectedHabit)
          .eq("logged_at", today);
      }

      setSaved(true);
      setTodayLogs((prev) => new Set([...prev, selectedHabit]));
      setTimeout(() => {
        setSaved(false);
        setSelectedHabit("");
        setValue("");
        setNote("");
      }, 1200);
    } catch (err) {
      console.error("Failed to save habit", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#FAFAF8", maxWidth: "720px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ background: GRADIENT, padding: "20px 20px 32px" }}>
        <button
          onClick={() => router.back()}
          style={{
            background: "rgba(255,255,255,0.15)", border: "none", cursor: "pointer",
            color: "#fff", padding: "8px", borderRadius: "10px", display: "flex", alignItems: "center",
            marginBottom: "16px",
          }}
        >
          <ArrowLeft size={18} />
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{
            width: "40px", height: "40px", borderRadius: "12px",
            backgroundColor: "rgba(255,255,255,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <CheckSquare size={20} color="#fff" />
          </div>
          <div>
            <h1 style={{
              fontFamily: '"Cal Sans", Inter, sans-serif',
              fontSize: "22px", fontWeight: 600, color: "#fff", margin: 0,
            }}>
              Log Action
            </h1>
            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.7)", marginTop: "2px" }}>
              {format(new Date(), "EEEE, d MMMM")}
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div style={{ padding: "24px 20px" }}>
        {/* Habit Selector */}
        <div style={{ background: GRADIENT, borderRadius: "18px", padding: "1.5px", marginBottom: "16px" }}>
          <div style={{ backgroundColor: "#fff", borderRadius: "16.5px", padding: "16px" }}>
            <label style={{ fontSize: "12px", fontWeight: 600, color: "#6B7280", marginBottom: "10px", display: "block" }}>
              Select Action
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {habits.map((h) => {
                const done = todayLogs.has(h.id);
                const active = selectedHabit === h.id;
                return (
                  <button
                    key={h.id}
                    onClick={() => setSelectedHabit(h.id)}
                    style={{
                      padding: "8px 16px", borderRadius: "99px", border: "none",
                      fontSize: "13px", fontWeight: 500, cursor: "pointer",
                      transition: "all 0.15s ease",
                      background: active ? GRADIENT : done ? "#ECFDF5" : "#F3F4F6",
                      color: active ? "#fff" : done ? "#059669" : "#374151",
                      display: "flex", alignItems: "center", gap: "6px",
                    }}
                  >
                    {done && <Check size={12} />}
                    {h.title}
                  </button>
                );
              })}
              {habits.length === 0 && (
                <p style={{ fontSize: "13px", color: "#9CA3AF" }}>No active actions found</p>
              )}
            </div>
          </div>
        </div>

        {/* Value (conditional) */}
        {needsValue && (
          <div style={{ background: GRADIENT, borderRadius: "18px", padding: "1.5px", marginBottom: "16px" }}>
            <div style={{ backgroundColor: "#fff", borderRadius: "16.5px", padding: "16px" }}>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "#6B7280", marginBottom: "10px", display: "block" }}>
                Value{selected?.unit ? ` (${selected.unit})` : ""}
              </label>
              <input
                type={selected?.input_type === "number" ? "number" : "text"}
                inputMode={selected?.input_type === "number" ? "decimal" : "text"}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={`Enter ${selected?.unit || "value"}`}
                style={{
                  width: "100%", padding: "10px 14px", borderRadius: "10px",
                  border: "1px solid #E5E7EB", fontSize: "15px", color: "#111827",
                  outline: "none", fontFamily: "Inter, sans-serif",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>
        )}

        {/* Note */}
        <div style={{ background: GRADIENT, borderRadius: "18px", padding: "1.5px", marginBottom: "24px" }}>
          <div style={{ backgroundColor: "#fff", borderRadius: "16.5px", padding: "16px" }}>
            <label style={{ fontSize: "12px", fontWeight: 600, color: "#6B7280", marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
              <FileText size={14} color="#6B7280" />
              Note (optional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Any notes about this habit"
              rows={2}
              style={{
                width: "100%", padding: "10px 14px", borderRadius: "10px",
                border: "1px solid #E5E7EB", fontSize: "14px", color: "#111827",
                resize: "none", outline: "none", fontFamily: "Inter, sans-serif",
                lineHeight: 1.5, boxSizing: "border-box",
              }}
            />
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={!selectedHabit || (needsValue && !value) || saving || saved}
          style={{
            width: "100%", padding: "14px", borderRadius: "14px",
            border: "none", fontSize: "15px", fontWeight: 600, cursor: "pointer",
            fontFamily: '"Cal Sans", Inter, sans-serif',
            background: !selectedHabit || (needsValue && !value) ? "#E5E7EB" : GRADIENT,
            color: !selectedHabit || (needsValue && !value) ? "#9CA3AF" : "#fff",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
            transition: "all 0.15s ease",
          }}
        >
          {saved ? (
            <>
              <Check size={18} />
              Saved
            </>
          ) : saving ? (
            <>
              <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
              Saving...
            </>
          ) : (
            "Log Action"
          )}
        </button>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}