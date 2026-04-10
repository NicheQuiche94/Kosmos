"use client";

import { useRouter, usePathname } from "next/navigation";
import { LayoutDashboard, BarChart2, Lightbulb, Calendar, User, Plus } from "lucide-react";
import { useState } from "react";
import QuickLogMenu from "@/components/nav/QuickLogMenu";

const navItems = [
  { icon: LayoutDashboard, href: "/dashboard", label: "Dashboard" },
  { icon: BarChart2, href: "/analytics", label: "Analytics" },
  { icon: Lightbulb, href: "/insights", label: "Insights" },
  { icon: Calendar, href: "/calendar", label: "Calendar" },
  { icon: User, href: "/profile", label: "Profile" },
];

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [logMenuOpen, setLogMenuOpen] = useState(false);

  return (
    <>
      {logMenuOpen && <QuickLogMenu onClose={() => setLogMenuOpen(false)} />}

      <div style={{
        position: "fixed", left: 0, top: 0,
        height: "100vh", width: "72px",
        backgroundColor: "rgba(255,255,255,0.06)",
        backdropFilter: "blur(12px)",
        borderRight: "1px solid rgba(255,255,255,0.1)",
        display: "flex", flexDirection: "column",
        alignItems: "center",
        padding: "20px 0",
        zIndex: 40,
      }}>
        {/* Logo */}
        <div style={{
          width: "38px", height: "38px", borderRadius: "12px",
          backgroundColor: "rgba(255,255,255,0.2)",
          border: "1px solid rgba(255,255,255,0.3)",
          display: "flex", alignItems: "center", justifyContent: "center",
          marginBottom: "32px", flexShrink: 0,
        }}>
          <span style={{ fontFamily: 'Inter, sans-serif', color: "#fff", fontSize: "14px", fontWeight: 700 }}>K</span>
        </div>

        {/* Nav items */}
        <nav style={{ display: "flex", flexDirection: "column", gap: "6px", flex: 1 }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname.startsWith(item.href);
            return (
              <button key={item.href}
                onClick={() => router.push(item.href)}
                title={item.label}
                style={{
                  width: "44px", height: "44px", borderRadius: "12px",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer",
                  backgroundColor: active ? "rgba(255,255,255,0.2)" : "transparent",
                  border: active ? "1px solid rgba(255,255,255,0.25)" : "1px solid transparent",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={e => {
                  if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.1)";
                }}
                onMouseLeave={e => {
                  if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                }}
              >
                <Icon size={19} color={active ? "#fff" : "rgba(255,255,255,0.6)"} strokeWidth={active ? 2.5 : 1.75} />
              </button>
            );
          })}
        </nav>

        {/* Plus button */}
        <button
          onClick={() => setLogMenuOpen(true)}
          style={{
            width: "44px", height: "44px", borderRadius: "12px",
            backgroundColor: "rgba(255,255,255,0.2)",
            border: "1px solid rgba(255,255,255,0.3)",
            cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.3)")}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.2)")}
        >
          <Plus size={20} color="#fff" strokeWidth={2.5} />
        </button>
      </div>
    </>
  );
}