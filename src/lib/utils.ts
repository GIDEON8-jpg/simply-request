import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Force-download a file without redirecting the user
export async function forceDownload(url: string, fileName?: string) {
  try {
    const res = await fetch(url, { credentials: 'include' });
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = fileName || 'document';
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(blobUrl);
    a.remove();
  } catch (_e) {
    // Fallback: try to hint download via URL param and open in new tab
    const a = document.createElement('a');
    const hint = (url.includes('?') ? '&' : '?') + 'download=' + encodeURIComponent(fileName || 'document');
    a.href = url + hint;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
}
