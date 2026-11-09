import { v } from "convex/values";
import { internal } from "./_generated/api";
import { mutation } from "./_generated/server";
import { drawWhiteCards, getRandomBlackCard } from "./cardsData";
import { deleteRoomCascade } from "./cleanup";

export const startGame = mutation({
	args: {
		roomId: v.id("rooms"),
		playerId: v.string(),
	},
	handler: async (ctx, args) => {
		const room = await ctx.db.get(args.roomId);
		if (!room) throw new Error("Room not found");
		if (room.hostPlayerId !== args.playerId) {
			throw new Error("Only the host can start the game");
		}

		const players = await ctx.db
			.query("players")
			.withIndex("by_room", (q) => q.eq("roomId", args.roomId))
			.filter((q) => q.eq(q.field("isConnected"), true))
			.collect();

		const minRequired = room.randoCardrissian ? 1 : 2;
		if (players.length < minRequired) {
			throw new Error(
				`Need at least ${minRequired} connected players to start`,
			);
		}

		// Purge any stale submissions from previous games in this room (prevents restart brick)
		const oldSubmissions = await ctx.db
			.query("submissions")
			.withIndex("by_room_round", (q) => q.eq("roomId", args.roomId))
			.collect();
		for (const sub of oldSubmissions) {
			await ctx.db.delete(sub._id);
		}

		// 1. Draw 10 white cards for each player
		let currentUsedWhite = [...room.usedWhiteCardIds];
		for (const player of players) {
			const { cards, newUsedIds } = drawWhiteCards(
				room.handSize,
				currentUsedWhite,
			);
			currentUsedWhite = newUsedIds;
			await ctx.db.patch(player._id, {
				hand: cards,
				score: 0,
			});
		}

		// 2. Initial Czar is the first connected player
		const initialCzar = players[0];

		// 3. Draw initial Black card
		const { card: initialBlack, newUsedIds: newUsedBlack } = getRandomBlackCard(
			room.usedBlackCardIds,
		);

		// 4. Update room state
		await ctx.db.patch(room._id, {
			status: "submitting",
			currentRound: 1,
			czarIndex: 0,
			currentCzarId: initialCzar.playerId,
			blackCard: initialBlack,
			usedBlackCardIds: newUsedBlack,
			usedWhiteCardIds: currentUsedWhite,
			winningSubmissionId: undefined,
			roundWinnerPlayerId: undefined,
			gameWinnerPlayerId: undefined,
			updatedAt: Date.now(),
		});

		// 5. If Rando Cardrissian rule is active, play a card for Rando
		if (room.randoCardrissian) {
			const { cards: randoCards, newUsedIds: randoUsed } = drawWhiteCards(
				initialBlack.pick,
				currentUsedWhite,
			);
			await ctx.db.patch(room._id, {
				usedWhiteCardIds: randoUsed,
			});

			await ctx.db.insert("submissions", {
				roomId: room._id,
				roundNumber: 1,
				playerId: "rando",
				playerName: "Rando Cardrissian (Bot)",
				cards: randoCards,
				isRevealed: false,
				revealOrder: 0,
			});
		}

		return { success: true };
	},
});

export const submitCards = mutation({
	args: {
		roomId: v.id("rooms"),
		playerId: v.string(),
		cardIds: v.array(v.string()),
	},
	handler: async (ctx, args) => {
		const room = await ctx.db.get(args.roomId);
		if (!room) throw new Error("Room not found");
		if (room.status !== "submitting") {
			throw new Error("Not currently accepting card submissions");
		}
		if (room.currentCzarId === args.playerId) {
			throw new Error("The Card Czar cannot submit cards");
		}

		const player = await ctx.db
			.query("players")
			.withIndex("by_room_player", (q) =>
				q.eq("roomId", args.roomId).eq("playerId", args.playerId),
			)
			.first();

		if (!player) throw new Error("Player not found in room");

		const requiredPick = room.blackCard?.pick ?? 1;
		if (args.cardIds.length !== requiredPick) {
			throw new Error(`This black card requires exactly ${requiredPick} cards`);
		}

		// Disallow duplicate card submission (SEC-08)
		if (new Set(args.cardIds).size !== args.cardIds.length) {
			throw new Error("Cannot submit duplicate cards");
		}

		// Check if already submitted this round using compound index
		const existingSubmission = await ctx.db
			.query("submissions")
			.withIndex("by_room_round_player", (q) =>
				q
					.eq("roomId", args.roomId)
					.eq("roundNumber", room.currentRound)
					.eq("playerId", args.playerId),
			)
			.first();

		if (existingSubmission) {
			throw new Error("You have already submitted cards for this round");
		}

		// Find submitted cards in player's hand preserving selection order
		const submittedCards = args.cardIds.map((id) => {
			const card = player.hand.find((c) => c.id === id);
			if (!card) throw new Error(`Card ${id} not found in player's hand`);
			return card;
		});

		// Remove cards from player's hand
		const remainingHand = player.hand.filter(
			(c) => !args.cardIds.includes(c.id),
		);
		await ctx.db.patch(player._id, { hand: remainingHand });

		// Insert submission
		await ctx.db.insert("submissions", {
			roomId: room._id,
			roundNumber: room.currentRound,
			playerId: args.playerId,
			playerName: player.nickname,
			cards: submittedCards,
			isRevealed: false,
		});

		// Check if all connected active non-Czar players have submitted (SEC-10)
		const allPlayers = await ctx.db
			.query("players")
			.withIndex("by_room", (q) => q.eq("roomId", args.roomId))
			.collect();

		const activeNonCzar = allPlayers.filter(
			(p) =>
				p.playerId !== room.currentCzarId &&
				p.isConnected &&
				p.hand.length >= 0,
		);

		const allSubmissions = await ctx.db
			.query("submissions")
			.withIndex("by_room_round", (q) =>
				q.eq("roomId", args.roomId).eq("roundNumber", room.currentRound),
			)
			.collect();

		const allHumansSubmitted = activeNonCzar.every((p) =>
			allSubmissions.some((s) => s.playerId === p.playerId),
		);

		const randoSubmitted =
			!room.randoCardrissian ||
			allSubmissions.some((s) => s.playerId === "rando");

		if (allHumansSubmitted && randoSubmitted && activeNonCzar.length > 0) {
			// Transition to judging and randomize reveal order (SEC-02)
			const shuffledSubmissions = [...allSubmissions].sort(
				() => Math.random() - 0.5,
			);
			for (let i = 0; i < shuffledSubmissions.length; i++) {
				await ctx.db.patch(shuffledSubmissions[i]._id, { revealOrder: i });
			}

			await ctx.db.patch(room._id, {
				status: "judging",
				updatedAt: Date.now(),
			});
		}

		return { success: true };
	},
});

export const revealSubmission = mutation({
	args: {
		submissionId: v.id("submissions"),
		playerId: v.string(),
	},
	handler: async (ctx, args) => {
		const sub = await ctx.db.get(args.submissionId);
		if (!sub) throw new Error("Submission not found");

		const room = await ctx.db.get(sub.roomId);
		if (!room) throw new Error("Room not found");

		// Czar only! (SEC-05)
		if (room.currentCzarId !== args.playerId) {
			throw new Error("Only the Card Czar can reveal submissions");
		}

		await ctx.db.patch(sub._id, { isRevealed: true });
		return { success: true };
	},
});

export const revealAllSubmissions = mutation({
	args: {
		roomId: v.id("rooms"),
		playerId: v.string(),
	},
	handler: async (ctx, args) => {
		const room = await ctx.db.get(args.roomId);
		if (!room) throw new Error("Room not found");

		// Czar only! (SEC-05)
		if (room.currentCzarId !== args.playerId) {
			throw new Error("Only the Card Czar can reveal submissions");
		}

		const submissions = await ctx.db
			.query("submissions")
			.withIndex("by_room_round", (q) =>
				q.eq("roomId", room._id).eq("roundNumber", room.currentRound),
			)
			.collect();

		for (const sub of submissions) {
			if (!sub.isRevealed) {
				await ctx.db.patch(sub._id, { isRevealed: true });
			}
		}

		return { success: true };
	},
});

export const pickWinner = mutation({
	args: {
		submissionId: v.id("submissions"),
		playerId: v.string(),
	},
	handler: async (ctx, args) => {
		const sub = await ctx.db.get(args.submissionId);
		if (!sub) throw new Error("Submission not found");

		const room = await ctx.db.get(sub.roomId);
		if (!room) throw new Error("Room not found");

		if (room.status !== "judging") {
			throw new Error("Can only pick a winner during the judging phase");
		}

		// Czar only! (SEC-05)
		if (room.currentCzarId !== args.playerId) {
			throw new Error("Only the Card Czar can pick the winner");
		}

		let isGameWon = false;

		if (sub.playerId !== "rando") {
			const winningPlayer = await ctx.db
				.query("players")
				.withIndex("by_room_player", (q) =>
					q.eq("roomId", room._id).eq("playerId", sub.playerId),
				)
				.first();

			if (winningPlayer) {
				const newScore = winningPlayer.score + 1;
				await ctx.db.patch(winningPlayer._id, { score: newScore });
				if (newScore >= room.targetScore) {
					isGameWon = true;
				}
			}
		}

		const cleanupTime = isGameWon ? Date.now() + 5 * 60 * 1000 : undefined;

		await ctx.db.patch(room._id, {
			status: isGameWon ? "game_over" : "round_over",
			winningSubmissionId: sub._id,
			roundWinnerPlayerId: sub.playerId,
			gameWinnerPlayerId: isGameWon ? sub.playerId : undefined,
			scheduledDeletionAt: cleanupTime,
			updatedAt: Date.now(),
		});

		if (isGameWon) {
			await ctx.scheduler.runAfter(
				5 * 60 * 1000,
				internal.cleanup.purgeRoomAfterGameOver,
				{ roomId: room._id },
			);
		}

		return { success: true, isGameWon };
	},
});

export const nextRound = mutation({
	args: {
		roomId: v.id("rooms"),
		playerId: v.string(),
	},
	handler: async (ctx, args) => {
		const room = await ctx.db.get(args.roomId);
		if (!room) throw new Error("Room not found");
		if (room.status !== "round_over") {
			throw new Error("Cannot advance to next round yet");
		}

		// Verification: Czar or Host only (SEC-07)
		if (
			room.currentCzarId !== args.playerId &&
			room.hostPlayerId !== args.playerId
		) {
			throw new Error("Only the Card Czar or Host can begin the next round");
		}

		const allPlayers = await ctx.db
			.query("players")
			.withIndex("by_room", (q) => q.eq("roomId", room._id))
			.collect();

		const connectedPlayers = allPlayers.filter((p) => p.isConnected);
		if (connectedPlayers.length === 0) {
			throw new Error("No connected players in room");
		}

		// 1. Replenish hands to handSize (10 cards), protecting active cards
		const activeCardIds = allPlayers.flatMap((p) => p.hand.map((c) => c.id));
		let currentUsedWhite = [...room.usedWhiteCardIds];

		for (const player of connectedPlayers) {
			const needed = room.handSize - player.hand.length;
			if (needed > 0) {
				const { cards, newUsedIds } = drawWhiteCards(
					needed,
					currentUsedWhite,
					activeCardIds,
				);
				currentUsedWhite = newUsedIds;
				await ctx.db.patch(player._id, {
					hand: [...player.hand, ...cards],
				});
			}
		}

		// 2. Rotate Czar among connected players (SEC-14)
		const currentCzarIdx = connectedPlayers.findIndex(
			(p) => p.playerId === room.currentCzarId,
		);
		const nextCzarIdx = (currentCzarIdx + 1) % connectedPlayers.length;
		const nextCzar = connectedPlayers[nextCzarIdx];

		// 3. Draw next black card
		const { card: nextBlack, newUsedIds: newUsedBlack } = getRandomBlackCard(
			room.usedBlackCardIds,
		);

		const nextRoundNumber = room.currentRound + 1;

		// 4. Update room
		await ctx.db.patch(room._id, {
			status: "submitting",
			currentRound: nextRoundNumber,
			czarIndex: nextCzarIdx,
			currentCzarId: nextCzar.playerId,
			blackCard: nextBlack,
			usedBlackCardIds: newUsedBlack,
			usedWhiteCardIds: currentUsedWhite,
			winningSubmissionId: undefined,
			roundWinnerPlayerId: undefined,
			updatedAt: Date.now(),
		});

		// 5. If Rando Cardrissian enabled, draw bot card
		if (room.randoCardrissian) {
			const { cards: randoCards, newUsedIds: randoUsed } = drawWhiteCards(
				nextBlack.pick,
				currentUsedWhite,
				activeCardIds,
			);
			await ctx.db.patch(room._id, {
				usedWhiteCardIds: randoUsed,
			});

			await ctx.db.insert("submissions", {
				roomId: room._id,
				roundNumber: nextRoundNumber,
				playerId: "rando",
				playerName: "Rando Cardrissian (Bot)",
				cards: randoCards,
				isRevealed: false,
				revealOrder: 0,
			});
		}

		return { success: true };
	},
});

export const updateSettings = mutation({
	args: {
		roomId: v.id("rooms"),
		playerId: v.string(),
		targetScore: v.optional(v.number()),
		randoCardrissian: v.optional(v.boolean()),
	},
	handler: async (ctx, args) => {
		const room = await ctx.db.get(args.roomId);
		if (!room) throw new Error("Room not found");
		if (room.hostPlayerId !== args.playerId) {
			throw new Error("Only the host can update room settings");
		}

		// SEC-18: Only allow setting changes in the lobby
		if (room.status !== "lobby") {
			throw new Error("Settings can only be changed in the lobby");
		}

		const updates: Record<string, unknown> = { updatedAt: Date.now() };
		if (args.targetScore !== undefined) updates.targetScore = args.targetScore;
		if (args.randoCardrissian !== undefined)
			updates.randoCardrissian = args.randoCardrissian;

		await ctx.db.patch(room._id, updates);
		return { success: true };
	},
});

export const leaveRoom = mutation({
	args: {
		roomId: v.id("rooms"),
		playerId: v.string(),
	},
	handler: async (ctx, args) => {
		const player = await ctx.db
			.query("players")
			.withIndex("by_room_player", (q) =>
				q.eq("roomId", args.roomId).eq("playerId", args.playerId),
			)
			.first();

		if (!player) return { success: true };

		await ctx.db.patch(player._id, { isConnected: false });

		const room = await ctx.db.get(args.roomId);
		if (!room) return { success: true };

		const remaining = await ctx.db
			.query("players")
			.withIndex("by_room", (q) => q.eq("roomId", args.roomId))
			.filter((q) => q.eq(q.field("isConnected"), true))
			.collect();

		if (remaining.length === 0) {
			await deleteRoomCascade(ctx, args.roomId);
			return { success: true };
		}

		// Reassign host if host left (SEC-19)
		if (room.hostPlayerId === args.playerId) {
			await ctx.db.patch(room._id, { hostPlayerId: remaining[0].playerId });
			await ctx.db.patch(remaining[0]._id, { isHost: true });
		}

		// Reassign czar if czar left
		if (room.currentCzarId === args.playerId) {
			await ctx.db.patch(room._id, { currentCzarId: remaining[0].playerId });
		}

		// SEC-11: If room was in 'submitting' and all remaining players have submitted, advance to 'judging'
		if (room.status === "submitting") {
			const activeNonCzar = remaining.filter(
				(p) => p.playerId !== room.currentCzarId,
			);
			const allSubmissions = await ctx.db
				.query("submissions")
				.withIndex("by_room_round", (q) =>
					q.eq("roomId", room._id).eq("roundNumber", room.currentRound),
				)
				.collect();

			const allRemainingSubmitted = activeNonCzar.every((p) =>
				allSubmissions.some((s) => s.playerId === p.playerId),
			);

			if (allRemainingSubmitted && activeNonCzar.length > 0) {
				const shuffled = [...allSubmissions].sort(() => Math.random() - 0.5);
				for (let i = 0; i < shuffled.length; i++) {
					await ctx.db.patch(shuffled[i]._id, { revealOrder: i });
				}
				await ctx.db.patch(room._id, {
					status: "judging",
					updatedAt: Date.now(),
				});
			}
		}

		return { success: true };
	},
});

export const kickPlayer = mutation({
	args: {
		roomId: v.id("rooms"),
		hostPlayerId: v.string(),
		targetPlayerId: v.string(),
		block: v.optional(v.boolean()),
	},
	handler: async (ctx, args) => {
		const room = await ctx.db.get(args.roomId);
		if (!room) throw new Error("Room not found");
		if (room.hostPlayerId !== args.hostPlayerId) {
			throw new Error("Only the host can kick players");
		}
		if (args.targetPlayerId === room.hostPlayerId) {
			throw new Error("The host cannot kick themselves");
		}

		const target = await ctx.db
			.query("players")
			.withIndex("by_room_player", (q) =>
				q.eq("roomId", args.roomId).eq("playerId", args.targetPlayerId),
			)
			.first();

		if (!target) return { success: true };

		// Mark target player as kicked and offline
		await ctx.db.patch(target._id, {
			isKicked: true,
			isConnected: false,
		});

		// Block target player if requested
		if (args.block) {
			const currentBlocked = room.blockedPlayerIds ?? [];
			if (!currentBlocked.includes(args.targetPlayerId)) {
				await ctx.db.patch(room._id, {
					blockedPlayerIds: [...currentBlocked, args.targetPlayerId],
				});
			}
		}

		// Delete target player's submission for current round
		const sub = await ctx.db
			.query("submissions")
			.withIndex("by_room_round_player", (q) =>
				q
					.eq("roomId", args.roomId)
					.eq("roundNumber", room.currentRound)
					.eq("playerId", args.targetPlayerId),
			)
			.first();

		if (sub) {
			await ctx.db.delete(sub._id);
		}

		// Check remaining connected players (excluding kicked)
		const remaining = await ctx.db
			.query("players")
			.withIndex("by_room", (q) => q.eq("roomId", args.roomId))
			.filter((q) =>
				q.and(
					q.eq(q.field("isConnected"), true),
					q.neq(q.field("isKicked"), true),
				),
			)
			.collect();

		if (remaining.length === 0) {
			await deleteRoomCascade(ctx, args.roomId);
			return { success: true };
		}

		// If kicked player was Czar, rotate Czar immediately
		if (room.currentCzarId === args.targetPlayerId) {
			await ctx.db.patch(room._id, { currentCzarId: remaining[0].playerId });
		}

		// If in 'submitting' phase, check if all remaining active players have submitted
		if (room.status === "submitting") {
			const activeNonCzar = remaining.filter(
				(p) => p.playerId !== room.currentCzarId,
			);
			const allSubmissions = await ctx.db
				.query("submissions")
				.withIndex("by_room_round", (q) =>
					q.eq("roomId", room._id).eq("roundNumber", room.currentRound),
				)
				.collect();

			const allRemainingSubmitted = activeNonCzar.every((p) =>
				allSubmissions.some((s) => s.playerId === p.playerId),
			);

			if (allRemainingSubmitted && activeNonCzar.length > 0) {
				const shuffled = [...allSubmissions].sort(() => Math.random() - 0.5);
				for (let i = 0; i < shuffled.length; i++) {
					await ctx.db.patch(shuffled[i]._id, { revealOrder: i });
				}
				await ctx.db.patch(room._id, {
					status: "judging",
					updatedAt: Date.now(),
				});
			}
		}

		return { success: true };
	},
});

export const stopGameToLobby = mutation({
	args: {
		roomId: v.id("rooms"),
		hostPlayerId: v.string(),
	},
	handler: async (ctx, args) => {
		const room = await ctx.db.get(args.roomId);
		if (!room) throw new Error("Room not found");
		if (room.hostPlayerId !== args.hostPlayerId) {
			throw new Error("Only the host can return the game to lobby");
		}

		// Purge submissions for the current round
		const subs = await ctx.db
			.query("submissions")
			.withIndex("by_room_round", (q) =>
				q.eq("roomId", args.roomId).eq("roundNumber", room.currentRound),
			)
			.collect();

		for (const sub of subs) {
			await ctx.db.delete(sub._id);
		}

		await ctx.db.patch(room._id, {
			status: "lobby",
			currentRound: 0,
			winningSubmissionId: undefined,
			roundWinnerPlayerId: undefined,
			gameWinnerPlayerId: undefined,
			scheduledDeletionAt: undefined,
			updatedAt: Date.now(),
		});

		return { success: true };
	},
});

export const restartGame = mutation({
	args: {
		roomId: v.id("rooms"),
		hostPlayerId: v.string(),
	},
	handler: async (ctx, args) => {
		const room = await ctx.db.get(args.roomId);
		if (!room) throw new Error("Room not found");
		if (room.hostPlayerId !== args.hostPlayerId) {
			throw new Error("Only the host can restart the game");
		}

		// Purge all existing submissions in this room
		const allSubs = await ctx.db
			.query("submissions")
			.withIndex("by_room_round", (q) => q.eq("roomId", args.roomId))
			.collect();

		for (const s of allSubs) {
			await ctx.db.delete(s._id);
		}

		const players = await ctx.db
			.query("players")
			.withIndex("by_room", (q) => q.eq("roomId", room._id))
			.collect();

		const connected = players.filter((p) => p.isConnected && !p.isKicked);
		if (connected.length === 0) {
			throw new Error("No connected players in room to restart with");
		}

		// Reset scores and deal fresh starting hands (10 cards)
		let usedWhite: string[] = [];
		for (const p of connected) {
			const { cards, newUsedIds } = drawWhiteCards(room.handSize, usedWhite);
			usedWhite = newUsedIds;
			await ctx.db.patch(p._id, {
				score: 0,
				hand: cards,
			});
		}

		// Draw first black card
		const { card: blackCard, newUsedIds: updatedBlackUsed } =
			getRandomBlackCard([]);

		await ctx.db.patch(room._id, {
			status: "submitting",
			currentRound: 1,
			czarIndex: 0,
			currentCzarId: connected[0].playerId,
			blackCard,
			usedBlackCardIds: updatedBlackUsed,
			usedWhiteCardIds: usedWhite,
			winningSubmissionId: undefined,
			roundWinnerPlayerId: undefined,
			gameWinnerPlayerId: undefined,
			scheduledDeletionAt: undefined,
			updatedAt: Date.now(),
		});

		return { success: true };
	},
});

export const deleteRoom = mutation({
	args: {
		roomId: v.id("rooms"),
		hostPlayerId: v.string(),
	},
	handler: async (ctx, args) => {
		const room = await ctx.db.get(args.roomId);
		if (!room) return { success: true };
		if (room.hostPlayerId !== args.hostPlayerId) {
			throw new Error("Only the host can delete the room");
		}

		await deleteRoomCascade(ctx, args.roomId);
		return { success: true };
	},
});
