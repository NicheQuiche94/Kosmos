"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useProfileStore } from "@/store/profileStore";
import { supabase } from "@/lib/supabase";
import { logHabit } from "@/lib/data";
import { ArrowLeft, Dumbbell, Clock, FileText, Check, Loader2 } from "lucide-react";
import { format } from "date-fns";

const GRADIENT = "linear-gradient(135deg, #2C5F8A 0%, #3B7FAD 50%, #4A9B8E 100%)";

const WORKOUT_TYPES = [
  "Upper Body",
  "Lower Body",
  "Full Body",
  "Cardio",
  "Run",
  "Kettlebell",
  "Flexibility",
] as const;

const HABIT_MAP: Record<string, string[]> = {
  "Upper Body": ["weight training"],
  "Lower Body": ["weight training"],
  "Full Body": ["weight training"],
  "Cardio": ["cardio"],
  "Run": ["cardio", "5k"],
  "Kettlebell": ["weight training", "kettlebell"],
  "Flexibility": ["flexibility", "mobility"],
};

export default function LogWorkout() {
  const router = useRouter();
  const { activeProfile } = useProfileStore();
  const profileId = activeProfile?.id || "";

  const [workoutType, setWorkoutType] = useState<string>("");
  const [duration, setDuration] = useState<string>("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [habits, setHabits] = useState<any[]>([]);

  useEffect(() => {
    if (!profileId) return;
    supabase
      .from("habits")
      .select("*")
      .eq("profile_id", profileId)
      .eq("active", true)
      .then(({ data }) => setHabits(data || []));
  }, [profileId]);

  const handleSave = async () => {
    if (!workoutType || !duration || saving) return;
    setSaving(true);

    try {
      const today = format(new Date(), "yyyy-MM-dd");

      // Save to workout_logs
      await supabase.from("workout_logs").insert({
        profile_id: profileId,
        workout_type: workoutType,
        duration_minutes: parseInt(duration, 10),
        note: note || null,
        logged_at: today,
      });

      // Mark relevant habits as complete
      const keywords = HABIT_MAP[workoutType] || [];
      const matchedHabits = habits.filter((h) =>
        keywords.some((kw) => h.title.toLowerCase().includes(kw))
      );

      for (const habit of matchedHabits) {
        await logHabit(profileId, habit.id, "true");
      }

      setSaved(true);
      setTimeout(() => router.back(), 1200);
    } catch (err) {
      console.error("Failed to save workout", err);
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
            <Dumbbell size={20} color="#fff" />
          </div>
          <div>
            <h1 style={{
              fontFamily: '"Cal Sans", Inter, sans-serif',
              fontSize: "22px", fontWeight: 600, color: "#fff", margin: 0,
            }}>
              Log Workout
            </h1>
            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.7)", marginTop: "2px" }}>
              {format(new Date(), "EEEE, d MMMM")}
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div style={{ padding: "24px 20px" }}>
        {/* Workout Type */}
        <div style={{ background: GRADIENT, borderRadius: "18px", padding: "1.5px", marginBottom: "16px" }}>
          <div style={{ backgroundColor: "#fff", borderRadius: "16.5px", padding: "16px" }}>
            <label style={{ fontSize: "12px", fontWeight: 600, color: "#6B7280", marginBottom: "10px", display: "block" }}>
              Workout Type
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {WORKOUT_TYPES.map((type) => (
                <button
                  key={type}
                  onClick={() => setWorkoutType(type)}
                  style={{
                    padding: "8px 16px", borderRadius: "99px", border: "none",
                    fontSize: "13px", fontWeight: 500, cursor: "pointer",
                    transition: "all 0.15s ease",
                    background: workoutType === type ? GRADIENT : "#F3F4F6",
                    color: workoutType === type ? "#fff" : "#374151",
                  }}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Duration */}
        <div style={{ background: GRADIENT, borderRadius: "18px", padding: "1.5px", marginBottom: "16px" }}>
          <div style={{ backgroundColor: "#fff", borderRadius: "16.5px", padding: "16px" }}>
            <label style={{ fontSize: "12px", fontWeight: 600, color: "#6B7280", marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
              <Clock size={14} color="#6B7280" />
              Duration (minutes)
            </label>
            <input
              type="number"
              inputMode="numeric"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="e.g. 45"
              style={{
                width: "100%", padding: "10px 14px", borderRadius: "10px",
                border: "1px solid #E5E7EB", fontSize: "15px", color: "#111827",
                outline: "none", fontFamily: "Inter, sans-serif",
                boxSizing: "border-box",
              }}
            />
          </div>
        </div>

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
              placeholder="How did it go?"
              rows={3}
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
          disabled={!workoutType || !duration || saving || saved}
          style={{
            width: "100%", padding: "14px", borderRadius: "14px",
            border: "none", fontSize: "15px", fontWeight: 600, cursor: "pointer",
            fontFamily: '"Cal Sans", Inter, sans-serif',
            background: !workoutType || !duration ? "#E5E7EB" : GRADIENT,
            color: !workoutType || !duration ? "#9CA3AF" : "#fff",
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
            "Log Workout"
          )}
        </button>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}