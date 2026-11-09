import { ConvexClient } from "convex/browser";

let client: ConvexClient | null = null;

export function getConvexClient(): ConvexClient | null {
	if (typeof window === "undefined") return null;
	if (client) return client;

	const url = import.meta.env.PUBLIC_CONVEX_URL;
	if (!url || url.includes("your-deployment-name")) {
		return null;
	}

	try {
		client = new ConvexClient(url);
		return client;
	} catch (err) {
		console.warn("Failed to initialize ConvexClient:", err);
		return null;
	}
}
