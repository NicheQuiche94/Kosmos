import { supabase } from "@/lib/supabase";
import { format, subDays } from "date-fns";

const ANDRE_ID = "a0000000-0000-0000-0000-000000000001";

export async function getProfileId(profileId: string) {
  return profileId || ANDRE_ID;
}

export async function getLifeAreas(profileId: string) {
  const { data } = await supabase
    .from("life_areas")
    .select("*")
    .eq("profile_id", profileId)
    .order("order_index");
  return data || [];
}

export async function getHabitsForToday(profileId: string) {
  const today = format(new Date(), "yyyy-MM-dd");

  const { data: habits } = await supabase
    .from("habits")
    .select("*")
    .eq("profile_id", profileId)
    .eq("active", true)
    .eq("frequency", "daily");

  const { data: logs } = await supabase
    .from("habit_logs")
    .select("*")
    .eq("profile_id", profileId)
    .eq("logged_at", today);

  const completedIds = new Set(logs?.map((l) => l.habit_id) || []);

  return {
    habits: habits || [],
    logs: logs || [],
    completedIds,
    total: habits?.length || 0,
    completed: logs?.length || 0,
  };
}

export async function getTodayActions(profileId: string) {
  const today = format(new Date(), "yyyy-MM-dd");

  const { data } = await supabase
    .from("actions")
    .select("*, life_areas(name, color)")
    .eq("profile_id", profileId)
    .eq("status", "pending")
    .lte("due_date", today)
    .eq("priority", "high")
    .order("due_date")
    .limit(3);

  return data || [];
}

export async function getDailySummary(profileId: string) {
  const today = format(new Date(), "yyyy-MM-dd");

  const { data } = await supabase
    .from("daily_summary")
    .select("*")
    .eq("profile_id", profileId)
    .eq("date", today)
    .single();

  return data;
}

export async function getLifeAreaProgress(profileId: string) {
  const today = format(new Date(), "yyyy-MM-dd");

  const { data: habits } = await supabase
    .from("habits")
    .select("id, life_area_id")
    .eq("profile_id", profileId)
    .eq("active", true)
    .eq("frequency", "daily");

  const { data: logs } = await supabase
    .from("habit_logs")
    .select("habit_id")
    .eq("profile_id", profileId)
    .eq("logged_at", today);

  const completedHabitIds = new Set(logs?.map((l) => l.habit_id) || []);

  const progressByArea: Record<string, { total: number; completed: number }> = {};

  habits?.forEach((habit) => {
    if (!progressByArea[habit.life_area_id]) {
      progressByArea[habit.life_area_id] = { total: 0, completed: 0 };
    }
    progressByArea[habit.life_area_id].total++;
    if (completedHabitIds.has(habit.id)) {
      progressByArea[habit.life_area_id].completed++;
    }
  });

  return progressByArea;
}

export async function getMilestones(profileId: string) {
  const { data } = await supabase
    .from("milestones")
    .select("*, goals(title, life_area_id)")
    .eq("profile_id", profileId)
    .eq("status", "in_progress")
    .order("target_date");
  return data || [];
}

export async function getProjects(profileId: string) {
  const { data } = await supabase
    .from("projects")
    .select("*")
    .eq("profile_id", profileId)
    .eq("status", "active")
    .order("created_at");
  return data || [];
}

export async function getRules(profileId: string) {
  const { data } = await supabase
    .from("rules")
    .select("*, life_areas(name, color)")
    .eq("profile_id", profileId);
  return data || [];
}

export async function logHabit(
  profileId: string,
  habitId: string,
  value: string = "true"
) {
  const today = format(new Date(), "yyyy-MM-dd");
  const { data, error } = await supabase
    .from("habit_logs")
    .upsert({
      profile_id: profileId,
      habit_id: habitId,
      logged_at: today,
      value,
      source: "manual",
    }, { onConflict: "habit_id,logged_at" });
  return { data, error };
}

export async function completeAction(actionId: string) {
  const { data, error } = await supabase
    .from("actions")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
    })
    .eq("id", actionId);
  return { data, error };
}

export async function logMetric(
  profileId: string,
  metricId: string,
  value: number,
  note?: string
) {
  const today = format(new Date(), "yyyy-MM-dd");
  const { data, error } = await supabase
    .from("metric_logs")
    .upsert({
      profile_id: profileId,
      metric_id: metricId,
      value,
      logged_at: today,
      note,
      source: "manual",
    }, { onConflict: "metric_id,logged_at" });
  return { data, error };
}

export async function getJournalEntries(profileId: string, days: number = 30) {
  const since = format(subDays(new Date(), days), "yyyy-MM-dd");
  const { data } = await supabase
    .from("journal_entries")
    .select("*")
    .eq("profile_id", profileId)
    .gte("logged_at", since)
    .order("logged_at", { ascending: false });
  return data || [];
}

export async function getRecentSentiment(profileId: string) {
  const since = format(subDays(new Date(), 7), "yyyy-MM-dd");
  const { data } = await supabase
    .from("journal_entries")
    .select("sentiment, energy_level, logged_at, related_area")
    .eq("profile_id", profileId)
    .gte("logged_at", since)
    .order("logged_at", { ascending: false });
  return data || [];
}