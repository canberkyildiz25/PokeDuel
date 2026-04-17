export interface Location {
  id: string;
  name: string;
  description: string;
  bg: string;       // CSS gradient fallback
  image: string;    // background image URL
  accent: string;
  emoji: string;
  weatherEffect: string;
  typeBonus?: string;
}

export const LOCATIONS: Location[] = [
  {
    id: 'pallet',
    name: 'Pallet Kasabası',
    description: 'Her şeyin başladığı küçük kasaba. Hafif rüzgar ve yemyeşil çimler.',
    bg: 'linear-gradient(160deg, #1a3a1a 0%, #2d5a2d 40%, #1a2a0a 100%)',
    image: 'https://play.pokemonshowdown.com/sprites/gen5bg/bg-dirtfield.jpg',
    accent: '#78C850',
    emoji: '🌿',
    weatherEffect: 'Parlak güneş',
    typeBonus: 'Grass',
  },
  {
    id: 'cerulean',
    name: 'Cerulean Spor Salonu',
    description: 'Gökkuşağı köprüsüne yakın su dolu arena. Dalgalar sürekli çarpar.',
    bg: 'linear-gradient(160deg, #0a1a3a 0%, #1a4a6a 40%, #0a2a4a 100%)',
    image: 'https://play.pokemonshowdown.com/sprites/gen5bg/bg-ocean.jpg',
    accent: '#6890F0',
    emoji: '💧',
    weatherEffect: 'Yağmur',
    typeBonus: 'Water',
  },
  {
    id: 'viridian',
    name: 'Viridian Ormanı',
    description: 'Karanlık ve gizemli orman. Böcek sesleri her yandan gelir.',
    bg: 'linear-gradient(160deg, #0a1a08 0%, #1a3a10 40%, #0a2a05 100%)',
    image: 'https://play.pokemonshowdown.com/sprites/gen5bg/bg-forest.jpg',
    accent: '#A8B820',
    emoji: '🌲',
    weatherEffect: 'Sisli',
    typeBonus: 'Grass',
  },
  {
    id: 'moonmountain',
    name: 'Ay Dağı',
    description: 'Mağara içi gizli arena. Kristaller ışıl ışıl parlar.',
    bg: 'linear-gradient(160deg, #0f0a1f 0%, #1a1035 40%, #0a0820 100%)',
    image: 'https://play.pokemonshowdown.com/sprites/gen5bg/bg-cave.jpg',
    accent: '#7038F8',
    emoji: '🌙',
    weatherEffect: 'Hailstorm',
    typeBonus: 'Psychic',
  },
  {
    id: 'lavender',
    name: 'Lavender Kasabası',
    description: 'Hayalet Kulesi\'nin gölgesinde tekinsiz bir arena. Ruhlar dolaşır.',
    bg: 'linear-gradient(160deg, #1a0a2a 0%, #2a1040 40%, #0f0820 100%)',
    image: 'https://play.pokemonshowdown.com/sprites/gen5bg/bg-ruins.jpg',
    accent: '#705898',
    emoji: '👻',
    weatherEffect: 'Haunted fog',
    typeBonus: 'Psychic',
  },
  {
    id: 'cinnabar',
    name: 'Cinnabar Adası',
    description: 'Volkanik ada. Lav akıntıları arenayı çevreler, sıcaklık dayanılmaz.',
    bg: 'linear-gradient(160deg, #2a0a00 0%, #4a1500 40%, #1a0800 100%)',
    image: 'https://play.pokemonshowdown.com/sprites/gen5bg/bg-volcano.jpg',
    accent: '#F08030',
    emoji: '🌋',
    weatherEffect: 'Sunshine',
    typeBonus: 'Fire',
  },
  {
    id: 'silph',
    name: 'Silph Co. Çatısı',
    description: 'Şehrin en yüksek noktasında fütüristik arena. Rüzgar uğuldar.',
    bg: 'linear-gradient(160deg, #0a1525 0%, #152540 40%, #0a1020 100%)',
    image: 'https://play.pokemonshowdown.com/sprites/gen5bg/bg-building.jpg',
    accent: '#98D8D8',
    emoji: '🏙️',
    weatherEffect: 'Electric storm',
    typeBonus: 'Lightning',
  },
  {
    id: 'elite4',
    name: 'Elit Dört Odası',
    description: 'En güçlü antrenörlerin buluştuğu efsanevi arena. Her adım tarihe geçer.',
    bg: 'linear-gradient(160deg, #1a0f00 0%, #3a2000 40%, #2a1500 100%)',
    image: 'https://play.pokemonshowdown.com/sprites/gen5bg/bg-indoorcomplex.jpg',
    accent: '#FFD700',
    emoji: '🏆',
    weatherEffect: 'Legendary aura',
  },
];

export const getLocation = (id: string) => LOCATIONS.find(l => l.id === id)!;
