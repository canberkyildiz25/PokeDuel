import type { Metadata } from 'next';
import Link from 'next/link';
import { CARDS, DECKS } from '@/lib/cards';
import { BENCH, BURN, CONFUSION, HAND, POISON, PRIZES, RESISTANCE, WEAKNESS } from '@/lib/duel/game';
import type { Condition, TrainerCard } from '@/lib/duel/types';
import { CONDITION, CONDITION_DOES, LEVEL, LEVELS, TRAINER } from '@/lib/words';

export const metadata: Metadata = {
  title: 'Kurallar',
  description: 'PokéDuel, Pokémon Kart Oyunu’nun kurallarıyla oynanır: altmış kartlık deste, yedi kartlık el, altı ödül kartı, zayıflık, direnç ve beş Özel Durum.',
  alternates: { canonical: '/kurallar/' },
};

const CONDITIONS: Condition[] = ['poisoned', 'burned', 'asleep', 'paralyzed', 'confused'];
const TRAINERS = CARDS.filter((card): card is TrainerCard => card.sort === 'item' || card.sort === 'supporter').sort((a, b) => Number(b.sort === 'supporter') - Number(a.sort === 'supporter') || a.name.localeCompare(b.name, 'en'));

/* The sheet that comes in the box. The numbers on it are read from the rules
   themselves, so the sheet cannot say one thing while the table does another. */
export default function Page() {
  return (
    <main id="main" className="wrap">
      <header className="page-head">
        <h1>Kurallar</h1>
        <p>Bu masada Pokémon Kart Oyunu’nun kendi kuralları geçerli, Sword &amp; Shield dönemi kartlarıyla. Hepsini bilmeden de oturabilirsin: masa o an neyin yapılabileceğini gösterir.</p>
      </header>

      <div className="rules">
        <section className="paper leaf leaf--wide" aria-labelledby="r-table">
          <h2 id="r-table" className="paper__head">
            Masa
          </h2>
          <div className="leaf__cols">
            <div>
              <h3>Deste ve el</h3>
              <p>
                Herkes altmış kartlık bir desteyle oynar. Maçın başında deste karılır ve {HAND} kart çekilir. Elde hiç Temel Pokémon yoksa el gösterilir, desteye karıştırılır ve yeniden çekilir; rakip, fazladan çekilen her el için bir kart çeker.
              </p>
            </div>
            <div>
              <h3>Kurulum</h3>
              <p>
                Bir Temel Pokémon ortaya, en çok {BENCH} tanesi yedeğe konur. Sonra destenin üstünden {PRIZES} kart, bakılmadan, ödül kartı olarak ayrılır. İlk turu yazı tura belirler.
              </p>
            </div>
            <div>
              <h3>Kim kazanır</h3>
              <p>
                Üç yolu var: {PRIZES} ödül kartının hepsini almak, rakibin sahasında hiç Pokémon bırakmamak, ya da rakibin turunun başında çekecek kartının kalmaması.
              </p>
              <p>
                <Link className="link" href="/kayit/">
                  Masaya otur
                </Link>
              </p>
            </div>
          </div>
        </section>

        <section className="paper leaf" aria-labelledby="r-turn">
          <h2 id="r-turn" className="paper__head">
            Bir tur
          </h2>
          <ol className="leaf__steps">
            <li>
              <strong>Bir kart çek.</strong> Her tur böyle başlar.
            </li>
            <li>
              <strong>İstediğin sırayla, istediğin kadarını yap:</strong> elindeki Temel Pokémon’ları yedeğe koy; Pokémon’larını evrimleştir; bir Enerji kartı bağla; Antrenör kartı oyna; ortadaki Pokémon’unu geri çek.
            </li>
            <li>
              <strong>Saldır.</strong> Saldırı turu bitirir. Saldırmadan da turu bitirebilirsin.
            </li>
          </ol>
          <dl className="leaf__list">
            <div>
              <dt>Enerji</dt>
              <dd>Turda yalnızca bir Enerji kartı bağlanır. Enerji saldırınca harcanmaz, Pokémon’un üstünde kalır.</dd>
            </div>
            <div>
              <dt>Evrim</dt>
              <dd>Evrim kartı, üstünde adı yazan Pokémon’un üstüne konur. Kimse ilk turunda evrimleştiremez; sahaya o tur inen ya da o tur evrimleşen Pokémon da bir tur bekler. Hasar kalır, Özel Durumlar kalkar.</dd>
            </div>
            <div>
              <dt>Geri çekilme</dt>
              <dd>Turda bir kez. Kartın sağ altında yazan sayıda Enerji atılır, yedekten bir Pokémon ortaya gelir.</dd>
            </div>
            <div>
              <dt>İlk tur</dt>
              <dd>İlk oynayan, o ilk turunda saldıramaz ve Destekçi kartı oynayamaz.</dd>
            </div>
          </dl>
        </section>

        <section className="paper leaf" aria-labelledby="r-hit">
          <h2 id="r-hit" className="paper__head">
            Saldırı ve hasar
          </h2>
          <dl className="leaf__list">
            <div>
              <dt>Bedel</dt>
              <dd>Her saldırının solunda bedeli yazar. Renkli simge o türden Enerji ister; renksiz simge herhangi bir Enerjiyle ödenir.</dd>
            </div>
            <div>
              <dt>Zayıflık</dt>
              <dd>
                Saldıran Pokémon’un türü, hedefin zayıflığıysa hasar ×{WEAKNESS} olur.
              </dd>
            </div>
            <div>
              <dt>Direnç</dt>
              <dd>
                Hedefin direnci varsa hasardan {RESISTANCE} düşülür. Önce zayıflık, sonra direnç hesaplanır.
              </dd>
            </div>
            <div>
              <dt>Yedek</dt>
              <dd>Yedekteki bir Pokémon’a verilen hasarda zayıflık da direnç de hesaba katılmaz.</dd>
            </div>
            <div>
              <dt>Nakavt</dt>
              <dd>Canı biten Pokémon, üstündeki bütün kartlarla ıskartaya gider. Rakip bir ödül kartı alır; nakavt olan bir Pokémon V ise iki, VMAX ise üç. Ortası boşalan oyuncu yedeğinden birini sürer.</dd>
            </div>
          </dl>
        </section>

        <section className="paper leaf" aria-labelledby="r-ails">
          <h2 id="r-ails" className="paper__head">
            Özel Durumlar
          </h2>
          <dl className="leaf__list">
            {CONDITIONS.map((name) => (
              <div key={name}>
                <dt>{CONDITION[name]}</dt>
                <dd>{CONDITION_DOES[name]}</dd>
              </div>
            ))}
          </dl>
          <p className="leaf__note">
            Turlar arasında sırayla bakılır: zehir ({POISON}), yanık ({BURN}), uyku, felç. Şaşkın bir Pokémon’un kendine verdiği hasar {CONFUSION}. Uyku, şaşkınlık ve felçten aynı anda yalnızca biri olur; yanık ve zehir bunların yanında durabilir. Yedeğe çekilen ya da evrimleşen Pokémon hepsinden kurtulur.
          </p>
        </section>

        <section className="paper leaf" aria-labelledby="r-trainers">
          <h2 id="r-trainers" className="paper__head">
            Antrenör kartları
          </h2>
          <p className="leaf__lead">Eşya kartlarından bir turda istediğin kadar oynanır; Destekçi kartından turda yalnızca bir tane.</p>
          <dl className="leaf__list">
            {TRAINERS.map((card) => (
              <div key={card.id}>
                <dt>
                  {card.name}
                  <span className="printed leaf__sort">{TRAINER[card.effect].sort}</span>
                </dt>
                <dd>{TRAINER[card.effect].does}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="paper leaf leaf--wide" aria-labelledby="r-honest">
          <h2 id="r-honest" className="paper__head">
            Kartlar ve bu masa
          </h2>
          <div className="leaf__cols">
            <div>
              <h3>Kartın yazısı geçerli</h3>
              <p>
                {DECKS.length} destedeki her Pokémon kartı, üstünde yazanı eksiksiz yapar: canı, saldırılarının adı, bedeli, hasarı, zayıflığı, direnci ve geri çekilme bedeli basıldığı gibi. Yazısı bu masada birebir uygulanamayan kartlar desteye alınmadı.
              </p>
              <p>Kartlar İngilizce basılmış. Bir karta yakından bakınca saldırılarının ne yaptığı Türkçe olarak yanında yazar.</p>
            </div>
            <div>
              <h3>Kural kitabından ayrıldığı yerler</h3>
              <ul className="leaf__plain">
                <li>Yazı turayı kazanan ilk oynar; ikinci oynamayı seçemez.</li>
                <li>Ödül kartları yığının üstünden sırayla alınır. Kapalı ve karışık oldukları için sonuç aynıdır.</li>
                <li>Rakibin fazladan çektiği el için hakkın olan kart kendiliğinden çekilir.</li>
                <li>Geri çekilirken atılacak Enerjiyi masa seçer; destelerde tek tür Enerji olduğu için fark etmez.</li>
                <li>İki oyuncu aynı anda kazanırsa Ani Ölüm maçı oynanmaz: daha çok koşulu sağlayan, eşitlikte sırası gelen oyuncu kazanır.</li>
              </ul>
            </div>
            <div>
              <h3>Rakip</h3>
              <dl className="leaf__list">
                {LEVELS.map((level) => (
                  <div key={level}>
                    <dt>{LEVEL[level].name}</dt>
                    <dd>{LEVEL[level].says}</dd>
                  </div>
                ))}
              </dl>
              <p className="leaf__note">Rakip senin elini, destelerin sırasını ve ödül kartlarını görmez; masada bir oyuncunun göreceği kadarını görür.</p>
            </div>
          </div>
        </section>
      </div>
      <div className="page-foot" />
    </main>
  );
}
