import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function cleanGoogleTranslationLabels(text: string | null | undefined): string {
  if (!text) return "";

  // Google concatenates: "(Translated by Google) <translated> (Original) <original>"
  // or in Spanish: "(Traducido por Google) <translated> (Original) <original>"
  // We want ONLY the original text.

  // Try to extract the text after "(Original)" marker — that's the real review
  const originalMarkerMatch = text.match(/\(Original\)\s*([\s\S]+)$/i);
  if (originalMarkerMatch) {
    return originalMarkerMatch[1].trim();
  }

  // If no "(Original)" marker is found, just clean up any leftover labels
  return text
    .replace(/\(Translated by Google\)\s*/gi, "")
    .replace(/\(Traducido por Google\)\s*/gi, "")
    .replace(/\(Traduït per Google\)\s*/gi, "")
    .replace(/\(Original\)\s*/gi, "")
    .trim();
}
