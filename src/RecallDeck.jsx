import { useState, useEffect, useRef, useMemo } from "react";
import { Play, X, RotateCcw, Check, Trash2, Home } from "lucide-react";
import "./styles.css";

/* ---------------------------------------------------------
   Deck construction
--------------------------------------------------------- */
const SUITS = [
  { symbol: "♠", letter: "S", name: "Spades", color: "ink" },
  { symbol: "♥", letter: "H", name: "Hearts", color: "red" },
  { symbol: "♦", letter: "D", name: "Diamonds", color: "red" },
  { symbol: "♣", letter: "C", name: "Clubs", color: "ink" },
];
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

function buildDeck() {
  const deck = [];
  SUITS.forEach((s) => {
    RANKS.forEach((r) => {
      // `code` is the filename-friendly key (e.g. "AS", "10H", "KD") used to look up an image.
      deck.push({ id: `${r}${s.symbol}`, code: `${r}${s.letter}`, rank: r, suit: s.symbol, suitName: s.name, color: s.color });
    });
  });
  return deck;
}

/* ---------------------------------------------------------
   Card images
   -----------------------------------------------------------
   Drop your own card images into /public/cards/ named by code,
   e.g. public/cards/AS.png, public/cards/10H.png, public/cards/KD.png,
   public/cards/2C.svg ... one file per card (52 total). They'll be
   picked up automatically — no code changes needed.

   Prefer to host them elsewhere (a CDN, an import, etc.) instead?
   Add explicit entries here and they'll take priority over the
   /cards/ convention, e.g.:
     CARD_IMAGES.AS = "https://your-cdn.com/ace-of-spades.png";
--------------------------------------------------------- */
const CARD_IMAGES = {};
const cardImageSrc = (card) => CARD_IMAGES[card.code] || `${import.meta.env.BASE_URL}cards/${card.code}.png`;  

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const TOTAL_LEVELS = 10;
const DEFAULT_TIMER_SECONDS = 10;
const MIN_CUSTOM_CARDS = 4;
const MAX_CUSTOM_CARDS = 52;
const MIN_CUSTOM_SECONDS = 3;
const MAX_CUSTOM_SECONDS = 300;
const NORMAL_START_CARDS = 10;
const NORMAL_STEP_CARDS = 5; // Normal mode adds 5 cards per level

// Normal mode: starts at 10 cards, +5 each level, capped at a full 52-card deck.
const normalCardCountFor = (level) => Math.min(MAX_CUSTOM_CARDS, NORMAL_START_CARDS + (level - 1) * NORMAL_STEP_CARDS);

function cardCountFor(level, settings) {
  return settings.gameMode === "custom" ? settings.customCardCount : normalCardCountFor(level);
}

// Returns seconds to memorize, or null for an untimed round.
function memorizationSeconds(settings) {
  if (settings.timerMode === "none") return null;
  if (settings.timerMode === "custom") return settings.customSeconds;
  return DEFAULT_TIMER_SECONDS;
}

/* ---------------------------------------------------------
   Presentational pieces
--------------------------------------------------------- */
const RANK_VALUE = { A: 1, J: 11, Q: 12, K: 13 };
const FACE_LETTERS = { J: "J", Q: "Q", K: "K" };

// Build the row structure for a pip layout: an array of "pair" | "single" rows.
function pipRows(rank) {
  const value = RANK_VALUE[rank] ?? parseInt(rank, 10);
  if (value >= 11) return null; // face cards don't use a pip grid
  const pairs = Math.floor(value / 2);
  const rows = Array.from({ length: pairs }, () => "pair");
  if (value % 2 === 1) rows.splice(Math.floor(rows.length / 2), 0, "single");
  return rows;
}

function CardPips({ suit }) {
  return (
    <>
      <span className="mt-pip">{suit}</span>
      <span className="mt-pip">{suit}</span>
    </>
  );
}

function CardCenter({ card }) {
  const value = RANK_VALUE[card.rank] ?? parseInt(card.rank, 10);

  if (value === 1) {
    // Ace: one large centered pip
    return <span className="mt-card__ace">{card.suit}</span>;
  }

  if (value >= 11) {
    // Face card: framed letter with a small pip
    return (
      <span className="mt-card__face">
        <span className="mt-card__faceFrame" />
        <span className="mt-card__faceLetter">{FACE_LETTERS[card.rank]}</span>
        <span className="mt-card__facePip">{card.suit}</span>
        <span className="mt-card__faceFrame mt-card__faceFrame--bottom" />
      </span>
    );
  }

  const rows = pipRows(card.rank);
  const half = Math.ceil(rows.length / 2);
  return (
    <span className="mt-card__pipGrid">
      {rows.map((kind, i) => (
        <span key={i} className={`mt-pipRow mt-pipRow--${kind} ${i >= half ? "mt-pipRow--flip" : ""}`}>
          {kind === "pair" ? <CardPips suit={card.suit} /> : <span className="mt-pip">{card.suit}</span>}
        </span>
      ))}
    </span>
  );
}

function CardFace({ card, width = 52, faded = false, tone = null, onClick, index = 0, reveal = false, disabled = false }) {
  const isRed = card.color === "red";
  const toneClass = tone ? `mt-card--${tone}` : "";
  // Try a real card image first; if it fails to load (or none was supplied), fall back to the drawn face.
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || !onClick}
      className={`mt-card ${isRed ? "mt-card--red" : "mt-card--ink"} ${faded ? "mt-card--faded" : ""} ${toneClass} ${reveal ? "mt-card--reveal" : ""} ${onClick ? "mt-card--interactive" : ""}`}
      style={{ "--card-w": `${width}px`, animationDelay: reveal ? `${Math.min(index * 22, 550)}ms` : undefined }}
      aria-label={`${card.rank} of ${card.suitName}`}
    >
      {!imageFailed ? (
        <img
          className="mt-card__img"
          src={cardImageSrc(card)}
          alt={`${card.rank} of ${card.suitName}`}
          draggable={false}
          onError={() => setImageFailed(true)}
        />
      ) : (
        <>
          <span className="mt-card__corner mt-card__corner--tl">
            {card.rank}
            <br />
            {card.suit}
          </span>
          <CardCenter card={card} />
          <span className="mt-card__corner mt-card__corner--br">
            {card.rank}
            <br />
            {card.suit}
          </span>
        </>
      )}
    </button>
  );
}

function EmptySlot({ width = 52, index }) {
  return (
    <div className="mt-slot" style={{ "--card-w": `${width}px` }}>
      <span className="mt-slot__num">{index + 1}</span>
    </div>
  );
}

function ProgressDots({ level }) {
  return (
    <div className="mt-dots" aria-label={`Level ${level} of ${TOTAL_LEVELS}`}>
      {Array.from({ length: TOTAL_LEVELS }, (_, i) => i + 1).map((n) => (
        <span
          key={n}
          className={`mt-dot ${n < level ? "mt-dot--done" : ""} ${n === level ? "mt-dot--now" : ""}`}
        />
      ))}
    </div>
  );
}

function Stat({ value, label }) {
  return (
    <div className="mt-stat">
      <div className="mt-stat__value">{value}</div>
      <div className="mt-stat__label">{label}</div>
    </div>
  );
}

/* ---------------------------------------------------------
   Main game
--------------------------------------------------------- */
export default function MemoryCardGame() {
  const fullDeck = useMemo(() => buildDeck(), []);

  const [phase, setPhase] = useState("menu"); // menu | level_start | memorization | recall | results | final_results
  const [level, setLevel] = useState(1);
  const [sequence, setSequence] = useState([]);
  const [playerSequence, setPlayerSequence] = useState([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [levelResults, setLevelResults] = useState([]);
  const [totalScore, setTotalScore] = useState(0);

  // Game setup, chosen on the menu screen.
  const [gameMode, setGameMode] = useState("normal"); // "normal" | "custom"
  const [customCardCount, setCustomCardCount] = useState(15);
  const [timerMode, setTimerMode] = useState("default"); // "default" | "custom" | "none"
  const [customSeconds, setCustomSeconds] = useState(DEFAULT_TIMER_SECONDS);
  const settings = { gameMode, customCardCount, timerMode, customSeconds };

  const count = cardCountFor(level, settings);

  const startGame = () => {
    setLevel(1);
    setLevelResults([]);
    setTotalScore(0);
    setPhase("level_start");
  };

  const beginMemorization = () => {
    const c = cardCountFor(level, settings);
    const newSeq = shuffle(fullDeck).slice(0, c);
    const t = memorizationSeconds(settings); // seconds, or null when untimed
    setSequence(newSeq);
    setPlayerSequence([]);
    setTotalTime(t ?? 0);
    setTimeLeft(t ?? 0);
    setPhase("memorization");
  };

  useEffect(() => {
    if (phase !== "memorization") return;
    if (timerMode === "none") return; // untimed — the player advances manually
    if (timeLeft <= 0) {
      setPhase("recall");
      return;
    }
    const id = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(id);
  }, [phase, timeLeft, timerMode]);

  const finishMemorizing = () => {
    setPlayerSequence([]);
    setPhase("recall");
  };

  const selectCard = (card) => {
    if (phase !== "recall") return;
    if (playerSequence.length >= count) return;
    if (playerSequence.some((c) => c.id === card.id)) return;
    setPlayerSequence((p) => [...p, card]);
  };

  const removeAt = (index) => {
    setPlayerSequence((p) => p.filter((_, i) => i !== index));
  };

  const clearAnswer = () => setPlayerSequence([]);

  const submitAnswer = () => {
    if (playerSequence.length !== count) return;
    let correctPositions = 0;
    for (let i = 0; i < count; i++) {
      if (playerSequence[i] && sequence[i] && playerSequence[i].id === sequence[i].id) correctPositions++;
    }
    const cardsRemembered = playerSequence.filter((pc) => sequence.some((s) => s.id === pc.id)).length;
    const accuracy = Math.round((correctPositions / count) * 100);
    const perfect = correctPositions === count;
    const levelScore = correctPositions * 10 + (cardsRemembered - correctPositions) * 3 + (perfect ? 100 : 0);

    const result = {
      level,
      count,
      sequence,
      playerSequence: [...playerSequence],
      correctPositions,
      cardsRemembered,
      accuracy,
      levelScore,
      perfect,
    };
    setLevelResults((r) => [...r, result]);
    setTotalScore((s) => s + levelScore);
    setPhase("results");
  };

  const goNextLevel = () => {
    if (level >= TOTAL_LEVELS) {
      setPhase("final_results");
      return;
    }
    setLevel((l) => l + 1);
    setPhase("level_start");
  };

  const restart = () => {
    setPhase("menu");
    setLevel(1);
    setLevelResults([]);
    setTotalScore(0);
    setSequence([]);
    setPlayerSequence([]);
  };

  const timerPct = totalTime > 0 ? (timeLeft / totalTime) * 100 : 0;
  const lastResult = levelResults[levelResults.length - 1];

  const finalStats = useMemo(() => {
    if (levelResults.length === 0) return null;
    const avgAccuracy = Math.round(
      levelResults.reduce((sum, r) => sum + r.accuracy, 0) / levelResults.length
    );
    const perfectLevels = levelResults.filter((r) => r.perfect).length;
    const totalCorrect = levelResults.reduce((sum, r) => sum + r.correctPositions, 0);
    const totalPresented = levelResults.reduce((sum, r) => sum + r.count, 0);
    const overall = Math.round((totalCorrect / totalPresented) * 100);
    return {
      avgAccuracy,
      perfectLevels,
      highestLevel: levelResults.length,
      totalCorrect,
      totalPresented,
      overall,
    };
  }, [levelResults]);

  return (
    <div className="mt-root">
      <div className="mt-table">
        <header className="mt-header">
          <div className="mt-brand">Recall Deck</div>
          {phase !== "menu" && phase !== "final_results" && (
            <div className="mt-header__right">
              <span className="mt-header__score">Score {totalScore}</span>
              {phase !== "level_start" && (
                <button className="mt-btn mt-btn-ghost mt-btn-sm" onClick={restart}>
                  <Home size={14} /> Quit
                </button>
              )}
            </div>
          )}
        </header>

        {phase === "menu" && (
          <section className="mt-panel mt-panel--center">
            <h1 className="mt-title">Watch closely. Remember the order.</h1>
            <p className="mt-copy">
              Ten rounds, each one a longer run of cards than the last by default — or set your
              own card count and timer below. You'll see the sequence once, then rebuild it from
              a full deck. Position is everything.
            </p>

            <div className="mt-setup">
              <div className="mt-modeToggle">
                <button
                  type="button"
                  className={`mt-modeCard ${gameMode === "normal" ? "mt-modeCard--active" : ""}`}
                  onClick={() => setGameMode("normal")}
                >
                  <span className="mt-modeCard__title">Normal</span>
                  <span className="mt-modeCard__desc">10 rounds, starting at 10 cards and adding 5 more each round.</span>
                </button>
                <button
                  type="button"
                  className={`mt-modeCard ${gameMode === "custom" ? "mt-modeCard--active" : ""}`}
                  onClick={() => setGameMode("custom")}
                >
                  <span className="mt-modeCard__title">Custom</span>
                  <span className="mt-modeCard__desc">Set your own fixed number of cards for every round.</span>
                </button>
              </div>

              {gameMode === "custom" && (
                <div className="mt-setupRow">
                  <span className="mt-setupRow__label">Number of cards (every round)</span>
                  <input
                    type="number"
                    className="mt-numberInput"
                    min={MIN_CUSTOM_CARDS}
                    max={MAX_CUSTOM_CARDS}
                    value={customCardCount}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      setCustomCardCount(
                        Number.isNaN(v) ? MIN_CUSTOM_CARDS : Math.min(MAX_CUSTOM_CARDS, Math.max(MIN_CUSTOM_CARDS, v))
                      );
                    }}
                  />
                </div>
              )}

              <div className="mt-setupRow">
                <span className="mt-setupRow__label">Memorization timer</span>
                <div className="mt-segmented">
                  <button
                    type="button"
                    className={`mt-segmented__btn ${timerMode === "default" ? "mt-segmented__btn--active" : ""}`}
                    onClick={() => setTimerMode("default")}
                  >
                    Default ({DEFAULT_TIMER_SECONDS}s)
                  </button>
                  <button
                    type="button"
                    className={`mt-segmented__btn ${timerMode === "custom" ? "mt-segmented__btn--active" : ""}`}
                    onClick={() => setTimerMode("custom")}
                  >
                    Custom
                  </button>
                  <button
                    type="button"
                    className={`mt-segmented__btn ${timerMode === "none" ? "mt-segmented__btn--active" : ""}`}
                    onClick={() => setTimerMode("none")}
                  >
                    No timer
                  </button>
                </div>
              </div>

              {timerMode === "custom" && (
                <div className="mt-setupRow">
                  <span className="mt-setupRow__label">Seconds to memorize</span>
                  <input
                    type="number"
                    className="mt-numberInput"
                    min={MIN_CUSTOM_SECONDS}
                    max={MAX_CUSTOM_SECONDS}
                    value={customSeconds}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      setCustomSeconds(
                        Number.isNaN(v) ? MIN_CUSTOM_SECONDS : Math.min(MAX_CUSTOM_SECONDS, Math.max(MIN_CUSTOM_SECONDS, v))
                      );
                    }}
                  />
                </div>
              )}
            </div>

            <button className="mt-btn mt-btn-primary mt-btn-lg" onClick={startGame}>
              <Play size={18} /> Begin
            </button>
          </section>
        )}

        {phase === "level_start" && (
          <section className="mt-panel mt-panel--center">
            <ProgressDots level={level} />
            <div className="mt-level-num">Level {level}</div>
            <p className="mt-copy">
              Memorize these <strong>{count}</strong> cards in order.{" "}
              {timerMode === "none"
                ? "Take as long as you need — you'll move on yourself."
                : `You'll have ${memorizationSeconds(settings)} seconds.`}
            </p>
            <button className="mt-btn mt-btn-primary mt-btn-lg" onClick={beginMemorization}>
              <Play size={18} /> Start
            </button>
          </section>
        )}

        {phase === "memorization" && (
          <section className="mt-panel">
            {timerMode === "none" ? (
              <div className="mt-timerRow">
                <span className="mt-timerRow__label">Memorize the sequence — no time limit</span>
              </div>
            ) : (
              <>
                <div className="mt-timerRow">
                  <span className="mt-timerRow__label">Memorize the sequence</span>
                  <span className="mt-timerRow__num">{timeLeft}s</span>
                </div>
                <div className="mt-timerBar">
                  <div className="mt-timerBar__fill" style={{ width: `${timerPct}%` }} />
                </div>
              </>
            )}
            <div className="mt-sequenceGrid" aria-hidden={false}>
              {sequence.map((card, i) => (
                <CardFace key={card.id} card={card} width={84} index={i} reveal />
              ))}
            </div>
            {timerMode === "none" && (
              <button className="mt-btn mt-btn-primary mt-btn-lg mt-submit" onClick={finishMemorizing}>
                <Check size={18} /> I've got it — start recall
              </button>
            )}
          </section>
        )}

        {phase === "recall" && (
          <section className="mt-panel">
            <div className="mt-recallHead">
              <span>
                Your sequence — {playerSequence.length} / {count} selected
              </span>
              <button className="mt-btn mt-btn-ghost mt-btn-sm" onClick={clearAnswer} disabled={playerSequence.length === 0}>
                <Trash2 size={14} /> Clear
              </button>
            </div>
            <div className="mt-answerGrid">
              {Array.from({ length: count }, (_, i) => i).map((i) =>
                playerSequence[i] ? (
                  <CardFace key={i} card={playerSequence[i]} width={72} onClick={() => removeAt(i)} />
                ) : (
                  <EmptySlot key={i} width={72} index={i} />
                )
              )}
            </div>

            <button
              className="mt-btn mt-btn-primary mt-btn-lg mt-submit"
              onClick={submitAnswer}
              disabled={playerSequence.length !== count}
            >
              <Check size={18} />
              {playerSequence.length === count ? "Submit sequence" : `Select ${count - playerSequence.length} more`}
            </button>

            <div className="mt-deck">
              {SUITS.map((s) => (
                <div className="mt-deckRow" key={s.symbol}>
                  <span className={`mt-deckRow__label ${s.color === "red" ? "mt-red" : "mt-ink"}`}>{s.symbol}</span>
                  <div className="mt-deckRow__cards">
                    {fullDeck
                      .filter((c) => c.suit === s.symbol)
                      .map((card) => {
                        const used = playerSequence.some((p) => p.id === card.id);
                        return (
                          <CardFace
                            key={card.id}
                            card={card}
                            width={66}
                            faded={used}
                            disabled={used}
                            onClick={used ? undefined : () => selectCard(card)}
                          />
                        );
                      })}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {phase === "results" && lastResult && (
          <section className="mt-panel">
            <div className="mt-level-num mt-level-num--sm">Level {lastResult.level} results</div>

            <div className="mt-statRow">
              <Stat value={`${lastResult.correctPositions}/${lastResult.count}`} label="Correct position" />
              <Stat value={`${lastResult.cardsRemembered}/${lastResult.count}`} label="Cards remembered" />
              <Stat value={`${lastResult.accuracy}%`} label="Accuracy" />
              <Stat value={lastResult.levelScore} label="Level score" />
              <Stat value={totalScore} label="Total score" />
            </div>
            {lastResult.perfect && <div className="mt-perfectBanner">Perfect sequence — bonus awarded</div>}

            <div className="mt-compareGrid">
              {Array.from({ length: lastResult.count }, (_, i) => i).map((i) => {
                const orig = lastResult.sequence[i];
                const pl = lastResult.playerSequence[i];
                const isCorrect = pl && orig && pl.id === orig.id;
                const isMisplaced = !isCorrect && pl && lastResult.sequence.some((s) => s.id === pl.id);
                const tone = isCorrect ? "correct" : isMisplaced ? "misplaced" : "wrong";
                return (
                  <div className="mt-compareUnit" key={i}>
                    <span className="mt-compareUnit__pos">{i + 1}</span>
                    <CardFace card={orig} width={64} />
                    <CardFace card={pl} width={64} tone={tone} />
                  </div>
                );
              })}
            </div>
            <div className="mt-legend">
              <span><i className="mt-legendDot mt-legendDot--correct" /> right card, right spot</span>
              <span><i className="mt-legendDot mt-legendDot--misplaced" /> right card, wrong spot</span>
              <span><i className="mt-legendDot mt-legendDot--wrong" /> not in the sequence</span>
            </div>

            <button className="mt-btn mt-btn-primary mt-btn-lg" onClick={goNextLevel}>
              {level >= TOTAL_LEVELS ? "See final results" : `Continue to level ${level + 1}`}
            </button>
          </section>
        )}

        {phase === "final_results" && finalStats && (
          <section className="mt-panel mt-panel--center">
            <div className="mt-level-num">Run complete</div>
            <div className="mt-statRow mt-statRow--final">
              <Stat value={totalScore} label="Total score" />
              <Stat value={`${finalStats.avgAccuracy}%`} label="Average accuracy" />
              <Stat value={`${finalStats.highestLevel}/${TOTAL_LEVELS}`} label="Levels completed" />
              <Stat value={finalStats.perfectLevels} label="Perfect levels" />
              <Stat value={`${finalStats.totalCorrect}/${finalStats.totalPresented}`} label="Cards recalled" />
              <Stat value={`${finalStats.overall}%`} label="Overall performance" />
            </div>
            <div className="mt-finalActions">
              <button className="mt-btn mt-btn-primary mt-btn-lg" onClick={startGame}>
                <RotateCcw size={18} /> Play again
              </button>
              <button className="mt-btn mt-btn-ghost" onClick={restart}>
                <X size={16} /> Exit to menu
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
