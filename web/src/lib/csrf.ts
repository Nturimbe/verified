export function getCsrfToken(): string | undefined {
  return document.cookie
    .split('; ')
    .find(row => row.startsWith('admin_csrf='))
    ?.split('=')[1];
}