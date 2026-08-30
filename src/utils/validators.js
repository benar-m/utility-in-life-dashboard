/**
  Client-side validation only. This gives immediate feedback in the UI,
  but it is NOT a security boundary  a real backend must re-validate
  (and re-hash, re-check) everything here independently. Never trust
  client-side validation as the only line of defense.
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MIN_PASSWORD_LENGTH = 8;

export function isValidEmail(email) {
  return EMAIL_PATTERN.test(email.trim());
}

export function isValidPassword(password) {
  return password.length >= MIN_PASSWORD_LENGTH;
}
