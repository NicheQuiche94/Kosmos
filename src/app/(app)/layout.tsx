"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useProfileStore } from "@/store/profileStore";
import BottomNav from "@/components/nav/BottomNav";
import Sidebar from "@/components/nav/Sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated } = useProfileStore();

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/select-profile");
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) return null;

  return (
    <div style={{
      minHeight: "100vh",
      width: "100%",
      background: "linear-gradient(160deg, #1A3F5C 0%, #2C5F8A 25%, #2E7A6E 60%, #3A8C7A 100%)",
      display: "flex",
      position: "relative",
    }}>
      {/* Decorative background orbs */}
      <div style={{
        position: "fixed", top: "-100px", right: "-100px",
        width: "500px", height: "500px", borderRadius: "50%",
        backgroundColor: "rgba(255,255,255,0.04)",
        pointerEvents: "none", zIndex: 0,
      }} />
      <div style={{
        position: "fixed", bottom: "-150px", left: "100px",
        width: "400px", height: "400px", borderRadius: "50%",
        backgroundColor: "rgba(255,255,255,0.03)",
        pointerEvents: "none", zIndex: 0,
      }} />
      <div style={{
        position: "fixed", top: "30%", right: "20%",
        width: "300px", height: "300px", borderRadius: "50%",
        backgroundColor: "rgba(74,155,142,0.08)",
        pointerEvents: "none", zIndex: 0,
      }} />

      {/* Sidebar — desktop only */}
      <div className="sidebar-desktop" style={{ display: "none", position: "relative", zIndex: 10 }}>
        <Sidebar />
      </div>

      {/* Main content */}
      <main style={{
        flex: 1,
        minHeight: "100vh",
        paddingBottom: "96px",
        position: "relative",
        zIndex: 1,
      }}>
        {children}
      </main>

      {/* Bottom nav — mobile only */}
      <div className="lg-hide">
        <BottomNav />
      </div>

      <style jsx global>{`
        @media (min-width: 1024px) {
          .sidebar-desktop { display: flex !important; }
          main { margin-left: 72px; padding-bottom: 0 !important; }
        }
        .lg-hide { display: block; }
        @media (min-width: 1024px) { .lg-hide { display: none; } }
      `}</style>
    </div>
  );
}