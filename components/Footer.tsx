import Link from 'next/link';
import { AUTHOR, REPO } from '@/lib/site';

/** The foot of every page: whose game this is not, and the small print. */
export function Footer() {
  return (
    <footer className="foot">
      <div className="wrap foot__in">
        <p>Bir hayran projesi. Pokémon ve kart görselleri Nintendo, Creatures ve Game Freak’e aittir; bu sitenin onlarla bir bağı yoktur ve burada hiçbir şey satılmaz.</p>
        <nav className="foot__ways" aria-label="Sayfanın altı">
          <Link className="link" href="/kurallar/">
            Kurallar
          </Link>
          <Link className="link" href="/kunye/">
            Künye
          </Link>
          <a className="link" href={REPO} rel="noopener">
            Kaynak kod
          </a>
          <a className="link" href={AUTHOR.url} rel="noopener">
            {AUTHOR.name}
          </a>
        </nav>
      </div>
    </footer>
  );
}
