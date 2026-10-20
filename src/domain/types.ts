export type Level = "abrangente" | "específica" | "especialista";
export type Screen =
  | "home"
  | "auth"
  | "categories"
  | "matchmaking"
  | "ready"
  | "arena"
  | "round-result"
  | "final-result"
  | "profile"
  | "history"
  | "ranking";
export interface Player {
  id: string;
  name: string;
  avatar: string;
}
export interface Category {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  tag: string;
}
export interface Question {
  id: string;
  categoryId: string;
  level: Level;
  prompt: string;
  options: [string, string, string, string];
  correctIndex: number;
  source: string;
}
export interface Answer {
  questionId: string;
  selectedIndex: number | null;
  elapsedMs: number;
  points: number;
}
export interface Round {
  level: Level;
  questionIds: string[];
  answers: [Answer[], Answer[]];
  winner: 0 | 1 | null;
}
export interface Duel {
  id: string;
  categoryId: string;
  players: [Player, Player];
  rounds: Round[];
  wins: [number, number];
  winner: 0 | 1 | null;
  status: "active" | "complete";
}
export interface Result {
  id: string;
  date: string;
  category: string;
  opponent: string;
  wins: [number, number];
  winner: 0 | 1;
  points: number;
  correct: number;
  questions: number;
}
