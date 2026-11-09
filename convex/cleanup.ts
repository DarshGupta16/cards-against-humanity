import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { internalMutation, type MutationCtx } from "./_generated/server";

// Cascade delete helper: removes a room and all its associated player and submission records
export async function deleteRoomCascade(
	ctx: MutationCtx,
	roomId: Id<"rooms">,
): Promise<void> {
	// 1. Delete all submissions for this room
	const submissions = await ctx.db
		.query("submissions")
		.withIndex("by_room_round", (q) => q.eq("roomId", roomId))
		.collect();

	for (const sub of submissions) {
		await ctx.db.delete(sub._id);
	}

	// 2. Delete all players in this room
	const players = await ctx.db
		.query("players")
		.withIndex("by_room", (q) => q.eq("roomId", roomId))
		.collect();

	for (const player of players) {
		await ctx.db.delete(player._id);
	}

	// 3. Delete the room document itself
	const room = await ctx.db.get(roomId);
	if (room) {
		await ctx.db.delete(roomId);
	}
}

// Internal mutation scheduled to run 5 minutes after a match hits game_over
export const purgeRoomAfterGameOver = internalMutation({
	args: {
		roomId: v.id("rooms"),
	},
	handler: async (ctx, args) => {
		const room = await ctx.db.get(args.roomId);
		if (!room) return { success: true };

		// Only purge if room is still in game_over (if host restarted or returned to lobby, keep it)
		if (room.status === "game_over") {
			await deleteRoomCascade(ctx, args.roomId);
		}

		return { success: true };
	},
});

// Daily cleanup mutation: purges any ghost rooms abandoned for more than 6 hours
export const purgeAbandonedRooms = internalMutation({
	args: {},
	handler: async (ctx) => {
		const sixHoursAgo = Date.now() - 6 * 60 * 60 * 1000;

		const staleRooms = await ctx.db
			.query("rooms")
			.filter((q) => q.lt(q.field("updatedAt"), sixHoursAgo))
			.collect();

		let purgedCount = 0;
		for (const room of staleRooms) {
			await deleteRoomCascade(ctx, room._id);
			purgedCount++;
		}

		return { purgedRooms: purgedCount };
	},
});
