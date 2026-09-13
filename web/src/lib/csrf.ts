const CSRF_KEY = 'admin_csrf_token';

export function setCsrfToken(token: string) {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(CSRF_KEY, token);
  }
}

export function getCsrfToken(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  return sessionStorage.getItem(CSRF_KEY) || undefined;
}

export function clearCsrfToken() {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(CSRF_KEY);
  }
}