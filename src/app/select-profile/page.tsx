"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useProfileStore } from "@/store/profileStore";
import { Profile } from "@/types";

export default function SelectProfile() {
  const router = useRouter();
  const { setActiveProfile } = useProfileStore();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfiles = async () => {
      const { data } = await supabase.from("profiles").select("*").order("created_at");
      if (data) setProfiles(data);
      setLoading(false);
    };
    fetchProfiles();
  }, []);

  const handleSelect = (profile: Profile) => {
    setActiveProfile(profile);
    router.push("/dashboard");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-heading text-text-primary tracking-tight mb-2">
          Kosmos
        </h1>
        <p className="text-text-secondary text-sm">Who is using Kosmos?</p>
      </div>

      <div className="flex gap-8">
        {profiles.map((profile) => (
          <button
            key={profile.id}
            onClick={() => handleSelect(profile)}
            className="flex flex-col items-center gap-3 group"
          >
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-white text-xl font-heading shadow-card group-hover:scale-105 transition-transform duration-200"
              style={{
                background: `linear-gradient(135deg, ${profile.avatar_color_from}, ${profile.avatar_color_to})`,
              }}
            >
              {profile.name.charAt(0)}
            </div>
            <span className="text-text-primary text-sm font-medium">
              {profile.name}
            </span>
          </button>
        ))}
      </div>

      <p className="mt-16 text-text-secondary text-xs">
        Kosmos. Your personal operating system
      </p>
    </div>
  );
}