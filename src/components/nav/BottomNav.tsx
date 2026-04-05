"use client";

import { useRouter, usePathname } from "next/navigation";
import { LayoutDashboard, BarChart2, Lightbulb, Calendar, User, Plus } from "lucide-react";
import { useState } from "react";
import QuickLogMenu from "@/components/nav/QuickLogMenu";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: BarChart2, label: "Analytics", href: "/analytics" },
  { icon: Lightbulb, label: "Insights", href: "/insights" },
  { icon: Calendar, label: "Calendar", href: "/calendar" },
  { icon: User, label: "Profile", href: "/profile" },
];

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [logMenuOpen, setLogMenuOpen] = useState(false);

  return (
    <>
      {logMenuOpen && <QuickLogMenu onClose={() => setLogMenuOpen(false)} />}

      <div style={{
        position: "fixed",
        bottom: 0, left: 0, right: 0,
        backgroundColor: "#fff",
        borderTop: "1px solid #F3F4F6",
        zIndex: 40,
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
      className="lg-hide"
      >
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-around",
          height: "64px",
          maxWidth: "480px",
          margin: "0 auto",
          padding: "0 8px",
          position: "relative",
        }}>
          {/* Left two */}
          {navItems.slice(0, 2).map((item) => {
            const Icon = item.icon;
            const active = pathname.startsWith(item.href);
            return (
              <button key={item.href} onClick={() => router.push(item.href)}
                style={{
                  display: "flex", flexDirection: "column",
                  alignItems: "center", gap: "3px",
                  flex: 1, padding: "8px 0",
                  border: "none", background: "none", cursor: "pointer",
                }}
              >
                <Icon size={22} color={active ? "#2C5F8A" : "#9CA3AF"}
                  strokeWidth={active ? 2.5 : 1.75} />
                <span style={{
                  fontSize: "10px",
                  color: active ? "#2C5F8A" : "#9CA3AF",
                  fontWeight: active ? 600 : 400,
                }}>
                  {item.label}
                </span>
              </button>
            );
          })}

          {/* Centre + */}
          <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
            <button
              onClick={() => setLogMenuOpen(true)}
              style={{
                width: "56px", height: "56px", borderRadius: "50%",
                background: "linear-gradient(135deg, #2C5F8A, #4A9B8E)",
                border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 4px 16px rgba(44,95,138,0.35)",
                marginTop: "-20px",
                transition: "transform 0.15s ease",
              }}
              onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.05)")}
              onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
            >
              <Plus size={26} color="#fff" strokeWidth={2.5} />
            </button>
          </div>

          {/* Right three */}
          {navItems.slice(2, 5).map((item) => {
            const Icon = item.icon;
            const active = pathname.startsWith(item.href);
            return (
              <button key={item.href} onClick={() => router.push(item.href)}
                style={{
                  display: "flex", flexDirection: "column",
                  alignItems: "center", gap: "3px",
                  flex: 1, padding: "8px 0",
                  border: "none", background: "none", cursor: "pointer",
                }}
              >
                <Icon size={22} color={active ? "#2C5F8A" : "#9CA3AF"}
                  strokeWidth={active ? 2.5 : 1.75} />
                <span style={{
                  fontSize: "10px",
                  color: active ? "#2C5F8A" : "#9CA3AF",
                  fontWeight: active ? 600 : 400,
                }}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <style jsx global>{`
        .lg-hide {
          display: block;
        }
        @media (min-width: 1024px) {
          .lg-hide {
            display: none;
          }
        }
      `}</style>
    </>
  );
}