'use client';

import { X } from '@phosphor-icons/react';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import type { Card, Kind } from '@/lib/duel/types';
import { KIND, says, TRAINER } from '@/lib/words';
import { KindTag, Pips } from './Bits';
import { CardFace } from './CardFace';

const STAGE = { basic: 'Temel', stage1: '1. Aşama', stage2: '2. Aşama', vmax: 'VMAX' } as const;

/* A card looked at closely: its scan at full size beside what it does at this
   table, said in Turkish. The card itself is in English, as printed; nothing
   here says anything the card does not. It is the browser's own dialog, so
   it holds the focus, closes on Escape and gives the focus back. */
export function CardSheet({ card, onClose, children }: { card: Card | null; onClose: () => void; children?: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const id = useId();

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (card && !element.open) element.showModal();
    if (!card && element.open) element.close();
  }, [card]);

  return (
    <dialog
      ref={dialog}
      className="sheetbox"
      aria-labelledby={id}
      onClose={onClose}
      onClick={(event) => {
        // a click on the dialog itself is a click on the dark round it
        if (event.target === dialog.current) onClose();
      }}
    >
      {card && (
        <div className="sheetbox__in">
          <div className="sheetbox__card">
            <CardFace card={card.sort === 'pokemon' ? { ...card, kind: card.type } : card} sizes="(min-width: 48rem) 20rem, 70vw" touch />
          </div>
          <div className="paper sheetbox__facts">
            <div className="sheetbox__top">
              <h2 id={id}>{card.name}</h2>
              <button type="button" className="iconbtn" aria-label="Kapat" onClick={onClose}>
                <X size={22} aria-hidden="true" />
              </button>
            </div>

            {card.sort === 'pokemon' && (
              <>
                <dl className="facts">
                  <div>
                    <dt className="printed">Tür</dt>
                    <dd>
                      <KindTag kind={card.type} />
                    </dd>
                  </div>
                  <div>
                    <dt className="printed">Can</dt>
                    <dd className="fig">{card.hp}</dd>
                  </div>
                  <div>
                    <dt className="printed">Aşama</dt>
                    <dd>{STAGE[card.stage]}</dd>
                  </div>
                </dl>
                {card.from && <p className="sheetbox__note">{card.from} kartının üstüne konur.</p>}
                <ul className="moves">
                  {card.attacks.map((attack) => (
                    <li key={attack.name}>
                      <p className="moves__name">
                        <strong>{attack.name}</strong>
                        <Pips kinds={attack.cost} />
                      </p>
                      <p className="fig moves__hit">{attack.damage ? `${attack.damage}${attack.mark}` : '—'}</p>
                      {attack.effects.length > 0 && <p className="moves__does">{attack.effects.map(says).join(' ')}</p>}
                    </li>
                  ))}
                </ul>
                <dl className="facts">
                  <div>
                    <dt className="printed">Zayıflık</dt>
                    <dd>{card.weak ? `${KIND[card.weak]} ×2` : 'Yok'}</dd>
                  </div>
                  <div>
                    <dt className="printed">Direnç</dt>
                    <dd>{card.resist ? `${KIND[card.resist]} −30` : 'Yok'}</dd>
                  </div>
                  <div>
                    <dt className="printed">Geri çekilme</dt>
                    <dd>{card.retreat ? <Pips kinds={Array.from({ length: card.retreat }, (): Kind => 'Colorless')} label={`${card.retreat} Enerji`} /> : 'Bedelsiz'}</dd>
                  </div>
                </dl>
                {card.prize > 1 && (
                  <p className="sheetbox__note">
                    {card.rule === 'vmax' ? 'Pokémon VMAX' : 'Pokémon V'}: nakavt olursa rakip {card.prize} ödül kartı alır.
                  </p>
                )}
              </>
            )}
            {(card.sort === 'item' || card.sort === 'supporter') && (
              <>
                <p className="printed">{TRAINER[card.effect].sort} kartı</p>
                <p className="sheetbox__does">{TRAINER[card.effect].does}</p>
                <p className="sheetbox__note">{card.sort === 'supporter' ? 'Turda yalnızca bir Destekçi oynanır; ilk oynayan, ilk turunda oynayamaz.' : 'Bir turda istediğin kadar Eşya oynanır.'}</p>
              </>
            )}
            {card.sort === 'energy' && (
              <>
                <p className="printed">Temel Enerji</p>
                <p className="sheetbox__does">
                  Bir Pokémon’a bağlanır ve saldırılarının bedelini öder. Bir <KindTag kind={card.type} /> Enerjisi sağlar.
                </p>
                <p className="sheetbox__note">Her tur elinden yalnızca bir Enerji kartı bağlanır.</p>
              </>
            )}
            {children && <div className="sheetbox__acts">{children}</div>}
          </div>
        </div>
      )}
    </dialog>
  );
}
