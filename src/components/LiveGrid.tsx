// ============================================================
// IL PROFETA v3 — components/LiveGrid.tsx
// Griglia 2 colonne partite live con modal dettaglio
// v3.1.0 — pulsante pre-match rapido
// ============================================================

import { useState, useEffect } from 'react';
import type { PartitaLive, EventoLive, SnapshotGrafico, PartitaPrematch } from '../services/supabaseService';
import { getSnapshotsGrafico, getPrematchByFixtureId } from '../services/supabaseService';
import LiveMonitor from './LiveMonitor';

// ── Conversione colori ────────────────────────────────────────
const trendColor = (delta: number): string => {
  if (delta >= 0.20) return '#F87171';
  if (delta >= 0.15) return '#FB923C';
  if (delta >= 0.10) return '#FACC15';
  if (delta >= 0.05) return '#9CA3AF';
  if (delta >= 0)    return '#4B5563';
  return '#60A5FA';
};

const votoColor = (v: number): string => {
  if (v >= 4.5) return '#F87171';
  if (v >= 3.5) return '#FB923C';
  if (v >= 2.5) return '#FACC15';
  if (v >= 1.5) return '#9CA3AF';
  return '#4B5563';
};

const ipColor = (ip: number): string => {
  if (ip >= 0.55) return '#F87171';
  if (ip >= 0.45) return '#FB923C';
  if (ip >= 0.35) return '#FACC15';
  if (ip > 0.20)  return '#9CA3AF';
  return '#4B5563';
};

const cardBorderColor = (isLive: boolean, livMax: number): string => {
  if (!isLive) return 'rgba(255,255,255,0.06)';
  if (livMax >= 3) return 'rgba(99,153,34,0.45)';
  if (livMax === 2) return 'rgba(216,90,48,0.40)';
  if (livMax === 1) return 'rgba(239,159,39,0.35)';
  return 'rgba(255,255,255,0.08)';
};

const semConfig: Record<number, { bg: string; border: string; dot: string; text: string; label: string }> = {
  0: { bg: 'rgba(255,255,255,0.03)', border: 'rgba(255,255,255,0.08)', dot: '#6B7280', text: 'rgba(255,255,255,0.3)', label: 'Nessun segnale' },
  1: { bg: 'rgba(250,204,21,0.08)',  border: 'rgba(250,204,21,0.30)',  dot: '#FACC15', text: '#FACC15', label: 'LIV.1' },
  2: { bg: 'rgba(251,146,60,0.08)',  border: 'rgba(251,146,60,0.30)',  dot: '#FB923C', text: '#FB923C', label: 'LIV.2' },
  3: { bg: 'rgba(52,211,153,0.08)',  border: 'rgba(52,211,153,0.30)',  dot: '#34D399', text: '#34D399', label: 'LIV.3' },
};

const ipColorHex = (ip: number): string => {
  if (ip >= 0.55) return '#F87171';
  if (ip >= 0.45) return '#FB923C';
  if (ip >= 0.35) return '#FACC15';
  if (ip > 0.20)  return '#9CA3AF';
  return '#4B5563';
};

const scoreColor = (v: number): string => {
  if (v >= 4.0) return '#34D399';
  if (v >= 3.8) return '#86EFAC';
  if (v >= 3.5) return '#FACC15';
  if (v >= 3.0) return '#FB923C';
  return '#6B7280';
};

// ── Mini grafico singola squadra ──────────────────────────────
const MiniGraficoSquadra = ({
  label, ip10vals, ip5vals, width,
}: {
  label: string;
  ip10vals: number[];
  ip5vals: number[];
  width: number;
}) => {
  if (ip10vals.length < 2) return (
    <div style={{ flex: 1, textAlign: 'center', padding: '4px' }}>
      <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.2)' }}>{label}</div>
      <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.15)', marginTop: '4px' }}>—</div>
    </div>
  );

  const currentIp10 = ip10vals[ip10vals.length - 1];
  const currentIp5  = ip5vals[ip5vals.length - 1];
  const colorIp10   = ipColorHex(currentIp10);
  const colorIp5    = ipColorHex(currentIp5);

  const allVals = [...ip10vals, ...ip5vals];
  const minV    = Math.min(...allVals);
  const maxV    = Math.max(...allVals, 0.1);
  const range   = maxV - minV || 0.1;

  const W = width; const H = 44; const pad = 4;
  const toX = (i: number) => pad + (i / (ip10vals.length - 1)) * (W - pad * 2);
  const toY = (v: number) => H - pad - ((v - minV) / range) * (H - pad * 2);
  const linePath = (vals: number[]) =>
    vals.map((v, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)} ${toY(v).toFixed(1)}`).join(' ');

  const soglie = [
    { v: 0.35, color: 'rgba(250,204,21,0.2)' },
    { v: 0.45, color: 'rgba(251,146,60,0.2)' },
    { v: 0.55, color: 'rgba(52,211,153,0.2)' },
  ];

  return (
    <div style={{ flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
        <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>{label}</span>
        <div style={{ display: 'flex', gap: '4px' }}>
          <span style={{ fontSize: '8px', color: colorIp10 }}>10'</span>
          <span style={{ fontSize: '8px', color: colorIp5 }}>5'</span>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: '44px', display: 'block' }} preserveAspectRatio="none">
        {soglie.map((s, i) => {
          const y = toY(s.v);
          if (y < 0 || y > H) return null;
          return <line key={i} x1={pad} y1={y} x2={W - pad} y2={y} stroke={s.color} strokeWidth="0.5" strokeDasharray="3,3" />;
        })}
        <path d={linePath(ip10vals)} fill="none" stroke={colorIp10} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
        <path d={linePath(ip5vals)}  fill="none" stroke={colorIp5}  strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" strokeDasharray="3,2" />
        <circle cx={toX(ip10vals.length - 1)} cy={toY(currentIp10)} r="2" fill={colorIp10} />
        <circle cx={toX(ip5vals.length - 1)}  cy={toY(currentIp5)}  r="2" fill={colorIp5} />
      </svg>
    </div>
  );
};

// ── Mini grafico SVG — due squadre ────────────────────────────
const MiniGrafico = ({
  snapshots, homeTeam, awayTeam,
}: {
  snapshots: SnapshotGrafico[];
  homeTeam: string;
  awayTeam: string;
}) => {
  if (snapshots.length < 2) return (
    <div style={{ marginTop: '8px', fontSize: '10px', color: 'rgba(255,255,255,0.2)', textAlign: 'center' }}>
      dati insufficienti
    </div>
  );

  const ip10Home = snapshots.map(s => s.ipHome10);
  const ip5Home  = snapshots.map(s => s.ipHome5);
  const ip10Away = snapshots.map(s => s.ipAway10);
  const ip5Away  = snapshots.map(s => s.ipAway5);

  return (
    <div style={{ marginTop: '8px' }}>
      <div style={{ display: 'flex', gap: '6px' }}>
        <MiniGraficoSquadra label={homeTeam} ip10vals={ip10Home} ip5vals={ip5Home} width={90} />
        <div style={{ width: '1px', background: 'rgba(255,255,255,0.06)', flexShrink: 0 }} />
        <MiniGraficoSquadra label={awayTeam} ip10vals={ip10Away} ip5vals={ip5Away} width={90} />
      </div>
    </div>
  );
};

// ── Timeline compatta ─────────────────────────────────────────
const MiniTimeline = ({
  events, homeTeam, minute,
}: {
  events: EventoLive[];
  homeTeam: string;
  minute: number;
}) => {
  const durata = minute > 90 ? minute : 90;
  const goals  = events.filter(e => e.type === 'goal' || e.type === 'penalty' || e.type === 'autogoal');
  const cards  = events.filter(e => e.type === 'yellow' || e.type === 'red' || e.type === 'second_yellow');
  const allEvents = [...goals, ...cards].sort((a, b) => a.minute - b.minute);

  return (
    <div style={{ position: 'relative', padding: '10px 0 4px' }}>
      <div style={{ height: '2px', background: 'rgba(255,255,255,0.08)', borderRadius: '1px', position: 'relative' }}>
        <div style={{ height: '100%', width: `${Math.min((minute / durata) * 100, 100)}%`, background: 'rgba(255,255,255,0.15)', borderRadius: '1px' }} />
        <div style={{ position: 'absolute', left: `${(45 / durata) * 100}%`, top: '-4px', width: '1px', height: '10px', background: 'rgba(255,255,255,0.15)' }} />
        {minute > 90 && (
          <div style={{ position: 'absolute', left: `${(90 / durata) * 100}%`, top: '-4px', width: '1px', height: '10px', background: 'rgba(255,255,255,0.15)' }} />
        )}
        {allEvents.map((ev, i) => {
          const pct    = Math.min((ev.minute / durata) * 100, 99);
          const isHome = ev.team === homeTeam;
          const isGoal = ev.type === 'goal' || ev.type === 'penalty' || ev.type === 'autogoal';
          const isRed  = ev.type === 'red' || ev.type === 'second_yellow';
          const icon   = isGoal ? '⚽' : isRed ? '🟥' : '🟨';
          const minColor = isGoal ? (isHome ? '#FACC15' : '#60A5FA') : 'rgba(255,255,255,0.35)';
          return (
            <div key={i} style={{ position: 'absolute', left: `${pct}%`, top: '-10px', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', lineHeight: 1 }}>{icon}</span>
              <span style={{ fontSize: '9px', color: minColor, marginTop: '1px' }}>{ev.minute}'</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── Modal Pre-Match rapido ────────────────────────────────────
const ModalPrematch = ({
  fixtureId, homeTeam, awayTeam, onClose,
}: {
  fixtureId: string;
  homeTeam: string;
  awayTeam: string;
  onClose: () => void;
}) => {
  const [dati, setDati] = useState<PartitaPrematch | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPrematchByFixtureId(fixtureId).then(d => {
      setDati(d);
      setLoading(false);
    });
  }, [fixtureId]);

  const ScoreBox = ({ label, score, rec }: { label: string; score: number; rec: string }) => (
    <div style={{
      background: 'rgba(255,255,255,0.04)', borderRadius: '12px',
      padding: '12px', textAlign: 'center', flex: 1,
    }}>
      <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
      <div style={{ fontSize: '28px', fontWeight: 700, color: scoreColor(score), lineHeight: 1 }}>{score.toFixed(1)}</div>
      <div style={{ fontSize: '10px', color: scoreColor(score), marginTop: '4px', opacity: 0.8 }}>{rec}</div>
    </div>
  );

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex', alignItems: 'flex-start',
        justifyContent: 'center', padding: '16px', overflowY: 'auto',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '420px',
          background: '#111827', borderRadius: '20px',
          border: '1px solid rgba(255,255,255,0.10)',
          padding: '20px', marginTop: '40px',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '2px' }}>Analisi Pre-Match</div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>{homeTeam}</div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>{awayTeam}</div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '20px', color: 'rgba(255,255,255,0.6)',
              padding: '4px 14px', fontSize: '12px', cursor: 'pointer',
            }}
          >✕</button>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: '32px 0' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>⏳</div>
            <div style={{ fontSize: '12px' }}>Caricamento...</div>
          </div>
        )}

        {!loading && !dati && (
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: '32px 0' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>📭</div>
            <div style={{ fontSize: '12px' }}>Nessuna analisi pre-match disponibile</div>
            <div style={{ fontSize: '11px', marginTop: '4px', color: 'rgba(255,255,255,0.2)' }}>La cache potrebbe non essere stata generata per questa partita</div>
          </div>
        )}

        {!loading && dati && (
          <>
            {/* Quote */}
            {dati.odds && (
              <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
                {[
                  { label: '1', val: dati.odds.home },
                  { label: 'O2.5', val: dati.odds.over25 },
                  { label: '2', val: dati.odds.away },
                ].map(q => (
                  <div key={q.label} style={{
                    flex: 1, background: 'rgba(255,255,255,0.03)',
                    borderRadius: '8px', padding: '6px 4px', textAlign: 'center',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}>
                    <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', marginBottom: '2px' }}>{q.label}</div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: q.val ? '#FBBF24' : 'rgba(255,255,255,0.2)' }}>
                      {q.val ? q.val.toFixed(2) : '—'}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Score principali */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <ScoreBox label="Segno 1" score={dati.sign1} rec={dati.sign1 >= 3.8 ? '✓ Consigliato' : '✗ Evita'} />
              <ScoreBox label="Over 2.5" score={dati.over25} rec={dati.over25 >= 3.6 ? '✓ Alta prob.' : '✗ Evita'} />
              <ScoreBox label="Segno 2" score={dati.sign2} rec={dati.sign2 >= 3.8 ? '✓ Consigliato' : '✗ Evita'} />
            </div>

            {/* Dettaglio parametri */}
            {dati.dettaglio && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  { label: 'Segno 1', mercato: dati.dettaglio.sign1 },
                  { label: 'Over 2.5', mercato: dati.dettaglio.over25 },
                  { label: 'Segno 2', mercato: dati.dettaglio.sign2 },
                ].map(({ label, mercato }) => (
                  <div key={label}>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '6px', fontWeight: 600 }}>
                      {label} — parametri
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      {mercato.parameters.map((par, i) => (
                        <div key={i} style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '5px 8px', borderRadius: '8px',
                          background: 'rgba(255,255,255,0.03)',
                        }}>
                          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', flex: 1, marginRight: '8px' }}>
                            {par.parameter}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', maxWidth: '100px', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {par.value}
                            </span>
                            <span style={{
                              fontSize: '11px', fontWeight: 700,
                              color: scoreColor(par.score),
                              minWidth: '24px', textAlign: 'right',
                            }}>
                              {par.score.toFixed(1)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// ── Card singola ──────────────────────────────────────────────
const LiveCard = ({
  partita, onClick, onPrematch,
}: {
  partita: PartitaLive;
  onClick: () => void;
  onPrematch: () => void;
}) => {
  const [snapshots, setSnapshots] = useState<SnapshotGrafico[]>([]);

  const isLive = partita.status === '1H' || partita.status === '2H';
  const isHT   = partita.status === 'HT';
  const isFT   = partita.status === 'FT';

  const statusLabel = isHT ? 'HT'
            : isFT ? 'FT'
            : partita.status === 'NS' ? 'NS'
            : (partita.extraTime && partita.extraTime > 0)
              ? `${partita.minute}+${partita.extraTime}'`
              : `${partita.minute}'`;

  const useHome  = (partita.semaforoHome ?? 0) >= (partita.semaforoAway ?? 0);
  const livMax   = Math.max(partita.semaforoHome ?? 0, partita.semaforoAway ?? 0);
  const livTeam  = useHome ? partita.homeTeam       : partita.awayTeam;
  const livVoto  = useHome ? (partita.votoHome  ?? 0) : (partita.votoAway  ?? 0);
  const livIp10  = useHome ? (partita.ipHome    ?? 0) : (partita.ipAway    ?? 0);
  const livIp5   = useHome ? (partita.ipHome5   ?? 0) : (partita.ipAway5   ?? 0);
  const livTr10  = useHome ? (partita.trendHome ?? 0) : (partita.trendAway ?? 0);
  const livTr5   = useHome ? (partita.trendHome5 ?? 0) : (partita.trendAway5 ?? 0);

  const sem = semConfig[livMax];

  useEffect(() => {
    if (!isLive && !isHT) return;
    getSnapshotsGrafico(partita.fixtureId).then(setSnapshots);
  }, [partita.fixtureId, partita.minute, isLive, isHT]);

  const kpis = [
    { label: "IP/10'",    val: livIp10.toFixed(2), color: ipColor(livIp10),        big: false },
    { label: "IP/5'",     val: livIp5.toFixed(2),  color: ipColor(livIp5),         big: false },
    { label: "Trend/10'", val: `${livTr10 > 0 ? '+' : ''}${livTr10.toFixed(2)}`, color: trendColor(livTr10), big: true },
    { label: "Trend/5'",  val: `${livTr5 > 0 ? '+' : ''}${livTr5.toFixed(2)}`,  color: trendColor(livTr5),  big: true },
    { label: 'Voto',      val: livVoto.toFixed(1), color: votoColor(livVoto),       big: true },
  ];

  return (
    <div
      onClick={onClick}
      style={{
        background: '#111827',
        border: `1px solid ${cardBorderColor(isLive, livMax)}`,
        borderRadius: '16px', padding: '12px', cursor: 'pointer',
        transition: 'transform 0.1s',
      }}
      onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-1px)')}
      onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#fff', lineHeight: 1.4 }}>{partita.homeTeam}</div>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#fff', lineHeight: 1.4 }}>{partita.awayTeam}</div>
          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>{partita.league}</div>
          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', marginTop: '1px' }}>
            {partita.kickoff ? new Date(partita.kickoff).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#FBBF24', letterSpacing: '2px' }}>
            {partita.scoreHome} – {partita.scoreAway}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', marginTop: '2px' }}>
            {isLive && <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#EF4444', display: 'inline-block', animation: 'livepulse 1.5s infinite' }} />}
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{statusLabel}</span>
          </div>
          {/* Pulsante Pre-Match */}
          <button
            onClick={e => { e.stopPropagation(); onPrematch(); }}
            style={{
              marginTop: '5px',
              background: 'rgba(99,102,241,0.15)',
              border: '1px solid rgba(99,102,241,0.35)',
              borderRadius: '8px',
              color: '#A5B4FC',
              padding: '3px 8px',
              fontSize: '10px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.28)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.15)')}
          >
            📋 Pre-Match
          </button>
        </div>
      </div>

      {/* Badge semaforo */}
      <div style={{ marginBottom: '8px' }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '5px',
          padding: '3px 8px', borderRadius: '20px',
          background: sem.bg, border: `1px solid ${sem.border}`,
          fontSize: '11px', fontWeight: 600, color: sem.text,
        }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: sem.dot, display: 'inline-block' }} />
          {livMax > 0 ? `${sem.label} — ${livTeam}` : sem.label}
        </span>
      </div>

      {/* KPI: 3 + 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: '4px', marginBottom: '4px' }}>
        {kpis.slice(0, 3).map(kpi => (
          <div key={kpi.label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '8px', padding: '5px 4px', textAlign: 'center' }}>
            <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', marginBottom: '3px' }}>{kpi.label}</div>
            <div style={{ fontSize: kpi.big ? '14px' : '13px', fontWeight: 700, color: kpi.color }}>{kpi.val}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: '4px', marginBottom: '8px' }}>
        {kpis.slice(3).map(kpi => (
          <div key={kpi.label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '8px', padding: '5px 4px', textAlign: 'center' }}>
            <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', marginBottom: '3px' }}>{kpi.label}</div>
            <div style={{ fontSize: kpi.big ? '14px' : '13px', fontWeight: 700, color: kpi.color }}>{kpi.val}</div>
          </div>
        ))}
      </div>

      {/* Grafico IP */}
      {(isLive || isHT) && (
        <MiniGrafico
          snapshots={snapshots}
          homeTeam={partita.homeTeam}
          awayTeam={partita.awayTeam}
        />
      )}

      {/* Timeline */}
      {partita.events && partita.events.length > 0 ? (
        <MiniTimeline events={partita.events} homeTeam={partita.homeTeam} minute={partita.minute ?? 0} />
      ) : (
        <div style={{ height: '2px', background: 'rgba(255,255,255,0.05)', borderRadius: '1px', margin: '8px 0 4px' }} />
      )}

      {/* Hint */}
      <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', textAlign: 'right', marginTop: '6px' }}>
        tocca per dettaglio →
      </div>
    </div>
  );
};

// ── Modal dettaglio live ──────────────────────────────────────
const ModalDettaglio = ({
  partita, onClose, onRemove,
}: {
  partita: PartitaLive;
  onClose: () => void;
  onRemove: (id: string) => void;
}) => (
  <div
    onClick={onClose}
    style={{
      position: 'fixed', inset: 0, zIndex: 50,
      background: 'rgba(0,0,0,0.80)',
      display: 'flex', alignItems: 'flex-start',
      justifyContent: 'center', padding: '16px', overflowY: 'auto',
    }}
  >
    <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '480px', marginTop: '8px', marginBottom: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
        <button
          onClick={onClose}
          style={{
            background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '20px', color: 'rgba(255,255,255,0.6)',
            padding: '4px 14px', fontSize: '12px', cursor: 'pointer',
          }}
        >✕ Chiudi</button>
      </div>
      <LiveMonitor partita={partita} onRemove={(id) => { onRemove(id); onClose(); }} />
    </div>
  </div>
);

// ── LiveGrid ──────────────────────────────────────────────────
interface LiveGridProps {
  partite: PartitaLive[];
  onRefresh: () => void;
  onRemove: (fixtureId: string) => void;
}

const LiveGrid = ({ partite, onRefresh, onRemove }: LiveGridProps) => {
  const [modalPartita, setModalPartita]   = useState<PartitaLive | null>(null);
  const [prematchPartita, setPrematchPartita] = useState<PartitaLive | null>(null);

  if (partite.length === 0) {
    return (
      <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', marginTop: '48px' }}>
        <p style={{ fontSize: '32px', marginBottom: '8px' }}>📭</p>
        <p style={{ fontSize: '14px' }}>Nessuna partita nel monitor</p>
        <p style={{ fontSize: '12px', marginTop: '4px', color: 'rgba(255,255,255,0.15)' }}>Aggiungile dalla tab Pre-Match</p>
      </div>
    );
  }

  const liveCount = partite.filter(p => p.status === '1H' || p.status === '2H').length;

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>
          {partite.length} partite · {liveCount} live
        </span>
        <button
          onClick={onRefresh}
          style={{
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)',
            borderRadius: '12px', color: 'rgba(255,255,255,0.4)',
            padding: '4px 12px', fontSize: '11px', cursor: 'pointer',
          }}
        >🔄 Aggiorna</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: '10px' }}>
        {[...partite]
          .sort((a, b) => {
            const ta = a.kickoff ? new Date(a.kickoff).getTime() : 0;
            const tb = b.kickoff ? new Date(b.kickoff).getTime() : 0;
            return ta - tb;
          })
          .map(p => (
            <LiveCard
              key={p.fixtureId}
              partita={p}
              onClick={() => setModalPartita(p)}
              onPrematch={() => setPrematchPartita(p)}
            />
          ))}
      </div>

      {/* Modal dettaglio live */}
      {modalPartita && (
        <ModalDettaglio
          partita={modalPartita}
          onClose={() => setModalPartita(null)}
          onRemove={(id) => { onRemove(id); setModalPartita(null); }}
        />
      )}

      {/* Modal pre-match rapido */}
      {prematchPartita && (
        <ModalPrematch
          fixtureId={prematchPartita.fixtureId}
          homeTeam={prematchPartita.homeTeam}
          awayTeam={prematchPartita.awayTeam}
          onClose={() => setPrematchPartita(null)}
        />
      )}

      <style>{`@keyframes livepulse { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
    </>
  );
};

export default LiveGrid;
