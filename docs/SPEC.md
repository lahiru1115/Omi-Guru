# Omi Guru (ඕමි ගුරු): Product & Technical Specification

Version 1.0 · Owner: Lahiru Dissanayake

This document is the source of truth for **what** to build. `CLAUDE.md` covers **how** to work in the repo,
and `MILESTONES.md` covers **in what order**.

---

## 1. Product overview

**Goal:** help a beginner learn Omi from zero, in Sinhala, and then play full games against computer players.

**Platform:** a Progressive Web App (PWA).
- iPhone: Safari → Share → "Add to Home Screen" → it opens full-screen and works offline.
- Windows: Edge or Chrome → "Install app", or simply use it in the browser.
- Hosting: Vercel (free tier). It is a static site with no server code.

**Main modes**

| Mode | Sinhala label | Purpose |
|---|---|---|
| Lessons | පාඩම් | 8 guided lessons with scripted deals and quizzes |
| Practice | පුහුණුව | A full game with a coach: hints, feedback, legal-card highlights, undo, card tracker |
| Real game | සැබෑ ගේම | A full game with no help, three bot difficulty levels and stats |

Lessons and Practice together are the **Learning mode (ඉගෙනුම් මාදිලිය)**.

---

## 2. Game rules (confirmed by the owner)

### 2.1 Players and cards
- 4 players in 2 partnerships. Partners sit opposite each other.
- 32 cards: A, K, Q, J, 10, 9, 8, 7 in each of the 4 suits.
- Rank order within a suit, high to low: **A > K > Q > J > 10 > 9 > 8 > 7**.
- Play goes **anticlockwise**. See the seat model in `CLAUDE.md`.

### 2.2 Deal and trumps
1. The first dealer of a game is chosen at random (seeded).
2. The dealer shuffles. The deal starts with `next(dealer)` and gives a **block of 4 cards** to each player.
3. The **trump chooser = `next(dealer)`** (the player to the dealer's right). They look at their 4 cards and
   announce the trump suit (හුරුව). Nobody else may help.
4. The dealer then deals a **second block of 4 cards** to each player. Everyone now has 8 cards.

### 2.3 Playing tricks
- The trump chooser leads the first trick and may play any card.
- Each other player, in anticlockwise order, **must follow suit** (play the suit that was led) if they can.
- A player who cannot follow suit may play **any** card, either a trump or a discard. They are **not** required
  to trump or to beat the current winner.
- **Trick winner:** the highest trump played. If no trump was played, the highest card of the suit led.
- The trick winner leads the next trick.
- A round always has **8 tricks**, and all 8 are always played (needed to detect කැපෝති).

### 2.4 Scoring (defaults, all configurable)
A team that wins **5 or more** tricks wins the round.

| Result | Points to the round winner | Setting |
|---|---|---|
| Trump-choosing team wins (5–7 tricks) | 1 | `trumpTeamWinPoints` |
| The other team wins (5–7 tricks) | 2 | `defenderWinPoints` |
| Either team wins all 8 tricks (කැපෝති) | 3 | `kapothiPoints` |
| 4–4 tie | 0, and the **next round's winner gets +1 extra** | `tieBonus` |

- Tie bonus: by default it does **not** stack (two ties in a row still give only +1). Setting: `stackTieBonus`.
- Game target: the first team to reach **10** points wins (`targetScore`).
- The game ends immediately when a team reaches the target after a round is scored.
- The next dealer is `next(dealer)` after every round.

### 2.5 Reference scoring function

```ts
function scoreRound(tricks: [number, number], chooserTeam: Team,
                    pendingBonus: number, s: GameSettings) {
  if (tricks[0] === 4) {
    return { winner: null, points: 0,
             pendingBonus: s.stackTieBonus ? pendingBonus + s.tieBonus : s.tieBonus };
  }
  const winner: Team = tricks[0] >= 5 ? 0 : 1;
  const base = tricks[winner] === 8 ? s.kapothiPoints
             : winner === chooserTeam ? s.trumpTeamWinPoints
             : s.defenderWinPoints;
  return { winner, points: base + pendingBonus, pendingBonus: 0,
           reason: tricks[winner] === 8 ? 'KAPOTHI'
                 : winner === chooserTeam ? 'TRUMP_TEAM_WIN' : 'DEFENDER_WIN' };
}
```

### 2.6 Illegal moves
The app never allows an illegal card.
- Practice: illegal cards are dimmed and can't be tapped.
- Real game: cards are not dimmed (no help). Tapping an illegal card makes it shake and shows
  `ඔයා ළඟ {suit} තියෙනවා. ඒ පාටම දාන්න ඕනේ.`

---

## 3. Domain model (TypeScript)

```ts
type Suit = 'S' | 'H' | 'D' | 'C';                    // Spades, Hearts, Diamonds, Clubs
type Rank = 'A' | 'K' | 'Q' | 'J' | '10' | '9' | '8' | '7';
type CardId = `${Rank}${Suit}`;                        // e.g. "AS", "10H"
interface Card { id: CardId; suit: Suit; rank: Rank; }

type Seat = 0 | 1 | 2 | 3;                             // play order, anticlockwise; 0 = human
type Team = 0 | 1;                                     // team(seat) = seat % 2

interface Play { seat: Seat; card: Card; }
interface Trick { leader: Seat; plays: Play[]; winner?: Seat; }

type Phase =
  | 'DEAL_FIRST'      // first block of 4 dealt (animation)
  | 'CHOOSE_TRUMP'    // waiting for the trump chooser
  | 'DEAL_SECOND'     // second block of 4 dealt (animation)
  | 'PLAYING'
  | 'ROUND_END'
  | 'GAME_OVER';

interface RoundState {
  number: number;
  dealer: Seat;
  trumpChooser: Seat;              // next(dealer)
  trump: Suit | null;
  hands: [Card[], Card[], Card[], Card[]];
  currentTrick: Trick;
  completedTricks: Trick[];
  tricksWon: [number, number];
  turn: Seat;
}

interface GameState {
  phase: Phase;
  settings: GameSettings;
  scores: [number, number];
  pendingTieBonus: number;
  round: RoundState;
  roundHistory: RoundResult[];
  rngState: number;                // seeded RNG state (mulberry32)
}

type Action =
  | { type: 'START_ROUND' }
  | { type: 'DEAL_SECOND' }
  | { type: 'CHOOSE_TRUMP'; seat: Seat; suit: Suit }
  | { type: 'PLAY_CARD'; seat: Seat; cardId: CardId }
  | { type: 'NEXT_ROUND' };

interface PlayerView {             // the only thing bots and the coach may see
  seat: Seat;
  hand: Card[];                    // own hand only
  handCounts: [number, number, number, number];
  trump: Suit | null;
  trumpChooser: Seat;
  dealer: Seat;
  currentTrick: Trick;
  completedTricks: Trick[];
  tricksWon: [number, number];
  scores: [number, number];
  phase: Phase;
}
```

### 3.1 Engine API (`src/engine/`)

| Function | Purpose |
|---|---|
| `createGame(settings, seed)` | New game, random first dealer |
| `applyAction(state, action)` | Pure reducer. Throws `IllegalActionError` on an invalid action |
| `getLegalCards(hand, trick)` | Cards the player may play |
| `getTrickWinner(trick, trump)` | Winner seat of a complete trick |
| `scoreRound(...)` | See section 2.5 |
| `getPlayerView(state, seat)` | Hidden-information-safe view |
| `createRoundFromPreset(state, preset)` | Used by lessons and tests: fixed hands, dealer and optional trump |
| `rng.ts` | `mulberry32(seed)`, `shuffle(cards, rng)` |

Files: `cards.ts`, `deck.ts`, `rng.ts`, `rules.ts`, `scoring.ts`, `stateMachine.ts`, `view.ts`, `types.ts`.

---

## 4. Bot AI (`src/ai/`)

Every bot implements:

```ts
interface Bot {
  chooseTrump(view: PlayerView): Suit;          // sees only its first 4 cards
  chooseCard(view: PlayerView): Decision;       // Decision = { cardId, reasons: ReasonCode[] }
}
```

### 4.1 Card tracker (`cardTracker.ts`)
This is built only from public information plus the bot's own hand.
- The set of cards already played.
- **Voids:** a player who failed to follow a suit has none of that suit left.
- **Master card of a suit:** the highest card of that suit not yet played.
- Trumps remaining (8 minus trumps played), and trumps not in my hand.

### 4.2 Trump choice (all levels except Easy)
For each suit in the first 4 cards: `score = 2 × count + points`, where A=4, K=3, Q=2, J=1 and the rest are 0.
Pick the highest score. If tied, pick the suit with the higher top card. Easy picks the suit with the most cards.

### 4.3 Difficulty levels

| Level | Behaviour |
|---|---|
| Easy (පහසු) | A random legal card (seeded) |
| Medium (සාමාන්‍ය) | The heuristic policy below, without voids or master tracking |
| Hard (අමාරු) | The heuristic policy with full card tracking. From trick 4 onwards, it also checks candidates with a Monte Carlo simulation (section 4.5) |

### 4.4 Heuristic policy (Medium/Hard). Each branch returns a reason code.

**Leading a trick**
1. If I hold the master card of a non-trump suit and no opponent is known to be void in it → lead it (`CASH_MASTER`).
2. If my team chose trumps and I hold 4 or more trumps → lead my highest trump (`DRAW_TRUMPS`).
3. If my partner is known to be void in a non-trump suit, and neither opponent is known void in it, and trumps are
   still out → lead my lowest card of that suit (`LEAD_PARTNER_VOID`).
4. Avoid suits where an opponent is known void (`AVOID_OPPONENT_RUFF`).
5. Otherwise, lead my lowest card of my longest non-trump suit (`LEAD_LONG_SUIT`). If I only have trumps, lead the lowest trump.

**Following when I can follow suit**
1. Only one legal card → play it (`ONLY_LEGAL`).
2. My partner is currently winning, and either I'm last to play or partner's card is the master → play my lowest legal card (`PARTNER_WINNING`).
3. I'm last to play and can win → play the **lowest** card that wins (`WIN_CHEAPLY`).
4. I'm second to play → play the master if I have it (`CASH_MASTER`), otherwise play low (`SECOND_HAND_LOW`).
5. I'm third to play → play the lowest card that beats the current winner, if I have one (`WIN_CHEAPLY`).
6. Otherwise, play my lowest legal card (`DISCARD_LOW`).

**When I can't follow suit**
1. My partner is winning and is likely to keep the trick → discard my lowest card from my weakest non-trump suit, and never a master (`PARTNER_WINNING`).
2. An opponent is winning without a trump, and I have a trump → play my **lowest** trump (`RUFF`).
3. An opponent is winning with a trump, and I can beat it → play the lowest trump that beats it (`OVERRUFF`).
4. Otherwise, discard my lowest non-trump card and keep masters (`DISCARD_LOW`, `SAVE_TRUMP`).

### 4.5 Monte Carlo check (Hard only)
- Sample N=40 deals of the hidden cards that are consistent with the known voids and hand counts.
- For each legal card, play out the rest of the round with the heuristic policy for all 4 seats.
- Pick the card with the best average expected team tricks. Keep the heuristic card if it's within 0.1 tricks of the best.
- Time budget: **150 ms or less on an iPhone**. If it's slower, reduce N, or move the work into a Web Worker.

### 4.6 Bot pacing (UI)
The delay between bot plays is set by the speed setting: Slow 1200 ms, Normal 700 ms, Fast 350 ms.
Practice and Lessons default to Slow.

---

## 5. Coach engine (`src/coach/`)

**Design decision:** the coach uses the **explainable heuristic policy** with full card tracking (section 4.4),
not Monte Carlo, so every suggestion comes with a clear reason a beginner can understand. It only ever sees the
human's `PlayerView`.

### 5.1 API
```ts
getHint(view): { cardId: CardId; reasons: ReasonCode[] }
getTrumpHint(view): { suit: Suit; count: number; highCards: CardId[]; ranking: SuitScore[] }
reviewMove(viewBefore, playedCardId): {
  verdict: 'GOOD' | 'OK' | 'BETTER_EXISTS';
  bestCardId: CardId;
  bestReasons: ReasonCode[];
  mistakes: MistakeCode[];       // detected problems with the played card
}
```

**Equivalent cards:** cards of the same suit that are adjacent once played cards are removed count as the same
card. For example, if you hold 8♣ and 7♣, playing either one is equally good. The verdict is **GOOD** if the
played card is equivalent to the best card, **OK** if it's legal and has no detected mistakes, and
**BETTER_EXISTS** otherwise.

### 5.2 Reason codes (good moves)

| Code | සිංහල | English |
|---|---|---|
| `ONLY_LEGAL` | දාන්න පුළුවන් එකම කාඩ් එක මේකයි. | This is the only card you can play. |
| `PARTNER_WINNING` | ඔයාගේ partner දැනටමත් මේ අත දිනනවා. පොඩිම කාඩ් එක දාලා ලොකු කාඩ් ඉතුරු කරගන්න. | Your partner is already winning this trick. Play your lowest card and save your high cards. |
| `WIN_CHEAPLY` | {card} එකෙන් මේ අත දිනන්න පුළුවන්. දිනන්න පුළුවන් පොඩිම කාඩ් එක ඒකයි. | {card} wins this trick. It's the lowest card that can win. |
| `CASH_MASTER` | {card} තමයි දැන් {suit} පාටේ ඉතුරු වෙලා තියෙන ලොකුම කාඩ් එක. ඒකෙන් අත ගන්න. | {card} is now the highest {suit} card left. Use it to take the trick. |
| `DRAW_TRUMPS` | ඔයා ළඟ හුරු කාඩ් ගොඩක් තියෙනවා. හුරු දාලා විරුද්ධ කණ්ඩායමේ හුරු ඉවර කරන්න. | You have many trumps. Lead trumps to clear out the opponents' trumps. |
| `RUFF` | ඔයා ළඟ {suit} නෑ. හුරුවෙන් ගහලා අත දිනන්න. | You have no {suit}. Play a trump to win the trick. |
| `OVERRUFF` | විරුද්ධ කණ්ඩායම හුරුවෙන් ගහලා. ඊට වඩා ලොකු හුරුවකින් ගහන්න. | An opponent has trumped. Beat it with a higher trump. |
| `DISCARD_LOW` | මේ අත දිනන්න බෑ. වටිනාකම අඩුම කාඩ් එක දාන්න. | You can't win this trick. Throw away your least useful card. |
| `SECOND_HAND_LOW` | ඔයාට පස්සේ තව දෙන්නෙක් කාඩ් දාන්න ඉන්නවා. දැන්ම ලොකු කාඩ් එකක් දාන්න එපා. | Two players still play after you. Don't spend a high card yet. |
| `LEAD_PARTNER_VOID` | ඔයාගේ partner ළඟ {suit} නෑ. {suit} දැම්මොත් එයාට හුරුවෙන් ගහන්න පුළුවන්. | Your partner has no {suit}. If you lead {suit}, they can trump it. |
| `LEAD_LONG_SUIT` | ඔයා ළඟ වැඩිපුරම තියෙන පාටේ පොඩි කාඩ් එකක් දාන්න. | Lead a low card from your longest suit. |
| `SAVE_TRUMP` | හුරු කාඩ් අගට තියාගන්න. ඒවා වැඩිපුරම වටින්නේ පස්සේ. | Keep your trumps for later, when they matter more. |
| `AVOID_OPPONENT_RUFF` | විරුද්ධ කණ්ඩායමේ කෙනෙක් ළඟ {suit} නෑ. ඒ පාට දැම්මොත් එයා හුරුවෙන් ගහයි. | An opponent has no {suit}. If you lead it, they'll trump it. |

### 5.3 Mistake codes (played-card review)

| Code | සිංහල | English |
|---|---|---|
| `OVERTOOK_PARTNER` | ඔයාගේ partner දැනටමත් දිනාගෙන ආවේ. ඊට උඩින් ලොකු කාඩ් එකක් දාලා ඒක නාස්ති කළා. | Your partner was already winning. Playing over them wasted a high card. |
| `TRUMPED_PARTNER` | Partner දිනන අතකට හුරුවෙන් ගහන්න ඕනේ නෑ. | No need to trump a trick your partner is winning. |
| `WASTED_HIGH_CARD` | {card} එකෙන් මේ අත දිනන්න බැරි වුණා. පොඩි කාඩ් එකක් දැම්මා නම් හොඳයි. | {card} couldn't win this trick. A low card would have been better. |
| `UNNECESSARY_TRUMP` | මේ අත දිනන්න හුරුවක් ඕනේ වුණේ නෑ. | You didn't need a trump to win this trick. |
| `LED_INTO_RUFF` | විරුද්ධ කණ්ඩායමේ කෙනෙක් ළඟ {suit} නෑ. ඒ නිසා එයා හුරුවෙන් ගහයි. | An opponent has no {suit}, so they can trump it. |
| `THREW_MASTER` | {card} පස්සේ අතක් දිනන්න තිබ්බ කාඩ් එකක්. ඒක විසි කළා. | {card} could have won a later trick. You threw it away. |
| `OVERPAID_WIN` | {card} එකෙන් දිනුවා, ඒත් {best} එකෙනුත් දිනන්න තිබ්බා. | You won with {card}, but {best} would also have won. |

### 5.4 Verdict headers
- GOOD: `✅ හොඳ තේරීමක්!` / "Good choice!"
- OK: `👍 කමක් නෑ` / "That's fine"
- BETTER_EXISTS: `⚠️ මීට වඩා හොඳ කාඩ් එකක් තිබ්බා: {card}` / "There was a better card: {card}"

### 5.5 Trump hint
`{suit} තෝරන්න: ඔයාගේ කාඩ් 4න් {count}ක්ම {suit}. ඒ අතර {highCards} වගේ ලොකු කාඩ් තියෙනවා.`
/ "Choose {suit}: {count} of your 4 cards are {suit}, including high cards like {highCards}."
Also show every suit's score as a small bar list, so the learner sees *why*.

---

## 6. Learning mode

### 6.1 Practice (පුහුණුව): a full game with these aids (each can be toggled in settings)
- Legal cards highlighted and illegal cards dimmed.
- **💡 Hint** button → `getHint` → highlights the suggested card and shows the reason bubble.
- **Coach feedback** after each human play → `reviewMove` → a bubble for 3 seconds (tap to keep it open).
- **Card tracker** drawer: a 4×8 grid of all cards, with played cards greyed out, each suit's master marked ★,
  and "trumps left: n".
- **Bot explanations:** tap a bot's played card to see its reason code text.
- **Undo** (↶): goes back to just before the human's last card, including any bot plays after it.
  Keep a stack of states, up to 1 round.
- **Show all cards** (👁): reveals bot hands **in the UI only**. The coach and bots still use `PlayerView`.
- Trump choice dialog shows the trump hint.
- Default bot difficulty: Medium. Default speed: Slow.

### 6.2 Lessons (පාඩම්)

```ts
interface Lesson {
  id: string; order: number;
  titleKey: string; goalKey: string;
  preset?: RoundPreset;            // fixed hands, dealer and trump (all 32 cards, validated by a test)
  steps: LessonStep[];
  quiz: QuizQuestion[];
}
type LessonStep =
  | { type: 'explain'; textKey: string; highlight?: Highlight }   // highlight cards/areas on the table
  | { type: 'chooseTrump'; expected?: Suit; textKey: string }
  | { type: 'play'; seat: Seat; cardId?: CardId; accept?: CardId[]; textKey: string }
      // seat 0: wait for the human; accept = allowed answers; wrong answer → gentle retry message
      // seats 1–3: auto-play the scripted cardId
  | { type: 'cardPick'; promptKey: string; options: CardId[]; answer: CardId }  // no table needed
  | { type: 'quizBreak' };
interface QuizQuestion { promptKey: string; options: { labelKey: string; correct: boolean }[]; explainKey: string; }
```

Progress: a lesson is completed when the quiz score is 2/3 or better. Show ✓ on the lesson list.
Lessons unlock in order, with a setting to "unlock all".

| # | Title | Goal | Interactive part | Example quiz question |
|---|---|---|---|---|
| 1 | කාඩ් හඳුනාගනිමු | The 32 cards, the 4 suits and rank order | `cardPick`: "tap the highest card" ×4 | ලොකුම කාඩ් එක මොකක්ද? (K♠, A♠, 10♠, J♠) → A♠ |
| 2 | පාට අනුගමනය | Follow-suit rule | Scripted trick: the human must follow suit | මුලින් ♥ දාලා. ඔයා ළඟ ♥9 සහ ♠A තියෙනවා. දාන්න ඕනේ මොකක්ද? → ♥9 |
| 3 | අතක් දිනන හැටි | Highest card of the led suit wins (no trumps involved) | Play 2 scripted tricks and predict each winner | ♦10, ♦K, ♣A, ♦7 (හුරුව ♠). දිනන්නේ? → ♦K |
| 4 | හුරුව | A trump beats any card of another suit | The human ruffs when void | හුරුව ♥. ♠A, ♥7, ♠K, ♠Q. දිනන්නේ? → ♥7 |
| 5 | හුරුව තෝරන හැටි | Choose trumps from 4 cards | 3 `chooseTrump` exercises with feedback | ♠A ♠J ♥9 ♦7 → හොඳම හුරුව? → ♠ |
| 6 | ලකුණු | 1 / 2 / 3 points, ties and the bonus | An animated scoreboard example | හුරුව තේරූ කණ්ඩායම අත් 6ක් දිනුවා. ලකුණු? → 1 |
| 7 | Partner එක්ක සෙල්ලම | Don't beat your partner; lead to your partner's void | Scripted tricks | Partner ♣A දැම්මා. ඔයා ළඟ ♣K සහ ♣8. දාන්න? → ♣8 |
| 8 | කාඩ් මතක තියාගැනීම | Masters, voids, counting trumps | Card-tracker walkthrough | ♠A සහ ♠K වැටිලා. ඔයා ළඟ ♠Q. දැන් ලොකුම ♠ මොකක්ද? → ♠Q |

Every lesson ends with "ඊළඟ පාඩම" (next lesson) and "පුහුණු වෙන්න" (practise now).

---

## 7. Real game mode (සැබෑ ගේම)
- Pick a difficulty before starting: පහසු / සාමාන්‍ය / අමාරු.
- No highlights, hints, undo or card tracker.
- A full match to `targetScore`.
- Auto-save after every trick. The Home screen shows "ඉදිරියට යන්න" (Continue) when a saved game exists.
- At game end, update stats and show a result screen.

---

## 8. Screens and UI

### 8.1 Screens
1. **Home:** logo "ඕමි ගුරු", Continue (if saved), ඉගෙන ගන්න (→ Lessons / Practice), සැබෑ ගේම,
   නීති (rules), ප්‍රගතිය (stats), සැකසුම් (settings), and a සිං/EN toggle.
2. **Lesson list** and **Lesson player**
3. **Game table** (Practice and Real)
4. **Trump choice dialog**
5. **Round result** modal
6. **Game over** screen
7. **Rules reference:** the full rules in Sinhala, plus the glossary (section 9.2)
8. **Stats** and **Settings**

### 8.2 Game table layout (portrait, 375×667)
```
┌───────────────────────────────────┐
│ අපි ●●●○○ 3   |  ඔවුන් ●○○○○ 1    │  scores as tokens (target 10)
│ හුරුව: ♠ ඉස්කෝප්පු   අත්: 2 – 1    │  trump + tricks this round, tie bonus badge
├───────────────────────────────────┤
│              [Partner]            │  name, card backs, dealer chip (D)
│                                   │
│ [Left]        ┌─────┐      [Right]│
│               │  N  │             │  trick area: each card sits on the
│             W │     │ E           │  side of the player who played it
│               │  S  │             │
│               └─────┘             │
│  ┌─────────────────────────────┐  │
│  │ 💬 coach bubble (Practice)  │  │
│  └─────────────────────────────┘  │
│ 💡  ↶  👁  📋                     │  hint, undo, show cards, tracker (Practice)
│  ╭A♠╮╭K♠╮╭J♥╮╭9♥╮╭10♦╮╭8♦╮╭Q♣╮╭7♣╮ │  your hand, overlapped fan, sorted by suit
└───────────────────────────────────┘
```
- Landscape (PC): the table sits in the centre, and the coach + tracker move into a right-side panel.
- The hand is sorted by suit (trump suit first, then alternating colours), and within a suit from high to low.
- Tap a card once to raise it, then tap again (or tap the trick area) to play it. Setting: "one-tap play".
- Minimum tap target 44 px. Use `touch-action: manipulation` to prevent double-tap zoom.
- Respect `env(safe-area-inset-bottom)` for the iPhone home bar.

### 8.3 Cards
- Drawn with **SVG/CSS in code**. No image files and no copyrighted card art.
- Rank labels use the English letters A K Q J 10 9 8 7, as Sri Lankan players use them.
- Hearts and diamonds are red; spades and clubs are black. Optional **4-colour deck** for clarity
  (diamonds blue, clubs green).
- The card back is an original simple pattern.

### 8.4 Animations
- Dealing (two blocks of 4), card to trick area, trick collected towards the winner, a celebration for කැපෝති.
- CSS transforms only. Turn them off under `prefers-reduced-motion`.

### 8.5 Bot names (editable in settings)
Partner (seat 2): **අමල්** · Right (seat 1): **කසුන්** · Left (seat 3): **නිමාලි**

### 8.6 Round result messages
| Case | සිංහල | English |
|---|---|---|
| Trump team wins | හුරුව තේරූ කණ්ඩායම දිනුවා. ලකුණු {n} | The trump team won: {n} point(s) |
| Defenders win | විරුද්ධ කණ්ඩායම දිනුවා. ලකුණු {n} | The defending team won: {n} points |
| කැපෝති | කැපෝති! අත් 8ම දිනුවා. ලකුණු {n} | Kapothi! All 8 tricks: {n} points |
| Tie | 4–4 සමයි. ඊළඟ වටය දිනන කණ්ඩායමට අමතර ලකුණක්. | 4–4 tie. The next round's winner gets 1 extra point. |
| Bonus applied | (+{bonus} සම වීමේ අමතර ලකුණ) | (+{bonus} tie bonus) |

---

## 9. Language and content

### 9.1 i18n
- `src/content/i18n/si.json` (default) and `en.json`, plus a `t(key, params)` helper with `{placeholder}` support.
- Suit names and card names inside sentences are inserted via params, so `{suit}` → "ඉස්කෝප්පු" or "Spades".
- The language toggle is saved in settings and switches instantly.
- Font: Noto Sans Sinhala (self-hosted via `@fontsource`), with a system Latin font for English.
  Line height ≥ 1.5, because Sinhala glyphs are tall.

### 9.2 Glossary (use these terms consistently)
| English | සිංහල (UI term) | Note |
|---|---|---|
| Spades ♠ | ඉස්කෝප්පු | |
| Hearts ♥ | හාත | |
| Diamonds ♦ | දියමන්ති | |
| Clubs ♣ | කලාවර | |
| Ace | ආසය (A) | |
| King | රජා (K) | |
| Queen | රැජින (Q) | |
| Jack | ජැක් (J) | |
| Trumps | හුරුව | "හුරුවෙන් ගහනවා" = to trump |
| Trick | අත | "අත් 5ක්" = 5 tricks. **Don't use අත for a player's hand of cards**; say "ඔයාගේ කාඩ්" |
| All 8 tricks | කැපෝති | |
| Suit | පාට | |
| Follow suit | පාට අනුගමනය කරනවා | |
| Dealer | බෙදන්නා | |
| Partner | partner | English is common in speech |
| Team | කණ්ඩායම | |
| Points / tokens | ලකුණු | |
| Round | වටය | |
| Game | ගේම | |
| Lead (a trick) | මුලින් දානවා | |

---

## 10. Settings and persistence

### 10.1 `GameSettings` (defaults)
```ts
{
  language: 'si',
  targetScore: 10,
  trumpTeamWinPoints: 1,
  defenderWinPoints: 2,
  kapothiPoints: 3,
  tieBonus: 1,
  stackTieBonus: false,
  botDifficulty: 'medium',
  speed: 'normal',              // 'slow' | 'normal' | 'fast'
  oneTapPlay: false,
  fourColorDeck: false,
  practice: { highlightLegal: true, autoFeedback: true, allowUndo: true },
  botNames: ['', 'කසුන්', 'අමල්', 'නිමාලි'],
  unlockAllLessons: false,
}
```

**Debug section** (at the bottom of Settings): shows the current game seed and round number, has a
"start game with seed" input, and a button to reset all saved data.

### 10.2 Storage keys (`localStorage`, always in try/catch, versioned)
| Key | Content |
|---|---|
| `omi.settings.v1` | GameSettings |
| `omi.progress.v1` | Lesson completion and best quiz scores |
| `omi.stats.v1` | Stats (10.3) |
| `omi.savedGame.v1` | The last unfinished GameState + mode |

### 10.3 Stats
Games played/won per difficulty, rounds won, කැපෝති for/against, trump-call success rate,
practice hints used, coach match rate (% of human moves rated GOOD).

---

## 11. PWA
- `vite-plugin-pwa` with `registerType: 'autoUpdate'`. Precache all assets, including the font.
- Manifest: name "ඕමි ගුරු · Omi Guru", short_name "Omi Guru", `display: standalone`,
  theme colour = the table green, icons 192/512 (maskable) generated from one original SVG logo.
- SEO: page title "Omi Guru · ඕමි ගුරු | Learn Omi (Oomi / Oombi), the Sri Lankan card game". Put a meta
  description and keywords that include **Omi, Oomi, Oombi, ඕමි, Sri Lankan card game, learn Omi**.
- iOS: `apple-touch-icon` (180×180), `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`,
  `viewport-fit=cover`.
- When an update is ready, show a small toast "අලුත් version එකක් තියෙනවා. Refresh කරන්න." / "A new version is available. Refresh."

---

## 12. Testing strategy

**Unit (Vitest)**
- Deck: 32 unique cards. Deal: 4 + 4 per player, starting from `next(dealer)`.
- `getLegalCards`: must follow suit; any card when void; any card when leading.
- `getTrickWinner`: led suit wins without trumps; an off-suit discard never wins; the highest trump wins; a lone trump wins.
- `scoreRound`: trump team 5/6/7 → 1; defenders 5/6/7 → 2; කැපෝති for either team → 3; 4–4 → 0 + bonus;
  the bonus is added to the next winner and then reset; stacking setting on/off; game over at ≥ target.
- Dealer rotation and the trump chooser leading the first trick.
- `getPlayerView` never contains another seat's cards.

**AI and coach scenarios:** fixed positions → expected card and reason code. For example: partner winning → lowest
card + `PARTNER_WINNING`; last to play and can win → lowest winning card + `WIN_CHEAPLY`; void with an opponent
winning → lowest trump + `RUFF`.

**Simulation (`npm run test:sim`)**
- 10,000 seeded bot games: no illegal action, 8 tricks per round, all 32 cards played exactly once,
  score totals consistent, every game ends.
- Strength sanity checks over 2,000 games: Medium beats Easy ≥ 60%, Hard beats Easy ≥ 70%.
- Hard bot decision time: p95 ≤ 150 ms (on desktop; check on an iPhone manually).

**Content:** every lesson preset has 32 unique cards with 8 per seat; every scripted play is legal;
every i18n key exists in both languages.

**Manual:** iPhone Safari + Home Screen install + offline (airplane mode); Windows Edge and Chrome.

---

## 13. Folder structure
```
src/
  engine/    types.ts cards.ts deck.ts rng.ts rules.ts scoring.ts stateMachine.ts view.ts
  ai/        bot.ts easyBot.ts heuristicBot.ts hardBot.ts trumpChooser.ts cardTracker.ts monteCarlo.ts
  coach/     hintEngine.ts review.ts reasons.ts equivalence.ts
  content/   i18n/si.json i18n/en.json lessons/*.ts rules/si.md rules/en.md
  store/     gameStore.ts settingsStore.ts progressStore.ts
  storage/   persist.ts
  ui/
    screens/     Home LessonList LessonPlayer GameTable Rules Stats Settings GameOver
    components/  Card CardBack Hand TrickArea Seat ScoreBar TrumpBadge CoachBubble HintButton
                 CardTracker TrumpDialog RoundResult LanguageToggle Toast
    styles/
  App.tsx main.tsx
tests/  engine/ ai/ coach/ content/ sim/
```

---

## 14. Out of scope for v1
Online multiplayer, accounts, leaderboards, sound effects (optional in M5 if time allows), and Tamil language (a possible future addition; the i18n design already supports it).
