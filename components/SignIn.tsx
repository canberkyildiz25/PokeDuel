'use client';

import { useRouter } from 'next/navigation';
import { TRAINERS, trainerById } from '@/lib/people';
import { sound } from '@/lib/sound';
import { setLevel, sit, useStore } from '@/lib/store';
import { LEVEL, LEVELS } from '@/lib/words';
import { KindTag, Stamp } from './Bits';
import { Stages } from './Stages';

/* The sign-in sheet at the door: ten names, and the one you sit down as. The
   name you are drawn against is printed beside each. Under it, which round
   you are playing, which is how hard the opponent thinks. */
export function SignIn() {
  const router = useRouter();
  const ready = useStore((state) => state.ready);
  const chosen = useStore((state) => (state.ready ? state.seat.trainer : null));
  const level = useStore((state) => state.seat.level);
  const tally = useStore((state) => state.tally);

  return (
    <main id="main" className="wrap">
      <Stages at="kayit" />
      <header className="page-head">
        <h1>Kayıt listesi</h1>
        <p>Masaya kimin adıyla oturacaksın? Karşına, kurada o isme düşen rakip çıkar.</p>
      </header>

      <form
        className="signin"
        onSubmit={(event) => {
          event.preventDefault();
          if (!chosen) return;
          sound.card();
          router.push('/deste/');
        }}
      >
        <fieldset className="paper sheet">
          <legend className="sr-only">Antrenör</legend>
          <div className="sheet__head printed" aria-hidden="true">
            <span>Masa</span>
            <span>Antrenör</span>
            <span>Sevdiği türler</span>
            <span>Rakibi</span>
            <span>Damga</span>
          </div>
          {TRAINERS.map((trainer, index) => (
            <label key={trainer.id} className="sheet__row">
              <input
                type="radio"
                name="trainer"
                value={trainer.id}
                checked={chosen === trainer.id}
                disabled={!ready}
                onChange={() => {
                  sit(trainer.id);
                  sound.stamp();
                }}
              />
              <span className="fig sheet__no">{String(index + 1).padStart(2, '0')}</span>
              <span className="sheet__name">{trainer.name}</span>
              <span className="sheet__kinds">
                {trainer.favours.map((kind) => (
                  <KindTag key={kind} kind={kind} />
                ))}
              </span>
              <span className="sheet__rival">{trainerById(trainer.rival)?.name}</span>
              <span className="sheet__mark">{chosen === trainer.id && <Stamp mark={trainer.mark} lean={index % 2 ? 6 : -8} />}</span>
            </label>
          ))}
        </fieldset>

        <div className="rounds">
          <fieldset>
            <legend className="label">Hangi tur</legend>
            <div className="tickets">
              {LEVELS.map((key) => (
                <label key={key} className="paper ticket">
                  <input
                    type="radio"
                    name="level"
                    value={key}
                    checked={level === key}
                    onChange={() => {
                      setLevel(key);
                      sound.press();
                    }}
                  />
                  <span className="ticket__name">{LEVEL[key].name}</span>
                  <span className="ticket__says">{LEVEL[key].says}</span>
                  {ready && tally[key].won + tally[key].lost > 0 && (
                    <span className="printed fig">
                      {tally[key].won} G, {tally[key].lost} Y
                    </span>
                  )}
                </label>
              ))}
            </div>
          </fieldset>
          <button type="submit" className="btn btn--go" disabled={!chosen}>
            Desteye geç
          </button>
          <p className="rounds__hint" aria-live="polite">
            {chosen ? `${trainerById(chosen)?.name} olarak oturuyorsun. Rakibin: ${trainerById(trainerById(chosen)?.rival ?? null)?.name}.` : 'Önce listeden bir isim seç.'}
          </p>
        </div>
      </form>
      <div className="page-foot" />
    </main>
  );
}
