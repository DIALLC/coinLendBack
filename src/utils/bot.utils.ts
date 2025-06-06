export const EVEN = (n: number) => (n % 2 === 0 ? n : n + 1);

export function evenRandom(min: number, max: number): number {
  const raw = Math.floor(min + Math.random() * (max - min + 1));
  return EVEN(raw);
}

export function shiftBy(
  base: number,
  minPercent = 0.05,
  maxPercent = 0.2,
): number {
  const sign = Math.random() < 0.5 ? -1 : 1;
  const k = 1 + sign * (minPercent + Math.random() * (maxPercent - minPercent));
  return EVEN(Math.round(base * k));
}
