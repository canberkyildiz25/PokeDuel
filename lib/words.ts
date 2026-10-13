/* What things are called on the table. The game is played in Turkish; the
   rules themselves know nothing of language. The names of cards and of their
   attacks stay as they are printed on the cards. */

import type { Refusal } from './duel/game.ts';
import type { Condition, Effect, Event, Kind, Level, TrainerEffect, Why } from './duel/types.ts';

export const KIND: Record<Kind, string> = {
  Fire: 'Ateş',
  Water: 'Su',
  Grass: 'Ot',
  Lightning: 'Elektrik',
  Psychic: 'Psişik',
  Fighting: 'Dövüş',
  Darkness: 'Karanlık',
  Metal: 'Çelik',
  Dragon: 'Ejder',
  Colorless: 'Renksiz',
};

export const CONDITION: Record<Condition, string> = { asleep: 'Uyku', burned: 'Yanık', confused: 'Şaşkın', paralyzed: 'Felç', poisoned: 'Zehir' };
/** What each Special Condition does, in a line. */
export const CONDITION_DOES: Record<Condition, string> = {
  asleep: 'Saldıramaz, geri çekilemez. Turlar arasında yazı tura atılır; tura gelirse uyanır.',
  burned: 'Turlar arasında 20 hasar alır. Sonra yazı tura atılır; tura gelirse yanık söner.',
  confused: 'Saldırırken yazı tura atar; yazı gelirse saldırı boşa gider ve kendine 30 hasar verir.',
  paralyzed: 'Saldıramaz, geri çekilemez. Sahibinin bir sonraki turunun sonunda geçer.',
  poisoned: 'Turlar arasında 10 hasar alır. Kendiliğinden geçmez.',
};

/** What one instruction on a card does, said in Turkish. */
export function says(effect: Effect): string {
  const status = (name: Condition) => CONDITION[name].toLocaleLowerCase('tr');
  switch (effect.t) {
    case 'flipMore':
      return `Yazı tura: tura gelirse ${effect.add} hasar daha.`;
    case 'flipFail':
      return 'Yazı tura: yazı gelirse saldırı boşa gider.';
    case 'flipTimes':
      return `${effect.coins} kez yazı tura: her tura için ${effect.each} hasar.`;
    case 'ifDamaged':
      return `Bu Pokémon hasarlıysa ${effect.add} hasar daha.`;
    case 'ifOppDamaged':
      return `Rakip Pokémon zaten hasarlıysa ${effect.add} hasar daha.`;
    case 'ifOppV':
      return `Rakip bir Pokémon V ise ${effect.add} hasar daha.`;
    case 'ifOppAiling':
      return `Rakip bir Özel Durum altındaysa ${effect.add} hasar daha.`;
    case 'perCounterSelf':
      return `Bu Pokémon’un üstündeki her hasar sayacı için ${effect.each} hasar${effect.plus ? ' daha' : ''}.`;
    case 'perEnergySelf':
      return `Bu Pokémon’a bağlı her ${effect.kind ? `${KIND[effect.kind]} ` : ''}Enerji için ${effect.each} hasar${effect.plus ? ' daha' : ''}.`;
    case 'ignoreW':
      return 'Zayıflık hesaba katılmaz.';
    case 'status':
      return `${effect.flip ? 'Yazı tura: tura gelirse rakip' : 'Rakip'} ${status(effect.status)} durumuna girer.`;
    case 'statusSelf':
      return `Bu Pokémon ${status(effect.status)} durumuna girer.`;
    case 'recoil':
      return effect.flipTails ? `Yazı tura: yazı gelirse kendine ${effect.amount} hasar verir.` : `Kendine de ${effect.amount} hasar verir.`;
    case 'heal':
      return `Bu Pokémon’dan ${effect.amount} hasar iyileşir.`;
    case 'discardSelf':
      return effect.count === 'all' ? 'Bu Pokémon’a bağlı bütün Enerjiler atılır.' : `Bu Pokémon’dan ${effect.count} ${effect.kind ? `${KIND[effect.kind]} ` : ''}Enerji atılır.`;
    case 'discardOpp':
      return `${effect.flip ? 'Yazı tura: tura gelirse rakibin' : 'Rakibin'} ortadaki Pokémon’undan bir Enerji atılır.`;
    case 'bench':
      return effect.scope === 'each' ? `Rakibin yedekteki her Pokémon’una da ${effect.amount} hasar.` : `Rakibin yedeğinden ${effect.scope === 'two' ? 'iki' : 'bir'} Pokémon’a da ${effect.amount} hasar.`;
    case 'snipe':
      return `Rakibin ${effect.bench ? 'yedekteki ' : ''}Pokémon’larından birine ${effect.amount} hasar.`;
    case 'gust':
      return `Rakibin yedeğinden bir Pokémon’u ortaya çeker${effect.then ? `, sonra ona ${effect.then} hasar verir` : ''}.`;
    case 'call':
      return `Desteden ${effect.count > 1 ? `en çok ${effect.count}` : 'bir'} Temel Pokémon bulup yedeğe koyar.`;
    case 'draw':
      return `${effect.count} kart çeker.`;
    case 'less':
      return `Rakibin gelecek turunda ${effect.amount} hasar az alır.`;
    case 'protect':
      return 'Yazı tura: tura gelirse rakibin gelecek turunda hiç hasar almaz.';
    case 'lock':
      return effect.attack ? `Gelecek turunda ${effect.attack} kullanamaz.` : 'Gelecek turunda saldıramaz.';
    case 'trap':
      return 'Rakip Pokémon gelecek turunda geri çekilemez.';
    case 'millOpp':
      return `Rakibin destesinin üstünden ${effect.count} kart atılır.`;
    case 'switchSelf':
      return effect.may ? 'İstersen yedekteki bir Pokémon’unla yer değiştirir.' : 'Yedekteki bir Pokémon’unla yer değiştirir.';
  }
}

export const TRAINER: Record<TrainerEffect, { sort: string; does: string }> = {
  research: { sort: 'Destekçi', does: 'Elini at, 7 kart çek.' },
  hop: { sort: 'Destekçi', does: '3 kart çek.' },
  marnie: { sort: 'Destekçi', does: 'İki oyuncu da elini destesinin altına koyar. Sen 5, rakibin 4 kart çeker.' },
  boss: { sort: 'Destekçi', does: 'Rakibin yedeğinden seçtiğin Pokémon ortaya gelir.' },
  lady: { sort: 'Destekçi', does: 'Bir Pokémon’undan 60 hasar iyileşir, Özel Durumları kalkar.' },
  potion: { sort: 'Eşya', does: 'Bir Pokémon’undan 30 hasar iyileşir.' },
  switch: { sort: 'Eşya', does: 'Ortadaki Pokémon’un yedektekilerden biriyle yer değiştirir.' },
  quickball: { sort: 'Eşya', does: 'Elinden bir kart at; desteden bir Temel Pokémon al.' },
  incense: { sort: 'Eşya', does: 'Desteden bir Evrim Pokémon’u al.' },
  energysearch: { sort: 'Eşya', does: 'Desteden bir temel Enerji kartı al.' },
  greatball: { sort: 'Eşya', does: 'Destenin üstteki 7 kartına bak; içinden bir Pokémon alabilirsin.' },
  hammer: { sort: 'Eşya', does: 'Yazı tura: tura gelirse rakibin bir Pokémon’undan bir Enerji atılır.' },
  catcher: { sort: 'Eşya', does: 'Yazı tura: tura gelirse rakibin yedeğinden seçtiğin Pokémon ortaya gelir.' },
  retrieval: { sort: 'Eşya', does: 'Iskartadan en çok 2 temel Enerji kartını eline al.' },
};

/** What the rules are asking for, said to the player. */
export const ASK: Record<Why | 'setup' | 'promote', string> = {
  setup: 'Ortaya çıkacak Pokémon’unu, sonra yedeğe koyacaklarını seç.',
  promote: 'Ortadaki yer boş kaldı. Yedekten bir Pokémon seç.',
  boss: 'Rakibin yedeğinden ortaya çekeceğin Pokémon’a dokun.',
  catcher: 'Rakibin yedeğinden ortaya çekeceğin Pokémon’a dokun.',
  gust: 'Rakibin yedeğinden ortaya çekeceğin Pokémon’a dokun.',
  lady: 'İyileştireceğin Pokémon’una dokun.',
  potion: 'İyileştireceğin Pokémon’una dokun.',
  switch: 'Ortaya gelecek Pokémon’una dokun.',
  'switch-self': 'Ortaya gelecek Pokémon’una dokun.',
  hammer: 'Enerjisi atılacak rakip Pokémon’a dokun.',
  'bench-hit': 'Hasar alacak yedek Pokémon’a dokun.',
  snipe: 'Hasar alacak rakip Pokémon’a dokun.',
  'quickball-cost': 'Elinden atacağın kartı seç.',
  quickball: 'Desteden bir Temel Pokémon seç.',
  incense: 'Desteden bir Evrim Pokémon’u seç.',
  energysearch: 'Desteden bir Enerji kartı seç.',
  greatball: 'Üstteki yedi karttan bir Pokémon alabilirsin.',
  retrieval: 'Iskartadan en çok iki Enerji kartı seç.',
  call: 'Desteden yedeğe koyacağın Temel Pokémon’u seç.',
};

/** Why something cannot be done just now. */
export const REFUSAL: Record<NonNullable<Refusal>, string> = {
  'first-turn': 'İlk oynayan, ilk turunda saldıramaz.',
  energy: 'Yeterli Enerji yok.',
  asleep: 'Uyuyor.',
  paralyzed: 'Felçli.',
  locked: 'Bu tur kullanılamaz.',
  bench: 'Yedekte Pokémon yok.',
  once: 'Bu tur bir kez geri çekildin.',
  trapped: 'Bu tur geri çekilemez.',
};

export const LEVEL: Record<Level, { name: string; says: string }> = {
  easy: { name: 'Ön eleme', says: 'Rakip elindekini oynar, Antrenör kartlarının yarısını unutur. Kuralları öğrenmek için.' },
  steady: { name: 'Yarı final', says: 'Rakip yedeğini kurar, evrimleştirir, en sert saldırısını yapar.' },
  sharp: { name: 'Final', says: 'Rakip bir sonraki turu da okur: nakavt alacağı Pokémon’u ortaya çeker.' },
};
export const LEVELS: Level[] = ['easy', 'steady', 'sharp'];

/** One line for the match slip. `name` gives a card's printed name; `mon` the name of a Pokémon in play, by its number. */
export function tell(event: Event, who: [string, string], name: (card: string) => string, mon: (uid: number) => string): string | null {
  const side = who[event.who];
  switch (event.t) {
    case 'flip':
      if (event.why === 'first') return `Yazı tura atıldı. İlk tur ${who[event.heads ? 0 : 1]} tarafında.`;
      return event.heads ? 'Yazı tura: tura.' : 'Yazı tura: yazı.';
    case 'mulligan':
      return `${side} elinde Temel Pokémon çıkmadığı için ${event.times} kez yeniden kart çekti.`;
    case 'turn':
      return null;
    case 'draw':
      return `${side} ${event.count} kart çekti.`;
    case 'bench':
      return `${side} ${name(event.card)} kartını yedeğe koydu.`;
    case 'evolve':
      return `${side}: ${name(event.from)}, ${name(event.card)} oldu.`;
    case 'attach':
      return `${side} ${mon(event.uid)} kartına ${name(event.card)} bağladı.`;
    case 'play':
      return `${side} ${name(event.card)} oynadı.`;
    case 'attack':
      return `${mon(event.uid)}: ${event.name}.`;
    case 'nothing':
      return 'Saldırı boşa gitti.';
    case 'damage':
      if (event.self) return `${mon(event.uid)} kendine ${event.amount} hasar verdi.`;
      return `${mon(event.uid)} ${event.amount} hasar aldı${event.weak ? ' (zayıflık ×2)' : ''}${event.resist ? ' (direnç −30)' : ''}.`;
    case 'heal':
      return `${mon(event.uid)} ${event.amount} hasar iyileşti.`;
    case 'condition':
      return `${mon(event.uid)}: ${CONDITION[event.status].toLocaleLowerCase('tr')}.`;
    case 'cured':
      return event.status === 'all' ? `${mon(event.uid)} Özel Durumlarından kurtuldu.` : `${mon(event.uid)}: ${CONDITION[event.status].toLocaleLowerCase('tr')} geçti.`;
    case 'hurt':
      return event.status === 'confused' ? `${mon(event.uid)} şaşkınlıkla kendine ${event.amount} hasar verdi.` : `${CONDITION[event.status]}: ${mon(event.uid)} ${event.amount} hasar aldı.`;
    case 'cannot':
      return null;
    case 'ko':
      return `${name(event.card)} nakavt oldu.`;
    case 'prize':
      return `${side} ${event.count} ödül kartı aldı. Kalan: ${event.left}.`;
    case 'promote':
      return `${side} ${mon(event.uid)} kartını ortaya sürdü.`;
    case 'retreat':
      return `${side} ${mon(event.from)} kartını geri çekti, ${mon(event.to)} ortaya geldi.`;
    case 'switch':
      return `${mon(event.uid)} ortaya geldi.`;
    case 'discard':
      return event.from === 'energy' ? `${side}: ${event.cards.length} Enerji atıldı.` : event.from === 'deck' ? `${side} destesinden ${event.cards.length} kart attı.` : `${side} elinden ${event.cards.length} kart attı.`;
    case 'take':
      return `${side} ${event.from === 'deck' ? 'destesinden' : 'ıskartadan'} ${event.cards.map(name).join(', ')} aldı.`;
    case 'shuffle':
      return null;
    case 'guard':
      return event.how === 'safe' ? `${mon(event.uid)} gelecek tur hasar almayacak.` : `${mon(event.uid)} gelecek tur daha az hasar alacak.`;
    case 'end':
      return null;
    case 'win':
      return `Maç bitti. Kazanan: ${side}.`;
  }
}
