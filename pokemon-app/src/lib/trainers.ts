export interface Trainer {
  id: string;
  name: string;
  title: string;
  description: string;
  specialty: string[];
  color: string;
  color2: string;
  emoji: string;
  sprite: string;
  rival: string;
}

export const TRAINERS: Trainer[] = [
  {
    id: 'ash',
    name: 'Ash Ketchum',
    title: 'Pallet Kasabası\'nın Şampiyonu',
    description: 'Elektrik ve Ateş tiplerini ustaca kullanır.',
    specialty: ['Lightning', 'Fire'],
    color: '#F08030', color2: '#F8D030',
    emoji: '⚡',
    sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/trainers/red.png',
    rival: 'gary',
  },
  {
    id: 'misty',
    name: 'Misty',
    title: 'Cerulean Şehri Spor Salonu Lideri',
    description: 'Su tiplerinin ustası. Starmie\'si rakiplerine nefes aldırmaz.',
    specialty: ['Water'],
    color: '#6890F0', color2: '#98D8D8',
    emoji: '💧',
    sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/trainers/misty.png',
    rival: 'giovanni',
  },
  {
    id: 'brock',
    name: 'Brock',
    title: 'Pewter Şehri Spor Salonu Lideri',
    description: 'Güçlü ve dayanıklı Pokémonlara güvenir.',
    specialty: ['Fighting', 'Colorless'],
    color: '#B8A038', color2: '#E0C068',
    emoji: '🪨',
    sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/trainers/brock.png',
    rival: 'erika',
  },
  {
    id: 'gary',
    name: 'Gary Oak',
    title: 'Prof. Oak\'ın Torunu',
    description: 'Her tipten güçlü kartlara sahip çok yönlü bir antrenör.',
    specialty: ['Colorless', 'Fire', 'Water'],
    color: '#A040A0', color2: '#F85888',
    emoji: '🌟',
    sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/trainers/blue.png',
    rival: 'ash',
  },
  {
    id: 'giovanni',
    name: 'Giovanni',
    title: 'Team Rocket Lideri',
    description: 'Karanlık ve sinsi stratejiler kullanır.',
    specialty: ['Darkness', 'Metal'],
    color: '#705848', color2: '#705898',
    emoji: '💀',
    sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/trainers/giovanni.png',
    rival: 'ash',
  },
  {
    id: 'erika',
    name: 'Erika',
    title: 'Celadon Şehri Spor Salonu Lideri',
    description: 'Çiçek ve ot tiplerinin şiirsel ustası.',
    specialty: ['Grass'],
    color: '#78C850', color2: '#A8B820',
    emoji: '🌿',
    sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/trainers/erika.png',
    rival: 'blaine',
  },
  {
    id: 'surge',
    name: 'Lt. Surge',
    title: 'Vermilion Şehri Spor Salonu Lideri',
    description: 'Elektrik tipinin askeri uzmanı. Hızlı ve agresif.',
    specialty: ['Lightning'],
    color: '#F8D030', color2: '#F08030',
    emoji: '⚡',
    sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/trainers/surge.png',
    rival: 'misty',
  },
  {
    id: 'sabrina',
    name: 'Sabrina',
    title: 'Saffron Şehri Spor Salonu Lideri',
    description: 'Psişik güçlerin efendisi. Rakibini önceden tahmin eder.',
    specialty: ['Psychic'],
    color: '#F85888', color2: '#A890F0',
    emoji: '🔮',
    sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/trainers/sabrina.png',
    rival: 'giovanni',
  },
  {
    id: 'blaine',
    name: 'Blaine',
    title: 'Cinnabar Adası Spor Salonu Lideri',
    description: 'Ateş tipinin yakıcı ustası. Fırtına gibi saldırır.',
    specialty: ['Fire'],
    color: '#F08030', color2: '#C03028',
    emoji: '🔥',
    sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/trainers/blaine.png',
    rival: 'misty',
  },
  {
    id: 'koga',
    name: 'Koga',
    title: 'Fuchsia Şehri Spor Salonu Lideri',
    description: 'Zehir ve karanlık taktikler kullanır.',
    specialty: ['Darkness', 'Psychic'],
    color: '#705898', color2: '#A040A0',
    emoji: '☠️',
    sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/trainers/koga.png',
    rival: 'erika',
  },
];

export const getTrainer = (id: string) => TRAINERS.find(t => t.id === id)!;
export const getRival = (trainerId: string) => {
  const trainer = getTrainer(trainerId);
  return getTrainer(trainer.rival);
};
