"use client";

import { useState, useEffect, useCallback } from "react";
import { useProfileStore } from "@/store/profileStore";
import { format, startOfWeek, addDays, isSameDay, addWeeks, subWeeks, parseISO } from "date-fns";
import {
  ChevronLeft, ChevronRight, Plus, X,
  Clock, MapPin, Repeat, Briefcase,
  Dumbbell, Heart, PoundSterling, BookOpen,
  Music, Home, Calendar, Check,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

const GRADIENT = "linear-gradient(135deg, #2C5F8A 0%, #3B7FAD 50%, #4A9B8E 100%)";
const GRADIENT_SOFT = "linear-gradient(135deg, #2C5F8A18 0%, #4A9B8E18 100%)";

const AREA_COLORS: Record<string, string> = {
  "Health & Fitness": "#4A8C6F",
  "Work": "#2C5F8A",
  "Finances": "#D97706",
  "Relationships": "#DC2626",
  "Personal Development": "#7C3AED",
  "Hobbies & Creativity": "#0891B2",
  "Environment & Lifestyle": "#65A30D",
};

const AREA_ICONS: Record<string, React.ElementType> = {
  "Health & Fitness": Dumbbell,
  "Work": Briefcase,
  "Finances": PoundSterling,
  "Relationships": Heart,
  "Personal Development": BookOpen,
  "Hobbies & Creativity": Music,
  "Environment & Lifestyle": Home,
};

const EVENT_TYPES = [
  { value: "focus_block", label: "Focus Block", color: "#2C5F8A" },
  { value: "habit", label: "Habit", color: "#4A8C6F" },
  { value: "personal", label: "Personal", color: "#7C3AED" },
  { value: "action", label: "Action", color: "#D97706" },
  { value: "external", label: "External", color: "#6B7280" },
];

const HOURS = Array.from({ length: 18 }, (_, i) => i + 6); // 6am to midnight

function GradientCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: GRADIENT, borderRadius: "18px", padding: "1.5px", ...style }}>
      <div style={{ backgroundColor: "#fff", borderRadius: "16.5px", overflow: "hidden", height: "100%" }}>
        {children}
      </div>
    </div>
  );
}

function CardHeader({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <div style={{ background: GRADIENT, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <h2 style={{ fontFamily: '"Cal Sans", Inter, sans-serif', fontSize: "14px", fontWeight: 600, color: "#fff", margin: 0 }}>
        {title}
      </h2>
      {right}
    </div>
  );
}

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  event_type: string;
  life_area_id?: string;
  source: string;
  color?: string;
  life_areas?: { name: string; color: string };
}

interface NewEvent {
  title: string;
  description: string;
  date: string;
  start_hour: string;
  start_minute: string;
  end_hour: string;
  end_minute: string;
  event_type: string;
  life_area_id: string;
  recurrence_rule: string;
}

export default function CalendarPage() {
  const { activeProfile } = useProfileStore();
  const profileId = activeProfile?.id || "";

  const [view, setView] = useState<"day" | "week">("day");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [areas, setAreas] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [addingAt, setAddingAt] = useState<{ date: Date; hour: number } | null>(null);
  const [conflictWarning, setConflictWarning] = useState<{
    show: boolean;
    conflicts: any[];
    pendingEvent: { title: string; startTime: Date; endTime: Date } | null;
  }>({ show: false, conflicts: [], pendingEvent: null });

  const [newEvent, setNewEvent] = useState<NewEvent>({
    title: "",
    description: "",
    date: format(new Date(), "yyyy-MM-dd"),
    start_hour: "9",
    start_minute: "00",
    end_hour: "10",
    end_minute: "00",
    event_type: "focus_block",
    life_area_id: "",
    recurrence_rule: "",
  });

  const loadData = useCallback(async () => {
    if (!profileId) return;

    const weekEndDate = addDays(weekStart, 7);

    const [{ data: eventsData }, { data: areasData }] = await Promise.all([
      supabase
        .from("calendar_events")
        .select("*, life_areas(name, color)")
        .eq("profile_id", profileId)
        .gte("start_time", weekStart.toISOString())
        .lte("start_time", weekEndDate.toISOString())
        .order("start_time"),
      supabase.from("life_areas").select("*").eq("profile_id", profileId).order("order_index"),
    ]);

    setEvents(eventsData || []);
    setAreas(areasData || []);
  }, [profileId, weekStart]);

  useEffect(() => { loadData(); }, [loadData]);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getEventsForDate = (date: Date) =>
    events.filter(e => isSameDay(parseISO(e.start_time), date));

  const getEventColor = (event: CalendarEvent) =>
    event.life_areas?.color ||
    EVENT_TYPES.find(t => t.value === event.event_type)?.color ||
    "#2C5F8A";

  const getEventTop = (event: CalendarEvent) => {
    const start = parseISO(event.start_time);
    const hours = start.getHours() - 6;
    const minutes = start.getMinutes();
    return (hours * 60 + minutes) * (64 / 60);
  };

  const getEventHeight = (event: CalendarEvent) => {
    const start = parseISO(event.start_time);
    const end = parseISO(event.end_time);
    const durationMins = (end.getTime() - start.getTime()) / 60000;
    return Math.max(durationMins * (64 / 60), 28);
  };

  const handleTimeSlotClick = (date: Date, hour: number) => {
    setAddingAt({ date, hour });
    setNewEvent(prev => ({
      ...prev,
      date: format(date, "yyyy-MM-dd"),
      start_hour: hour.toString(),
      start_minute: "00",
      end_hour: (hour + 1).toString(),
      end_minute: "00",
    }));
    setShowAddModal(true);
  };

  const saveEventToDb = async (startTime: Date, endTime: Date) => {
    const { error } = await supabase.from("calendar_events").insert({
      profile_id: profileId,
      title: newEvent.title,
      description: newEvent.description || null,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      event_type: newEvent.event_type,
      life_area_id: newEvent.life_area_id || null,
      recurrence_rule: newEvent.recurrence_rule || null,
      source: "internal",
      color: null,
    });

    if (!error) {
      setShowAddModal(false);
      setConflictWarning({ show: false, conflicts: [], pendingEvent: null });
      setNewEvent({
        title: "", description: "",
        date: format(selectedDate, "yyyy-MM-dd"),
        start_hour: "9", start_minute: "00",
        end_hour: "10", end_minute: "00",
        event_type: "focus_block", life_area_id: "",
        recurrence_rule: "",
      });
      loadData();
    }
  };

  const handleSaveEvent = async () => {
    if (!newEvent.title.trim()) return;

    const startTime = new Date(`${newEvent.date}T${newEvent.start_hour.padStart(2, "0")}:${newEvent.start_minute}:00`);
    const endTime = new Date(`${newEvent.date}T${newEvent.end_hour.padStart(2, "0")}:${newEvent.end_minute}:00`);

    // Check for conflicts
    const { data: existingEvents } = await supabase
      .from("calendar_events")
      .select("*")
      .eq("profile_id", profileId)
      .gte("start_time", `${newEvent.date}T00:00:00`)
      .lte("start_time", `${newEvent.date}T23:59:59`);

    const conflicts = (existingEvents || []).filter(e => {
      const eStart = new Date(e.start_time).getTime();
      const eEnd = new Date(e.end_time).getTime();
      return startTime.getTime() < eEnd && endTime.getTime() > eStart;
    });

    if (conflicts.length > 0) {
      setConflictWarning({ show: true, conflicts, pendingEvent: { title: newEvent.title, startTime, endTime } });
      return;
    }

    await saveEventToDb(startTime, endTime);
  };

  const handleDeleteEvent = async (eventId: string) => {
    await supabase.from("calendar_events").delete().eq("id", eventId);
    setSelectedEvent(null);
    loadData();
  };

  const dayEvents = getEventsForDate(selectedDate);

  return (
    <div style={{ maxWidth: "860px", margin: "0 auto", padding: "0 0 140px 0" }}>

      {/* Hero header */}
      <div style={{
        background: GRADIENT,
        margin: "20px 20px 20px",
        padding: "28px 28px 24px",
        borderRadius: "24px",
        position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: "-40px", right: "-40px", width: "180px", height: "180px", borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.06)" }} />
        <div style={{ position: "absolute", bottom: "-50px", right: "100px", width: "120px", height: "120px", borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.04)" }} />

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", position: "relative" }}>
          <div>
            <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.65)", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "6px" }}>
              Calendar
            </p>
            <h1 style={{ fontFamily: '"Cal Sans", Inter, sans-serif', fontSize: "32px", fontWeight: 600, color: "#fff", lineHeight: 1.1, marginBottom: "4px" }}>
              {format(selectedDate, "MMMM yyyy")}
            </h1>
            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.7)" }}>
              {format(selectedDate, "EEEE, d MMMM")}
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {/* View toggle */}
            <div style={{
              display: "flex",
              backgroundColor: "rgba(255,255,255,0.15)",
              borderRadius: "10px",
              padding: "3px",
            }}>
              {(["day", "week"] as const).map(v => (
                <button key={v} onClick={() => setView(v)} style={{
                  padding: "5px 14px", borderRadius: "8px", border: "none",
                  cursor: "pointer", fontSize: "12px", fontWeight: 500,
                  backgroundColor: view === v ? "#fff" : "transparent",
                  color: view === v ? "#2C5F8A" : "rgba(255,255,255,0.8)",
                  transition: "all 0.15s",
                  textTransform: "capitalize",
                }}>
                  {v}
                </button>
              ))}
            </div>

            {/* Add event */}
            <button
              onClick={() => { setAddingAt(null); setShowAddModal(true); }}
              style={{
                width: "36px", height: "36px", borderRadius: "10px",
                backgroundColor: "rgba(255,255,255,0.2)",
                border: "1px solid rgba(255,255,255,0.3)",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <Plus size={18} color="#fff" />
            </button>
          </div>
        </div>
      </div>

      <div style={{ padding: "0 20px", display: "flex", flexDirection: "column", gap: "14px" }}>

        {/* Week strip */}
        <GradientCard>
          <div style={{ padding: "4px 4px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <button
                onClick={() => { setWeekStart(subWeeks(weekStart, 1)); setSelectedDate(subWeeks(selectedDate, 1)); }}
                style={{ background: "none", border: "none", cursor: "pointer", padding: "8px", color: "#9CA3AF", display: "flex" }}
              >
                <ChevronLeft size={16} />
              </button>

              <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "3px" }}>
                {weekDays.map((day) => {
                  const isSelected = isSameDay(day, selectedDate);
                  const isToday = isSameDay(day, new Date());
                  const dayEvents = getEventsForDate(day);
                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => setSelectedDate(day)}
                      style={{
                        display: "flex", flexDirection: "column", alignItems: "center",
                        padding: "8px 4px", borderRadius: "12px", border: "none",
                        cursor: "pointer",
                        background: isSelected ? GRADIENT : isToday ? GRADIENT_SOFT : "transparent",
                        transition: "all 0.15s",
                      }}
                    >
                      <span style={{ fontSize: "9px", fontWeight: 500, color: isSelected ? "rgba(255,255,255,0.8)" : "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        {format(day, "EEE")}
                      </span>
                      <span style={{
                        fontSize: "15px", fontWeight: 600, marginTop: "3px",
                        fontFamily: '"Cal Sans", Inter, sans-serif',
                        color: isSelected ? "#fff" : isToday ? "#2C5F8A" : "#111827",
                      }}>
                        {format(day, "d")}
                      </span>
                      {dayEvents.length > 0 && (
                        <div style={{ display: "flex", gap: "2px", marginTop: "4px" }}>
                          {dayEvents.slice(0, 3).map((e, i) => (
                            <div key={i} style={{ width: "4px", height: "4px", borderRadius: "50%", backgroundColor: isSelected ? "rgba(255,255,255,0.7)" : getEventColor(e) }} />
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => { setWeekStart(addWeeks(weekStart, 1)); setSelectedDate(addWeeks(selectedDate, 1)); }}
                style={{ background: "none", border: "none", cursor: "pointer", padding: "8px", color: "#9CA3AF", display: "flex" }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </GradientCard>

        {/* Day view */}
        {view === "day" && (
          <GradientCard>
            <CardHeader
              title={format(selectedDate, "EEEE, d MMMM")}
              right={
                <span style={{
                  fontSize: "10px", fontWeight: 600, color: "#fff",
                  backgroundColor: "rgba(255,255,255,0.2)",
                  border: "1px solid rgba(255,255,255,0.3)",
                  padding: "3px 10px", borderRadius: "99px",
                }}>
                  {dayEvents.length} events
                </span>
              }
            />
            <div style={{ position: "relative", overflowY: "auto", maxHeight: "520px" }}>
              {HOURS.map((hour) => {
                const isCurrentHour = new Date().getHours() === hour && isSameDay(selectedDate, new Date());
                return (
                  <div
                    key={hour}
                    onClick={() => handleTimeSlotClick(selectedDate, hour)}
                    style={{
                      display: "flex", gap: "12px",
                      height: "64px", borderBottom: "1px solid #F3F4F6",
                      cursor: "pointer", position: "relative",
                      backgroundColor: isCurrentHour ? "#2C5F8A04" : "transparent",
                      transition: "background-color 0.15s",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#F9FAFB")}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = isCurrentHour ? "#2C5F8A04" : "transparent")}
                  >
                    <div style={{ width: "52px", padding: "8px 0 0 14px", flexShrink: 0 }}>
                      <span style={{
                        fontSize: "10px", fontWeight: 600,
                        color: isCurrentHour ? "#2C5F8A" : "#9CA3AF",
                      }}>
                        {hour === 12 ? "12pm" : hour < 12 ? `${hour}am` : `${hour - 12}pm`}
                      </span>
                    </div>
                    <div style={{ flex: 1, position: "relative" }}>
                      {isCurrentHour && (
                        <div style={{ position: "absolute", top: `${(new Date().getMinutes() / 60) * 64}px`, left: 0, right: 8, height: "2px", background: GRADIENT, zIndex: 2, borderRadius: "1px" }}>
                          <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: GRADIENT, marginTop: "-3px", marginLeft: "-4px" }} />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Events overlay with overlap detection */}
              <div style={{ position: "absolute", top: 0, left: "64px", right: "8px" }}>
                {(() => {
                  const sorted = [...dayEvents].sort((a, b) =>
                    new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
                  );

                  // Group overlapping events into columns
                  const columns: CalendarEvent[][] = [];
                  sorted.forEach(event => {
                    const eStart = new Date(event.start_time).getTime();
                    let placed = false;
                    for (const col of columns) {
                      const lastInCol = col[col.length - 1];
                      const lastEnd = new Date(lastInCol.end_time).getTime();
                      if (eStart >= lastEnd) {
                        col.push(event);
                        placed = true;
                        break;
                      }
                    }
                    if (!placed) columns.push([event]);
                  });

                  // Build layout map: event -> { colIndex, totalCols }
                  const eventLayout = new Map<string, { colIndex: number; totalCols: number }>();
                  sorted.forEach(event => {
                    const eStart = new Date(event.start_time).getTime();
                    const eEnd = new Date(event.end_time).getTime();
                    const overlappingCols = columns.filter(col =>
                      col.some(e => {
                        const s = new Date(e.start_time).getTime();
                        const en = new Date(e.end_time).getTime();
                        return eStart < en && eEnd > s;
                      })
                    );
                    const colIndex = columns.findIndex(col => col.includes(event));
                    eventLayout.set(event.id, { colIndex, totalCols: overlappingCols.length });
                  });

                  return sorted.map((event) => {
                    const color = getEventColor(event);
                    const isExternal = event.source === "google" || event.source === "outlook";
                    const layout = eventLayout.get(event.id) || { colIndex: 0, totalCols: 1 };
                    const colWidth = 100 / layout.totalCols;
                    const leftPct = layout.colIndex * colWidth;

                    return (
                      <div
                        key={event.id}
                        onClick={e => { e.stopPropagation(); setSelectedEvent(event); }}
                        style={{
                          position: "absolute",
                          top: `${getEventTop(event)}px`,
                          height: `${getEventHeight(event)}px`,
                          left: `${leftPct}%`,
                          width: `${colWidth - 1}%`,
                          background: isExternal
                            ? `repeating-linear-gradient(45deg, ${color}12, ${color}12 4px, ${color}06 4px, ${color}06 8px)`
                            : `linear-gradient(135deg, ${color}22, ${color}12)`,
                          border: `1.5px solid ${color}${isExternal ? "60" : "40"}`,
                          borderLeft: `3px solid ${color}`,
                          borderRadius: "8px",
                          padding: "4px 8px",
                          cursor: "pointer",
                          overflow: "hidden",
                          zIndex: 3,
                          transition: "all 0.15s",
                          boxSizing: "border-box",
                        }}
                      >
                        <p style={{ fontSize: "11px", fontWeight: 600, color, lineHeight: 1.2, margin: 0 }}>
                          {event.title}
                          {isExternal && <span style={{ fontSize: "9px", opacity: 0.7, marginLeft: "4px" }}>({event.source})</span>}
                        </p>
                        {getEventHeight(event) > 36 && (
                          <p style={{ fontSize: "10px", color: `${color}99`, marginTop: "2px" }}>
                            {format(parseISO(event.start_time), "h:mm")} - {format(parseISO(event.end_time), "h:mma")}
                          </p>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </GradientCard>
        )}

        {/* Week view */}
        {view === "week" && (
          <GradientCard>
            <CardHeader title={`${format(weekStart, "d MMM")} - ${format(addDays(weekStart, 6), "d MMM yyyy")}`} />
            <div style={{ overflowX: "auto" }}>
              <div style={{ display: "grid", gridTemplateColumns: "52px repeat(7, 1fr)", minWidth: "600px" }}>
                {/* Header row */}
                <div style={{ borderBottom: "1px solid #F3F4F6" }} />
                {weekDays.map((day) => {
                  const isToday = isSameDay(day, new Date());
                  const isSelected = isSameDay(day, selectedDate);
                  return (
                    <div
                      key={day.toISOString()}
                      onClick={() => { setSelectedDate(day); setView("day"); }}
                      style={{
                        padding: "10px 4px", textAlign: "center",
                        borderBottom: "1px solid #F3F4F6",
                        borderLeft: "1px solid #F3F4F6",
                        cursor: "pointer",
                        backgroundColor: isSelected ? GRADIENT_SOFT : "transparent",
                      }}
                    >
                      <p style={{ fontSize: "9px", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        {format(day, "EEE")}
                      </p>
                      <p style={{
                        fontSize: "14px", fontWeight: 600,
                        fontFamily: '"Cal Sans", Inter, sans-serif',
                        color: isToday ? "#2C5F8A" : "#111827",
                        marginTop: "2px",
                      }}>
                        {format(day, "d")}
                      </p>
                    </div>
                  );
                })}

                {/* Hour rows */}
                {HOURS.map((hour) => (
                  <>
                    <div key={`hour-${hour}`} style={{ padding: "4px 8px 0", borderBottom: "1px solid #F3F4F6", height: "48px" }}>
                      <span style={{ fontSize: "9px", fontWeight: 600, color: "#9CA3AF" }}>
                        {hour === 12 ? "12pm" : hour < 12 ? `${hour}am` : `${hour - 12}pm`}
                      </span>
                    </div>
                    {weekDays.map((day) => {
                      const slotEvents = getEventsForDate(day).filter(e => parseISO(e.start_time).getHours() === hour);
                      const isToday = isSameDay(day, new Date());
                      const isCurrentHour = isToday && new Date().getHours() === hour;
                      return (
                        <div
                          key={`${day.toISOString()}-${hour}`}
                          onClick={() => handleTimeSlotClick(day, hour)}
                          style={{
                            borderBottom: "1px solid #F3F4F6",
                            borderLeft: "1px solid #F3F4F6",
                            height: "48px", padding: "2px",
                            cursor: "pointer",
                            backgroundColor: isCurrentHour ? "#2C5F8A06" : "transparent",
                            transition: "background-color 0.15s",
                            position: "relative",
                            overflow: "hidden",
                          }}
                          onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#F9FAFB")}
                          onMouseLeave={e => (e.currentTarget.style.backgroundColor = isCurrentHour ? "#2C5F8A06" : "transparent")}
                        >
                          {slotEvents.map((event) => {
                            const color = getEventColor(event);
                            return (
                              <div
                                key={event.id}
                                onClick={e => { e.stopPropagation(); setSelectedEvent(event); }}
                                style={{
                                  background: `linear-gradient(135deg, ${color}25, ${color}15)`,
                                  border: `1px solid ${color}40`,
                                  borderLeft: `2px solid ${color}`,
                                  borderRadius: "5px",
                                  padding: "2px 5px",
                                  fontSize: "9px", fontWeight: 600, color,
                                  overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis",
                                  cursor: "pointer",
                                  marginBottom: "1px",
                                }}>
                                {event.title}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </>
                ))}
              </div>
            </div>
          </GradientCard>
        )}

        {/* Sync integrations */}
        <GradientCard>
          <CardHeader title="Calendar Integrations" />
          <div style={{ padding: "16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            {[
              { name: "Google Calendar", color: "#4285F4", status: "Not connected", icon: "G" },
              { name: "Outlook", color: "#0078D4", status: "Not connected", icon: "O" },
            ].map((integration) => (
              <button
                key={integration.name}
                style={{
                  display: "flex", alignItems: "center", gap: "12px",
                  padding: "12px 14px",
                  backgroundColor: "#FAFAF8",
                  border: "1px solid #E5E7EB",
                  borderRadius: "12px",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.15s",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = integration.color;
                  (e.currentTarget as HTMLElement).style.backgroundColor = `${integration.color}08`;
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = "#E5E7EB";
                  (e.currentTarget as HTMLElement).style.backgroundColor = "#FAFAF8";
                }}
              >
                <div style={{
                  width: "34px", height: "34px", borderRadius: "10px",
                  backgroundColor: `${integration.color}18`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  <span style={{ fontSize: "14px", fontWeight: 700, color: integration.color }}>
                    {integration.icon}
                  </span>
                </div>
                <div>
                  <p style={{ fontSize: "12px", fontWeight: 600, color: "#111827" }}>{integration.name}</p>
                  <p style={{ fontSize: "10px", color: "#9CA3AF", marginTop: "2px" }}>{integration.status}</p>
                </div>
              </button>
            ))}
          </div>
          <div style={{ padding: "0 16px 14px" }}>
            <p style={{ fontSize: "11px", color: "#9CA3AF", textAlign: "center" }}>
              Calendar sync coming soon. Events you add here are saved to Kosmos.
            </p>
          </div>
        </GradientCard>
      </div>

      {/* Add Event Modal */}
      {showAddModal && (
        <div
          style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.3)", backdropFilter: "blur(4px)", zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center" }}
          onClick={() => setShowAddModal(false)}
        >
          <div
            style={{
              width: "100%", maxWidth: "560px",
              background: GRADIENT, borderRadius: "24px 24px 0 0",
              padding: "1.5px 1.5px 0 1.5px",
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ backgroundColor: "#fff", borderRadius: "22.5px 22.5px 0 0", padding: "24px 24px 32px" }}>

              {/* Modal header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
                <h2 style={{ fontFamily: '"Cal Sans", Inter, sans-serif', fontSize: "20px", color: "#111827" }}>
                  Add Event
                </h2>
                <button onClick={() => setShowAddModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9CA3AF" }}>
                  <X size={20} />
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

                {/* Title */}
                <input
                  placeholder="Event title"
                  value={newEvent.title}
                  onChange={e => setNewEvent(prev => ({ ...prev, title: e.target.value }))}
                  style={{
                    width: "100%", padding: "12px 14px",
                    backgroundColor: "#F3F4F6", border: "none", borderRadius: "12px",
                    fontSize: "14px", color: "#111827", outline: "none",
                    fontFamily: "Inter, sans-serif",
                    boxSizing: "border-box",
                  }}
                />

                {/* Date + Times */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                  <div>
                    <p style={{ fontSize: "10px", fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>Date</p>
                    <input
                      type="date"
                      value={newEvent.date}
                      onChange={e => setNewEvent(prev => ({ ...prev, date: e.target.value }))}
                      style={{
                        width: "100%", padding: "10px 12px",
                        backgroundColor: "#F3F4F6", border: "none", borderRadius: "10px",
                        fontSize: "12px", color: "#111827", outline: "none",
                        fontFamily: "Inter, sans-serif", boxSizing: "border-box",
                      }}
                    />
                  </div>
                  <div>
                    <p style={{ fontSize: "10px", fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>Start</p>
                    <div style={{ display: "flex", gap: "4px" }}>
                      <select
                        value={newEvent.start_hour}
                        onChange={e => setNewEvent(prev => ({ ...prev, start_hour: e.target.value }))}
                        style={{ flex: 1, padding: "10px 6px", backgroundColor: "#F3F4F6", border: "none", borderRadius: "10px", fontSize: "12px", color: "#111827", outline: "none" }}
                      >
                        {Array.from({ length: 24 }, (_, i) => (
                          <option key={i} value={i}>{i === 0 ? "12am" : i < 12 ? `${i}am` : i === 12 ? "12pm" : `${i - 12}pm`}</option>
                        ))}
                      </select>
                      <select
                        value={newEvent.start_minute}
                        onChange={e => setNewEvent(prev => ({ ...prev, start_minute: e.target.value }))}
                        style={{ width: "52px", padding: "10px 4px", backgroundColor: "#F3F4F6", border: "none", borderRadius: "10px", fontSize: "12px", color: "#111827", outline: "none" }}
                      >
                        {["00", "15", "30", "45"].map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <p style={{ fontSize: "10px", fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>End</p>
                    <div style={{ display: "flex", gap: "4px" }}>
                      <select
                        value={newEvent.end_hour}
                        onChange={e => setNewEvent(prev => ({ ...prev, end_hour: e.target.value }))}
                        style={{ flex: 1, padding: "10px 6px", backgroundColor: "#F3F4F6", border: "none", borderRadius: "10px", fontSize: "12px", color: "#111827", outline: "none" }}
                      >
                        {Array.from({ length: 24 }, (_, i) => (
                          <option key={i} value={i}>{i === 0 ? "12am" : i < 12 ? `${i}am` : i === 12 ? "12pm" : `${i - 12}pm`}</option>
                        ))}
                      </select>
                      <select
                        value={newEvent.end_minute}
                        onChange={e => setNewEvent(prev => ({ ...prev, end_minute: e.target.value }))}
                        style={{ width: "52px", padding: "10px 4px", backgroundColor: "#F3F4F6", border: "none", borderRadius: "10px", fontSize: "12px", color: "#111827", outline: "none" }}
                      >
                        {["00", "15", "30", "45"].map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Event type */}
                <div>
                  <p style={{ fontSize: "10px", fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>Type</p>
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    {EVENT_TYPES.map(type => (
                      <button
                        key={type.value}
                        onClick={() => setNewEvent(prev => ({ ...prev, event_type: type.value }))}
                        style={{
                          padding: "6px 14px", borderRadius: "99px",
                          border: `1.5px solid ${newEvent.event_type === type.value ? type.color : "#E5E7EB"}`,
                          background: newEvent.event_type === type.value ? `${type.color}15` : "transparent",
                          color: newEvent.event_type === type.value ? type.color : "#9CA3AF",
                          fontSize: "11px", fontWeight: newEvent.event_type === type.value ? 600 : 400,
                          cursor: "pointer", transition: "all 0.15s",
                        }}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Life area */}
                <div>
                  <p style={{ fontSize: "10px", fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>Life Area</p>
                  <select
                    value={newEvent.life_area_id}
                    onChange={e => setNewEvent(prev => ({ ...prev, life_area_id: e.target.value }))}
                    style={{
                      width: "100%", padding: "10px 14px",
                      backgroundColor: "#F3F4F6", border: "none", borderRadius: "10px",
                      fontSize: "13px", color: "#111827", outline: "none",
                      fontFamily: "Inter, sans-serif",
                    }}
                  >
                    <option value="">No area</option>
                    {areas.map(area => (
                      <option key={area.id} value={area.id}>{area.name}</option>
                    ))}
                  </select>
                </div>

                {/* Description */}
                <textarea
                  placeholder="Notes (optional)"
                  value={newEvent.description}
                  onChange={e => setNewEvent(prev => ({ ...prev, description: e.target.value }))}
                  rows={2}
                  style={{
                    width: "100%", padding: "12px 14px",
                    backgroundColor: "#F3F4F6", border: "none", borderRadius: "12px",
                    fontSize: "13px", color: "#111827", outline: "none",
                    fontFamily: "Inter, sans-serif", resize: "none",
                    boxSizing: "border-box",
                  }}
                />

                {/* Conflict warning */}
                {conflictWarning.show && conflictWarning.conflicts.length > 0 && (
                  <div style={{
                    backgroundColor: "#FEF2F2",
                    border: "1px solid #FECACA",
                    borderRadius: "12px",
                    padding: "12px 14px",
                  }}>
                    <p style={{ fontSize: "12px", fontWeight: 600, color: "#DC2626", marginBottom: "8px" }}>
                      Conflict detected
                    </p>
                    {conflictWarning.conflicts.map(c => (
                      <p key={c.id} style={{ fontSize: "11px", color: "#374151", marginBottom: "4px" }}>
                        Overlaps with: {c.title} ({format(parseISO(c.start_time), "h:mm")} - {format(parseISO(c.end_time), "h:mma")})
                      </p>
                    ))}
                    <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                      <button
                        onClick={() => setConflictWarning({ show: false, conflicts: [], pendingEvent: null })}
                        style={{
                          flex: 1, padding: "8px", borderRadius: "8px",
                          backgroundColor: "#fff", border: "1px solid #E5E7EB",
                          fontSize: "12px", color: "#6B7280", cursor: "pointer",
                        }}
                      >
                        Go back and edit
                      </button>
                      <button
                        onClick={() => {
                          if (conflictWarning.pendingEvent) {
                            saveEventToDb(conflictWarning.pendingEvent.startTime, conflictWarning.pendingEvent.endTime);
                          }
                        }}
                        style={{
                          flex: 1, padding: "8px", borderRadius: "8px",
                          background: GRADIENT, border: "none",
                          fontSize: "12px", color: "#fff", cursor: "pointer", fontWeight: 600,
                        }}
                      >
                        Add anyway
                      </button>
                    </div>
                  </div>
                )}

                {/* Save */}
                <button
                  onClick={handleSaveEvent}
                  disabled={!newEvent.title.trim()}
                  style={{
                    width: "100%", padding: "14px",
                    background: newEvent.title.trim() ? GRADIENT : "#F3F4F6",
                    border: "none", borderRadius: "12px",
                    color: newEvent.title.trim() ? "#fff" : "#9CA3AF",
                    fontSize: "14px", fontWeight: 600,
                    fontFamily: '"Cal Sans", Inter, sans-serif',
                    cursor: newEvent.title.trim() ? "pointer" : "default",
                    transition: "all 0.15s",
                    boxShadow: newEvent.title.trim() ? "0 2px 10px rgba(44,95,138,0.3)" : "none",
                  }}
                >
                  Save Event
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Event detail modal */}
      {selectedEvent && (
        <div
          style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.3)", backdropFilter: "blur(4px)", zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center" }}
          onClick={() => setSelectedEvent(null)}
        >
          <div
            style={{ width: "100%", maxWidth: "560px", background: GRADIENT, borderRadius: "24px 24px 0 0", padding: "1.5px 1.5px 0 1.5px" }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ backgroundColor: "#fff", borderRadius: "22.5px 22.5px 0 0", padding: "24px 24px 32px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{
                    width: "40px", height: "40px", borderRadius: "12px",
                    background: `linear-gradient(135deg, ${getEventColor(selectedEvent)}25, ${getEventColor(selectedEvent)}15)`,
                    border: `1.5px solid ${getEventColor(selectedEvent)}40`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <div style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: getEventColor(selectedEvent) }} />
                  </div>
                  <div>
                    <h2 style={{ fontFamily: '"Cal Sans", Inter, sans-serif', fontSize: "18px", color: "#111827" }}>
                      {selectedEvent.title}
                    </h2>
                    {selectedEvent.life_areas?.name && (
                      <p style={{ fontSize: "11px", color: selectedEvent.life_areas.color, fontWeight: 500, marginTop: "2px" }}>
                        {selectedEvent.life_areas.name}
                      </p>
                    )}
                  </div>
                </div>
                <button onClick={() => setSelectedEvent(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9CA3AF" }}>
                  <X size={20} />
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", backgroundColor: "#FAFAF8", borderRadius: "10px" }}>
                  <Clock size={14} color="#9CA3AF" />
                  <span style={{ fontSize: "13px", color: "#374151" }}>
                    {format(parseISO(selectedEvent.start_time), "h:mm a")} - {format(parseISO(selectedEvent.end_time), "h:mm a")}
                  </span>
                </div>
                {selectedEvent.description && (
                  <div style={{ padding: "10px 14px", backgroundColor: "#FAFAF8", borderRadius: "10px" }}>
                    <p style={{ fontSize: "13px", color: "#374151", lineHeight: 1.5 }}>{selectedEvent.description}</p>
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", backgroundColor: "#FAFAF8", borderRadius: "10px" }}>
                  <Calendar size={14} color="#9CA3AF" />
                  <span style={{ fontSize: "13px", color: "#374151", textTransform: "capitalize" }}>
                    {EVENT_TYPES.find(t => t.value === selectedEvent.event_type)?.label || selectedEvent.event_type}
                  </span>
                </div>
              </div>

              <button
                onClick={() => handleDeleteEvent(selectedEvent.id)}
                style={{
                  width: "100%", padding: "12px",
                  backgroundColor: "#FEF2F2", border: "1px solid #FECACA",
                  borderRadius: "12px", color: "#DC2626",
                  fontSize: "13px", fontWeight: 600, cursor: "pointer",
                  fontFamily: "Inter, sans-serif",
                  transition: "all 0.15s",
                }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#FEE2E2")}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = "#FEF2F2")}
              >
                Delete Event
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}