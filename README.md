# Cards Against Humanity — Digitized Multiplayer Web Edition

> **Note on Authorship**: This entire project was created, designed, digitized, adversarially red-teamed, and built **completely by an AI coding assistant (Google DeepMind's Antigravity / Gemini)** rather than written manually by the repository owner. From OCR card extraction to Convex reactive backend architecture, Biome setup, adversarial security audits, and tactile frontend micro-interactions, every line of code was generated autonomously.

A sleek, tactile, and responsive multiplayer web digitization of the popular party game **Cards Against Humanity**, playable with friends across phones, tablets, and desktop devices via a simple 6-digit room PIN.

---

## Features

- **Direct PDF Digitization**: 100 Black cards and 503 White cards extracted directly from the official print-at-home PDF using optical character recognition (`rapidocr` and `PyMuPDF`).
- **Dual-Mode Multiplayer Architecture**:
  - **Live Convex Backend**: Real-time WebSocket synchronization, atomic dealing, and server-side authorization powered by [Convex](https://www.convex.dev/).
  - **Zero-Config Local Simulation**: Seamless offline testing and multi-tab play powered by `BroadcastChannel` and `localStorage`, with automated AI bots like *Rando Cardrissian*.
- **Tactile Card Experience**:
  - Realistic 3D card flips during the Card Czar judging phase.
  - Zero-dependency Web Audio procedural sound synthesizer (dealing cards, pops, card flips, win chords).
  - Safe tokenized text rendering for blank fill-in lines (`_____`).
- **Strict Blind Anonymity**:
  - Card submissions remain 100% anonymous to all players (including the Czar) until the winning card is crowned.
  - Shuffled presentation order to prevent submitter deduction.
- **Full Rules & House Variants**:
  - **PICK 2 Mechanics**: Support for multi-blank cards with interactive numbered ordering badges (`1`, `2`).
  - **Rando Cardrissian**: Ghost player bot that automatically plays random cards into the judging pool each round.
  - **House Rules Included**: Meritocracy, Gambling, Re-Booting the Hand, and Never Have I Ever.
  - Dedicated `/rules` route and accessible in-game modal dialogs.
- **Player Customization**:
  - Set and update your in-game display name at any point (on landing, in the lobby, or mid-match).
  - Randomized name generator for hilarious Cards Against Humanity aliases.
- **Code Quality & Tooling**:
  - Formatted and linted with **Biome** (`@biomejs/biome`).
  - Built with SvelteKit and Svelte 5 Runes (`$state`, `$derived`, `$effect`).
  - Styled with Tailwind CSS v4.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | [SvelteKit](https://kit.svelte.dev/) (Svelte 5 Runes) |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) |
| **Backend & Sync** | [Convex](https://www.convex.dev/) |
| **Linter & Formatter** | [Biome](https://biomejs.dev/) |
| **Audio Engine** | Web Audio API (procedural synthesis) |
| **Icons** | [Lucide Svelte](https://lucide.dev/) |
| **Package Manager** | [Bun](https://bun.sh/) |

---

## Getting Started

### Prerequisites
- [Bun](https://bun.sh/) installed on your machine.

### 1. Installation
Clone the repository and install dependencies:
```bash
git clone https://github.com/DarshGupta16/cards-against-humanity.git
cd cards-against-humanity
bun install
```

### 2. Environment Setup (Optional for Convex Live Backend)
The project runs out of the box in simulation mode without any external accounts.

To connect to a live Convex deployment:
```bash
cp .env.example .env
bunx convex dev
```
Follow the CLI prompt to log in and set up your Convex project, then copy the generated deployment URL into `.env`:
```env
PUBLIC_CONVEX_URL="https://your-deployment-name.convex.cloud"
```

### 3. Run Development Server
```bash
bun run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Project Scripts

| Command | Description |
|---|---|
| `bun run dev` | Starts Vite dev server with hot module replacement |
| `bun run build` | Builds the production bundle |
| `bun run preview` | Previews the production build locally |
| `bun run lint` | Runs Biome code checks across the codebase |
| `bun run format` | Runs Biome code formatter |

---

## Project Structure

```
├── convex/                     # Convex backend functions and schema
│   ├── schema.ts               # Database schema (rooms, players, submissions)
│   ├── rooms.ts                # Room creation, joining, PIN query, state subscriptions
│   ├── game.ts                 # Game state transitions, card dealing, judging, scores
│   ├── cardsData.ts            # Active-hand tracking and reshuffling logic
│   └── cards.json              # 603 digitized cards (100 black, 503 white)
├── src/
│   ├── lib/
│   │   ├── components/         # Svelte UI components
│   │   │   ├── Card.svelte             # Tactile 3D card component with flip mode
│   │   │   ├── Landing.svelte          # Room creation and PIN join forms
│   │   │   ├── Lobby.svelte            # Waiting room, player roster, host controls
│   │   │   ├── GameTable.svelte        # Active table, Czar stage, dock, scoreboard
│   │   │   ├── RulesModal.svelte       # Accessible rules popup modal
│   │   │   ├── RulesContent.svelte     # Shared rulebook content
│   │   │   └── EditDisplayNameModal.svelte # Display name editor with name generator
│   │   ├── audio.ts            # Zero-dependency procedural Web Audio synthesizer
│   │   ├── convex.ts           # Convex client initializer
│   │   ├── gameStore.svelte.ts # Svelte 5 reactive game client (Convex + Simulation)
│   │   └── data/cards.json     # Client-side card dataset fallback
│   └── routes/
│       ├── +layout.svelte      # Root layout and global typography
│       ├── +page.svelte        # Main game routing state machine
│       ├── layout.css          # Tailwind CSS v4 and custom 3D card perspective
│       └── rules/              # Dedicated standalone rulebook route (/rules)
├── biome.json                  # Biome linter and formatter configuration
├── package.json
└── README.md
```

---

## License & Attribution

Cards Against Humanity is distributed under the [Creative Commons Attribution-NonCommercial-ShareAlike 2.0 Generic (CC BY-NC-SA 2.0)](https://creativecommons.org/licenses/by-nc-sa/2.0/) license. This digital adaptation is intended solely for personal, non-commercial entertainment.
