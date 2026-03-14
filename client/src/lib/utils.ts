import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function cleanGoogleTranslationLabels(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .replace(/\(Translated by Google\)\s*/gi, "")
    .replace(/\(Traducido por Google\)\s*/gi, "")
    .replace(/\(Traduït per Google\)\s*/gi, "")
    .replace(/\(Original\)\s*/gi, "")
    .trim();
}
