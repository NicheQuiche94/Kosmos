"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useProfileStore } from "@/store/profileStore";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, UtensilsCrossed, Flame, Beef, Wheat, Droplets, FileText, Check, Loader2 } from "lucide-react";
import { format } from "date-fns";

const GRADIENT = "linear-gradient(135deg, #2C5F8A 0%, #3B7FAD 50%, #4A9B8E 100%)";

export default function LogFood() {
  const router = useRouter();
  const { activeProfile } = useProfileStore();
  const profileId = activeProfile?.id || "";

  const [name, setName] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    if (!name || saving) return;
    setSaving(true);

    try {
      const today = format(new Date(), "yyyy-MM-dd");

      await supabase.from("food_logs").insert({
        profile_id: profileId,
        name,
        calories: parseInt(calories, 10) || 0,
        protein: parseInt(protein, 10) || 0,
        carbs: parseInt(carbs, 10) || 0,
        fat: parseInt(fat, 10) || 0,
        note: note || null,
        logged_at: today,
      });

      setSaved(true);
      setTimeout(() => router.back(), 1200);
    } catch (err) {
      console.error("Failed to save food log", err);
    } finally {
      setSaving(false);
    }
  };

  const macroField = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    icon: React.ReactNode,
    unit: string,
    placeholder: string,
  ) => (
    <div style={{ flex: 1, minWidth: "0" }}>
      <label style={{ fontSize: "11px", fontWeight: 600, color: "#6B7280", marginBottom: "6px", display: "flex", alignItems: "center", gap: "4px" }}>
        {icon}
        {label}
      </label>
      <div style={{ position: "relative" }}>
        <input
          type="number"
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            width: "100%", padding: "10px 14px", borderRadius: "10px",
            border: "1px solid #E5E7EB", fontSize: "15px", color: "#111827",
            outline: "none", fontFamily: "Inter, sans-serif",
            boxSizing: "border-box",
          }}
        />
        <span style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "12px", color: "#9CA3AF" }}>
          {unit}
        </span>
      </div>
    </div>
  );

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
            <UtensilsCrossed size={20} color="#fff" />
          </div>
          <div>
            <h1 style={{
              fontFamily: '"Cal Sans", Inter, sans-serif',
              fontSize: "22px", fontWeight: 600, color: "#fff", margin: 0,
            }}>
              Log Food
            </h1>
            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.7)", marginTop: "2px" }}>
              {format(new Date(), "EEEE, d MMMM")}
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div style={{ padding: "24px 20px" }}>
        {/* Food Name */}
        <div style={{ background: GRADIENT, borderRadius: "18px", padding: "1.5px", marginBottom: "16px" }}>
          <div style={{ backgroundColor: "#fff", borderRadius: "16.5px", padding: "16px" }}>
            <label style={{ fontSize: "12px", fontWeight: 600, color: "#6B7280", marginBottom: "10px", display: "block" }}>
              What did you eat?
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Chicken breast with rice"
              style={{
                width: "100%", padding: "10px 14px", borderRadius: "10px",
                border: "1px solid #E5E7EB", fontSize: "15px", color: "#111827",
                outline: "none", fontFamily: "Inter, sans-serif",
                boxSizing: "border-box",
              }}
            />
          </div>
        </div>

        {/* Macros */}
        <div style={{ background: GRADIENT, borderRadius: "18px", padding: "1.5px", marginBottom: "16px" }}>
          <div style={{ backgroundColor: "#fff", borderRadius: "16.5px", padding: "16px" }}>
            <label style={{ fontSize: "12px", fontWeight: 600, color: "#6B7280", marginBottom: "12px", display: "block" }}>
              Nutrition
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              {macroField("Calories", calories, setCalories, <Flame size={12} color="#D97706" />, "kcal", "0")}
              {macroField("Protein", protein, setProtein, <Beef size={12} color="#DC2626" />, "g", "0")}
              {macroField("Carbs", carbs, setCarbs, <Wheat size={12} color="#D97706" />, "g", "0")}
              {macroField("Fat", fat, setFat, <Droplets size={12} color="#2C5F8A" />, "g", "0")}
            </div>
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
              placeholder="Any details about this meal"
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
          disabled={!name || saving || saved}
          style={{
            width: "100%", padding: "14px", borderRadius: "14px",
            border: "none", fontSize: "15px", fontWeight: 600, cursor: "pointer",
            fontFamily: '"Cal Sans", Inter, sans-serif',
            background: !name ? "#E5E7EB" : GRADIENT,
            color: !name ? "#9CA3AF" : "#fff",
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
            "Log Food"
          )}
        </button>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}