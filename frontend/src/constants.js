// Keep these two lists in sync with backend/src/routes/children.js -
// the backend validates against the same values, duplicated rather than
// shared since frontend and backend can't import from each other here.

export const AVATARS = [
  { key: 'sprout', emoji: '🌱' },
  { key: 'sunflower', emoji: '🌻' },
  { key: 'fern', emoji: '🌿' },
  { key: 'clover', emoji: '🍀' },
  { key: 'daisy', emoji: '🌼' },
  { key: 'cactus', emoji: '🌵' },
  { key: 'mushroom', emoji: '🍄' },
  { key: 'acorn', emoji: '🌰' }
];

export const FAVORITE_COLORS = [
  { key: 'sunshine', hex: '#F4A93B' },
  { key: 'sky', hex: '#6E8FB0' },
  { key: 'berry', hex: '#C1608A' },
  { key: 'grass', hex: '#5B9A5E' },
  { key: 'lavender', hex: '#8C7BB5' }
];

export function avatarEmoji(key) {
  return AVATARS.find((a) => a.key === key)?.emoji || '🌱';
}

export function colorHex(key) {
  return FAVORITE_COLORS.find((c) => c.key === key)?.hex || 'var(--color-bloom)';
}
