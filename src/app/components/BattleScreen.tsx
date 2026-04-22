'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { Trainer } from '@/lib/trainers';
import { Location } from '@/lib/locations';
import { TcgCard } from '@/lib/tcg-types';
import {
  BattleState, BattlePokemon,
  initBattle, calcDamage, nextActivePokemon, isTeamDefeated,
} from '@/lib/battle-engine';
import cardsData from '@/lib/cards.json';

const ALL_CARDS = cardsData as TcgCard[];

interface Props {
  playerTrainer: Trainer;
  playerDeck: TcgCard[];
  playerSupporter: TcgCard;
  aiTrainer: Trainer;
  location: Location;
  onRematch: () => void;
}

function HpBar({ current, max }: { current: number; max: number }) {
  const pct = Math.max(0, (current / max) * 100);
  const color = pct > 50 ? '#4ade80' : pct > 25 ? '#facc15' : '#f87171';
  return (
    <div className="w-full h-2.5 rounded-full bg-white/10 overflow-hidden">
      <motion.div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} layout />
    </div>
  );
}

function PokemonBattleCard({ bp, side, isActive, isAttacking, isFainted }:
  { bp: BattlePokemon; side: 'player'|'ai'; isActive: boolean; isAttacking: boolean; isFainted: boolean }) {
  return (
    <motion.div
      animate={
        isFainted ? { opacity: 0, y: 30, scale: 0.8 } :
        isAttacking ? { x: side === 'player' ? [0,30,0] : [0,-30,0], filter: ['brightness(1)','brightness(2)','brightness(1)'] } : {}
      }
      transition={isAttacking ? { duration: 0.4 } : { duration: 0.5 }}
      className={`relative rounded-xl overflow-hidden ${isActive ? 'ring-2 ring-yellow-400 shadow-lg' : 'opacity-60'}`}
      style={{ aspectRatio: '0.718', width: '100%', maxWidth: isActive ? 160 : 110 }}
    >
      <Image src={bp.card.images.small} alt={bp.card.name} fill className="object-cover" sizes="130px" />
      {isFainted && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
          <span className="text-red-400 font-black text-lg">❌</span>
        </div>
      )}
    </motion.div>
  );
}

export default function BattleScreen({ playerTrainer, playerDeck, playerSupporter, aiTrainer, location, onRematch }: Props) {
  const aiDeck = (() => {
    const pool = ALL_CARDS.filter(c =>
      c.supertype !== 'Trainer' &&
      (!c.types || aiTrainer.specialty.some(s => c.types?.includes(s)))
    );
    return [...pool].sort(() => Math.random() - 0.5).slice(0, 3);
  })();

  const [state, setState] = useState<BattleState>(() => initBattle(playerDeck, aiDeck));
  const [attackingPlayer, setAttackingPlayer] = useState(false);
  const [attackingAi, setAttackingAi] = useState(false);
  const [dmgDisplay, setDmgDisplay] = useState<{ side: 'player'|'ai'; value: number; effective: boolean } | null>(null);
  const [autoMode, setAutoMode] = useState(false);

  // Player supporter state
  const [supporterUsed, setSupporterUsed] = useState(false);
  const [supporterEffectLabel, setSupporterEffectLabel] = useState<string | null>(null);
  const blockNextAiRef   = useRef(false);
  const doubleTurnRef    = useRef(false);
  const damageBoostRef   = useRef<{ types: string[]; bonus: number } | null>(null);
  const shieldActiveRef  = useRef(false);

  // AI supporter state
  const [aiSupporter] = useState<TcgCard>(() => {
    const supporters = ALL_CARDS.filter(c => c.supertype === 'Trainer' && c.subtypes?.includes('Supporter'));
    return supporters[Math.floor(Math.random() * supporters.length)];
  });
  const [aiSupporterUsed, setAiSupporterUsed] = useState(false);
  const [aiSupporterLabel, setAiSupporterLabel] = useState<string | null>(null);
  const aiBlockNextPlayerRef = useRef(false);
  const aiDoubleTurnRef      = useRef(false);
  const aiDamageBoostRef     = useRef<{ types: string[]; bonus: number } | null>(null);
  const aiShieldRef          = useRef(false);

  const autoRef = useRef(autoMode);
  autoRef.current = autoMode;

  // ── Supporter ability ──────────────────────────────────────────────────────
  const useSupporter = useCallback(() => {
    if (supporterUsed || state.phase !== 'idle' || state.winner) return;
    setSupporterUsed(true);

    const id = playerSupporter.id;
    switch (id) {
      case 'swsh9-132': // Boss's Orders — force AI to switch
        setState(prev => {
          const next = nextActivePokemon(prev.aiTeam, prev.aiActive);
          if (next === -1) return { ...prev, log: ['Patron Emirleri! Ama rakibin başka kartı yok.', ...prev.log].slice(0,6) };
          return { ...prev, aiActive: next, log: ['👔 Patron Emirleri! Rakip kartını değiştirmek zorunda!', ...prev.log].slice(0,6) };
        });
        setSupporterEffectLabel(null);
        break;

      case 'swsh45-60': // Professor's Research — heal 40 HP
        setState(prev => {
          const playerTeam = prev.playerTeam.map((p,i) =>
            i === prev.playerActive ? { ...p, currentHp: Math.min(p.maxHp, p.currentHp + 40) } : p
          );
          return { ...prev, playerTeam, log: ["📚 Profesör'ün Araştırması! Aktif kart 40 HP kazandı!", ...prev.log].slice(0,6) };
        });
        setSupporterEffectLabel(null);
        break;

      case 'swsh6-196': // Peonia — block next AI attack
        blockNextAiRef.current = true;
        setState(prev => ({ ...prev, log: ['🔮 Peonia! Rakibin saldırısı engellendi!', ...prev.log].slice(0,6) }));
        setSupporterEffectLabel('🛡️ Saldırı engeli aktif');
        break;

      case 'swsh9-167': // Barry — double attack
        doubleTurnRef.current = true;
        setState(prev => ({ ...prev, log: ['⚡ Barry! Bu tur iki kez saldırıyorsun!', ...prev.log].slice(0,6) }));
        setSupporterEffectLabel('⚡ Çift saldırı hazır');
        break;

      case 'swsh1-200': // Marnie — both take 20 dmg
        setState(prev => {
          const playerTeam = prev.playerTeam.map((p,i) => i === prev.playerActive ? { ...p, currentHp: Math.max(0, p.currentHp - 20) } : p);
          const aiTeam = prev.aiTeam.map((p,i) => i === prev.aiActive ? { ...p, currentHp: Math.max(0, p.currentHp - 20) } : p);
          return { ...prev, playerTeam, aiTeam, log: ['🖤 Marnie! Her iki taraf 20 hasar aldı!', ...prev.log].slice(0,6) };
        });
        setSupporterEffectLabel(null);
        break;

      case 'swsh11tg-TG27': // Nessa — Water +30 dmg
        damageBoostRef.current = { types: ['Water'], bonus: 30 };
        setState(prev => ({ ...prev, log: ["🌊 Nessa! Su kartların hasarı +30 arttı!", ...prev.log].slice(0,6) }));
        setSupporterEffectLabel('💧 Su güç artışı aktif');
        break;

      case 'swsh12tg-TG26': // Prof. Burnet — shield
        shieldActiveRef.current = true;
        setState(prev => ({ ...prev, log: ['🌺 Prof. Burnet! Bir sonraki hasarın yarısı engellendi!', ...prev.log].slice(0,6) }));
        setSupporterEffectLabel('🛡️ Kalkan aktif');
        break;

      case 'swsh11tg-TG26': // Kabu — Fire +30 dmg
        damageBoostRef.current = { types: ['Fire'], bonus: 30 };
        setState(prev => ({ ...prev, log: ["🔥 Kabu! Ateş kartların hasarı +30 arttı!", ...prev.log].slice(0,6) }));
        setSupporterEffectLabel('🔥 Ateş güç artışı aktif');
        break;

      case 'swsh10-204': // Irida — heal all 20
        setState(prev => {
          const playerTeam = prev.playerTeam.map(p => !p.fainted ? { ...p, currentHp: Math.min(p.maxHp, p.currentHp + 20) } : p);
          return { ...prev, playerTeam, log: ["❄️ Irida! Tüm kartlar 20 HP kazandı!", ...prev.log].slice(0,6) };
        });
        setSupporterEffectLabel(null);
        break;

      case 'swsh12-205': { // Furisode Girl — random heal 10-50
        const heal = Math.floor(Math.random() * 40) + 10;
        setState(prev => {
          const playerTeam = prev.playerTeam.map((p,i) => i === prev.playerActive ? { ...p, currentHp: Math.min(p.maxHp, p.currentHp + heal) } : p);
          return { ...prev, playerTeam, log: [`🌸 Furisode Girl! Aktif kart ${heal} HP kazandı!`, ...prev.log].slice(0,6) };
        });
        setSupporterEffectLabel(null);
        break;
      }

      case 'swsh1-173': // Poké Kid — heal 30
        setState(prev => {
          const playerTeam = prev.playerTeam.map((p,i) => i === prev.playerActive ? { ...p, currentHp: Math.min(p.maxHp, p.currentHp + 30) } : p);
          return { ...prev, playerTeam, log: ['⭐ Poké Kid! Aktif kart 30 HP kazandı!', ...prev.log].slice(0,6) };
        });
        setSupporterEffectLabel(null);
        break;

      default:
        setSupporterEffectLabel(null);
    }
  }, [supporterUsed, state.phase, state.winner, playerSupporter.id]);

  // ── Battle phases ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (state.phase === 'playerAttack') {
      // Check if player attack is blocked by AI supporter
      if (aiBlockNextPlayerRef.current) {
        aiBlockNextPlayerRef.current = false;
        setAiSupporterLabel(null);
        setTimeout(() => {
          setState(prev => ({
            ...prev, phase: 'aiAttack',
            log: ['🛡️ Rakip saldırını engelledi!', ...prev.log].slice(0,6),
          }));
        }, 400);
        return;
      }

      const attacker = state.playerTeam[state.playerActive];
      const defender = state.aiTeam[state.aiActive];
      const { damage: baseDmg, effective } = calcDamage(attacker, defender, location);

      // Apply player damage boost
      let damage = baseDmg;
      const boost = damageBoostRef.current;
      if (boost) {
        const atkTypes = attacker.card.types ?? ['Colorless'];
        if (boost.types.some(t => atkTypes.includes(t))) damage += boost.bonus;
        damageBoostRef.current = null;
        setSupporterEffectLabel(null);
      }

      // Apply AI shield
      if (aiShieldRef.current) {
        damage = Math.floor(damage / 2);
        aiShieldRef.current = false;
        setAiSupporterLabel(null);
      }

      setAttackingPlayer(true);
      setTimeout(() => {
        setAttackingPlayer(false);
        setDmgDisplay({ side: 'ai', value: damage, effective });

        const usedDouble = doubleTurnRef.current;

        setState(prev => {
          const aiTeam = prev.aiTeam.map((p,i) =>
            i === prev.aiActive ? { ...p, currentHp: Math.max(0, p.currentHp - damage) } : p
          );
          const fainted = aiTeam[prev.aiActive].currentHp <= 0;
          if (fainted) aiTeam[prev.aiActive].fainted = true;
          const nextAi = fainted ? nextActivePokemon(aiTeam, prev.aiActive) : prev.aiActive;
          const aiDefeated = isTeamDefeated(aiTeam);

          let nextPhase: BattleState['phase'];
          if (aiDefeated) {
            nextPhase = 'end';
          } else if (usedDouble) {
            nextPhase = 'playerAttack';
          } else if (fainted) {
            nextPhase = 'faint';
          } else {
            nextPhase = 'aiAttack';
          }

          return {
            ...prev, aiTeam,
            aiActive: nextAi === -1 ? prev.aiActive : nextAi,
            phase: nextPhase,
            winner: aiDefeated ? 'player' : null,
            log: [`${attacker.card.name} → ${damage} hasar${effective ? ' (Etkili!)' : ''}`, ...prev.log].slice(0,6),
          };
        });

        if (usedDouble) {
          doubleTurnRef.current = false;
          setSupporterEffectLabel(null);
        }

        setTimeout(() => setDmgDisplay(null), 800);
      }, 500);
    }

    if (state.phase === 'faint') {
      setTimeout(() => setState(prev => ({ ...prev, phase: 'aiAttack' })), 800);
    }

    if (state.phase === 'aiAttack') {
      // Check if AI attack is blocked
      if (blockNextAiRef.current) {
        blockNextAiRef.current = false;
        setSupporterEffectLabel(null);
        setTimeout(() => {
          setState(prev => ({
            ...prev, phase: 'idle', round: prev.round + 1,
            log: ['🛡️ Rakibin saldırısı engellendi!', ...prev.log].slice(0,6),
          }));
        }, 400);
        return;
      }

      // AI uses its supporter if: not used yet AND (HP < 50% OR round >= 3)
      const aiActive = state.aiTeam[state.aiActive];
      const aiHpPct = aiActive.currentHp / aiActive.maxHp;
      if (!aiSupporterUsed && (aiHpPct < 0.5 || state.round >= 3)) {
        setAiSupporterUsed(true);
        const sid = aiSupporter.id;
        setState(prev => {
          const attacker = prev.aiTeam[prev.aiActive];
          switch (sid) {
            case 'swsh9-132': { // Boss's Orders — force player to switch
              const next = nextActivePokemon(prev.playerTeam, prev.playerActive);
              if (next === -1) return { ...prev, log: [`👔 ${aiTrainer.name}: Patron Emirleri! Ama senin başka kartın yok.`, ...prev.log].slice(0,6) };
              return { ...prev, playerActive: next, log: [`👔 ${aiTrainer.name}: Patron Emirleri! Kartını değiştirmek zorunda kaldın!`, ...prev.log].slice(0,6) };
            }
            case 'swsh45-60': { // Professor's Research — heal AI 40
              const aiTeam = prev.aiTeam.map((p,i) => i === prev.aiActive ? { ...p, currentHp: Math.min(p.maxHp, p.currentHp + 40) } : p);
              return { ...prev, aiTeam, log: [`📚 ${aiTrainer.name}: Profesör'ün Araştırması! +40 HP!`, ...prev.log].slice(0,6) };
            }
            case 'swsh6-196': { // Peonia — block next player attack
              aiBlockNextPlayerRef.current = true;
              setAiSupporterLabel('🛡️ Oyuncu saldırısı engellendi');
              return { ...prev, log: [`🔮 ${aiTrainer.name}: Peonia! Senin saldırın engellendi!`, ...prev.log].slice(0,6) };
            }
            case 'swsh9-167': { // Barry — AI double attack
              aiDoubleTurnRef.current = true;
              setAiSupporterLabel('⚡ Rakip çift saldırı hazır');
              return { ...prev, log: [`⚡ ${aiTrainer.name}: Barry! Bu tur iki kez saldıracak!`, ...prev.log].slice(0,6) };
            }
            case 'swsh1-200': { // Marnie — both take 20 dmg
              const aiTeam = prev.aiTeam.map((p,i) => i === prev.aiActive ? { ...p, currentHp: Math.max(0, p.currentHp - 20) } : p);
              const playerTeam = prev.playerTeam.map((p,i) => i === prev.playerActive ? { ...p, currentHp: Math.max(0, p.currentHp - 20) } : p);
              return { ...prev, aiTeam, playerTeam, log: [`🖤 ${aiTrainer.name}: Marnie! Her iki taraf 20 hasar aldı!`, ...prev.log].slice(0,6) };
            }
            case 'swsh11tg-TG27': { // Nessa — AI Water +30
              aiDamageBoostRef.current = { types: ['Water'], bonus: 30 };
              setAiSupporterLabel('💧 Rakip Su güç artışı aktif');
              return { ...prev, log: [`🌊 ${aiTrainer.name}: Nessa! Su kartlarına +30 hasar!`, ...prev.log].slice(0,6) };
            }
            case 'swsh12tg-TG26': { // Prof. Burnet — AI shield
              aiShieldRef.current = true;
              setAiSupporterLabel('🛡️ Rakip kalkan aktif');
              return { ...prev, log: [`🌺 ${aiTrainer.name}: Prof. Burnet! Bir sonraki hasarı yarıya indirecek!`, ...prev.log].slice(0,6) };
            }
            case 'swsh11tg-TG26': { // Kabu — AI Fire +30
              aiDamageBoostRef.current = { types: ['Fire'], bonus: 30 };
              setAiSupporterLabel('🔥 Rakip Ateş güç artışı aktif');
              return { ...prev, log: [`🔥 ${aiTrainer.name}: Kabu! Ateş kartlarına +30 hasar!`, ...prev.log].slice(0,6) };
            }
            case 'swsh10-204': { // Irida — heal all AI 20
              const aiTeam = prev.aiTeam.map(p => !p.fainted ? { ...p, currentHp: Math.min(p.maxHp, p.currentHp + 20) } : p);
              return { ...prev, aiTeam, log: [`❄️ ${aiTrainer.name}: Irida! Tüm kartlar 20 HP kazandı!`, ...prev.log].slice(0,6) };
            }
            case 'swsh12-205': { // Furisode Girl — random heal
              const heal = Math.floor(Math.random() * 40) + 10;
              const aiTeam = prev.aiTeam.map((p,i) => i === prev.aiActive ? { ...p, currentHp: Math.min(p.maxHp, p.currentHp + heal) } : p);
              return { ...prev, aiTeam, log: [`🌸 ${aiTrainer.name}: Furisode Girl! +${heal} HP!`, ...prev.log].slice(0,6) };
            }
            case 'swsh1-173': { // Poké Kid — heal AI 30
              const aiTeam = prev.aiTeam.map((p,i) => i === prev.aiActive ? { ...p, currentHp: Math.min(p.maxHp, p.currentHp + 30) } : p);
              return { ...prev, aiTeam, log: [`⭐ ${aiTrainer.name}: Poké Kid! +30 HP!`, ...prev.log].slice(0,6) };
            }
            default:
              return { ...prev, log: [`🃏 ${aiTrainer.name} bir supporter kullandı!`, ...prev.log].slice(0,6) };
          }
          void attacker;
        });
      }

      const attacker = state.aiTeam[state.aiActive];
      const defender = state.playerTeam[state.playerActive];
      const { damage: baseDmg, effective } = calcDamage(attacker, defender, location);

      // Apply player shield
      let damage = baseDmg;
      if (shieldActiveRef.current) {
        damage = Math.floor(damage / 2);
        shieldActiveRef.current = false;
        setSupporterEffectLabel(null);
      }

      // Apply AI damage boost
      const aiBoost = aiDamageBoostRef.current;
      if (aiBoost) {
        const atkTypes = attacker.card.types ?? ['Colorless'];
        if (aiBoost.types.some(t => atkTypes.includes(t))) damage += aiBoost.bonus;
        aiDamageBoostRef.current = null;
        setAiSupporterLabel(null);
      }

      setTimeout(() => {
        setAttackingAi(true);
        setTimeout(() => {
          setAttackingAi(false);
          setDmgDisplay({ side: 'player', value: damage, effective });

          const usedAiDouble = aiDoubleTurnRef.current;

          setState(prev => {
            const playerTeam = prev.playerTeam.map((p,i) =>
              i === prev.playerActive ? { ...p, currentHp: Math.max(0, p.currentHp - damage) } : p
            );
            const fainted = playerTeam[prev.playerActive].currentHp <= 0;
            if (fainted) playerTeam[prev.playerActive].fainted = true;
            const nextPlayer = fainted ? nextActivePokemon(playerTeam, prev.playerActive) : prev.playerActive;
            const playerDefeated = isTeamDefeated(playerTeam);

            let nextPhase: BattleState['phase'];
            if (playerDefeated) nextPhase = 'end';
            else if (usedAiDouble) nextPhase = 'aiAttack';
            else nextPhase = 'idle';

            return {
              ...prev, playerTeam,
              playerActive: nextPlayer === -1 ? prev.playerActive : nextPlayer,
              phase: nextPhase,
              winner: playerDefeated ? 'ai' : null,
              round: usedAiDouble ? prev.round : prev.round + 1,
              log: [`${attacker.card.name} → ${damage} hasar${effective ? ' (Etkili!)' : ''}`, ...prev.log].slice(0,6),
            };
          });

          if (usedAiDouble) {
            aiDoubleTurnRef.current = false;
            setAiSupporterLabel(null);
          }

          setTimeout(() => setDmgDisplay(null), 800);
        }, 500);
      }, 300);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase, state.playerActive, state.aiActive]);

  // Auto mode
  const doTurn = useCallback(() => {
    setState(prev => {
      if (prev.phase !== 'idle' || prev.winner) return prev;
      return { ...prev, phase: 'playerAttack' };
    });
  }, []);

  useEffect(() => {
    if (!autoMode || state.winner || state.phase !== 'idle') return;
    const t = setTimeout(doTurn, 1200);
    return () => clearTimeout(t);
  }, [autoMode, state.winner, state.phase, doTurn]);

  const player = state.playerTeam[state.playerActive];
  const ai = state.aiTeam[state.aiActive];

  return (
    <div className="min-h-screen flex flex-col relative z-10 overflow-hidden">
      <div className="fixed inset-0 z-0" style={{ background: location.bg }} />
      <div className="fixed inset-0 z-0"
        style={{ backgroundImage: `url(${location.image})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.4 }} />
      <div className="fixed inset-0 z-0 opacity-60"
        style={{ background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.9) 100%)' }} />

      {[...Array(8)].map((_,i) => (
        <motion.div key={i} className="fixed w-2 h-2 rounded-full pointer-events-none z-0"
          style={{ background: location.accent, left: `${10+i*12}%`, top: `${20+i*8}%` }}
          animate={{ y: [0,-20,0], opacity: [0.2,0.6,0.2] }}
          transition={{ duration: 3+i*0.5, repeat: Infinity, delay: i*0.4 }} />
      ))}

      <div className="relative z-10 flex flex-col h-screen max-w-5xl mx-auto w-full px-4 py-4 gap-3">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <div className="text-sm font-bold" style={{ color: location.accent }}>{location.emoji} {location.name}</div>
          <div className="text-white/50 text-xs">Tur {state.round}</div>
          <div className="text-sm font-bold text-white/70">{location.weatherEffect}</div>
        </div>

        {/* AI side */}
        <div className="flex items-start gap-4 rounded-2xl p-4 relative"
          style={{ background: 'rgba(0,0,0,0.5)', border: `1px solid ${aiTrainer.color}33` }}>
          <div className="flex items-start gap-2 shrink-0">
            <div className="flex flex-col items-center gap-1">
              <div className="w-14 h-16 rounded-xl overflow-hidden flex items-center justify-center"
                style={{ background: `linear-gradient(135deg,${aiTrainer.color}33,${aiTrainer.color2}22)`, border: `2px solid ${aiTrainer.color}66` }}>
                <img src={aiTrainer.sprite} alt={aiTrainer.name} className="w-full h-full object-contain"
                  style={{ filter: `drop-shadow(0 2px 6px ${aiTrainer.color}99)` }} />
              </div>
              <span className="text-[10px] font-black text-white/80 text-center leading-tight" style={{maxWidth:56}}>{aiTrainer.name}</span>
            </div>
            {/* AI Supporter card */}
            <div className="flex flex-col items-center gap-0.5">
              <div className={`relative rounded-lg overflow-hidden transition-all ${aiSupporterUsed ? 'opacity-40 grayscale' : ''}`}
                style={{ width: 36, aspectRatio: '0.718' }}>
                <Image src={aiSupporter.images.small} alt={aiSupporter.name} fill className="object-cover" sizes="36px" />
                {aiSupporterUsed && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <span className="text-white/60 text-[6px] font-black text-center leading-tight px-0.5">KULLANILDI</span>
                  </div>
                )}
              </div>
              {aiSupporterLabel && (
                <span className="text-[7px] text-yellow-400 font-bold text-center leading-tight animate-pulse" style={{maxWidth:40}}>{aiSupporterLabel}</span>
              )}
            </div>
          </div>

          <div className="flex-1 flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <div className="flex gap-2">
                {state.aiTeam.map((bp,i) => (
                  <div key={bp.card.id} style={{ width: i===state.aiActive ? 80 : 56, transition: 'width 0.3s' }}>
                    <PokemonBattleCard bp={bp} side="ai" isActive={i===state.aiActive}
                      isAttacking={attackingAi&&i===state.aiActive} isFainted={bp.fainted} />
                  </div>
                ))}
              </div>
              {ai && (
                <div className="flex-1">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-black text-white">{ai.card.name}</span>
                    <span style={{ color: location.accent }}>{ai.currentHp}/{ai.maxHp} HP</span>
                  </div>
                  <HpBar current={ai.currentHp} max={ai.maxHp} />
                </div>
              )}
            </div>
          </div>

          <AnimatePresence>
            {dmgDisplay?.side === 'ai' && (
              <motion.div initial={{y:0,opacity:1,scale:0.8}} animate={{y:-30,opacity:0,scale:1.4}}
                exit={{opacity:0}} transition={{duration:0.8}}
                className="absolute right-4 top-4 text-2xl font-black pointer-events-none"
                style={{ color: dmgDisplay.effective ? '#fbbf24' : '#f87171' }}>
                -{dmgDisplay.value}{dmgDisplay.effective ? '⚡' : ''}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Battle log + supporter */}
        <div className="flex gap-3">
          {/* Log */}
          <div className="flex-1 rounded-xl px-4 py-3"
            style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.08)', minHeight: 80 }}>
            {state.log.slice(0,3).map((msg,i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1-i*0.3, x: 0 }}
                className="text-sm" style={{ color: i === 0 ? '#fff' : 'rgba(255,255,255,0.4)' }}>
                {msg}
              </motion.div>
            ))}
            {supporterEffectLabel && (
              <div className="text-xs text-yellow-400 font-bold mt-1 animate-pulse">{supporterEffectLabel}</div>
            )}
          </div>

          {/* Supporter card widget */}
          <div className="flex flex-col items-center gap-1 shrink-0">
            <div className={`relative rounded-xl overflow-hidden transition-all ${supporterUsed ? 'opacity-40 grayscale' : ''}`}
              style={{ width: 52, aspectRatio: '0.718' }}>
              <Image src={playerSupporter.images.small} alt={playerSupporter.name} fill className="object-cover" sizes="52px" />
              {supporterUsed && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <span className="text-white/60 text-[8px] font-black text-center leading-tight px-1">KULLANILDI</span>
                </div>
              )}
            </div>
            <motion.button
              whileHover={!supporterUsed && state.phase==='idle' && !state.winner ? {scale:1.05} : {}}
              whileTap={!supporterUsed && state.phase==='idle' && !state.winner ? {scale:0.95} : {}}
              onClick={useSupporter}
              disabled={supporterUsed || state.phase !== 'idle' || !!state.winner}
              className="text-[9px] font-black px-2 py-1 rounded-full transition-all"
              style={{
                background: supporterUsed || state.phase !== 'idle'
                  ? 'rgba(255,255,255,0.05)'
                  : 'linear-gradient(135deg,#FFD700,#F08030)',
                color: supporterUsed || state.phase !== 'idle' ? 'rgba(255,255,255,0.3)' : '#000',
                cursor: supporterUsed || state.phase !== 'idle' ? 'not-allowed' : 'pointer',
                boxShadow: !supporterUsed && state.phase === 'idle' ? '0 0 10px rgba(255,215,0,0.5)' : 'none',
              }}>
              {supporterUsed ? '✓' : '✨ KULLAN'}
            </motion.button>
          </div>
        </div>

        {/* Player side */}
        <div className="flex items-start gap-4 rounded-2xl p-4 relative"
          style={{ background: 'rgba(0,0,0,0.5)', border: `1px solid ${playerTrainer.color}33` }}>
          <AnimatePresence>
            {dmgDisplay?.side === 'player' && (
              <motion.div initial={{y:0,opacity:1,scale:0.8}} animate={{y:-30,opacity:0,scale:1.4}}
                exit={{opacity:0}} transition={{duration:0.8}}
                className="absolute left-4 top-4 text-2xl font-black z-20 pointer-events-none"
                style={{ color: dmgDisplay.effective ? '#fbbf24' : '#f87171' }}>
                -{dmgDisplay.value}{dmgDisplay.effective ? '⚡' : ''}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex flex-col items-center gap-1 shrink-0">
            <div className="w-14 h-16 rounded-xl overflow-hidden flex items-center justify-center"
              style={{ background: `linear-gradient(135deg,${playerTrainer.color}33,${playerTrainer.color2}22)`, border: `2px solid ${playerTrainer.color}66` }}>
              <img src={playerTrainer.sprite} alt={playerTrainer.name} className="w-full h-full object-contain"
                style={{ filter: `drop-shadow(0 2px 6px ${playerTrainer.color}99)` }} />
            </div>
            <span className="text-[10px] font-black text-white/80 text-center leading-tight" style={{maxWidth:56}}>{playerTrainer.name}</span>
          </div>

          <div className="flex-1 flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <div className="flex gap-2">
                {state.playerTeam.map((bp,i) => (
                  <div key={bp.card.id} style={{ width: i===state.playerActive ? 80 : 56, transition: 'width 0.3s' }}>
                    <PokemonBattleCard bp={bp} side="player" isActive={i===state.playerActive}
                      isAttacking={attackingPlayer&&i===state.playerActive} isFainted={bp.fainted} />
                  </div>
                ))}
              </div>
              {player && (
                <div className="flex-1">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-black text-white">{player.card.name}</span>
                    <span style={{ color: playerTrainer.color }}>{player.currentHp}/{player.maxHp} HP</span>
                  </div>
                  <HpBar current={player.currentHp} max={player.maxHp} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 justify-center mt-auto pb-4">
          {!state.winner ? (
            <>
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={doTurn} disabled={state.phase !== 'idle'}
                className="px-8 py-3 rounded-full font-black text-black text-lg cursor-pointer"
                style={{
                  background: state.phase === 'idle' ? `linear-gradient(135deg,${playerTrainer.color},${playerTrainer.color2})` : 'rgba(255,255,255,0.2)',
                  color: state.phase === 'idle' ? '#000' : 'rgba(255,255,255,0.4)',
                  cursor: state.phase !== 'idle' ? 'not-allowed' : 'pointer',
                  boxShadow: state.phase === 'idle' ? `0 0 25px ${playerTrainer.color}88` : 'none',
                }}>
                {state.phase === 'idle' ? '⚔️ SALDIR!' : '⏳ Bekleniyor...'}
              </motion.button>

              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={() => setAutoMode(p => !p)}
                className="px-4 py-3 rounded-full font-bold text-sm cursor-pointer"
                style={{
                  background: autoMode ? `${playerTrainer.color}44` : 'rgba(255,255,255,0.08)',
                  border: `1px solid ${autoMode ? playerTrainer.color : 'rgba(255,255,255,0.15)'}`,
                  color: autoMode ? playerTrainer.color : 'rgba(255,255,255,0.5)',
                }}>
                {autoMode ? '⏸ Durdur' : '▶ Otomatik'}
              </motion.button>
            </>
          ) : (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }}
              className="flex flex-col items-center gap-4">
              <div className="text-5xl">{state.winner === 'player' ? '🏆' : '💀'}</div>
              <div className="text-2xl font-black text-white">
                {state.winner === 'player' ? `${playerTrainer.name} KAZANDI!` : `${aiTrainer.name} KAZANDI!`}
              </div>
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onRematch}
                className="px-8 py-3 rounded-full font-black text-black text-lg cursor-pointer"
                style={{ background: 'linear-gradient(135deg,#FFD700,#FF6B00)', boxShadow: '0 0 30px rgba(255,200,0,.5)' }}>
                🔄 Yeniden Oyna
              </motion.button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
