package middleware

import "net/http"

// CORS wraps an http.Handler with permissive CORS headers for dashboard access.
func CORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers",
			"Accept, Authorization, Content-Type, Anthropic-Version, Anthropic-Beta, "+
				"X-Api-Key, X-ModelTrack-App, X-ModelTrack-Team, X-ModelTrack-Feature, X-ModelTrack-Customer-Tier")
		w.Header().Set("Access-Control-Max-Age", "86400")

		// Handle preflight.
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}
