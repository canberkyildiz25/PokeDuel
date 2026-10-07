# PokéDuel

A card duel in the browser: pick a trainer, build a deck of five Pokémon cards, choose an arena and fight a computer opponent turn by turn.

**Live:** https://pokedueltr.netlify.app/

A fan project, made to learn how to build a small game in React: a state machine for the battle, cards that tilt and shine under the pointer, and screens that hand over to one another without a page load. It is not affiliated with Nintendo, Game Freak or The Pokémon Company, and nothing is sold on it.

## How a game goes

1. **Choose a trainer.** The opponent is one of the others.
2. **Build a deck.** Five cards from a list you can search. Two cards can be set side by side to compare them before you commit.
3. **Choose an arena.** Each arena favours one type.
4. **Fight.** You and the opponent attack in turn. When a Pokémon faints the next one comes in, and the side with nobody left loses.

## The rules the engine plays by

All of it is in `src/lib/battle-engine.ts`, and it is short on purpose.

- **Hit points** come from a card's rarity: rarity score × 30 + 60.
- **Damage** is 20 + rarity score × 8, plus a random 0 to 19.
- **Type advantage** multiplies the damage by 1.5. The table is a simplified one from the card game: Fire beats Grass and Metal, Water beats Fire and Fighting, and so on.
- **The arena's bonus** multiplies it by 1.15 when the attacker's type is the one the arena favours.

## What else is in it

- **Cards that behave like cards.** They tilt with the pointer and carry a holographic shine, after the technique in pokemon-cards-css.
- **Music** that starts when you enter and can be switched off, and confetti when you choose your trainer.
- **A battle screen that fits a phone**: the attack button stays in view however small the window is.

## Stack

- Next.js 16 (App Router), exported as a static site
- React 19 and TypeScript 5
- Tailwind CSS 4
- Framer Motion 12
- ESLint 9

## Run it

Node 20 or newer.

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # the static site, into out/
npm run lint
```

There are no environment variables and no server. The cards are a file in the repository; their pictures are loaded from `images.pokemontcg.io`.

## Layout of the code

```
src/app/
  page.tsx                  the game: which screen is showing, and what has been chosen so far
  layout.tsx, globals.css
  components/
    SplashScreen            the way in
    TrainerSelect           choosing a trainer
    DeckSelect              building the deck
    CompareModal            two cards side by side
    LocationSelect          choosing an arena
    BattleScreen            the fight
    PokemonCard, TypeBadge, StatBar
    AudioPlayer, StarField, Confetti
src/lib/
  battle-engine.ts          hit points, damage, turns, who has won
  cards.json                the cards
  tcg-types.ts              the shape of a card, and a score for each rarity
  trainers.ts, locations.ts the trainers and the arenas
  pokemon-utils.ts          colours for types, labels for stats
  spring.ts                 the springs the motion uses
public/trainers, public/arenas   the pictures of both
netlify.toml                the build, and the folder that is published
```

## Deploying

A static site on Netlify: `npm run build`, then the `out` folder.

## Credits

- Card data and card images: the Pokémon TCG API (pokemontcg.io).
- The card tilt and shine: after [pokemon-cards-css](https://github.com/simeydotme/pokemon-cards-css) by Simon Goellner.
- Pokémon and its characters belong to Nintendo, Creatures and Game Freak.

The interface is in Turkish.

## Author

[Canberk Yıldız](https://canberkyildiz.netlify.app)
