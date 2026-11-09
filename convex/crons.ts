import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Daily automated cleanup: sweeps abandoned ghost rooms once every 24 hours at 03:00 UTC
// Consumes exactly 30 function calls per month (0.003% of Convex Free Tier allowance)
crons.daily(
	"purge-abandoned-ghost-rooms",
	{ hourUTC: 3, minuteUTC: 0 },
	internal.cleanup.purgeAbandonedRooms,
);

export default crons;
