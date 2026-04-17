import { StaticImageData } from 'next/image';
import ash from '@/assets/trainers/ash.png';
import misty from '@/assets/trainers/misty.png';
import brock from '@/assets/trainers/brock.png';
import gary from '@/assets/trainers/gary.png';
import giovanni from '@/assets/trainers/giovanni.png';
import erika from '@/assets/trainers/erika.png';
import ltsurge from '@/assets/trainers/ltsurge.png';
import sabrina from '@/assets/trainers/sabrina.png';
import blaine from '@/assets/trainers/blaine.png';
import koga from '@/assets/trainers/koga.png';

export interface Trainer {
  id: string;
  name: string;
  title: string;
  description: string;
  specialty: string[];
  color: string;
  color2: string;
  emoji: string;
  sprite: string | StaticImageData;
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
    sprite: ash,
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
    sprite: misty,
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
    sprite: brock,
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
    sprite: gary,
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
    sprite: giovanni,
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
    sprite: erika,
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
    sprite: ltsurge,
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
    sprite: sabrina,
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
    sprite: blaine,
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
    sprite: koga,
    rival: 'erika',
  },
];

export const getTrainer = (id: string) => TRAINERS.find(t => t.id === id)!;
export const getRival = (trainerId: string) => {
  const trainer = getTrainer(trainerId);
  return getTrainer(trainer.rival);
};
