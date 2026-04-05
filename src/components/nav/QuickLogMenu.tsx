"use client";

import { useRouter } from "next/navigation";
import {
  Dumbbell,
  UtensilsCrossed,
  BarChart2,
  CheckSquare,
  MessageCircle,
  Moon,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const GRADIENT = "linear-gradient(135deg, #2C5F8A 0%, #3B7FAD 50%, #4A9B8E 100%)";

const logOptions = [
  { icon: Dumbbell, label: "Workout", href: "/log/workout", color: "#4A8C6F" },
  { icon: UtensilsCrossed, label: "Food", href: "/log/food", color: "#D97706" },
  { icon: BarChart2, label: "Metric", href: "/log/metric", color: "#2C5F8A" },
  { icon: CheckSquare, label: "Habit", href: "/log/habit", color: "#7C3AED" },
  { icon: MessageCircle, label: "Chat", href: "/log/chat", color: "#0891B2" },
  { icon: Moon, label: "Debrief", href: "/debrief", color: "#1E4266" },
];

export default function QuickLogMenu({ onClose }: { onClose: () => void }) {
  const router = useRouter();

  const handleSelect = (href: string) => {
    onClose();
    router.push(href);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: "fixed", inset: 0, zIndex: 50,
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "20px",
        }}
        onClick={onClose}
      >
        {/* Backdrop */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundColor: "rgba(0,0,0,0.25)",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
        }} />

        {/* Modal */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          style={{
            position: "relative",
            width: "100%", maxWidth: "400px",
            background: GRADIENT,
            borderRadius: "24px",
            padding: "1.5px",
            boxShadow: "0 8px 32px rgba(44,95,138,0.3), 0 2px 8px rgba(0,0,0,0.1)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{
            background: GRADIENT,
            borderRadius: "22.5px",
            padding: "24px",
            overflow: "hidden",
            position: "relative",
          }}>
            {/* Decorative circles */}
            <div style={{ position: "absolute", top: "-30px", right: "-30px", width: "120px", height: "120px", borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.06)" }} />
            <div style={{ position: "absolute", bottom: "-40px", left: "-20px", width: "100px", height: "100px", borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.04)" }} />

            {/* Header */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              marginBottom: "20px", position: "relative",
            }}>
              <h2 style={{
                fontFamily: '"Cal Sans", Inter, sans-serif',
                fontSize: "20px", fontWeight: 600, color: "#fff", margin: 0,
              }}>
                What are you logging?
              </h2>
              <button
                onClick={onClose}
                style={{
                  width: "32px", height: "32px", borderRadius: "50%",
                  backgroundColor: "rgba(255,255,255,0.15)",
                  border: "none", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <X size={16} color="#fff" />
              </button>
            </div>

            {/* Grid */}
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
              gap: "12px", position: "relative",
            }}>
              {logOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.href}
                    onClick={() => handleSelect(option.href)}
                    style={{
                      display: "flex", flexDirection: "column",
                      alignItems: "center", gap: "8px",
                      padding: "16px 8px",
                      borderRadius: "16px",
                      backgroundColor: "rgba(255,255,255,0.12)",
                      border: "none", cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.22)";
                      (e.currentTarget as HTMLElement).style.transform = "scale(1.03)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.12)";
                      (e.currentTarget as HTMLElement).style.transform = "scale(1)";
                    }}
                  >
                    <div style={{
                      width: "44px", height: "44px", borderRadius: "12px",
                      backgroundColor: "rgba(255,255,255,0.2)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <Icon size={22} color="#fff" />
                    </div>
                    <span style={{
                      fontSize: "12px", fontWeight: 600, color: "#fff",
                    }}>
                      {option.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}