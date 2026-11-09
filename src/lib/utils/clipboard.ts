/**
 * Copies a given text string to the system clipboard.
 * Returns true if successful, false otherwise.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
	if (typeof window === "undefined" || !navigator?.clipboard?.writeText) {
		return false;
	}
	try {
		await navigator.clipboard.writeText(text);
		return true;
	} catch {
		return false;
	}
}

/**
 * Shares or copies a room invite link with automatic fallback to clipboard.
 * Returns:
 * - "shared": natively shared via Web Share API
 * - "copied": copied invite link to clipboard
 * - "failed": unable to share or copy
 */
export async function shareRoomInvite(
	pin: string,
): Promise<"shared" | "copied" | "failed"> {
	if (typeof window === "undefined") {
		return "failed";
	}

	const url = `${window.location.origin}?pin=${encodeURIComponent(pin)}`;

	if (navigator.share) {
		try {
			await navigator.share({
				title: "Join Cards Against Humanity!",
				text: `Join our Cards Against Humanity game! Room PIN: ${pin}`,
				url,
			});
			return "shared";
		} catch {
			// User dismissed share sheet or platform error -> fall back to clipboard
		}
	}

	const copied = await copyToClipboard(url);
	return copied ? "copied" : "failed";
}
