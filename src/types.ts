// BothLingo Core Type Definitions

export type ViewType = 'path' | 'lesson' | 'tutor' | 'settings';

export interface UserStats {
  xp: number;
  streak: number;
  lives: number;
  lastActiveDate: string | null;
}

export type ExerciseType = 'multiple-choice' | 'matching' | 'word-bank' | 'fill-blank';

export interface Exercise {
  id: string;
  type: ExerciseType;
  instruction: string;
  questionText: string;
  
  // For multiple choice & fill blank
  options?: string[];
  correctAnswer?: string; // or matching correct indices
  
  // For word bank translation
  englishPhrase?: string;
  wordBank?: string[];
  correctWordOrder?: string[]; // exact order of words
  
  // For matching pairs
  leftPairs?: string[];  // Spanish words (e.g. ["hola", "café", "panqueques"])
  rightPairs?: string[]; // English words (e.g. ["coffee", "hello", "pancakes"])
  matchingMap?: Record<string, string>; // Spanish key -> English value map
}

export interface Lesson {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  xpReward: number;
  icon: string;
  exercises: Exercise[];
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'tutor';
  text: string;
  translation?: string;
  correction?: string; // feedback if user made a grammar/spelling mistake
  timestamp: Date;
}
