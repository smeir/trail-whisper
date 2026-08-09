/**
 * Supabase resolves failures as plain `{ message, details, hint, code }` objects
 * rather than `Error` instances — `new PostgrestError` is only constructed on the
 * `.throwOnError()` path, which this app does not use. An `instanceof Error` test
 * therefore discards the actual reason (RLS violation, constraint, fetch failure)
 * and leaves the user with a generic string.
 */
export function errorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message || fallback

  if (typeof error === 'object' && error !== null && 'message' in error) {
    const { message } = error as { message?: unknown }
    if (typeof message === 'string' && message) return message
  }

  return fallback
}
