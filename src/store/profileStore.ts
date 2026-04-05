import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Profile } from "@/types";

interface ProfileState {
  activeProfile: Profile | null;
  isAuthenticated: boolean;
  setActiveProfile: (profile: Profile) => void;
  logout: () => void;
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      activeProfile: null,
      isAuthenticated: false,
      setActiveProfile: (profile) =>
        set({ activeProfile: profile, isAuthenticated: true }),
      logout: () => set({ activeProfile: null, isAuthenticated: false }),
    }),
    {
      name: "kosmos-profile",
    }
  )
);