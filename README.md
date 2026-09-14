# Recall Deck

A visual memory-training game built with React. Watch a sequence of playing
cards, then rebuild it from a full 52-card deck — in the exact same order.

## How it works

1. **Watch** — a sequence of cards is shown once, left to right.
2. **Memorize** — you get a countdown (or no timer at all, your choice).
3. **Recall** — the cards are hidden. Pick cards from the full deck, in order,
   to reconstruct what you saw.
4. **Score** — you're graded on which cards you remembered *and* whether
   each one landed in the right position.

Position is what matters most: remembering all the right cards in the wrong
order still costs you points.

## Game modes

Chosen from the menu before starting:

- **Normal** — 10 rounds. Round 1 shows 10 cards; each round after that adds
  5 more, up to a full 52-card sequence by round 10.
- **Custom** — pick a single fixed number of cards (4–52) used for every
  round.

Independent of the mode above, you also choose a **timer**:

- **Default** — 10 seconds to memorize.
- **Custom** — set your own number of seconds.
- **No timer** — study the sequence as long as you like, then press a button
  when you're ready to move to recall.

## Scoring

For each round:

- **Correct position** — cards you placed exactly where they appeared in
  the original sequence.
- **Cards remembered** — cards you picked that were somewhere in the
  original sequence, regardless of position.
- **Accuracy** — correct positions ÷ total cards, as a percentage.
- **Level score** — 10 points per correct position, 3 points per
  remembered-but-misplaced card, plus a 100-point bonus for a perfect round.

Scores accumulate into a running total, and a final results screen after the
last round shows your average accuracy, how many rounds were perfect, and
your overall recall rate across the whole run.

## Project structure

```
src/
  App.jsx          entry point — renders the game
  RecallDeck.jsx    all game logic and UI
  styles.css        all styling (felt table / playing-card look)
public/
  cards/            card face images (optional — see below)
```

## Using your own card images

Drop image files into `public/cards/`, one per card, named by a short code:
rank first, then suit letter (`S`/`H`/`D`/`C`) — e.g. `AS.png` (Ace of
Spades), `10H.png` (Ten of Hearts), `KD.png` (King of Diamonds), `2C.png`
(Two of Clubs). 52 files total.

They're picked up automatically — no code changes needed. If a file is
missing for a given card, the game quietly falls back to a simple drawn
card face instead of breaking.

To host images elsewhere (a CDN, an import, etc.) instead of `public/cards/`,
add explicit entries to the `CARD_IMAGES` object near the top of
`RecallDeck.jsx`:

```js
CARD_IMAGES.AS = "https://your-cdn.com/ace-of-spades.png";
```

## Running locally

Requires [Node.js](https://nodejs.org) (v18+).

```bash
npm create vite@latest recall-deck -- --template react
cd recall-deck
npm install
npm install lucide-react
```

Then:

1. Replace `src/App.jsx` with this project's `App.jsx`.
2. Add `RecallDeck.jsx` and `styles.css` to `src/`.
3. (Optional) add your card images to `public/cards/`.

```bash
npm run dev
```

Open the local URL it prints (usually `http://localhost:5173`).

## Tech

- React (hooks-based, no external state library)
- `lucide-react` for icons
- Plain CSS (no framework) — all styling lives in `styles.css`
