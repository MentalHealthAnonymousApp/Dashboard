/** Extracts a human-readable message from an RTK Query / fetch error. */
export function getApiErrorMessage(error: unknown, fallback = 'The request failed. Please try again.'): string {
  if (typeof error === 'object' && error !== null && 'data' in error) {
    const data = (error as { data?: { message?: unknown; error?: unknown } }).data;
    if (typeof data?.message === 'string') return data.message;
    if (typeof data?.error === 'string') return data.error;
  }
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string') return message;
  }
  return fallback;
}
