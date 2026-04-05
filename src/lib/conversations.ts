import { supabase } from "@/lib/supabase";
import { format } from "date-fns";

export interface StoredMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

// Get or create a conversation thread for a profile + area
export async function getOrCreateConversation(
  profileId: string,
  area: string
): Promise<string> {
  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("profile_id", profileId)
    .eq("life_area", area)
    .order("last_message_at", { ascending: false })
    .limit(1)
    .single();

  if (existing) return existing.id;

  const { data: created } = await supabase
    .from("conversations")
    .insert({
      profile_id: profileId,
      life_area: area,
      context: area,
      last_message_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  return created?.id || "";
}

// Load recent messages for an area conversation
export async function loadConversationHistory(
  profileId: string,
  area: string,
  limit: number = 30
): Promise<StoredMessage[]> {
  const { data: conversation } = await supabase
    .from("conversations")
    .select("id")
    .eq("profile_id", profileId)
    .eq("life_area", area)
    .order("last_message_at", { ascending: false })
    .limit(1)
    .single();

  if (!conversation) return [];

  const { data: messages } = await supabase
    .from("conversation_messages")
    .select("id, role, content, created_at")
    .eq("conversation_id", conversation.id)
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (messages || []).reverse();
}

// Save a message to a conversation
export async function saveMessage(
  profileId: string,
  conversationId: string,
  role: "user" | "assistant",
  content: string
): Promise<void> {
  await supabase.from("conversation_messages").insert({
    profile_id: profileId,
    conversation_id: conversationId,
    role,
    content,
  });

  await supabase
    .from("conversations")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", conversationId);
}

// Load food logs for nutrition logbook
export async function getFoodLogs(
  profileId: string,
  days: number = 30
): Promise<any[]> {
  const since = format(
    new Date(Date.now() - days * 24 * 60 * 60 * 1000),
    "yyyy-MM-dd"
  );

  const { data } = await supabase
    .from("food_logs")
    .select("*")
    .eq("profile_id", profileId)
    .gte("logged_at", since)
    .order("logged_at", { ascending: false })
    .order("created_at", { ascending: false });

  return data || [];
}

// Get daily macro totals
export async function getDailyMacros(
  profileId: string,
  days: number = 14
): Promise<any[]> {
  const since = format(
    new Date(Date.now() - days * 24 * 60 * 60 * 1000),
    "yyyy-MM-dd"
  );

  const { data } = await supabase
    .from("food_logs")
    .select("logged_at, calories, protein_g, carbs_g, fat_g")
    .eq("profile_id", profileId)
    .gte("logged_at", since)
    .order("logged_at", { ascending: true });

  const grouped: Record<string, any> = {};
  (data || []).forEach(log => {
    if (!grouped[log.logged_at]) {
      grouped[log.logged_at] = {
        date: log.logged_at,
        calories: 0,
        protein_g: 0,
        carbs_g: 0,
        fat_g: 0,
        entries: 0,
      };
    }
    grouped[log.logged_at].calories += log.calories || 0;
    grouped[log.logged_at].protein_g += log.protein_g || 0;
    grouped[log.logged_at].carbs_g += log.carbs_g || 0;
    grouped[log.logged_at].fat_g += log.fat_g || 0;
    grouped[log.logged_at].entries++;
  });

  return Object.values(grouped);
}
