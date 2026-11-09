import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { drawWhiteCards } from "./cardsData";

// Helper to generate a unique 6-digit numeric PIN
function generatePin(): string {
	return Math.floor(100000 + Math.random() * 900000).toString();
}

export const createRoom = mutation({
	args: {
		hostNickname: v.string(),
		playerId: v.string(),
		targetScore: v.optional(v.number()),
		randoCardrissian: v.optional(v.boolean()),
	},
	handler: async (ctx, args) => {
		let pin = generatePin();
		let existing = await ctx.db
			.query("rooms")
			.withIndex("by_pin", (q) => q.eq("pin", pin))
			.first();

		while (existing) {
			pin = generatePin();
			existing = await ctx.db
				.query("rooms")
				.withIndex("by_pin", (q) => q.eq("pin", pin))
				.first();
		}

		const roomId = await ctx.db.insert("rooms", {
			pin,
			hostPlayerId: args.playerId,
			status: "lobby",
			currentRound: 0,
			targetScore: args.targetScore ?? 7,
			handSize: 10,
			randoCardrissian: args.randoCardrissian ?? true,
			czarIndex: 0,
			currentCzarId: args.playerId,
			usedBlackCardIds: [],
			usedWhiteCardIds: [],
			updatedAt: Date.now(),
		});

		await ctx.db.insert("players", {
			roomId,
			playerId: args.playerId,
			nickname: args.hostNickname.trim() || "Host",
			avatarSeed: args.playerId.slice(0, 8),
			score: 0,
			hand: [],
			isHost: true,
			isConnected: true,
			lastSeen: Date.now(),
		});

		return { roomId, pin, playerId: args.playerId };
	},
});

export const joinRoom = mutation({
	args: {
		pin: v.string(),
		nickname: v.string(),
		playerId: v.string(),
	},
	handler: async (ctx, args) => {
		const cleanPin = args.pin.trim();
		const room = await ctx.db
			.query("rooms")
			.withIndex("by_pin", (q) => q.eq("pin", cleanPin))
			.first();

		if (!room) {
			throw new Error(`Room with PIN ${cleanPin} not found.`);
		}

		// Check if player already exists in room (allow reconnect even if game_over)
		const existingPlayer = await ctx.db
			.query("players")
			.withIndex("by_room_player", (q) =>
				q.eq("roomId", room._id).eq("playerId", args.playerId),
			)
			.first();

		if (existingPlayer) {
			await ctx.db.patch(existingPlayer._id, {
				nickname: args.nickname.trim() || existingPlayer.nickname,
				isConnected: true,
				lastSeen: Date.now(),
			});
			return { roomId: room._id, pin: room.pin, playerId: args.playerId };
		}

		if (room.status === "game_over") {
			throw new Error("This game has already ended.");
		}

		// If joining mid-game, deal them a starting hand of 10 cards so they don't block the round
		let initialHand: Array<{ id: string; text: string }> = [];
		if (room.status !== "lobby") {
			const { cards, newUsedIds } = drawWhiteCards(
				room.handSize,
				room.usedWhiteCardIds,
			);
			initialHand = cards;
			await ctx.db.patch(room._id, { usedWhiteCardIds: newUsedIds });
		}

		// Add new player
		await ctx.db.insert("players", {
			roomId: room._id,
			playerId: args.playerId,
			nickname:
				args.nickname.trim() || `Player ${Math.floor(10 + Math.random() * 90)}`,
			avatarSeed: args.playerId.slice(0, 8),
			score: 0,
			hand: initialHand,
			isHost: false,
			isConnected: true,
			lastSeen: Date.now(),
		});

		return { roomId: room._id, pin: room.pin, playerId: args.playerId };
	},
});

export const updateNickname = mutation({
	args: {
		roomId: v.id("rooms"),
		playerId: v.string(),
		newNickname: v.string(),
	},
	handler: async (ctx, args) => {
		const cleanName = args.newNickname.trim().slice(0, 24);
		if (!cleanName) {
			throw new Error("Display name cannot be empty.");
		}

		const player = await ctx.db
			.query("players")
			.withIndex("by_room_player", (q) =>
				q.eq("roomId", args.roomId).eq("playerId", args.playerId),
			)
			.first();

		if (!player) {
			throw new Error("Player not found in this room.");
		}

		await ctx.db.patch(player._id, {
			nickname: cleanName,
			lastSeen: Date.now(),
		});

		// Update player's active submission name for the current round if one exists
		const room = await ctx.db.get(args.roomId);
		if (room) {
			const sub = await ctx.db
				.query("submissions")
				.withIndex("by_room_round_player", (q) =>
					q
						.eq("roomId", args.roomId)
						.eq("roundNumber", room.currentRound)
						.eq("playerId", args.playerId),
				)
				.first();

			if (sub) {
				await ctx.db.patch(sub._id, { playerName: cleanName });
			}
		}

		return { success: true, nickname: cleanName };
	},
});

export const getRoom = query({
	args: { roomId: v.id("rooms") },
	handler: async (ctx, args) => {
		return await ctx.db.get(args.roomId);
	},
});

export const getRoomByPin = query({
	args: { pin: v.string() },
	handler: async (ctx, args) => {
		return await ctx.db
			.query("rooms")
			.withIndex("by_pin", (q) => q.eq("pin", args.pin.trim()))
			.first();
	},
});

export const getRoomState = query({
	args: {
		roomId: v.id("rooms"),
		playerId: v.string(),
	},
	handler: async (ctx, args) => {
		const room = await ctx.db.get(args.roomId);
		if (!room) return null;

		const allPlayers = await ctx.db
			.query("players")
			.withIndex("by_room", (q) => q.eq("roomId", args.roomId))
			.collect();

		const self = allPlayers.find((p) => p.playerId === args.playerId) ?? null;
		const isCzar = self?.playerId === room.currentCzarId;

		// Sanitize players info (derive isHost dynamically from room.hostPlayerId)
		const publicPlayers = allPlayers.map((p) => ({
			_id: p._id,
			playerId: p.playerId,
			nickname: p.nickname,
			avatarSeed: p.avatarSeed,
			score: p.score,
			cardCount: p.hand.length,
			isHost: p.playerId === room.hostPlayerId,
			isConnected: p.isConnected,
			isCzar: p.playerId === room.currentCzarId,
			hasSubmitted: false,
		}));

		// Fetch submissions for current round
		const rawSubmissions = await ctx.db
			.query("submissions")
			.withIndex("by_room_round", (q) =>
				q.eq("roomId", args.roomId).eq("roundNumber", room.currentRound),
			)
			.collect();

		// Mark who has submitted
		for (const sub of rawSubmissions) {
			const p = publicPlayers.find((pl) => pl.playerId === sub.playerId);
			if (p) p.hasSubmitted = true;
		}

		// PRIVACY & ANONYMITY CONTROLS
		// Phase 1: During "submitting", hide other players' cards completely!
		// Czar sees no submissions. Players see only their own submission.
		let eligibleSubmissions = rawSubmissions;

		if (room.status === "submitting") {
			eligibleSubmissions = rawSubmissions.filter(
				(s) => s.playerId === args.playerId,
			);
		} else if (room.status === "judging") {
			// Sort deterministically by revealOrder or random index so insertion order is never leaked
			eligibleSubmissions = [...rawSubmissions].sort((a, b) => {
				const orderA = a.revealOrder ?? 0;
				const orderB = b.revealOrder ?? 0;
				return orderA - orderB;
			});
		}

		const isResolved =
			room.status === "round_over" || room.status === "game_over";

		const submissions = eligibleSubmissions.map((s) => {
			const isSelf = s.playerId === args.playerId;

			// During judging, redact unrevealed cards for non-submitters
			const safeCards =
				room.status === "judging" && !s.isRevealed && !isSelf
					? s.cards.map((c) => ({ id: c.id, text: "???" }))
					: s.cards;

			return {
				_id: s._id,
				roundNumber: s.roundNumber,
				playerId: isResolved || isSelf ? s.playerId : "anonymous",
				playerName: isResolved
					? s.playerName
					: isSelf
						? "You"
						: "Anonymous Player",
				cards: safeCards,
				isRevealed: s.isRevealed,
				isWinner: room.winningSubmissionId === s._id,
				isSelf,
			};
		});

		// Strip internal used deck lists from the room object sent to clients to prevent opponent hand leakage
		const safeRoom = {
			_id: room._id,
			pin: room.pin,
			hostPlayerId: room.hostPlayerId,
			status: room.status,
			currentRound: room.currentRound,
			targetScore: room.targetScore,
			handSize: room.handSize,
			randoCardrissian: room.randoCardrissian,
			czarIndex: room.czarIndex,
			currentCzarId: room.currentCzarId,
			blackCard: room.blackCard,
			winningSubmissionId: room.winningSubmissionId,
			roundWinnerPlayerId: room.roundWinnerPlayerId,
			gameWinnerPlayerId: room.gameWinnerPlayerId,
			updatedAt: room.updatedAt,
		};

		return {
			room: safeRoom,
			players: publicPlayers,
			self,
			submissions,
			isCzar,
			roundNumber: room.currentRound,
		};
	},
});
