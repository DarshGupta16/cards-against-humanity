/**
 * Player session and localStorage persistence for Cards Against Humanity.
 */

const PLAYER_ID_KEY = "cah_player_id";
const NICKNAME_KEY = "cah_nickname";

export function getPlayerId(): string {
	if (typeof window === "undefined") return "";
	let pid = localStorage.getItem(PLAYER_ID_KEY);
	if (!pid) {
		pid = `p_${Math.random().toString(36).substring(2, 10)}`;
		localStorage.setItem(PLAYER_ID_KEY, pid);
	}
	return pid;
}

export function getNickname(): string {
	if (typeof window === "undefined") return "";
	return localStorage.getItem(NICKNAME_KEY) || "";
}

export function saveNickname(name: string): string {
	const trimmed = name.trim().slice(0, 24);
	if (typeof window !== "undefined") {
		localStorage.setItem(NICKNAME_KEY, trimmed);
	}
	return trimmed;
}

export function initPlayerSession(): { playerId: string; nickname: string } {
	return {
		playerId: getPlayerId(),
		nickname: getNickname(),
	};
}
