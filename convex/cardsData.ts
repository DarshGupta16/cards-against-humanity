import cardsData from "./cards.json";

export interface BlackCard {
	id: string;
	text: string;
	pick: number;
}

export interface WhiteCard {
	id: string;
	text: string;
}

export const ALL_BLACK_CARDS: BlackCard[] = cardsData.black;
export const ALL_WHITE_CARDS: WhiteCard[] = cardsData.white;

export function getRandomBlackCard(usedIds: string[]): {
	card: BlackCard;
	newUsedIds: string[];
} {
	let available = ALL_BLACK_CARDS.filter((c) => !usedIds.includes(c.id));
	let currentUsed = usedIds;
	if (available.length === 0) {
		available = [...ALL_BLACK_CARDS];
		currentUsed = [];
	}
	const idx = Math.floor(Math.random() * available.length);
	const card = available[idx];
	return {
		card,
		newUsedIds: [...currentUsed, card.id],
	};
}

export function drawWhiteCards(
	count: number,
	usedIds: string[],
	activeHandCardIds: string[] = [],
): { cards: WhiteCard[]; newUsedIds: string[] } {
	let available = ALL_WHITE_CARDS.filter((c) => !usedIds.includes(c.id));
	let currentUsed = usedIds;

	// If running low on cards, recycle discard pile while strictly protecting cards in active hands
	if (available.length < count) {
		const activeSet = new Set(activeHandCardIds);
		available = ALL_WHITE_CARDS.filter((c) => !activeSet.has(c.id));
		currentUsed = [...activeHandCardIds];
	}

	// Fisher-Yates shuffle
	const shuffled = [...available];
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
	}

	const drawn = shuffled.slice(0, count);
	return {
		cards: drawn,
		newUsedIds: [...currentUsed, ...drawn.map((c) => c.id)],
	};
}
