export const TYPE_COLORS: Record<string, string> = {
  normal: '#A8A878',
  fire: '#F08030',
  water: '#6890F0',
  electric: '#F8D030',
  grass: '#78C850',
  ice: '#98D8D8',
  fighting: '#C03028',
  poison: '#A040A0',
  ground: '#E0C068',
  flying: '#A890F0',
  psychic: '#F85888',
  bug: '#A8B820',
  rock: '#B8A038',
  ghost: '#705898',
  dragon: '#7038F8',
  dark: '#705848',
  steel: '#B8B8D0',
  fairy: '#EE99AC',
};

export const TYPE_COLORS_DARK: Record<string, string> = {
  normal: '#6b6b4f',
  fire: '#c0611a',
  water: '#3a60c0',
  electric: '#c8a800',
  grass: '#4a9030',
  ice: '#5a9898',
  fighting: '#901818',
  poison: '#702880',
  ground: '#b08030',
  flying: '#7060c0',
  psychic: '#c82860',
  bug: '#708010',
  rock: '#886820',
  ghost: '#403060',
  dragon: '#4018c0',
  dark: '#403028',
  steel: '#888898',
  fairy: '#b86878',
};

export const STAT_COLORS: Record<string, string> = {
  hp: '#FF5959',
  attack: '#F5AC78',
  defense: '#FAE078',
  'special-attack': '#9DB7F5',
  'special-defense': '#A7DB8D',
  speed: '#FA92B2',
};

export const STAT_LABELS: Record<string, string> = {
  hp: 'HP',
  attack: 'ATK',
  defense: 'DEF',
  'special-attack': 'Sp.ATK',
  'special-defense': 'Sp.DEF',
  speed: 'SPD',
};

export const ALL_TYPES = [
  'fire', 'water', 'grass', 'electric', 'psychic', 'ice',
  'dragon', 'dark', 'fairy', 'normal', 'fighting', 'flying',
  'poison', 'ground', 'rock', 'bug', 'ghost', 'steel',
];

export function getOfficialArtwork(id: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
}

export function getIdFromUrl(url: string): number {
  const parts = url.split('/').filter(Boolean);
  return parseInt(parts[parts.length - 1], 10);
}

export function getPrimaryTypeColor(types: { type: { name: string } }[]): string {
  return TYPE_COLORS[types[0]?.type.name] ?? '#888';
}

export function formatStatName(stat: string): string {
  return STAT_LABELS[stat] ?? stat;
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
