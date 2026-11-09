import confetti from "canvas-confetti";
import { api } from "../../convex/_generated/api";
import { sound } from "./audio";
import { getConvexClient } from "./convex";
import {
	type Card,
	type GameState,
	type LocalRoomData,
	localSimulation,
	type Player,
	type Room,
	type Submission,
} from "./localSimulationEngine";
import { getNickname, getPlayerId, saveNickname } from "./playerSession";

export type { Card, GameState, LocalRoomData, Player, Room, Submission };

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

	constructor() {
		if (typeof window !== "undefined") {
			this.playerId = getPlayerId();
			this.nickname = getNickname();

			localSimulation.setupBroadcast(
				() => this.state.room?.pin,
				(localData) => this.applyLocalState(localData),
				() => {
					this.leaveRoom();
					this.userNotification =
						"The game room has ended or was disbanded by the host.";
				},
			);
		}
	}

	public setNickname(name: string) {
		this.nickname = saveNickname(name);
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
		const { pin, localData } = localSimulation.createRoom(
			this.playerId,
			this.nickname,
			targetScore,
			randoCardrissian,
		);
		this.applyLocalState(localData);
		localSimulation.startSync(pin, (data) => this.applyLocalState(data));
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
		const joinResult = localSimulation.joinRoom(
			cleanPin,
			this.playerId,
			this.nickname,
		);
		if (!joinResult.success || !joinResult.localData) {
			this.errorMessage =
				joinResult.error || `Room with PIN ${cleanPin} not found.`;
			this.isConnecting = false;
			return false;
		}

		this.applyLocalState(joinResult.localData);
		localSimulation.startSync(cleanPin, (data) => this.applyLocalState(data));
		this.isConnecting = false;
		sound.playDeal();
		return true;
	}

	// --- GAME SETTINGS & PROFILE ---

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

		const pin = this.state.room?.pin;
		if (!pin) return;
		const updated = localSimulation.updateSettings(
			pin,
			targetScore,
			randoCardrissian,
		);
		if (updated) this.applyLocalState(updated);
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

		const pin = this.state.room?.pin;
		if (!pin) return false;
		const updated = localSimulation.updateDisplayName(
			pin,
			this.playerId,
			cleanName,
		);
		if (!updated) return false;

		this.applyLocalState(updated);
		sound.playPop();
		return true;
	}

	public async kickPlayer(
		targetPlayerId: string,
		block: boolean = false,
		scramble: boolean = false,
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
					if (scramble) {
						await this.scramblePin();
					}
					sound.playSnap();
					return true;
				} catch (err) {
					console.warn("kickPlayer error:", err);
					return false;
				}
			}
		}

		const pin = this.state.room?.pin;
		if (!pin) return false;
		const updated = localSimulation.kickPlayer(pin, targetPlayerId, block);
		if (!updated) return false;

		this.applyLocalState(updated);
		if (scramble) {
			await this.scramblePin();
		}
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

		const oldPin = this.state.room?.pin;
		if (!oldPin) return null;
		const scrambled = localSimulation.scramblePin(oldPin);
		if (!scrambled) return null;

		localSimulation.startSync(scrambled.newPin, (data) =>
			this.applyLocalState(data),
		);
		this.applyLocalState(scrambled.localData);
		sound.playPop();
		return scrambled.newPin;
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
		const updated = localSimulation.stopGameToLobby(pin);
		if (!updated) return false;

		this.applyLocalState(updated);
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
		const updated = localSimulation.restartGame(pin);
		if (!updated) return false;

		this.applyLocalState(updated);
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
			localSimulation.deleteRoom(pin);
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

		const pin = this.state.room?.pin;
		if (!pin) return;
		const updated = localSimulation.startGame(pin);
		if (updated) this.applyLocalState(updated);
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

		const pin = this.state.room?.pin;
		if (!pin) return;
		const result = localSimulation.submitCards(
			pin,
			this.playerId,
			this.nickname,
			this.selectedCardIds,
		);
		if (result) {
			if (result.shouldPlayDeal) {
				sound.playDeal();
			}
			this.applyLocalState(result.localData);
		}

		this.selectedCardIds = [];
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

		const pin = this.state.room?.pin;
		if (!pin) return;
		const updated = localSimulation.revealSubmission(pin, submissionId);
		if (updated) this.applyLocalState(updated);
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

		const pin = this.state.room?.pin;
		if (!pin) return;
		const updated = localSimulation.revealAllSubmissions(pin);
		if (updated) this.applyLocalState(updated);
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

		const pin = this.state.room?.pin;
		if (!pin) return;
		const result = localSimulation.pickWinner(pin, submissionId);
		if (result) this.applyLocalState(result.localData);
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

		const pin = this.state.room?.pin;
		if (!pin) return;
		const updated = localSimulation.nextRound(pin);
		if (updated) this.applyLocalState(updated);
	}

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

		localSimulation.stopSync();

		this.state = {
			room: null,
			players: [],
			self: null,
			submissions: [],
			isCzar: false,
			roundNumber: 0,
		};
		this.selectedCardIds = [];
		this.isConvexLive = false;
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

	private applyLocalState(localData: LocalRoomData) {
		const transformed = localSimulation.transformLocalStateToGameState(
			localData,
			this.playerId,
			this.nickname,
		);
		this.state.room = transformed.room;
		this.state.players = transformed.players;
		this.state.self = transformed.self;
		this.state.submissions = transformed.submissions;
		this.state.isCzar = transformed.isCzar;
		this.state.roundNumber = transformed.roundNumber;
	}
}

export const game = new GameEngine();
