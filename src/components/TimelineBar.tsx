// ============================================================
// IL PROFETA v2 — components/TimelineBar.tsx
// Casa sopra (giallo) — Ospite sotto (blu)
// v2.3.2
// ============================================================

import { useState } from 'react';
import type { EventoLive } from '../services/supabaseService';

interface TimelineBarProps {
    events: EventoLive[];
    homeTeam: string;
    awayTeam: string;
    minute: number;
}

const getEventoIcon = (type: EventoLive['type']): string => {
    switch (type) {
        case 'goal':          return '⚽';
        case 'penalty':       return '⚽P';
        case 'autogoal':      return '⚽AG';
        case 'yellow':        return '🟨';
        case 'red':           return '🟥';
        case 'second_yellow': return '🟨🟥';
        case 'subst':         return '🔄';
        default:              return '•';
    }
};

const getEventoLabel = (type: EventoLive['type']): string => {
    switch (type) {
        case 'goal':          return 'GOL';
        case 'penalty':       return 'RIG';
        case 'autogoal':      return 'AUT';
        case 'yellow':        return 'AMM';
        case 'red':           return 'ESP';
        case 'second_yellow': return 'ESP';
        case 'subst':         return 'SUB';
        default:              return '';
    }
};

// ── Badge evento ──────────────────────────────────────────────
const EventoBadge = ({
    evento,
    side,
    isHome,
    onClick,
    isSelected,
}: {
    evento: EventoLive;
    side: 'home' | 'away';
    isHome: boolean;
    onClick: () => void;
    isSelected: boolean;
}) => {
    const icon     = getEventoIcon(evento.type);
    const label    = getEventoLabel(evento.type);
    const minLabel = evento.extraTime
        ? `${evento.minute}+${evento.extraTime}'`
        : `${evento.minute}'`;

    const leftPct = Math.min(95, Math.max(2, (evento.minute / 90) * 100));

    // Colore fisso per squadra: giallo=casa, blu=ospite
    const colorClass = isHome
        ? 'border-yellow-500/60 bg-yellow-500/15 text-yellow-400'
        : 'border-blue-500/60 bg-blue-500/15 text-blue-400';

    const ringClass = isSelected ? 'ring-1 ring-white/50' : '';

    return (
        <div
            className="absolute flex flex-col items-center cursor-pointer select-none"
            style={{
                left:      `${leftPct}%`,
                transform: 'translateX(-50%)',
                top:       side === 'home' ? '0px' : 'auto',
                bottom:    side === 'away' ? '0px' : 'auto',
                zIndex:    isSelected ? 10 : 1,
            }}
            onClick={e => { e.stopPropagation(); onClick(); }}
        >
            {side === 'home' && (
                <>
                    <span className="text-[7px] text-gray-500 font-bold leading-none mb-0.5">{minLabel}</span>
                    <div className={`flex flex-col items-center px-1.5 py-1 rounded-lg border ${colorClass} ${ringClass}`}>
                        <span className="text-[10px] leading-none">{icon}</span>
                        <span className="text-[6px] font-black leading-none mt-0.5 uppercase">{label}</span>
                    </div>
                    <div className="w-px h-2 bg-gray-600" />
                </>
            )}
            {side === 'away' && (
                <>
                    <div className="w-px h-2 bg-gray-600" />
                    <div className={`flex flex-col items-center px-1.5 py-1 rounded-lg border ${colorClass} ${ringClass}`}>
                        <span className="text-[6px] font-black leading-none mb-0.5 uppercase">{label}</span>
                        <span className="text-[10px] leading-none">{icon}</span>
                    </div>
                    <span className="text-[7px] text-gray-500 font-bold leading-none mt-0.5">{minLabel}</span>
                </>
            )}

            {/* Popup dettaglio al click */}
            {isSelected && (
                <div
                    className={`absolute z-20 w-40 bg-gray-900 border border-gray-700 rounded-xl p-2.5 shadow-xl ${
                        side === 'home' ? 'top-full mt-1' : 'bottom-full mb-1'
                    }`}
                    style={{ left: leftPct > 60 ? 'auto' : '0', right: leftPct > 60 ? '0' : 'auto' }}
                    onClick={e => e.stopPropagation()}
                >
                    <div className={`text-[9px] font-black uppercase mb-1.5 ${isHome ? 'text-yellow-400' : 'text-blue-400'}`}>
                        {isHome ? '🏠 ' : '✈️ '}{evento.team}
                    </div>
                    <div className="space-y-1">
                        <div>
                            <span className="text-[7px] text-gray-600 uppercase tracking-wider block">
                                {evento.type === 'subst' ? 'Esce' : 'Giocatore'}
                            </span>
                            <span className="text-[10px] font-bold text-white">{evento.player || '—'}</span>
                        </div>
                        {evento.assist && (
                            <div>
                                <span className="text-[7px] text-gray-600 uppercase tracking-wider block">
                                    {evento.type === 'subst' ? 'Entra' : 'Assist'}
                                </span>
                                <span className={`text-[10px] font-bold ${
                                    evento.type === 'subst' ? 'text-emerald-400' : 'text-gray-300'
                                }`}>
                                    {evento.assist}
                                </span>
                            </div>
                        )}
                        <div className={`text-[9px] font-black mt-1 px-1.5 py-0.5 rounded-lg border inline-block ${
                            getEventoIcon(evento.type)
                        } ${isHome ? 'border-yellow-500/40 bg-yellow-500/10 text-yellow-400' : 'border-blue-500/40 bg-blue-500/10 text-blue-400'}`}>
                            {getEventoIcon(evento.type)} {getEventoLabel(evento.type)} {evento.minute}'
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ── TimelineBar ───────────────────────────────────────────────
const TimelineBar = ({ events, homeTeam, awayTeam, minute }: TimelineBarProps) => {
    const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

    if (!events || events.length === 0) return null;

    const homeEvents = events.filter(e => e.team === homeTeam);
    const awayEvents = events.filter(e => e.team !== homeTeam);
    const progressPct = Math.min(100, (minute / 90) * 100);

    return (
        <div className="space-y-2" onClick={() => setSelectedIdx(null)}>

            {/* Label squadre con colori */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-yellow-400" />
                    <span className="text-[8px] uppercase tracking-widest text-yellow-400/80 font-black truncate max-w-[80px]">
                        {homeTeam}
                    </span>
                </div>
                <span className="text-[7px] uppercase tracking-widest text-gray-600">
                    Timeline
                </span>
                <div className="flex items-center gap-1.5">
                    <span className="text-[8px] uppercase tracking-widest text-blue-400/80 font-black truncate max-w-[80px]">
                        {awayTeam}
                    </span>
                    <div className="w-2 h-2 rounded-full bg-blue-400" />
                </div>
            </div>

            {/* Contenitore */}
            <div className="relative" style={{ height: '84px' }} onClick={e => e.stopPropagation()}>

                {/* Linea centrale */}
                <div className="absolute left-0 right-0" style={{ top: '50%' }}>
                    <div className="h-px bg-gray-700 w-full" />
                    <div
                        className="absolute left-0 top-0 h-px bg-yellow-500/30 transition-all duration-1000"
                        style={{ width: `${progressPct}%` }}
                    />
                    <div
                        className="absolute top-1/2 -translate-y-1/2 w-0.5 h-3 bg-yellow-400 rounded-full"
                        style={{ left: `${progressPct}%` }}
                    />
                </div>

                {/* Marker tempi */}
                {[30, 45, 60, 75].map(m => (
                    <div
                        key={m}
                        className="absolute"
                        style={{ left: `${(m / 90) * 100}%`, top: 'calc(50% - 4px)' }}
                    >
                        <div className="w-px h-2 bg-gray-700/60" />
                        <span
                            className="text-[6px] text-gray-700 absolute"
                            style={{ transform: 'translateX(-50%)' }}
                        >
                            {m}'
                        </span>
                    </div>
                ))}

                {/* Casa — sopra */}
                {homeEvents.map((evento, idx) => (
                    <EventoBadge
                        key={idx}
                        evento={evento}
                        side="home"
                        isHome={true}
                        onClick={() => setSelectedIdx(prev => prev === idx ? null : idx)}
                        isSelected={selectedIdx === idx}
                    />
                ))}

                {/* Ospite — sotto */}
                {awayEvents.map((evento, idx) => {
                    const gIdx = homeEvents.length + idx;
                    return (
                        <EventoBadge
                            key={idx}
                            evento={evento}
                            side="away"
                            isHome={false}
                            onClick={() => setSelectedIdx(prev => prev === gIdx ? null : gIdx)}
                            isSelected={selectedIdx === gIdx}
                        />
                    );
                })}
            </div>

            {/* Legenda */}
            <div className="flex items-center justify-center gap-4 pt-1 border-t border-gray-700/40">
                <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-sm bg-yellow-500/30 border border-yellow-500/60" />
                    <span className="text-[7px] text-gray-600 uppercase tracking-wider">Casa</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-sm bg-blue-500/30 border border-blue-500/60" />
                    <span className="text-[7px] text-gray-600 uppercase tracking-wider">Ospite</span>
                </div>
                {[
                    { icon: '⚽', label: 'Gol' },
                    { icon: '🟨', label: 'Giallo' },
                    { icon: '🟥', label: 'Rosso' },
                    { icon: '🔄', label: 'Sost.' },
                ].map(item => (
                    <div key={item.label} className="flex items-center gap-1">
                        <span className="text-[8px]">{item.icon}</span>
                        <span className="text-[7px] text-gray-600 uppercase tracking-wider">{item.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TimelineBar;
