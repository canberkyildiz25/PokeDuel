# Design notes

What the table is meant to look like, and the few rules that keep it looking like one thing.

## The idea

A tournament table seen from the player's chair. Everything on the screen is an object that could lie on a table: baize, a playmat, cards, paper slips, a coin, glass beads. Nothing floats, nothing glows, and there is no panel that is only a panel.

## Materials

| Thing | What it is | Where |
| --- | --- | --- |
| Baize | a photograph of red felt, tiled, under one lamp | `body` in `app/globals.css` |
| Playmat | black neoprene, stitched in the colour of the deck's kind, with a print for each kind | `.mat`, `[data-mat]` in `app/styles/duel.css` |
| Paper | cream, with a little grain; almost square corners | `.paper` in `app/styles/things.css` |
| Cards | the real scans; a back of the table's own (lattice and ring) | `.card` |
| Energy | glass beads in the colours of the kinds | `.bead`, `--k-*` |
| Coin | brass | `.coin` |

Shadows are the baize's own colour, darkened: never grey.

## Colour

Tomato red is the table. Cream is paper. Yellow is the one colour that means "this can be pressed now" or "this is chosen", and it is used for nothing else. Black is the mat. The ten kinds of Pokémon each have one colour (`--k-fire` and so on), used for beads, for the mat's stitching and print, and for what an attack looks like.

All colours are tokens on `:root` in `app/globals.css` and `app/styles/things.css`. A colour written anywhere else is a mistake.

## Type

Two families.

- **Big Shoulders**, condensed, in capitals: everything written on the cloth or the mat, and every heading.
- **Courier Prime**: everything typed on paper, and every number read off the table.

Nothing is set below 12px.

## Space

Steps of 4px for layout, 2px inside a component. Radii: paper `0.125rem`, a card `4.6% / 3.3%`.

## Motion

Motion says what happened; it is never decoration on its own.

- A card moving from one place to another travels there (shared layout, a short spring).
- A card under the pointer leans towards it on springs and its foil slides. Mouse only, except for a card opened to be looked at.
- An attack: the card lunges, its name is called out, the effect of its kind crosses the mat and lands 320ms later, which is when the damage is shown. The table holds the old state until then.
- Easing is `--ease-out` (`cubic-bezier(0.23, 1, 0.32, 1)`) for things arriving and `--ease-slow` for paper and cards settling. Nothing eases in.
- With reduced motion asked for: no lean, no lunge, no effect, no delay; results are simply shown.

## Layout

- Phone: one column. Each side is its name and piles, its Bench, then its Active Pokémon with the tag beside it; attacks are chosen on the tag. The hand is held at the bottom edge and slides sideways when it is crowded.
- From 40rem: each side in two rows, Prize cards on the left, deck and discard on the right.
- From 72rem: the move slip and the match slip lie beside the mat.

Card sizes on the mat follow the height of the window as well as its width, so that the mat and the hand stay in sight together.

## Things not to do

- No gradient that is not light falling on something.
- No glass, no blur, no glow.
- No icon where a word would do; no emoji.
- No second accent colour.
- No rounded "card" containers: if something needs a container, it is a piece of paper or it is on the mat.
