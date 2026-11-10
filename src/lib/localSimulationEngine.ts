/**
 * Offline/Local Fallback Simulation Engine for Cards Against Humanity.
 * Handles local card deck loading, shuffling, bot simulation,
 * Czar rotation, scoring, BroadcastChannel syncing, and local state persistence.
 */

import cardsData from "./data/cards.json";

export interface Card {
	id: string;
	text: string;
	pick?: number;
}

export interface Player {
	_id?: string;
	playerId: string;
	nickname: string;
	avatarSeed: string;
	score: number;
	cardCount: number;
	isHost: boolean;
	isConnected: boolean;
	isCzar: boolean;
	hasSubmitted: boolean;
}

export interface Submission {
	_id: string;
	roundNumber: number;
	playerId: string;
	playerName: string;
	cards: Card[];
	isRevealed: boolean;
	isWinner: boolean;
	isSelf: boolean;
}

export interface Room {
	_id: string;
	pin: string;
	hostPlayerId: string;
	status: "lobby" | "submitting" | "judging" | "round_over" | "game_over";
	currentRound: number;
	targetScore: number;
	handSize: number;
	randoCardrissian: boolean;
	czarIndex: number;
	currentCzarId: string;
	blackCard?: Card;
	winningSubmissionId?: string;
	roundWinnerPlayerId?: string;
	gameWinnerPlayerId?: string;
	blockedPlayerIds?: string[];
	scheduledDeletionAt?: number;
	updatedAt: number;
}

export interface GameState {
	room: Room | null;
	players: Player[];
	self: {
		playerId: string;
		nickname: string;
		score: number;
		hand: Card[];
		isHost: boolean;
	} | null;
	submissions: Submission[];
	isCzar: boolean;
	roundNumber: number;
}

export interface LocalRoomData {
	room: Room;
	players: Player[];
	playerHands: Record<string, Card[]>;
	submissions: Submission[];
	usedBlackCardIds: string[];
	usedWhiteCardIds: string[];
}

export class LocalSimulationEngine {
	private broadcastChannel: BroadcastChannel | null = null;
	private pollInterval: number | null = null;
	private storageListener: ((e: StorageEvent) => void) | null = null;
	private lastRawState: string = "";
	private lastLoadedUpdatedAt: number = 0;

	constructor() {
		this.initBroadcastChannel();
	}

	private initBroadcastChannel() {
		if (typeof window !== "undefined" && "BroadcastChannel" in window) {
			if (!this.broadcastChannel) {
				this.broadcastChannel = new BroadcastChannel("cah_game_channel");
			}
		}
	}

	public setupBroadcast(
		currentPinGetter: () => string | undefined,
		onStateUpdate: (state: LocalRoomData) => void,
		onDisband?: (pin: string) => void,
	) {
		this.initBroadcastChannel();
		if (!this.broadcastChannel) return;

		this.broadcastChannel.onmessage = (event) => {
			const { type, pin, state } = event.data;
			const currentPin = currentPinGetter();
			if (type === "STATE_UPDATE" && currentPin === pin && state) {
				if (
					state.room?.updatedAt &&
					state.room.updatedAt <= this.lastLoadedUpdatedAt
				) {
					return;
				}
				this.lastLoadedUpdatedAt = state.room?.updatedAt || Date.now();
				onStateUpdate(state);
			} else if (type === "ROOM_DISBANDED" && currentPin === pin) {
				onDisband?.(pin);
			}
		};
	}

	public startSync(pin: string, onUpdate: (data: LocalRoomData) => void) {
		this.stopSync();

		const sync = () => {
			if (typeof window === "undefined") return;
			const raw = localStorage.getItem(`cah_room_${pin}`);
			if (!raw) return;

			// Fast string equality check completely bypasses JSON parsing and reactivity churn
			if (raw === this.lastRawState) return;
			this.lastRawState = raw;

			try {
				const data: LocalRoomData = JSON.parse(raw);
				const incomingTime = data.room?.updatedAt || 0;
				if (incomingTime && incomingTime <= this.lastLoadedUpdatedAt) {
					return;
				}
				this.lastLoadedUpdatedAt = incomingTime;
				onUpdate(data);
			} catch {
				// Ignore transient JSON parse errors
			}
		};

		// Initial sync
		sync();

		if (typeof window !== "undefined") {
			// Instant cross-tab sync via window storage event
			this.storageListener = (e: StorageEvent) => {
				if (e.key === `cah_room_${pin}` && e.newValue) {
					sync();
				}
			};
			window.addEventListener("storage", this.storageListener);

			// Fallback poll interval relaxed to 4000ms
			this.pollInterval = window.setInterval(sync, 4000);
		}
	}

	public stopSync() {
		if (this.pollInterval) {
			clearInterval(this.pollInterval);
			this.pollInterval = null;
		}
		if (this.storageListener && typeof window !== "undefined") {
			window.removeEventListener("storage", this.storageListener);
			this.storageListener = null;
		}
	}

	public cleanup() {
		this.stopSync();
		if (this.broadcastChannel) {
			this.broadcastChannel.close();
			this.broadcastChannel = null;
		}
	}

	public loadLocalData(pin: string): LocalRoomData | null {
		if (typeof window === "undefined") return null;
		const raw = localStorage.getItem(`cah_room_${pin}`);
		if (!raw) return null;
		try {
			return JSON.parse(raw);
		} catch {
			return null;
		}
	}

	public saveLocalData(pin: string, data: LocalRoomData) {
		if (typeof window === "undefined") return;
		data.room.updatedAt = Math.max(Date.now(), (data.room.updatedAt || 0) + 1);
		this.lastLoadedUpdatedAt = data.room.updatedAt;

		const json = JSON.stringify(data);
		this.lastRawState = json; // Prevent current tab from re-processing its own save

		localStorage.setItem(`cah_room_${pin}`, json);
		this.initBroadcastChannel();
		if (this.broadcastChannel) {
			this.broadcastChannel.postMessage({
				type: "STATE_UPDATE",
				pin,
				state: data,
			});
		}
	}

	public localDrawCards(
		count: number,
		usedIds: string[],
		activeHandCardIds: string[] = [],
	) {
		const usedSet = new Set(usedIds);
		let available = cardsData.white.filter((c) => !usedSet.has(c.id));
		let currentUsed = usedIds;
		if (available.length < count) {
			const activeSet = new Set(activeHandCardIds);
			available = cardsData.white.filter((c) => !activeSet.has(c.id));
			currentUsed = [...activeHandCardIds];
		}

		// Partial Fisher-Yates shuffle for O(k) drawing
		const pool = [...available];
		const n = Math.min(count, pool.length);
		const drawn: Card[] = [];
		for (let i = 0; i < n; i++) {
			const j = i + Math.floor(Math.random() * (pool.length - i));
			const temp = pool[i];
			pool[i] = pool[j];
			pool[j] = temp;
			drawn.push(pool[i]);
		}

		return {
			drawn,
			updatedUsed: [...currentUsed, ...drawn.map((c) => c.id)],
		};
	}

	public localDrawBlackCard(usedIds: string[]) {
		const usedSet = new Set(usedIds);
		let available = cardsData.black.filter((c) => !usedSet.has(c.id));
		let currentUsed = usedIds;
		if (available.length === 0) {
			available = [...cardsData.black];
			currentUsed = [];
		}
		const idx = Math.floor(Math.random() * available.length);
		const card = available[idx];
		return {
			blackCard: card,
			updatedBlackUsed: [...currentUsed, card.id],
		};
	}

	public createRoom(
		hostPlayerId: string,
		hostNickname: string,
		targetScore: number = 7,
		randoCardrissian: boolean = true,
	): { pin: string; localData: LocalRoomData } {
		const pin = Math.floor(100000 + Math.random() * 900000).toString();
		const roomId = `local_room_${pin}`;
		const initialRoom: Room = {
			_id: roomId,
			pin,
			hostPlayerId,
			status: "lobby",
			currentRound: 0,
			targetScore,
			handSize: 10,
			randoCardrissian,
			czarIndex: 0,
			currentCzarId: hostPlayerId,
			updatedAt: Date.now(),
		};

		const hostPlayer: Player = {
			_id: `p_${hostPlayerId}`,
			playerId: hostPlayerId,
			nickname: hostNickname || "Host",
			avatarSeed: hostPlayerId.slice(0, 8),
			score: 0,
			cardCount: 0,
			isHost: true,
			isConnected: true,
			isCzar: true,
			hasSubmitted: false,
		};

		const localData: LocalRoomData = {
			room: initialRoom,
			players: [hostPlayer],
			playerHands: {
				[hostPlayerId]: [] as Card[],
			},
			submissions: [] as Submission[],
			usedBlackCardIds: [] as string[],
			usedWhiteCardIds: [] as string[],
		};

		this.saveLocalData(pin, localData);
		return { pin, localData };
	}

	public joinRoom(
		pin: string,
		playerId: string,
		nickname: string,
	): { success: boolean; error?: string; localData?: LocalRoomData } {
		const cleanPin = pin.trim();
		const local = this.loadLocalData(cleanPin);
		if (!local) {
			return {
				success: false,
				error: `Room with PIN ${cleanPin} not found.`,
			};
		}

		let p = local.players.find((pl: Player) => pl.playerId === playerId);
		if (!p) {
			let startingHand: Card[] = [];
			if (local.room.status !== "lobby") {
				const activeIds = Object.values(local.playerHands).flatMap((h) =>
					h.map((c) => c.id),
				);
				const { drawn, updatedUsed } = this.localDrawCards(
					10,
					local.usedWhiteCardIds || [],
					activeIds,
				);
				startingHand = drawn;
				local.usedWhiteCardIds = updatedUsed;
			}

			p = {
				_id: `p_${playerId}`,
				playerId,
				nickname: nickname || `Player ${Math.floor(10 + Math.random() * 90)}`,
				avatarSeed: playerId.slice(0, 8),
				score: 0,
				cardCount: startingHand.length,
				isHost: false,
				isConnected: true,
				isCzar: false,
				hasSubmitted: false,
			};
			local.players.push(p);
			local.playerHands[playerId] = startingHand;
		} else {
			p.nickname = nickname || p.nickname;
			p.isConnected = true;
		}

		this.saveLocalData(cleanPin, local);
		return { success: true, localData: local };
	}

	public updateSettings(
		pin: string,
		targetScore?: number,
		randoCardrissian?: boolean,
	): LocalRoomData | null {
		const local = this.loadLocalData(pin);
		if (local?.room.status !== "lobby") return null;

		if (targetScore !== undefined) local.room.targetScore = targetScore;
		if (randoCardrissian !== undefined)
			local.room.randoCardrissian = randoCardrissian;

		this.saveLocalData(pin, local);
		return local;
	}

	public updateDisplayName(
		pin: string,
		playerId: string,
		newNickname: string,
	): LocalRoomData | null {
		const cleanName = newNickname.trim().slice(0, 24);
		if (!cleanName) return null;

		const local = this.loadLocalData(pin);
		if (!local) return null;

		const player = local.players.find((p: Player) => p.playerId === playerId);
		if (player) {
			player.nickname = cleanName;
		}

		const sub = (local.submissions || []).find(
			(s: Submission) =>
				s.playerId === playerId && s.roundNumber === local.room.currentRound,
		);
		if (sub) {
			sub.playerName = cleanName;
		}

		this.saveLocalData(pin, local);
		return local;
	}

	public kickPlayer(
		pin: string,
		targetPlayerId: string,
		block: boolean = false,
	): LocalRoomData | null {
		const local = this.loadLocalData(pin);
		if (!local) return null;

		local.players = (local.players || []).filter(
			(p: Player) => p.playerId !== targetPlayerId,
		);
		local.submissions = (local.submissions || []).filter(
			(s: Submission) => s.playerId !== targetPlayerId,
		);
		if (block) {
			local.room.blockedPlayerIds = local.room.blockedPlayerIds || [];
			local.room.blockedPlayerIds.push(targetPlayerId);
		}

		this.saveLocalData(pin, local);
		return local;
	}

	public scramblePin(
		oldPin: string,
	): { newPin: string; localData: LocalRoomData } | null {
		const local = this.loadLocalData(oldPin);
		if (!local) return null;

		const newPin = Math.floor(100000 + Math.random() * 900000).toString();
		local.room.pin = newPin;
		if (typeof window !== "undefined") {
			localStorage.removeItem(`cah_room_${oldPin}`);
		}
		this.saveLocalData(newPin, local);
		return { newPin, localData: local };
	}

	public stopGameToLobby(pin: string): LocalRoomData | null {
		const local = this.loadLocalData(pin);
		if (!local) return null;

		local.room.status = "lobby";
		local.room.currentRound = 0;
		local.room.winningSubmissionId = undefined;
		local.room.roundWinnerPlayerId = undefined;
		local.room.gameWinnerPlayerId = undefined;
		local.submissions = [];

		this.saveLocalData(pin, local);
		return local;
	}

	public restartGame(pin: string): LocalRoomData | null {
		const local = this.loadLocalData(pin);
		if (!local) return null;

		local.submissions = [];
		local.room.status = "submitting";
		local.room.currentRound = 1;
		for (const p of local.players) {
			p.score = 0;
			p.hasSubmitted = false;
		}

		this.saveLocalData(pin, local);
		return local;
	}

	public deleteRoom(pin: string) {
		if (typeof window !== "undefined") {
			localStorage.removeItem(`cah_room_${pin}`);
		}
		if (this.broadcastChannel) {
			this.broadcastChannel.postMessage({
				type: "ROOM_DISBANDED",
				pin,
			});
		}
	}

	public startGame(pin: string): LocalRoomData | null {
		const local = this.loadLocalData(pin);
		if (!local) return null;

		let usedWhite = [...(local.usedWhiteCardIds || [])];
		for (const player of local.players) {
			const { drawn, updatedUsed } = this.localDrawCards(10, usedWhite);
			usedWhite = updatedUsed;
			local.playerHands[player.playerId] = drawn;
			player.cardCount = 10;
			player.score = 0;
		}

		const { blackCard, updatedBlackUsed } = this.localDrawBlackCard(
			local.usedBlackCardIds || [],
		);

		local.room.status = "submitting";
		local.room.currentRound = 1;
		local.room.czarIndex = 0;
		local.room.currentCzarId = local.players[0].playerId;
		local.room.blackCard = blackCard;
		local.usedBlackCardIds = updatedBlackUsed;
		local.usedWhiteCardIds = usedWhite;
		local.submissions = [];

		if (local.room.randoCardrissian) {
			const { drawn: randoCards, updatedUsed: randoUsed } = this.localDrawCards(
				blackCard.pick || 1,
				usedWhite,
			);
			local.usedWhiteCardIds = randoUsed;
			local.submissions.push({
				_id: "sub_rando_1",
				roundNumber: 1,
				playerId: "rando",
				playerName: "Rando Cardrissian (Bot)",
				cards: randoCards,
				isRevealed: false,
				isWinner: false,
				isSelf: false,
			});
		}

		this.saveLocalData(pin, local);
		return local;
	}

	public submitCards(
		pin: string,
		playerId: string,
		playerNickname: string,
		selectedCardIds: string[],
	): { localData: LocalRoomData; shouldPlayDeal: boolean } | null {
		const local = this.loadLocalData(pin);
		if (!local) return null;

		const myHand: Card[] = local.playerHands[playerId] || [];
		const submittedCards = selectedCardIds
			.map((id) => myHand.find((c) => c.id === id))
			.filter((c): c is Card => c !== undefined);

		local.playerHands[playerId] = myHand.filter(
			(c) => !selectedCardIds.includes(c.id),
		);

		const p = local.players.find((pl: Player) => pl.playerId === playerId);
		if (p) {
			p.cardCount = local.playerHands[playerId].length;
			p.hasSubmitted = true;
		}

		local.submissions.push({
			_id: `sub_${playerId}_${local.room.currentRound}`,
			roundNumber: local.room.currentRound,
			playerId,
			playerName: playerNickname,
			cards: submittedCards,
			isRevealed: false,
			isWinner: false,
			isSelf: true,
		});

		const activeNonCzar = local.players.filter(
			(pl: Player) =>
				pl.playerId !== local.room.currentCzarId && pl.isConnected,
		);
		const expected =
			activeNonCzar.length + (local.room.randoCardrissian ? 1 : 0);

		let shouldPlayDeal = false;
		if (local.submissions.length >= expected) {
			local.room.status = "judging";
			shouldPlayDeal = true;
		}

		this.saveLocalData(pin, local);
		return { localData: local, shouldPlayDeal };
	}

	public revealSubmission(
		pin: string,
		submissionId: string,
	): LocalRoomData | null {
		const local = this.loadLocalData(pin);
		if (!local) return null;

		const sub = local.submissions.find(
			(s: Submission) => s._id === submissionId,
		);
		if (sub) {
			sub.isRevealed = true;
		}
		this.saveLocalData(pin, local);
		return local;
	}

	public revealAllSubmissions(pin: string): LocalRoomData | null {
		const local = this.loadLocalData(pin);
		if (!local) return null;

		for (const sub of local.submissions) {
			sub.isRevealed = true;
		}
		this.saveLocalData(pin, local);
		return local;
	}

	public pickWinner(
		pin: string,
		submissionId: string,
	): { localData: LocalRoomData; isGameWon: boolean } | null {
		const local = this.loadLocalData(pin);
		if (!local) return null;

		const sub = local.submissions.find(
			(s: Submission) => s._id === submissionId,
		);
		if (!sub) return null;

		sub.isRevealed = true;
		sub.isWinner = true;
		local.room.winningSubmissionId = submissionId;
		local.room.roundWinnerPlayerId = sub.playerId;

		let isGameWon = false;
		if (sub.playerId !== "rando") {
			const winner = local.players.find(
				(pl: Player) => pl.playerId === sub.playerId,
			);
			if (winner) {
				winner.score += 1;
				if (winner.score >= local.room.targetScore) {
					isGameWon = true;
					local.room.gameWinnerPlayerId = winner.playerId;
				}
			}
		}

		local.room.status = isGameWon ? "game_over" : "round_over";
		this.saveLocalData(pin, local);
		return { localData: local, isGameWon };
	}

	public nextRound(pin: string): LocalRoomData | null {
		const local = this.loadLocalData(pin);
		if (!local) return null;

		let usedWhite = [...(local.usedWhiteCardIds || [])];
		const activeIds = Object.values(local.playerHands).flatMap((h) =>
			h.map((c) => c.id),
		);

		for (const player of local.players) {
			const hand: Card[] = local.playerHands[player.playerId] || [];
			const needed = 10 - hand.length;
			if (needed > 0) {
				const { drawn, updatedUsed } = this.localDrawCards(
					needed,
					usedWhite,
					activeIds,
				);
				usedWhite = updatedUsed;
				local.playerHands[player.playerId] = [...hand, ...drawn];
				player.cardCount = local.playerHands[player.playerId].length;
			}
			player.hasSubmitted = false;
		}

		const connected = local.players.filter((p: Player) => p.isConnected);
		const currentCzarIdx = connected.findIndex(
			(p: Player) => p.playerId === local.room.currentCzarId,
		);
		const nextCzarIdx = (currentCzarIdx + 1) % connected.length;
		local.room.czarIndex = nextCzarIdx;
		local.room.currentCzarId = connected[nextCzarIdx].playerId;

		const { blackCard, updatedBlackUsed } = this.localDrawBlackCard(
			local.usedBlackCardIds || [],
		);
		const nextRound = local.room.currentRound + 1;

		local.room.currentRound = nextRound;
		local.room.status = "submitting";
		local.room.blackCard = blackCard;
		local.usedBlackCardIds = updatedBlackUsed;
		local.usedWhiteCardIds = usedWhite;
		local.room.winningSubmissionId = undefined;
		local.room.roundWinnerPlayerId = undefined;
		local.submissions = [];

		if (local.room.randoCardrissian) {
			const { drawn: randoCards, updatedUsed: randoUsed } = this.localDrawCards(
				blackCard.pick || 1,
				usedWhite,
				activeIds,
			);
			local.usedWhiteCardIds = randoUsed;
			local.submissions.push({
				_id: `sub_rando_${nextRound}`,
				roundNumber: nextRound,
				playerId: "rando",
				playerName: "Rando Cardrissian (Bot)",
				cards: randoCards,
				isRevealed: false,
				isWinner: false,
				isSelf: false,
			});
		}

		this.saveLocalData(pin, local);
		return local;
	}

	public transformLocalStateToGameState(
		local: LocalRoomData,
		playerId: string,
		fallbackNickname: string,
	): GameState {
		const myHand: Card[] = local.playerHands[playerId] || [];
		const isCzar = local.room.currentCzarId === playerId;
		const isHost = local.room.hostPlayerId === playerId;
		const selfPlayer = local.players.find(
			(p: Player) => p.playerId === playerId,
		);

		const isResolved =
			local.room.status === "round_over" || local.room.status === "game_over";

		let eligibleSubmissions = local.submissions || [];
		if (local.room.status === "submitting") {
			eligibleSubmissions = (local.submissions || []).filter(
				(s: Submission) => s.playerId === playerId,
			);
		}

		const visibleSubs = eligibleSubmissions.map((s: Submission) => {
			const isSelf = s.playerId === playerId;
			return {
				...s,
				playerId: isResolved || isSelf ? s.playerId : "anonymous",
				playerName: isResolved
					? s.playerName
					: isSelf
						? "You"
						: "Anonymous Player",
				isSelf,
			};
		});

		return {
			room: local.room,
			players: local.players,
			self: {
				playerId,
				nickname: selfPlayer?.nickname || fallbackNickname,
				score: selfPlayer?.score || 0,
				hand: myHand,
				isHost,
			},
			submissions: visibleSubs,
			isCzar,
			roundNumber: local.room.currentRound,
		};
	}
}

export const localSimulation = new LocalSimulationEngine();
