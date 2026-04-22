import { TcgCard, rarityScore } from './tcg-types';
import { Location } from './locations';

export interface BattlePokemon {
  card: TcgCard;
  maxHp: number;
  currentHp: number;
  fainted: boolean;
}

export interface BattleState {
  playerTeam: BattlePokemon[];
  aiTeam: BattlePokemon[];
  playerActive: number;  // index
  aiActive: number;
  turn: 'player' | 'ai';
  log: string[];
  phase: 'idle' | 'playerAttack' | 'aiAttack' | 'faint' | 'end';
  winner: 'player' | 'ai' | null;
  round: number;
}

// TCG type effectiveness (simplified)
const EFFECTIVENESS: Record<string, string[]> = {
  Fire:      ['Grass', 'Metal'],
  Water:     ['Fire', 'Fighting'],
  Grass:     ['Water', 'Fighting'],
  Lightning: ['Water', 'Colorless'],
  Psychic:   ['Fighting', 'Darkness'],
  Fighting:  ['Darkness', 'Colorless', 'Lightning'],
  Darkness:  ['Psychic', 'Grass'],
  Metal:     ['Fairy', 'Grass'],
  Dragon:    ['Dragon'],
  Fairy:     ['Dragon', 'Darkness'],
};

export function isEffective(attackerType: string, defenderTypes: string[]): boolean {
  const weaknesses = EFFECTIVENESS[attackerType] ?? [];
  return defenderTypes.some(dt => weaknesses.includes(dt));
}

export function calcHp(card: TcgCard): number {
  return rarityScore(card.rarity) * 30 + 60;
}

export function calcDamage(
  attacker: BattlePokemon,
  defender: BattlePokemon,
  location: Location,
): { damage: number; effective: boolean; locationBonus: boolean } {
  const atkTypes  = attacker.card.types ?? ['Colorless'];
  const defTypes  = defender.card.types ?? ['Colorless'];
  const score     = rarityScore(attacker.card.rarity);

  const base      = 20 + score * 8 + Math.floor(Math.random() * 20);
  const effective = isEffective(atkTypes[0], defTypes);
  const locationBonus = !!location.typeBonus && atkTypes.includes(location.typeBonus);

  let damage = base;
  if (effective) damage = Math.floor(damage * 1.5);
  if (locationBonus) damage = Math.floor(damage * 1.15);

  return { damage, effective, locationBonus };
}

export function initBattle(
  playerCards: TcgCard[],
  aiCards: TcgCard[],
): BattleState {
  return {
    playerTeam: playerCards.map(c => ({ card: c, maxHp: calcHp(c), currentHp: calcHp(c), fainted: false })),
    aiTeam:     aiCards.map(c =>     ({ card: c, maxHp: calcHp(c), currentHp: calcHp(c), fainted: false })),
    playerActive: 0,
    aiActive: 0,
    turn: 'player',
    log: ['Savaş başlıyor!'],
    phase: 'idle',
    winner: null,
    round: 1,
  };
}

export function nextActivePokemon(team: BattlePokemon[], current: number): number {
  for (let i = current + 1; i < team.length; i++) {
    if (!team[i].fainted) return i;
  }
  return -1; // all fainted
}

export function isTeamDefeated(team: BattlePokemon[]): boolean {
  return team.every(p => p.fainted);
}
