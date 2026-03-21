// ============================================================
// IL PROFETA v2 — components/LiveMonitor.tsx
// v2.3.0 — Dual window IP/10' + IP/5'
// ============================================================

import { useState, useEffect } from 'react';
import type { PartitaLive, SnapshotGrafico } from '../services/sheetsService';
import { getTrendLabel, getVotoLabel, semaforoEmoji, getSnapshotsGrafico } from '../services/sheetsService';
import TimelineBar from './TimelineBar';
// ── Semaforo ──────────────────────────────────────────────────
const SemaforoSignal = ({
    livello,
    showEsci,
}: {
    livello: number;
    showEsci?: boolean;
}) => {
    const config = {
        0: { color: 'text-gray-500',   bg: 'bg-gray-800/60',      border: 'border-gray-700/40',    label: 'NESSUN SEGNALE' },
        1: { color: 'text-yellow-400', bg: 'bg-yellow-500/10',    border: 'border-yellow-500/30',  label: 'LIV. 1' },
        2: { color: 'text-orange-400', bg: 'bg-orange-500/10',    border: 'border-orange-500/30',  label: 'LIV. 2' },
        3: { color: 'text-emerald-400',bg: 'bg-emerald-500/15',   border: 'border-emerald-500/40', label: 'LIV. 3' },
    }[livello] ?? { color: 'text-gray-500', bg: 'bg-gray-800/60', border: 'border-gray-700/40', label: 'NESSUN SEGNALE' };

    return (
        <div className="flex flex-col items-center gap-1 pt-2">
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border ${config.bg} ${config.border}`}>
                <span className="text-[11px]">{semaforoEmoji(livello)}</span>
                <span className={`text-[8px] font-black uppercase tracking-widest ${config.color}`}>
                    {config.label}
                </span>
            </div>
            {livello > 0 && (
                <div className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border ${
                    showEsci ? 'bg-red-500/15 border-red-500/40' : 'bg-emerald-500/10 border-emerald-500/30'
                }`}>
                    <span className="text-[9px]">{showEsci ? '🔴' : '🟢'}</span>
                    <span className={`text-[8px] font-black uppercase tracking-widest ${
                        showEsci ? 'text-red-400 animate-pulse' : 'text-emerald-400'
                    }`}>
                        {showEsci ? 'ESCI' : 'TIENI'}
                    </span>
                </div>
            )}
        </div>
    );
};

// ── Barra comparativa ─────────────────────────────────────────
const StatBar = ({
    label, homeVal, awayVal, isPercent = false
}: {
    label: string;
    homeVal: number;
    awayVal: number;
    isPercent?: boolean;
}) => {
    const total = homeVal + awayVal || 1;
    const homePct = (homeVal / total) * 100;
    return (
        <div className="space-y-0.5">
            <div className="flex items-center justify-between text-[9px]">
                <span className={`font-black w-10 text-right ${homeVal >= awayVal ? 'text-yellow-400' : 'text-gray-500'}`}>
                    {homeVal}{isPercent ? '%' : ''}
                </span>
                <span className="text-gray-600 uppercase tracking-widest text-[8px] flex-1 text-center">{label}</span>
                <span className={`font-black w-10 text-left ${awayVal >= homeVal ? 'text-yellow-400' : 'text-gray-500'}`}>
                    {awayVal}{isPercent ? '%' : ''}
                </span>
            </div>
            <div className="flex h-1.5 rounded-full overflow-hidden bg-gray-800">
                <div className="h-full bg-yellow-500 transition-all duration-500" style={{ width: `${homePct}%` }} />
                <div className="h-full flex-1 bg-blue-500/60" />
            </div>
        </div>
    );
};

// ── Griglia dual window ───────────────────────────────────────
const DualWindowGrid = ({
    ip10, ip5, trend10, trend5,
}: {
    ip10: number; ip5: number; trend10: number; trend5: number;
}) => {
    const t10Label = getTrendLabel(trend10);
    const t5Label  = getTrendLabel(trend5);
    return (
        <div className="grid grid-cols-2 gap-1">
            <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg px-1.5 py-1 text-center">
                <div className="text-[7px] text-yellow-500/60 uppercase tracking-widest mb-0.5">IP/10'</div>
                <div className={`text-sm font-black ${ip10 > 0.2 ? 'text-yellow-400' : 'text-gray-500'}`}>
                    {ip10.toFixed(2)}
                </div>
            </div>
            <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg px-1.5 py-1 text-center">
                <div className="text-[7px] text-blue-500/60 uppercase tracking-widest mb-0.5">IP/5'</div>
                <div className={`text-sm font-black ${ip5 > 0.2 ? 'text-blue-400' : 'text-gray-500'}`}>
                    {ip5.toFixed(2)}
                </div>
            </div>
            <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg px-1.5 py-1 text-center">
                <div className="text-[7px] text-yellow-500/60 uppercase tracking-widest mb-0.5">TR/10'</div>
                <div className={`text-sm font-black ${t10Label.color}`}>
                    {trend10 > 0 ? '+' : ''}{trend10.toFixed(2)}
                </div>
            </div>
            <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg px-1.5 py-1 text-center">
                <div className="text-[7px] text-blue-500/60 uppercase tracking-widest mb-0.5">TR/5'</div>
                <div className={`text-sm font-black ${t5Label.color}`}>
                    {trend5 > 0 ? '+' : ''}{trend5.toFixed(2)}
                </div>
            </div>
        </div>
    );
};

// ── Colore IP dinamico ────────────────────────────────────────
const ipColorHex = (ip: number): string => {
  if (ip >= 0.55) return '#F87171';
  if (ip >= 0.45) return '#FB923C';
  if (ip >= 0.35) return '#FACC15';
  if (ip > 0.20)  return '#9CA3AF';
  return '#4B5563';
};

// ── Grafico singola squadra ───────────────────────────────────
const GraficoSquadra = ({
  label, ip10vals, ip5vals,
}: {
  label: string;
  ip10vals: number[];
  ip5vals: number[];
}) => {
  if (ip10vals.length < 2) return (
    <div className="flex-1 bg-gray-800/40 rounded-xl p-2 text-center">
      <div className="text-[8px] text-gray-600 uppercase tracking-widest mb-1">{label}</div>
      <div className="text-[9px] text-gray-700">dati insufficienti</div>
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

  const W = 140; const H = 70; const pad = 6;
  const toX = (i: number) => pad + (i / (ip10vals.length - 1)) * (W - pad * 2);
  const toY = (v: number) => H - pad - ((v - minV) / range) * (H - pad * 2);
  const linePath = (vals: number[]) =>
    vals.map((v, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)} ${toY(v).toFixed(1)}`).join(' ');

  const soglie = [
    { v: 0.35, color: 'rgba(250,204,21,0.25)' },
    { v: 0.45, color: 'rgba(251,146,60,0.25)' },
    { v: 0.55, color: 'rgba(52,211,153,0.25)' },
  ];

  return (
    <div className="flex-1 bg-gray-800/40 rounded-xl p-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[8px] text-gray-500 uppercase tracking-widest truncate">{label}</span>
        <div className="flex gap-2 shrink-0">
          <span style={{ fontSize: '9px', color: colorIp10 }}>10'</span>
          <span style={{ fontSize: '9px', color: colorIp5 }}>5'</span>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: '70px' }} preserveAspectRatio="none">
        {soglie.map((s, i) => {
          const y = toY(s.v);
          if (y < 0 || y > H) return null;
          return <line key={i} x1={pad} y1={y} x2={W - pad} y2={y} stroke={s.color} strokeWidth="0.5" strokeDasharray="3,3" />;
        })}
        <path d={linePath(ip10vals)} fill="none" stroke={colorIp10} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
        <path d={linePath(ip5vals)}  fill="none" stroke={colorIp5}  strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" strokeDasharray="4,2" />
        <circle cx={toX(ip10vals.length - 1)} cy={toY(currentIp10)} r="2.5" fill={colorIp10} />
        <circle cx={toX(ip5vals.length - 1)}  cy={toY(currentIp5)}  r="2.5" fill={colorIp5} />
      </svg>
    </div>
  );
};

// ── Grafico IP esteso ─────────────────────────────────────────
const GraficoIP = ({ fixtureId, homeTeam, awayTeam }: { fixtureId: string; homeTeam: string; awayTeam: string }) => {
  const [snapshots, setSnapshots] = useState<SnapshotGrafico[]>([]);

  useEffect(() => {
    getSnapshotsGrafico(fixtureId).then(setSnapshots);
  }, [fixtureId]);

  if (snapshots.length < 2) return null;

  const ip10Home = snapshots.map(s => s.ipHome10);
  const ip5Home  = snapshots.map(s => s.ipHome5);
  const ip10Away = snapshots.map(s => s.ipAway10);
  const ip5Away  = snapshots.map(s => s.ipAway5);

  return (
    <div className="bg-gray-800/40 rounded-2xl p-3">
      <div className="text-[8px] uppercase tracking-widest text-gray-600 mb-2 text-center">
        Trend IP — ultimi 30' &nbsp;·&nbsp; <span style={{ borderBottom: '1px solid #9CA3AF' }}>IP/10'</span> &nbsp; <span style={{ borderBottom: '1px dashed #9CA3AF' }}>IP/5'</span>
      </div>
      <div className="flex gap-2">
        <GraficoSquadra label={homeTeam} ip10vals={ip10Home} ip5vals={ip5Home} />
        <GraficoSquadra label={awayTeam} ip10vals={ip10Away} ip5vals={ip5Away} />
      </div>
    </div>
  );
};

// ── LiveMonitor ───────────────────────────────────────────────
interface LiveMonitorProps {
    partita: PartitaLive;
    onRemove: (fixtureId: string) => void;
}

const LiveMonitor = ({ partita, onRemove }: LiveMonitorProps) => {
    const [showFtStats, setShowFtStats] = useState(false);

    const isLive = partita.status === '1H' || partita.status === '2H';
    const isHT   = partita.status === 'HT';
    const isFT   = partita.status === 'FT';
    const showStats = isLive || isHT || (isFT && showFtStats);

    const homeVotoLabel  = getVotoLabel(partita.votoHome ?? 0);
    const awayVotoLabel  = getVotoLabel(partita.votoAway ?? 0);
    const homeTrendLabel = getTrendLabel(partita.trendHome ?? 0);
    const awayTrendLabel = getTrendLabel(partita.trendAway ?? 0);

    const statusLabel = partita.status === 'HT' ? 'Intervallo'
        : partita.status === 'FT'  ? 'Terminata'
        : partita.status === 'NS'  ? 'Non iniziata'
        : `${partita.minute}'`;

    return (
        <div className={`bg-gray-900 rounded-[2rem] border p-5 space-y-4 transition-all ${
            isLive ? 'border-yellow-500/20' : 'border-gray-800'
        }`}>

            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                        isLive ? 'bg-red-500/20 text-red-400 animate-pulse' :
                        isFT   ? 'bg-gray-700/60 text-gray-400' :
                                 'bg-gray-800 text-gray-500'
                    }`}>
                        {isLive ? '● LIVE' : isFT ? '✓ FT' : '⏸ ATTESA'}
                    </span>
                    <span className="text-[10px] text-gray-500 font-bold">{partita.league}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-400">{statusLabel}</span>
                    <button
                        onClick={() => onRemove(partita.fixtureId)}
                        className="text-gray-600 hover:text-red-400 text-xs transition-colors px-1"
                    >✕</button>
                </div>
            </div>
            
{/* Card NS — partita non iniziata */}
            {partita.status === 'NS' && (
                <div className="flex items-center justify-between bg-gray-800/40 rounded-2xl px-4 py-3">
                    <span className="text-sm font-black text-white">
                        {partita.homeTeam}
                    </span>
                    <span className="text-xs text-gray-600 font-bold">vs</span>
                    <span className="text-sm font-black text-white">
                        {partita.awayTeam}
                    </span>
                </div>
            )}

            {/* Card ristretta FT */}
            {isFT && !showFtStats && (
                <div className="flex items-center justify-between bg-gray-800/40 rounded-2xl px-4 py-3">
                    <span className="text-sm font-black text-white">
                        {partita.homeTeam}{' '}
                        <span className="text-yellow-400">{partita.scoreHome} – {partita.scoreAway}</span>{' '}
                        {partita.awayTeam}
                    </span>
                    <button
                        onClick={() => setShowFtStats(true)}
                        className="text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/20 transition-all"
                    >
                        📊 Vedi Statistiche
                    </button>
                </div>
            )}

            {/* Bottone comprimi FT */}
            {isFT && showFtStats && (
                <div className="flex items-center justify-between">
                    <div className="text-[8px] uppercase tracking-widest text-gray-600">
                        📊 Statistiche Finali — {partita.homeTeam} {partita.scoreHome}–{partita.scoreAway} {partita.awayTeam}
                    </div>
                    <button
                        onClick={() => setShowFtStats(false)}
                        className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-xl bg-gray-800 text-gray-500 hover:text-gray-300 transition-all"
                    >
                        ▲ Comprimi
                    </button>
                </div>
            )}

            {/* Teams + Score + Dual Window + Semaforo */}
            {showStats && (
                <div className="flex items-center justify-between">

                    {/* Casa */}
                    <div className="flex-1 text-center space-y-1">
                        <div className="text-sm font-black text-white truncate">{partita.homeTeam}</div>
                        <div className={`text-3xl font-black ${homeVotoLabel.color}`}>
                            {(partita.votoHome ?? 0).toFixed(1)}
                        </div>
                        <div className={`text-[8px] font-bold uppercase tracking-wider ${homeVotoLabel.color}`}>
                            {homeVotoLabel.label}
                        </div>
                        <div className="pt-1 space-y-1.5">
                            <DualWindowGrid
                                ip10={partita.ipHome ?? 0}
                                ip5={partita.ipHome5 ?? 0}
                                trend10={partita.trendHome ?? 0}
                                trend5={partita.trendHome5 ?? 0}
                            />
                            <SemaforoSignal livello={partita.semaforoHome ?? 0} />
                        </div>
                    </div>

                    {/* Score */}
                    <div className="px-3 text-center">
                        <div className="text-2xl font-black text-yellow-400">
                            {partita.scoreHome} – {partita.scoreAway}
                        </div>
                    </div>

                    {/* Ospite */}
                    <div className="flex-1 text-center space-y-1">
                        <div className="text-sm font-black text-white truncate">{partita.awayTeam}</div>
                        <div className={`text-3xl font-black ${awayVotoLabel.color}`}>
                            {(partita.votoAway ?? 0).toFixed(1)}
                        </div>
                        <div className={`text-[8px] font-bold uppercase tracking-wider ${awayVotoLabel.color}`}>
                            {awayVotoLabel.label}
                        </div>
                        <div className="pt-1 space-y-1.5">
                            <DualWindowGrid
                                ip10={partita.ipAway ?? 0}
                                ip5={partita.ipAway5 ?? 0}
                                trend10={partita.trendAway ?? 0}
                                trend5={partita.trendAway5 ?? 0}
                            />
                            <SemaforoSignal livello={partita.semaforoAway ?? 0} />
                        </div>
                    </div>

                </div>
            )}

            {/* Timeline eventi */}
            {showStats && partita.events && partita.events.length > 0 && (
                <div className="bg-gray-800/40 rounded-2xl p-3">
                    <TimelineBar
                        events={partita.events}
                        homeTeam={partita.homeTeam}
                        awayTeam={partita.awayTeam}
                        minute={partita.minute}
                    />
                </div>
            )}
            
           {/* Grafico IP */}
           {showStats && (isLive || isHT) && (
              <GraficoIP
                fixtureId={partita.fixtureId}
                homeTeam={partita.homeTeam}
                awayTeam={partita.awayTeam}
              />
            )}

            {/* Tabella confronto statistiche */}
            {showStats && partita.stats && (
                <div className={`bg-gray-800/40 rounded-2xl p-3 space-y-2.5 ${isHT ? 'opacity-75' : ''} ${isFT ? 'opacity-90' : ''}`}>
                    {isHT && <div className="text-[8px] uppercase tracking-widest text-yellow-500/60 text-center mb-1">⏸ Dati congelati — Fine 1° Tempo</div>}
                    {isFT && <div className="text-[8px] uppercase tracking-widest text-gray-500 text-center mb-1">✓ Statistiche Finali</div>}
                    <div className="text-[8px] uppercase tracking-widest text-gray-600 text-center mb-1">Confronto Statistiche</div>
                    <StatBar label="TIRI IN AREA" homeVal={partita.stats.sibHome}    awayVal={partita.stats.sibAway} />
                    <StatBar label="TIRI TOT."    homeVal={partita.stats.shotsHome}  awayVal={partita.stats.shotsAway} />
                    <StatBar label="TIRI IN P."   homeVal={partita.stats.sotHome}    awayVal={partita.stats.sotAway} />
                    <StatBar label="ANGOLI"        homeVal={partita.stats.cornersHome} awayVal={partita.stats.cornersAway} />
                    <StatBar label="POSSESSO"      homeVal={partita.stats.possHome}   awayVal={partita.stats.possAway} isPercent />
                    <div className="border-t border-gray-700/50 pt-2 space-y-1.5">
                        <div className="flex items-center justify-between text-[9px]">
                            <span className={`font-black w-10 text-right ${(partita.ipHome ?? 0) >= (partita.ipAway ?? 0) ? 'text-yellow-400' : 'text-gray-500'}`}>
                                {(partita.ipHome ?? 0).toFixed(2)}
                            </span>
                            <span className="text-yellow-500/60 uppercase tracking-widest text-[8px] flex-1 text-center">IP/10'</span>
                            <span className={`font-black w-10 text-left ${(partita.ipAway ?? 0) >= (partita.ipHome ?? 0) ? 'text-yellow-400' : 'text-gray-500'}`}>
                                {(partita.ipAway ?? 0).toFixed(2)}
                            </span>
                        </div>
                        <div className="flex items-center justify-between text-[9px]">
                            <span className={`font-black w-10 text-right ${homeTrendLabel.color}`}>
                                {(partita.trendHome ?? 0) > 0 ? '+' : ''}{(partita.trendHome ?? 0).toFixed(2)}
                            </span>
                            <span className="text-yellow-500/60 uppercase tracking-widest text-[8px] flex-1 text-center">TR/10'</span>
                            <span className={`font-black w-10 text-left ${awayTrendLabel.color}`}>
                                {(partita.trendAway ?? 0) > 0 ? '+' : ''}{(partita.trendAway ?? 0).toFixed(2)}
                            </span>
                        </div>
                        <div className="flex items-center justify-between text-[9px]">
                            <span className={`font-black w-10 text-right ${(partita.ipHome5 ?? 0) >= (partita.ipAway5 ?? 0) ? 'text-blue-400' : 'text-gray-500'}`}>
                                {(partita.ipHome5 ?? 0).toFixed(2)}
                            </span>
                            <span className="text-blue-500/60 uppercase tracking-widest text-[8px] flex-1 text-center">IP/5'</span>
                            <span className={`font-black w-10 text-left ${(partita.ipAway5 ?? 0) >= (partita.ipHome5 ?? 0) ? 'text-blue-400' : 'text-gray-500'}`}>
                                {(partita.ipAway5 ?? 0).toFixed(2)}
                            </span>
                        </div>
                        <div className="flex items-center justify-between text-[9px]">
                            <span className={`font-black w-10 text-right ${getTrendLabel(partita.trendHome5 ?? 0).color}`}>
                                {(partita.trendHome5 ?? 0) > 0 ? '+' : ''}{(partita.trendHome5 ?? 0).toFixed(2)}
                            </span>
                            <span className="text-blue-500/60 uppercase tracking-widest text-[8px] flex-1 text-center">TR/5'</span>
                            <span className={`font-black w-10 text-left ${getTrendLabel(partita.trendAway5 ?? 0).color}`}>
                                {(partita.trendAway5 ?? 0) > 0 ? '+' : ''}{(partita.trendAway5 ?? 0).toFixed(2)}
                            </span>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default LiveMonitor;
