export interface UserProfile {
  name: string;
  age: number;
  gender: 'male' | 'female';
  height: number; // cm
  weight: number; // kg
  targetWeight: number; // kg
  targetMonths: number;
  goal: 'lose' | 'maintain' | 'fitness';
  bmi: number;
  bmiCategory: string;
  tdee: number;
  dailyCalorieTarget: number;
  dailyStepTarget: number;
}

export interface ActivitySession {
  id: string;
  type: 'walking' | 'running' | 'cycling';
  startTime: number;
  endTime: number;
  duration: number; // seconds
  distance: number; // km
  steps: number;
  calories: number;
  date: string; // YYYY-MM-DD
  segments: ActivitySegment[];
}

export interface ActivitySegment {
  type: 'walking' | 'running' | 'cycling';
  duration: number;
  distance: number;
  calories: number;
}

export interface DailyRecord {
  date: string;
  steps: number;
  distance: number;
  calories: number;
  activeMinutes: number;
  waterGlasses: number;
  waterTarget: number;
  goalReached: boolean;
  sessions: ActivitySession[];
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned: boolean;
  earnedDate?: string;
  condition: string;
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  avatar: string;
  steps: number;
  streak: number;
}

export interface Notification {
  id: string;
  message: string;
  time: string;
  type: 'reminder' | 'achievement' | 'hydration' | 'goal' | 'workout' | 'tip';
  read: boolean;
}

export interface WeeklyData {
  day: string;
  steps: number;
  calories: number;
  distance: number;
  minutes: number;
}

export type AppScreen = 
  | 'onboarding' 
  | 'home' 
  | 'tracking' 
  | 'analytics' 
  | 'hydration' 
  | 'badges' 
  | 'leaderboard' 
  | 'planner'
  | 'notifications'
  | 'profile'
  | 'challenges'
  | 'wall'
  | 'ai_coach'
  | 'settings';
