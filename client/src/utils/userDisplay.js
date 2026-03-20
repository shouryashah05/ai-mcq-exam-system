export function getDisplayName(user, fallback = 'Unknown User') {
  if (!user) return fallback;

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  return fullName || user.name || fallback;
}

export function getDisplayNameSlug(user, fallback = 'user') {
  return getDisplayName(user, fallback).toLowerCase().replace(/\s+/g, '-');
}