import confetti from "canvas-confetti";
import { api } from "../../convex/_generated/api";
import { sound } from "./audio";
import { getConvexClient } from "./convex";
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

class GameEngine {
	public playerId: string = "";
	public nickname: string = "";
	public state = $state<GameState>({
		room: null,
		players: [],
		self: null,
		submissions: [],
		isCzar: false,
		roundNumber: 0,
	});

	public selectedCardIds = $state<string[]>([]);
	public isSubmitting = $state<boolean>(false);
	public isConnecting = $state<boolean>(false);
	public errorMessage = $state<string>("");
	public isConvexLive = $state<boolean>(false);
	public userNotification = $state<string | null>(null);

	private unsubscribeConvex: (() => void) | null = null;
	private broadcastChannel: BroadcastChannel | null = null;
	private localPollInterval: number | null = null;

	constructor() {
		if (typeof window !== "undefined") {
			this.initPlayer();
			this.setupBroadcast();
		}
	}

	private initPlayer() {
		let pid = localStorage.getItem("cah_player_id");
		if (!pid) {
			pid = `p_${Math.random().toString(36).substring(2, 10)}`;
			localStorage.setItem("cah_player_id", pid);
		}
		this.playerId = pid;

		const savedName = localStorage.getItem("cah_nickname");
		if (savedName) {
			this.nickname = savedName;
		}
	}

	private setupBroadcast() {
		if (typeof window === "undefined" || !("BroadcastChannel" in window))
			return;
		this.broadcastChannel = new BroadcastChannel("cah_game_channel");
		this.broadcastChannel.onmessage = (event) => {
			const { type, pin, state } = event.data;
			if (type === "STATE_UPDATE" && this.state.room?.pin === pin) {
				this.applyLocalState(state);
			}
		};
	}

	public setNickname(name: string) {
		this.nickname = name.trim();
		if (typeof window !== "undefined") {
			localStorage.setItem("cah_nickname", this.nickname);
		}
	}

	// --- ROOM CREATION & JOINING ---

	public async createRoom(
		hostNickname: string,
		targetScore: number = 7,
		randoCardrissian: boolean = true,
	): Promise<string> {
		this.setNickname(hostNickname);
		this.isConnecting = true;
		this.errorMessage = "";

		const client = getConvexClient();
		if (client) {
			try {
				const res = await client.mutation(api.rooms.createRoom, {
					hostNickname: this.nickname,
					playerId: this.playerId,
					targetScore,
					randoCardrissian,
				});
				this.isConvexLive = true;
				this.subscribeToConvex(res.roomId);
				this.isConnecting = false;
				sound.playDeal();
				return res.pin;
			} catch (err: unknown) {
				console.warn(
					"Convex createRoom error, falling back to local simulation:",
					err,
				);
			}
		}

		// Local Simulation Mode
		const pin = Math.floor(100000 + Math.random() * 900000).toString();
		const roomId = `local_room_${pin}`;
		const initialRoom: Room = {
			_id: roomId,
			pin,
			hostPlayerId: this.playerId,
			status: "lobby",
			currentRound: 0,
			targetScore,
			handSize: 10,
			randoCardrissian,
			czarIndex: 0,
			currentCzarId: this.playerId,
			updatedAt: Date.now(),
		};

		const hostPlayer: Player = {
			_id: `p_${this.playerId}`,
			playerId: this.playerId,
			nickname: this.nickname || "Host",
			avatarSeed: this.playerId.slice(0, 8),
			score: 0,
			cardCount: 0,
			isHost: true,
			isConnected: true,
			isCzar: true,
			hasSubmitted: false,
		};

		const localData = {
			room: initialRoom,
			players: [hostPlayer],
			playerHands: {
				[this.playerId]: [] as Card[],
			},
			submissions: [] as Submission[],
			usedBlackCardIds: [] as string[],
			usedWhiteCardIds: [] as string[],
		};

		this.saveLocalData(pin, localData);
		this.startLocalSync(pin);
		this.isConnecting = false;
		sound.playDeal();
		return pin;
	}

	public async joinRoom(pin: string, nickname: string): Promise<boolean> {
		this.setNickname(nickname);
		this.isConnecting = true;
		this.errorMessage = "";
		const cleanPin = pin.trim();

		const client = getConvexClient();
		if (client) {
			try {
				const res = await client.mutation(api.rooms.joinRoom, {
					pin: cleanPin,
					nickname: this.nickname,
					playerId: this.playerId,
				});
				this.isConvexLive = true;
				this.subscribeToConvex(res.roomId);
				this.isConnecting = false;
				sound.playDeal();
				return true;
			} catch (err: unknown) {
				console.warn("Convex joinRoom error:", err);
			}
		}

		// Local Simulation Mode
		const local = this.loadLocalData(cleanPin);
		if (!local) {
			this.errorMessage = `Room with PIN ${cleanPin} not found.`;
			this.isConnecting = false;
			return false;
		}

		let p = local.players.find((pl: Player) => pl.playerId === this.playerId);
		if (!p) {
			// F-09: Deal 10 cards if joining an active game
			let startingHand: Card[] = [];
			if (local.room.status !== "lobby") {
				const activeIds = Object.values(
					local.playerHands as Record<string, Card[]>,
				).flatMap((h) => h.map((c) => c.id));
				const { drawn, updatedUsed } = this.localDrawCards(
					10,
					local.usedWhiteCardIds || [],
					activeIds,
				);
				startingHand = drawn;
				local.usedWhiteCardIds = updatedUsed;
			}

			p = {
				_id: `p_${this.playerId}`,
				playerId: this.playerId,
				nickname:
					this.nickname || `Player ${Math.floor(10 + Math.random() * 90)}`,
				avatarSeed: this.playerId.slice(0, 8),
				score: 0,
				cardCount: startingHand.length,
				isHost: false,
				isConnected: true,
				isCzar: false,
				hasSubmitted: false,
			};
			local.players.push(p);
			local.playerHands[this.playerId] = startingHand;
		} else {
			p.nickname = this.nickname || p.nickname;
			p.isConnected = true;
		}

		this.saveLocalData(cleanPin, local);
		this.startLocalSync(cleanPin);
		this.isConnecting = false;
		sound.playDeal();
		return true;
	}

	// --- GAME ACTIONS ---

	public async updateSettings(
		targetScore?: number,
		randoCardrissian?: boolean,
	) {
		if (this.isConvexLive && this.state.room) {
			const client = getConvexClient();
			if (client) {
				try {
					await client.mutation(api.game.updateSettings, {
						roomId: this.state.room._id as any,
						playerId: this.playerId,
						targetScore,
						randoCardrissian,
					});
				} catch (err) {
					console.warn("updateSettings failed:", err);
				}
				return;
			}
		}

		// Local update settings
		const pin = this.state.room?.pin;
		if (!pin) return;
		const local = this.loadLocalData(pin);
		if (local?.room.status !== "lobby") return;

		if (targetScore !== undefined) local.room.targetScore = targetScore;
		if (randoCardrissian !== undefined)
			local.room.randoCardrissian = randoCardrissian;

		this.saveLocalData(pin, local);
		this.applyLocalState(local);
	}

	public async updateDisplayName(newNickname: string): Promise<boolean> {
		const cleanName = newNickname.trim().slice(0, 24);
		if (!cleanName) return false;

		this.setNickname(cleanName);

		if (this.isConvexLive && this.state.room) {
			const client = getConvexClient();
			if (client) {
				try {
					await client.mutation((api.rooms as any).updateNickname, {
						roomId: this.state.room._id as any,
						playerId: this.playerId,
						newNickname: cleanName,
					});
					sound.playPop();
					return true;
				} catch (err) {
					console.warn("updateNickname failed:", err);
					return false;
				}
			}
		}

		// Local simulation update
		const pin = this.state.room?.pin;
		if (!pin) return false;
		const local = this.loadLocalData(pin);
		if (!local) return false;

		const player = local.players.find(
			(p: Player) => p.playerId === this.playerId,
		);
		if (player) {
			player.nickname = cleanName;
		}

		// Also update current round submission if exists
		const sub = (local.submissions || []).find(
			(s: Submission) =>
				s.playerId === this.playerId &&
				s.roundNumber === local.room.currentRound,
		);
		if (sub) {
			sub.playerName = cleanName;
		}

		this.saveLocalData(pin, local);
		this.applyLocalState(local);
		sound.playPop();
		return true;
	}

	public async kickPlayer(
		targetPlayerId: string,
		block: boolean = false,
	): Promise<boolean> {
		if (this.isConvexLive && this.state.room) {
			const client = getConvexClient();
			if (client) {
				try {
					await client.mutation((api.game as any).kickPlayer, {
						roomId: this.state.room._id as any,
						hostPlayerId: this.playerId,
						targetPlayerId,
						block,
					});
					sound.playSnap();
					return true;
				} catch (err) {
					console.warn("kickPlayer error:", err);
					return false;
				}
			}
		}

		// Local simulation kick
		const pin = this.state.room?.pin;
		if (!pin) return false;
		const local = this.loadLocalData(pin);
		if (!local) return false;

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
		this.applyLocalState(local);
		sound.playSnap();
		return true;
	}

	public async scramblePin(): Promise<string | null> {
		if (this.isConvexLive && this.state.room) {
			const client = getConvexClient();
			if (client) {
				try {
					const res = await client.mutation((api.rooms as any).scramblePin, {
						roomId: this.state.room._id as any,
						hostPlayerId: this.playerId,
					});
					sound.playPop();
					return res?.pin || null;
				} catch (err) {
					console.warn("scramblePin error:", err);
					return null;
				}
			}
		}

		// Local simulation scramble
		const oldPin = this.state.room?.pin;
		if (!oldPin) return null;
		const local = this.loadLocalData(oldPin);
		if (!local) return null;

		const newPin = Math.floor(100000 + Math.random() * 900000).toString();
		local.room.pin = newPin;
		localStorage.removeItem(`cah_room_${oldPin}`);
		this.saveLocalData(newPin, local);
		this.applyLocalState(local);
		sound.playPop();
		return newPin;
	}

	public async stopGameToLobby(): Promise<boolean> {
		if (this.isConvexLive && this.state.room) {
			const client = getConvexClient();
			if (client) {
				try {
					await client.mutation((api.game as any).stopGameToLobby, {
						roomId: this.state.room._id as any,
						hostPlayerId: this.playerId,
					});
					sound.playPop();
					return true;
				} catch (err) {
					console.warn("stopGameToLobby error:", err);
					return false;
				}
			}
		}

		const pin = this.state.room?.pin;
		if (!pin) return false;
		const local = this.loadLocalData(pin);
		if (!local) return false;

		local.room.status = "lobby";
		local.room.currentRound = 0;
		local.room.winningSubmissionId = undefined;
		local.room.roundWinnerPlayerId = undefined;
		local.room.gameWinnerPlayerId = undefined;
		local.submissions = [];

		this.saveLocalData(pin, local);
		this.applyLocalState(local);
		sound.playPop();
		return true;
	}

	public async restartGame(): Promise<boolean> {
		if (this.isConvexLive && this.state.room) {
			const client = getConvexClient();
			if (client) {
				try {
					await client.mutation((api.game as any).restartGame, {
						roomId: this.state.room._id as any,
						hostPlayerId: this.playerId,
					});
					sound.playDeal();
					return true;
				} catch (err) {
					console.warn("restartGame error:", err);
					return false;
				}
			}
		}

		const pin = this.state.room?.pin;
		if (!pin) return false;
		const local = this.loadLocalData(pin);
		if (!local) return false;

		local.submissions = [];
		local.room.status = "submitting";
		local.room.currentRound = 1;
		for (const p of local.players) {
			p.score = 0;
			p.hasSubmitted = false;
		}

		this.saveLocalData(pin, local);
		this.applyLocalState(local);
		sound.playDeal();
		return true;
	}

	public async deleteRoom(): Promise<boolean> {
		if (this.isConvexLive && this.state.room) {
			const client = getConvexClient();
			if (client) {
				try {
					await client.mutation((api.game as any).deleteRoom, {
						roomId: this.state.room._id as any,
						hostPlayerId: this.playerId,
					});
				} catch (err) {
					console.warn("deleteRoom error:", err);
				}
			}
		}

		const pin = this.state.room?.pin;
		if (pin) {
			localStorage.removeItem(`cah_room_${pin}`);
			if (this.broadcastChannel) {
				this.broadcastChannel.postMessage({
					type: "ROOM_DISBANDED",
					pin,
				});
			}
		}

		this.leaveRoom();
		this.userNotification = "You have disbanded the game room.";
		return true;
	}

	public async startGame() {
		sound.playDeal();
		if (this.isConvexLive && this.state.room) {
			const client = getConvexClient();
			if (client) {
				await client.mutation(api.game.startGame, {
					roomId: this.state.room._id as any,
					playerId: this.playerId,
				});
				return;
			}
		}

		// Local Game Start
		const pin = this.state.room?.pin;
		if (!pin) return;
		const local = this.loadLocalData(pin);
		if (!local) return;

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
		this.applyLocalState(local);
	}

	public toggleCardSelection(cardId: string) {
		sound.playSelect();
		const requiredPick = this.state.room?.blackCard?.pick ?? 1;

		if (this.selectedCardIds.includes(cardId)) {
			this.selectedCardIds = this.selectedCardIds.filter((id) => id !== cardId);
			return;
		}

		if (requiredPick === 1) {
			this.selectedCardIds = [cardId];
		} else {
			if (this.selectedCardIds.length < requiredPick) {
				this.selectedCardIds = [...this.selectedCardIds, cardId];
			} else {
				// Replace last selection
				this.selectedCardIds = [
					...this.selectedCardIds.slice(0, requiredPick - 1),
					cardId,
				];
			}
		}
	}

	public clearSelection() {
		this.selectedCardIds = [];
	}

	public async submitCards() {
		if (this.selectedCardIds.length === 0) return;
		sound.playSnap();
		this.isSubmitting = true;

		if (this.isConvexLive && this.state.room) {
			const client = getConvexClient();
			if (client) {
				try {
					await client.mutation(api.game.submitCards, {
						roomId: this.state.room._id as any,
						playerId: this.playerId,
						cardIds: this.selectedCardIds,
					});
					this.selectedCardIds = [];
					this.isSubmitting = false;
					return;
				} catch (err: unknown) {
					this.errorMessage =
						err instanceof Error ? err.message : "Submission failed";
					this.isSubmitting = false;
					return;
				}
			}
		}

		// Local Submission
		const pin = this.state.room?.pin;
		if (!pin) return;
		const local = this.loadLocalData(pin);
		if (!local) return;

		const myHand: Card[] = local.playerHands[this.playerId] || [];
		const submittedCards = this.selectedCardIds
			.map((id) => myHand.find((c) => c.id === id))
			.filter((c): c is Card => c !== undefined);

		local.playerHands[this.playerId] = myHand.filter(
			(c) => !this.selectedCardIds.includes(c.id),
		);

		const p = local.players.find((pl: Player) => pl.playerId === this.playerId);
		if (p) {
			p.cardCount = local.playerHands[this.playerId].length;
			p.hasSubmitted = true;
		}

		local.submissions.push({
			_id: `sub_${this.playerId}_${local.room.currentRound}`,
			roundNumber: local.room.currentRound,
			playerId: this.playerId,
			playerName: this.nickname,
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

		if (local.submissions.length >= expected) {
			local.room.status = "judging";
			sound.playDeal();
		}

		this.selectedCardIds = [];
		this.saveLocalData(pin, local);
		this.applyLocalState(local);
		this.isSubmitting = false;
	}

	public async revealSubmission(submissionId: string) {
		sound.playReveal();
		if (this.isConvexLive) {
			const client = getConvexClient();
			if (client) {
				await client.mutation(api.game.revealSubmission, {
					submissionId: submissionId as any,
					playerId: this.playerId,
				});
				return;
			}
		}

		// Local reveal
		const pin = this.state.room?.pin;
		if (!pin) return;
		const local = this.loadLocalData(pin);
		if (!local) return;

		const sub = local.submissions.find(
			(s: Submission) => s._id === submissionId,
		);
		if (sub) {
			sub.isRevealed = true;
		}
		this.saveLocalData(pin, local);
		this.applyLocalState(local);
	}

	public async revealAll() {
		sound.playReveal();
		if (this.isConvexLive && this.state.room) {
			const client = getConvexClient();
			if (client) {
				await client.mutation(api.game.revealAllSubmissions, {
					roomId: this.state.room._id as any,
					playerId: this.playerId,
				});
				return;
			}
		}

		// Local reveal all
		const pin = this.state.room?.pin;
		if (!pin) return;
		const local = this.loadLocalData(pin);
		if (!local) return;

		for (const sub of local.submissions) {
			sub.isRevealed = true;
		}
		this.saveLocalData(pin, local);
		this.applyLocalState(local);
	}

	public async pickWinner(submissionId: string) {
		sound.playWin();
		this.triggerConfetti();

		if (this.isConvexLive) {
			const client = getConvexClient();
			if (client) {
				await client.mutation(api.game.pickWinner, {
					submissionId: submissionId as any,
					playerId: this.playerId,
				});
				return;
			}
		}

		// Local pick winner
		const pin = this.state.room?.pin;
		if (!pin) return;
		const local = this.loadLocalData(pin);
		if (!local) return;

		const sub = local.submissions.find(
			(s: Submission) => s._id === submissionId,
		);
		if (!sub) return;

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
		this.applyLocalState(local);
	}

	public async nextRound() {
		sound.playDeal();
		if (this.isConvexLive && this.state.room) {
			const client = getConvexClient();
			if (client) {
				await client.mutation(api.game.nextRound, {
					roomId: this.state.room._id as any,
					playerId: this.playerId,
				});
				return;
			}
		}

		// Local next round
		const pin = this.state.room?.pin;
		if (!pin) return;
		const local = this.loadLocalData(pin);
		if (!local) return;

		let usedWhite = [...(local.usedWhiteCardIds || [])];
		const activeIds = Object.values(
			local.playerHands as Record<string, Card[]>,
		).flatMap((h) => h.map((c) => c.id));

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

		// Rotate Czar among connected players
		const connected = local.players.filter((p: Player) => p.isConnected);
		const currentCzarIdx = connected.findIndex(
			(p: Player) => p.playerId === local.room.currentCzarId,
		);
		const nextCzarIdx = (currentCzarIdx + 1) % connected.length;
		local.room.czarIndex = nextCzarIdx;
		local.room.currentCzarId = connected[nextCzarIdx].playerId;

		// Draw black card
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
		this.applyLocalState(local);
	}

	// F-05 & SEC-23: Clean up remote connection on backend
	public async leaveRoom() {
		sound.playSnap();

		if (this.isConvexLive && this.state.room) {
			const client = getConvexClient();
			if (client) {
				try {
					await client.mutation(api.game.leaveRoom, {
						roomId: this.state.room._id as any,
						playerId: this.playerId,
					});
				} catch (err) {
					console.warn("leaveRoom backend error:", err);
				}
			}
		}

		if (this.unsubscribeConvex) {
			this.unsubscribeConvex();
			this.unsubscribeConvex = null;
		}
		if (this.localPollInterval) {
			clearInterval(this.localPollInterval);
			this.localPollInterval = null;
		}
		this.state = {
			room: null,
			players: [],
			self: null,
			submissions: [],
			isCzar: false,
			roundNumber: 0,
		};
		this.selectedCardIds = [];
	}

	public triggerConfetti() {
		try {
			confetti({
				particleCount: 80,
				spread: 70,
				origin: { y: 0.6 },
				colors: ["#ffffff", "#aaaaaa", "#e0e0e0", "#ffffff"],
			});
		} catch {
			// ignore
		}
	}

	// --- CONVEX SYNC ---

	private subscribeToConvex(roomId: string) {
		const client = getConvexClient();
		if (!client) return;

		if (this.unsubscribeConvex) {
			this.unsubscribeConvex();
		}

		this.unsubscribeConvex = client.onUpdate(
			api.rooms.getRoomState,
			{ roomId: roomId as any, playerId: this.playerId },
			(roomState: any) => {
				if (!roomState) {
					if (this.state.room) {
						this.leaveRoom();
						this.userNotification =
							"The game room has ended or was disbanded by the host.";
					}
					return;
				}

				if (roomState.self?.isKicked) {
					this.leaveRoom();
					this.userNotification = "You were removed from the room by the host.";
					return;
				}

				this.state.room = roomState.room;
				this.state.players = roomState.players;
				this.state.self = roomState.self;
				this.state.submissions = roomState.submissions;
				this.state.isCzar = roomState.isCzar;
				this.state.roundNumber = roomState.roundNumber;
			},
		);
	}

	// --- LOCAL FALLBACK ENGINE ---

	private localDrawCards(
		count: number,
		usedIds: string[],
		activeHandCardIds: string[] = [],
	) {
		let available = cardsData.white.filter((c) => !usedIds.includes(c.id));
		let currentUsed = usedIds;
		if (available.length < count) {
			const activeSet = new Set(activeHandCardIds);
			available = cardsData.white.filter((c) => !activeSet.has(c.id));
			currentUsed = [...activeHandCardIds];
		}
		const shuffled = [...available].sort(() => Math.random() - 0.5);
		const drawn = shuffled.slice(0, count);
		return {
			drawn,
			updatedUsed: [...currentUsed, ...drawn.map((c) => c.id)],
		};
	}

	private localDrawBlackCard(usedIds: string[]) {
		let available = cardsData.black.filter((c) => !usedIds.includes(c.id));
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

	private loadLocalData(pin: string) {
		if (typeof window === "undefined") return null;
		const raw = localStorage.getItem(`cah_room_${pin}`);
		if (!raw) return null;
		try {
			return JSON.parse(raw);
		} catch {
			return null;
		}
	}

	private saveLocalData(pin: string, data: any) {
		if (typeof window === "undefined") return;
		localStorage.setItem(`cah_room_${pin}`, JSON.stringify(data));
		if (this.broadcastChannel) {
			this.broadcastChannel.postMessage({
				type: "STATE_UPDATE",
				pin,
				state: data,
			});
		}
	}

	private applyLocalState(local: any) {
		if (!local?.room) return;

		const myHand: Card[] = local.playerHands[this.playerId] || [];
		const isCzar = local.room.currentCzarId === this.playerId;
		const isHost = local.room.hostPlayerId === this.playerId;
		const selfPlayer = local.players.find(
			(p: Player) => p.playerId === this.playerId,
		);

		const isResolved =
			local.room.status === "round_over" || local.room.status === "game_over";

		// Submissions visibility and anonymity during submitting/judging
		let eligibleSubmissions = local.submissions || [];
		if (local.room.status === "submitting") {
			eligibleSubmissions = (local.submissions || []).filter(
				(s: Submission) => s.playerId === this.playerId,
			);
		}

		const visibleSubs = eligibleSubmissions.map((s: Submission) => {
			const isSelf = s.playerId === this.playerId;
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

		this.state.room = local.room;
		this.state.players = local.players;
		this.state.self = {
			playerId: this.playerId,
			nickname: selfPlayer?.nickname || this.nickname,
			score: selfPlayer?.score || 0,
			hand: myHand,
			isHost,
		};
		this.state.submissions = visibleSubs;
		this.state.isCzar = isCzar;
		this.state.roundNumber = local.room.currentRound;
	}

	private startLocalSync(pin: string) {
		if (this.localPollInterval) {
			clearInterval(this.localPollInterval);
		}

		const sync = () => {
			const data = this.loadLocalData(pin);
			if (data) this.applyLocalState(data);
		};

		sync();
		this.localPollInterval = window.setInterval(sync, 1000);
	}
}

export const game = new GameEngine();
