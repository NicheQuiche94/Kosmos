export interface Profile {
    id: string;
    name: string;
    avatar_color_from: string;
    avatar_color_to: string;
    pin?: string;
    created_at: string;
  }
  
  export interface LifeArea {
    id: string;
    profile_id: string;
    name: string;
    icon: string;
    color: string;
    order_index: number;
  }
  
  export interface Goal {
    id: string;
    profile_id: string;
    life_area_id: string;
    title: string;
    description?: string;
    target_date?: string;
    status: "active" | "completed" | "paused";
    created_at: string;
  }
  
  export interface Milestone {
    id: string;
    profile_id: string;
    goal_id: string;
    quarter: "Q1" | "Q2" | "Q3" | "Q4";
    title: string;
    description?: string;
    target_date?: string;
    status: "pending" | "in_progress" | "completed" | "missed";
  }
  
  export interface Habit {
    id: string;
    profile_id: string;
    life_area_id: string;
    title: string;
    description?: string;
    frequency: "daily" | "weekly" | "monthly";
    frequency_detail?: string;
    stack_with?: string;
    input_type: "boolean" | "number" | "text";
    unit?: string;
    active: boolean;
  }
  
  export interface HabitLog {
    id: string;
    profile_id: string;
    habit_id: string;
    logged_at: string;
    value?: string;
    note?: string;
    source: "manual" | "chat" | "notification";
  }
  
  export interface Action {
    id: string;
    profile_id: string;
    life_area_id: string;
    goal_id?: string;
    title: string;
    description?: string;
    due_date?: string;
    completed_at?: string;
    status: "pending" | "in_progress" | "completed" | "dismissed";
    priority: "high" | "medium" | "low";
    recurring: boolean;
  }
  
  export interface Metric {
    id: string;
    profile_id: string;
    life_area_id: string;
    name: string;
    unit?: string;
    target_value?: number;
    tracking_frequency: "daily" | "weekly" | "monthly";
    active: boolean;
  }
  
  export interface MetricLog {
    id: string;
    profile_id: string;
    metric_id: string;
    value: number;
    logged_at: string;
    note?: string;
    source: "manual" | "chat";
  }
  
  export interface Project {
    id: string;
    profile_id: string;
    name: string;
    entity?: string;
    status: "active" | "launched" | "exited" | "paused";
    current_mrr: number;
    target_mrr?: number;
    milestone_status?: string;
    color?: string;
    icon?: string;
  }
  
  export interface WorkoutLog {
    id: string;
    profile_id: string;
    workout_type: "Upper Body" | "Lower Body" | "Full Body" | "Cardio" | "Run" | "Kettlebell" | "Flexibility";
    duration_minutes: number;
    note?: string;
    logged_at: string;
  }

  export interface FoodLog {
    id: string;
    profile_id: string;
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    note?: string;
    logged_at: string;
  }

  export interface DailySummary {
    id: string;
    profile_id: string;
    date: string;
    habits_completed: number;
    habits_total: number;
    actions_completed: number;
    rule_of_100_count: number;
    mood_rating?: number;
    energy_rating?: number;
    notes?: string;
  }