import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
	rooms: defineTable({
		pin: v.string(), // 6-digit room PIN, e.g. "492018"
		hostPlayerId: v.string(),
		status: v.union(
			v.literal("lobby"),
			v.literal("submitting"),
			v.literal("judging"),
			v.literal("round_over"),
			v.literal("game_over"),
		),
		currentRound: v.number(),
		targetScore: v.number(),
		handSize: v.number(),
		randoCardrissian: v.boolean(),
		czarIndex: v.number(),
		currentCzarId: v.string(),
		blackCard: v.optional(
			v.object({
				id: v.string(),
				text: v.string(),
				pick: v.number(),
			}),
		),
		usedBlackCardIds: v.array(v.string()),
		usedWhiteCardIds: v.array(v.string()),
		winningSubmissionId: v.optional(v.string()),
		roundWinnerPlayerId: v.optional(v.string()),
		gameWinnerPlayerId: v.optional(v.string()),
		blockedPlayerIds: v.optional(v.array(v.string())),
		scheduledDeletionAt: v.optional(v.number()),
		updatedAt: v.number(),
	}).index("by_pin", ["pin"]),

	players: defineTable({
		roomId: v.id("rooms"),
		playerId: v.string(),
		nickname: v.string(),
		avatarSeed: v.string(),
		score: v.number(),
		hand: v.array(
			v.object({
				id: v.string(),
				text: v.string(),
			}),
		),
		isHost: v.boolean(),
		isConnected: v.boolean(),
		isKicked: v.optional(v.boolean()),
		lastSeen: v.number(),
	})
		.index("by_room", ["roomId"])
		.index("by_room_player", ["roomId", "playerId"]),

	submissions: defineTable({
		roomId: v.id("rooms"),
		roundNumber: v.number(),
		playerId: v.string(),
		playerName: v.string(),
		cards: v.array(
			v.object({
				id: v.string(),
				text: v.string(),
			}),
		),
		isRevealed: v.boolean(),
		revealOrder: v.optional(v.number()),
	})
		.index("by_room_round", ["roomId", "roundNumber"])
		.index("by_room_round_player", ["roomId", "roundNumber", "playerId"]),
});
