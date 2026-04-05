"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useProfileStore } from "@/store/profileStore";

export default function Home() {
  const router = useRouter();
  const { isAuthenticated } = useProfileStore();

  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/dashboard");
    } else {
      router.replace("/select-profile");
    }
  }, [isAuthenticated, router]);

  return null;
}