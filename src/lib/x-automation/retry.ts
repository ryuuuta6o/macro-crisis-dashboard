export async function withExponentialBackoff<T>(
  operation: () => Promise<T>,
  options: { attempts?: number; initialDelayMs?: number; shouldRetry?: (error: unknown) => boolean } = {},
) {
  const attempts = options.attempts ?? 3;
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt === attempts - 1 || (options.shouldRetry && !options.shouldRetry(error))) throw error;
      await new Promise((resolve) => setTimeout(resolve, (options.initialDelayMs ?? 400) * 2 ** attempt));
    }
  }
  throw lastError;
}

