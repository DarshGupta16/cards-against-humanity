import type { Player } from "#lib/gameStore.svelte";

class ModalStore {
	public rulesOpen = $state(false);
	public editNameOpen = $state(false);
	public kickTargetPlayer = $state<Player | null>(null);

	public openRules() {
		this.rulesOpen = true;
	}

	public closeRules() {
		this.rulesOpen = false;
	}

	public openEditName() {
		this.editNameOpen = true;
	}

	public closeEditName() {
		this.editNameOpen = false;
	}

	public openKick(player: Player) {
		this.kickTargetPlayer = player;
	}

	public closeKick() {
		this.kickTargetPlayer = null;
	}
}

export const modalStore = new ModalStore();
