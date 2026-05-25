/** Resolve question image URL: absolute https/http as-is, else prefix VITE_QUESTION_BASE_URL. */
export function resolveQuestionImageUrl(imageUrl: string | null | undefined): string | null {
  const raw = (imageUrl ?? '').trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  const base = (import.meta.env.VITE_QUESTION_BASE_URL ?? '').trim();
  if (!base) return raw;
  const normalizedBase = base.replace(/\/$/, '');
  const path = raw.replace(/^\//, '');
  return `${normalizedBase}/${path}`;
}
