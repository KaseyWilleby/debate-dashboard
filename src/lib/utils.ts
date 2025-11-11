
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { UserRole } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getRoleBasedColor(role: UserRole) {
  switch (role) {
    case 'admin':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300';
    case 'varsity':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300';
    case 'novice':
      return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

export function formatTime(seconds: number) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.max(0, Math.floor(seconds % 60));
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};
