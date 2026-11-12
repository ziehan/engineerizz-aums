const key = (userId: string, name: string) => `aums:${userId}:${name}`;

function read<T>(storageKey: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(storageKey: string, value: unknown) {
  localStorage.setItem(storageKey, JSON.stringify(value));
}

/* Tugas yang diambil petugas */

export function getClaimedIds(userId: string): string[] {
  return read<string[]>(key(userId, "claimed"), []);
}

export function claimReport(userId: string, reportId: string): string[] {
  const next = Array.from(new Set([...getClaimedIds(userId), reportId]));
  write(key(userId, "claimed"), next);
  return next;
}

/* Draf form planning & verifikasi */

export interface PlanDraft {
  agency: string;
  days: string;
  detail: string;
}

export interface VerifyDraft {
  notes: string;
}

export type DraftKind = "plan" | "verify";

export function getDraft<T>(userId: string, reportId: string, kind: DraftKind): T | null {
  return read<T | null>(key(userId, `draft:${kind}:${reportId}`), null);
}

export function saveDraft(userId: string, reportId: string, kind: DraftKind, value: unknown) {
  write(key(userId, `draft:${kind}:${reportId}`), value);
}

export function clearDraft(userId: string, reportId: string, kind: DraftKind) {
  localStorage.removeItem(key(userId, `draft:${kind}:${reportId}`));
}

/** ID laporan yang memiliki draf (plan maupun verify). */
export function getDraftReportIds(userId: string): string[] {
  const prefix = `aums:${userId}:draft:`;
  const ids = new Set<string>();
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith(prefix)) ids.add(k.split(":").pop() as string);
  }
  return Array.from(ids);
}
