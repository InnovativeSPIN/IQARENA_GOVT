import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Default marks per question constant used across the client UI
export const DEFAULT_QUESTION_MARKS = 4;


/**
 * Build a public URL for uploaded images.
 * Accepts absolute URLs, leading-slash URLs, or bare filenames and returns
 * a fully qualified URL using VITE_IMG_API_URL or VITE_API_URL if set.
 */
export function getUploadUrl(img?: string | null) {
  if (!img) return '';
  const asStr = String(img);
  // If it's already an absolute URL (http/https) or a blob/data URI created from File, return as-is
  if (asStr.startsWith('http://') || asStr.startsWith('https://') || asStr.startsWith('blob:') || asStr.startsWith('data:')) return asStr;
  const baseCandidate = import.meta.env.VITE_IMG_API_URL || import.meta.env.VITE_API_URL || '';
  const base = String(baseCandidate).replace(/\/api\/?$/, '').replace(/\/$/, '');
  if (asStr.startsWith('/')) {
    // base + '/uploads/...' or '/something'
    return (base || '') + asStr;
  }
  return (base || '') + '/uploads/' + asStr;
}
