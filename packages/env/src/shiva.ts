/**
 * Gets the API URL for Hono backend requests
 * @returns the Hono backend URL for the current environment
 */
export function getApiUrl(): string {

	// Production environment
	if (process.env.NODE_ENV === "production") {
		return "https://bu-shiva-production.tomas-cordero-esp.workers.dev";
	}

	// Staging environment (check EXPO_PUBLIC_ENVIRONMENT for Expo apps)
	if (process.env.NODE_ENV === "staging") {
		return "https://bu-shiva-staging.tomas-cordero-esp.workers.dev";
	}

	// Fallback to localhost for development
	return "http://localhost:8787";
}