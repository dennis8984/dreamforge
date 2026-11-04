// Characters must be 21 or older (see the Underage Policy in lib/policies.ts).

export function ageNumber(age?: string | null): number | null {
  if (!age) return null;
  const n = parseInt(age, 10);
  return Number.isNaN(n) ? null : n;
}

// A missing or non-numeric age passes, because many older rows have no age set.
export function isAtLeast21(character: { age?: string | null }): boolean {
  const n = ageNumber(character.age);
  return n === null || n >= 21;
}
