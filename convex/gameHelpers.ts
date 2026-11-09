import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

/**
 * Checks whether all active non-Czar players (and bot if enabled) have submitted their cards
 * for the current round. If so, randomizes submission reveal order and transitions the room to "judging".
 *
 * @returns boolean indicating whether the room transitioned to "judging".
 */
export async function checkAndTransitionToJudging(
	ctx: MutationCtx,
	roomId: Id<"rooms">,
	currentRound: number,
	currentCzarId: string,
	randoCardrissian: boolean,
	remainingPlayers?: Doc<"players">[],
): Promise<boolean> {
	let players = remainingPlayers;
	if (!players) {
		players = await ctx.db
			.query("players")
			.withIndex("by_room", (q) => q.eq("roomId", roomId))
			.filter((q) =>
				q.and(
					q.eq(q.field("isConnected"), true),
					q.neq(q.field("isKicked"), true),
				),
			)
			.collect();
	}

	const activeNonCzar = players.filter(
		(p) => p.playerId !== currentCzarId && p.isConnected,
	);

	const allSubmissions = await ctx.db
		.query("submissions")
		.withIndex("by_room_round", (q) =>
			q.eq("roomId", roomId).eq("roundNumber", currentRound),
		)
		.collect();

	const allHumansSubmitted = activeNonCzar.every((p) =>
		allSubmissions.some((s) => s.playerId === p.playerId),
	);

	const randoSubmitted =
		!randoCardrissian || allSubmissions.some((s) => s.playerId === "rando");

	if (allHumansSubmitted && randoSubmitted && activeNonCzar.length > 0) {
		// Transition to judging and randomize reveal order (SEC-02)
		const shuffledSubmissions = [...allSubmissions].sort(
			() => Math.random() - 0.5,
		);
		for (let i = 0; i < shuffledSubmissions.length; i++) {
			await ctx.db.patch(shuffledSubmissions[i]._id, { revealOrder: i });
		}

		await ctx.db.patch(roomId, {
			status: "judging",
			updatedAt: Date.now(),
		});

		return true;
	}

	return false;
}
