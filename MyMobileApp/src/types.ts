// src/types.ts
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

// This is the "single source of truth" for all routes and their parameters.
export type RootTabParamList = {
  Mon: { day: string };
  Tue: { day: string };
  Wed: { day: string };
  Thu: { day: string };
  Fri: { day: string };
  Sat: { day: string };
  Sun: { day: string };
};

// This defines the Prop types for *any* screen in our Bottom Tab navigator.
// We'll use this in DayScreen.tsx
export type DayScreenProps = BottomTabScreenProps<RootTabParamList>;