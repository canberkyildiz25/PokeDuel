import type { Metadata } from 'next';
import { CARDS, DECKS } from '@/lib/cards';
import { AUTHOR, REPO } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Künye',
  description: 'PokéDuel kimin, kartlar ve fotoğraf nereden geliyor, tarayıcında ne saklanıyor.',
  alternates: { canonical: '/kunye/' },
};

/* Who made what. The cards are not this project's, and the page says so first. */
export default function Page() {
  return (
    <main id="main" className="wrap">
      <header className="page-head">
        <h1>Künye</h1>
        <p>Bu masada neyin kime ait olduğu, nereden geldiği ve tarayıcında ne tutulduğu.</p>
      </header>

      <dl className="paper colophon">
        <div>
          <dt className="printed">Kartlar</dt>
          <dd>
            <p>
              Pokémon, kartların adları ve üzerlerindeki bütün çizimler Nintendo, Creatures Inc. ve GAME FREAK inc. şirketlerine aittir. Bu site bir hayran projesidir: bu şirketlerle bir bağı yoktur, onlarca onaylanmamıştır, burada hiçbir şey satılmaz ve reklam gösterilmez.
            </p>
            <p>
              {DECKS.length} destedeki {CARDS.length} ayrı kartın görselleri bu sitede saklanmaz; her biri{' '}
              <a className="link" href="https://pokemontcg.io" rel="noopener">
                Pokémon TCG API
              </a>{' '}
              sunucusundan, baskıdaki haliyle yüklenir. Kartların canı, saldırıları ve yazıları da aynı kaynaktan alındı; oyun, kartın üstünde yazanı uygular.
            </p>
          </dd>
        </div>
        <div>
          <dt className="printed">Oyun</dt>
          <dd>
            <p>
              Oyunun kuralları Pokémon Kart Oyunu’nun kurallarıdır. Onları yürüten kod, rakibin oynayışı, saldırı efektleri ve tasarım:{' '}
              <a className="link" href={AUTHOR.url} rel="noopener">
                {AUTHOR.name}
              </a>
              . Kaynak kodu{' '}
              <a className="link" href={REPO} rel="noopener">
                GitHub’da
              </a>{' '}
              açık.
            </p>
            <p>Kayıt listesindeki damgalar, kartın arka yüzü, matlar, para ve saldırıların görüntüsü (şimşek, alev, su ve ötekiler) bu proje için kodla çizildi.</p>
          </dd>
        </div>
        <div>
          <dt className="printed">Çuha</dt>
          <dd>
            <p>
              Masanın kumaşı bir fotoğraf:{' '}
              <a className="link" href="https://www.pexels.com/photo/red-textured-surface-14827102/" rel="noopener">
                “Red Textured Surface”
              </a>
              , Engin Akyurt, Pexels. Rengi domates kırmızısına çekildi ve kenarları birbirine ulanarak döşenebilir hale getirildi.
            </p>
          </dd>
        </div>
        <div>
          <dt className="printed">Yazı</dt>
          <dd>
            <p>Başlıklar Big Shoulders (Patric King), kâğıt üstündeki her şey Courier Prime (Alan Dague-Greene). İkisi de SIL Open Font License ile dağıtılıyor.</p>
          </dd>
        </div>
        <div>
          <dt className="printed">Araçlar</dt>
          <dd>
            <p>Next.js, React, Tailwind CSS, Zustand, Motion ve Phosphor simgeleri.</p>
          </dd>
        </div>
        <div>
          <dt className="printed">Ses</dt>
          <dd>
            <p>Kart, jeton ve para sesleri tarayıcıda o an üretilir; sitede hiçbir ses dosyası yoktur. Sağ üstteki düğme hepsini kapatır.</p>
          </dd>
        </div>
        <div>
          <dt className="printed">Kayıt</dt>
          <dd>
            <p>Hesap yok, sunucuya giden bir şey yok. Seçtiğin ad, aldığın deste, yarım kalan maçın ve kazanıp kaybettiklerin yalnızca bu tarayıcıda tutulur; tarayıcının site verisini silersen onlar da gider.</p>
          </dd>
        </div>
      </dl>
      <div className="page-foot" />
    </main>
  );
}
