# PokéDuel

A card table in the browser where you play the Pokémon Trading Card Game against the computer, with real cards and the game's own rules. The interface is in Turkish; the cards are in English, as printed.

**Live:** https://pokedueltr.netlify.app/

A fan project. Pokémon, the names on the cards and all the artwork on them belong to Nintendo, Creatures Inc. and GAME FREAK inc. This site is not affiliated with them or endorsed by them, sells nothing and shows no advertising.

## What a match is

1. **Sign in.** Pick a name from the sheet and one of three rounds. Your opponent is the trainer that name is drawn against.
2. **Take a deck.** Eight ready decks of sixty cards, each built round one kind of Pokémon. You can look through any of them before choosing.
3. **Play.** Seven cards each, a Basic Pokémon in the Active Spot, up to five on the Bench, six Prize cards set aside, a coin for who goes first. Then turn by turn: draw, attach one Energy, evolve, play Trainer cards, retreat, attack.

Before the first match a short sheet says how a match goes, and during it a coach in the bar over the hand says what can be done next and points at the card or button (`lib/coach.ts`). It only suggests what the rules allow, never plays for you, and can be switched off.

A match that is interrupted is still on the table when the page is opened again. Nothing leaves the browser: there is no account and no server.

## The rules

They are the rules of the card game as played with Sword & Shield cards, and they live in `lib/duel/game.ts`:

- sixty-card decks, a hand of seven, a new hand when there is no Basic Pokémon in it, six Prize cards;
- one Energy card a turn; attacks paid for with the kinds of Energy printed on them, Colorless with anything;
- evolution on top of the Pokémon named on the card, not on a player's first turn and not on the turn a Pokémon came into play;
- Items without limit, one Supporter a turn, no Supporter and no attack for the player going first on that first turn;
- retreating once a turn for the cost printed on the card;
- Weakness ×2, then Resistance −30, neither of them for damage done to the Bench;
- the five Special Conditions and the Pokémon Checkup between turns;
- one Prize card for a Knock Out, two for a Pokémon V, three for a VMAX;
- three ways to win: the last Prize card, nothing left standing on the other side, or the other side unable to draw.

Where I left the rulebook, on purpose, and say so on the rules page too:

- whoever wins the opening coin flip goes first (they cannot choose to go second);
- Prize cards are taken from the top of the pile, which is the same thing, since they are face down and shuffled;
- the cards a player may draw for the opponent's mulligans are always drawn;
- the Energy paid to retreat is picked for the player (every deck has one kind of Energy, so it makes no difference);
- a match both players win at the same moment goes to whoever met more of the winning conditions, then to the player whose turn it is, instead of to a Sudden Death match.

## The cards

A card in this game does what is printed on it: its hit points, the names of its attacks, what they cost, what they do, its Weakness, its Resistance and its Retreat Cost. To be able to promise that, I only took cards whose text the game carries out in full. Each attack's text is read into a list of instructions (flip a coin, put the opponent to sleep, do damage to the Bench, discard an Energy, and so on, twenty-seven kinds in all), and a Pokémon is used only if every word under every one of its attacks is understood. Pokémon with Abilities, VSTAR and Radiant Pokémon are left out for the same reason.

What that leaves in the game: 76 Pokémon, 14 Trainer cards and 8 basic Energy cards, in eight decks of 22 Pokémon, 14 Trainers and 24 Energy.

The card data comes from the [Pokémon TCG API](https://pokemontcg.io). `lib/cards.json` and `lib/decks.json` are what I kept of it. The pictures are not in the repository: each one is loaded from `images.pokemontcg.io` when it is shown.

## The opponent

`lib/duel/rival.ts` plays through the same two functions the page uses, and it sees what a player across the table would see: its own hand, everything in play, both discard piles and how many cards I hold. It never reads my hand, the order of either deck, or a Prize card.

- **Ön eleme** puts Pokémon down, gives its Active Pokémon Energy and attacks with whatever it can. It forgets its Trainer cards half the time.
- **Yarı final** builds its Bench, evolves, uses Trainer cards when they do something, and takes its hardest attack.
- **Final** also reads the next turn: it brings up whoever can take a Knock Out, puts its Energy where it will not be lost, and does not throw a hand away while there is Energy in it to attach.

Over a few hundred matches between them, with decks and seats swapped so that neither decides it, Yarı final beats Ön eleme about nine times in ten and Final beats Yarı final a little more often than not. The test suite holds them to that order.

## What it looks like

A tournament table: red baize under a lamp, a black playmat stitched in the colour of the deck being played, paper slips for the moves and the match record, and the cards themselves.

- **The cards behave like cards.** Under a mouse a card leans towards the pointer on springs, in all four directions, its foil slides and the lamp's glare sits where the pointer is. A card opened to be looked at does the same under a finger.
- **Attacks are acted out.** The attacking card lunges at its target, the attack's name is called out, and an effect in the manner of its kind crosses the mat: forked lightning, a ball of fire and the flames it leaves, a jet of water, leaves, rings, claw marks, sparks. All ten are drawn on a canvas in `lib/fx.ts` out of lines and circles; there is no image or video file behind them.
- **The sounds are made in the browser** as they are needed (`lib/sound.ts`). There is no audio file, and one switch turns them all off.
- **Less motion when asked.** With the system's reduced-motion setting on, cards lie flat, attacks are not acted out and results are shown at once.

The baize is a photograph: ["Red Textured Surface"](https://www.pexels.com/photo/red-textured-surface-14827102/) by Engin Akyurt, from Pexels, graded towards tomato red and made to tile. The headings are set in Big Shoulders (Patric King) and everything on paper in Courier Prime (Alan Dague-Greene), both under the SIL Open Font License. The trainers' stamps, the back of the cards, the mats and the coin are drawn in CSS for this project.

## What it does not do

- You cannot build your own deck. The eight are fixed.
- There are no Abilities, Pokémon Tools, Stadiums or Special Energy, because no card in the pool has or needs them.
- One player, against the computer. No play between two people.

## Stack

- Next.js 16 (App Router), exported as a static site
- React 19, TypeScript 5
- Tailwind CSS 4
- Zustand for what the browser keeps, Motion for cards moving between places, Phosphor for icons

## Run it

Node 22.6 or newer (the tests use Node's own runner with TypeScript files).

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # the rules and the opponent
npm run lint
npm run typecheck
npm run build      # the static site, into out/
```

There are no environment variables. `NEXT_PUBLIC_SITE_URL` can be set to the address the site is served from, for the sitemap and the share picture.

## What I checked

- `npm test`: 30 tests. Every rule listed above has its own; whole matches are played between every pairing of decks at every level; a run of matches made of random legal moves has to end without the rules breaking; and in every one of them each side must still own exactly sixty cards.
- By hand and with a headless browser, against the built site: every page at nine widths from 320 to 1920 pixels with nothing wider than the window; no accessibility violations reported by axe at phone and desktop width; every control on a phone at least 44 pixels in both directions; the dialogs hold the keyboard and give the focus back; a match survives a reload; the pages that are read still read with scripts turned off.
- Whole matches played through the interface at phone, tablet and desktop widths with each deck, with no errors in the console.

The scripts for the second and third are not in the repository.

## Layout of the code

```
app/
  page.tsx                 the front page
  kayit/ deste/ mac/       sign in, take a deck, the match
  kurallar/ kunye/         the rules sheet, the credits
  styles/                  one stylesheet for each part of the table
components/
  CardFace.tsx             a card: the scan, the lean, the foil
  CardSheet.tsx            a card looked at closely
  SignIn.tsx, DeckPick.tsx
  duel/Table.tsx           the match: what pressing something does
  duel/Seat.tsx            one side of the mat
  duel/CardsDialog.tsx     a pile spread out, to look through or take from
lib/
  duel/types.ts            what a match is made of
  duel/game.ts             the rules
  duel/rival.ts            the opponent
  duel/game.test.ts        the tests
  cards.json, decks.json   the cards and the eight decks
  cards.ts, people.ts      reading them; the trainers and the mats
  words.ts                 everything said in Turkish
  fx.ts, sound.ts          what an attack looks like, and sounds like
  coach.ts                 what the coach says at each step
  store.ts                 what the browser keeps
scripts/
  flatten-segments.mjs     run after the build: puts the prefetch files where a plain file host is asked for them
```
