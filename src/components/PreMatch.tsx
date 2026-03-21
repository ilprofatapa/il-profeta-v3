// ============================================================
// IL PROFETA v2 — components/PreMatch.tsx
// v2.3.1 — con popup dettaglio analisi
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import {
    getPrematch, setLegheExtra,
    LEGHE_EXTRA_DISPONIBILI,
    getVotoColor, getOddColor,
} from '../services/sheetsService';
import type { PartitaPrematch, PrematchMercato } from '../services/sheetsService';

const LEGHE_PREFERITE_NOMI = [
    'Champions League', 'Premier League', 'Serie A',
    'La Liga', 'Bundesliga', 'Ligue 1', 'Eredivisie', 'Primeira Liga',
];

const AREE = ['Sud America', 'Nord America', 'Europa', 'Asia'];

// ── Voto badge ────────────────────────────────────────────────
const VotoBadge = ({ label, voto }: { label: string; voto: number }) => (
    <div className="flex flex-col items-center gap-0.5">
        <span className="text-[8px] uppercase tracking-widest text-gray-600">{label}</span>
        <span className={`text-lg font-black ${getVotoColor(voto)}`}>
            {voto.toFixed(2)}
        </span>
        <div className="w-full bg-gray-800 rounded-full h-1">
            <div
                className={`h-1 rounded-full transition-all ${
                    voto >= 4.0 ? 'bg-emerald-400' :
                    voto >= 3.5 ? 'bg-yellow-400' :
                    voto >= 3.0 ? 'bg-orange-400' : 'bg-gray-600'
                }`}
                style={{ width: `${Math.min(100, (voto / 5) * 100)}%` }}
            />
        </div>
    </div>
);

// ── Popup dettaglio analisi ───────────────────────────────────
const AnalisiPopup = ({
    partita,
    onClose,
}: {
    partita: PartitaPrematch;
    onClose: () => void;
}) => {
    const [tab, setTab] = useState<'sign1' | 'sign2' | 'over25'>('sign1');
    if (!partita.dettaglio) return null;

    const mercati: Record<string, PrematchMercato> = {
        sign1:  partita.dettaglio.sign1,
        sign2:  partita.dettaglio.sign2,
        over25: partita.dettaglio.over25,
    };
    const mercato = mercati[tab];
    const nomi: Record<string, string> = {
        sign1: 'Segno 1', sign2: 'Segno 2', over25: 'Over 2.5',
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div
                className="bg-gray-950 border border-gray-800 rounded-[2rem] w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-gray-800 bg-gray-900/50">
                    <div>
                        <div className="inline-block px-3 py-1 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-yellow-500 text-[10px] font-black uppercase tracking-widest mb-1">
                            Analisi Oracolo
                        </div>
                        <h2 className="text-lg font-black text-white italic">
                            {partita.teams.home.name} vs {partita.teams.away.name}
                        </h2>
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest">
                            {partita.leagueName}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                    >✕</button>
                </div>

                {/* Tab mercati */}
                <div className="flex gap-1 p-3 bg-gray-900/30 border-b border-gray-800">
                    {(['sign1', 'sign2', 'over25'] as const).map(t => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            className={`flex-1 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all ${
                                tab === t
                                    ? 'bg-yellow-500 text-gray-950'
                                    : 'text-gray-500 hover:text-gray-300 bg-gray-800/60'
                            }`}
                        >
                            {nomi[t]}
                            {tab !== t && (
                                <span className={`ml-1.5 text-[10px] ${
                                    mercati[t].finalScore >= 4.0 ? 'text-emerald-400' :
                                    mercati[t].finalScore >= 3.0 ? 'text-yellow-400' : 'text-rose-400'
                                }`}>
                                    {mercati[t].finalScore.toFixed(2)}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Contenuto scrollabile */}
                <div className="overflow-y-auto p-5 space-y-3">

                    {/* Score mercato attivo */}
                    <div className="flex items-center justify-between bg-gray-900 rounded-2xl px-4 py-3 border border-gray-800">
                        <span className="text-xs font-black uppercase tracking-widest text-gray-500">
                            {nomi[tab]}
                        </span>
                        <div className="flex items-center gap-3">
                            <span className={`text-2xl font-black ${
                                mercato.finalScore >= 4.0 ? 'text-emerald-400' :
                                mercato.finalScore >= 3.0 ? 'text-yellow-400' : 'text-rose-400'
                            }`}>
                                {mercato.finalScore.toFixed(2)}
                            </span>
                            <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg ${
                                mercato.recommendation.includes('Scommetti') || mercato.recommendation.includes('Alta')
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                    : 'bg-gray-800 text-gray-400 border border-gray-700'
                            }`}>
                                {mercato.recommendation}
                            </span>
                        </div>
                    </div>

                    {/* Parametri */}
                    {mercato.parameters.map((param, idx) => (
                        <div key={idx} className="bg-gray-900 rounded-xl p-3 border border-gray-800/50 space-y-1">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                                    {param.parameter}
                                </span>
                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-black text-sm border ${
                                    param.score >= 4.0
                                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                        : param.score >= 3.0
                                        ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
                                        : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                                }`}>
                                    {param.score.toFixed(1)}
                                </div>
                            </div>
                            <p className="text-sm font-bold text-yellow-400">{param.value}</p>
                            <p className="text-[10px] text-gray-500">{param.motivation}</p>
                            {param.rawData && (
                                <p className="text-[10px] font-mono text-gray-600 bg-gray-800/60 rounded-lg px-2 py-1 mt-1">
                                    {param.rawData}
                                </p>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// ── Card partita prematch ─────────────────────────────────────
const PartitaCard = ({
    partita,
    onAddToMonitor,
    onShowAnalisi,
}: {
    partita: PartitaPrematch;
    onAddToMonitor: (p: PartitaPrematch) => void;
    onShowAnalisi: (p: PartitaPrematch) => void;
}) => {
    const kickoff = new Date(partita.commenceTime).toLocaleTimeString('it-IT', {
        hour: '2-digit', minute: '2-digit',
    });
    const isPreferiti = LEGHE_PREFERITE_NOMI.includes(partita.leagueName);
    const bestVoto    = Math.max(partita.sign1, partita.sign2, partita.over25);
    const isHot       = bestVoto >= 4.0;

    return (
        <div className={`bg-gray-900 rounded-[1.5rem] border p-4 space-y-3 transition-all ${
            isHot ? 'border-yellow-500/30' : 'border-gray-800'
        }`}>

            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                        isPreferiti
                            ? 'bg-yellow-500/10 border border-yellow-500/30 text-yellow-500'
                            : 'bg-gray-800 text-gray-500'
                    }`}>
                        {partita.leagueName}
                    </span>
                    {partita.area !== 'Europa' && (
                        <span className="text-[8px] text-gray-600">{partita.area}</span>
                    )}
                </div>
                <span className="text-[10px] font-bold text-gray-500">{kickoff}</span>
            </div>

            {/* Squadre */}
            <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-black text-white flex-1 truncate">
                    {partita.teams.home.name}
                </span>
                <span className="text-xs font-black text-gray-600 px-2">vs</span>
                <span className="text-sm font-black text-white flex-1 truncate text-right">
                    {partita.teams.away.name}
                </span>
            </div>

            {/* Quote */}
            {(partita.odds.home || partita.odds.away || partita.odds.over25) && (
                <div className="flex items-center justify-between bg-gray-800/40 rounded-xl px-3 py-2">
                    <div className="text-center">
                        <div className="text-[8px] uppercase tracking-widest text-gray-600">1</div>
                        <div className={`text-sm font-black ${getOddColor(partita.odds.home)}`}>
                            {partita.odds.home?.toFixed(2) ?? '—'}
                        </div>
                    </div>
                    <div className="text-center">
                        <div className="text-[8px] uppercase tracking-widest text-gray-600">Over 2.5</div>
                        <div className={`text-sm font-black ${getOddColor(partita.odds.over25)}`}>
                            {partita.odds.over25?.toFixed(2) ?? '—'}
                        </div>
                    </div>
                    <div className="text-center">
                        <div className="text-[8px] uppercase tracking-widest text-gray-600">2</div>
                        <div className={`text-sm font-black ${getOddColor(partita.odds.away)}`}>
                            {partita.odds.away?.toFixed(2) ?? '—'}
                        </div>
                    </div>
                </div>
            )}

            {/* Voti */}
            <div className="grid grid-cols-3 gap-2">
                <VotoBadge label="Segno 1"  voto={partita.sign1}  />
                <VotoBadge label="Over 2.5" voto={partita.over25} />
                <VotoBadge label="Segno 2"  voto={partita.sign2}  />
            </div>

            {/* Bottoni */}
            <div className="flex gap-2">
                {partita.dettaglio && (
                    <button
                        onClick={() => onShowAnalisi(partita)}
                        className="flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 transition-all"
                    >
                        🔍 Analisi
                    </button>
                )}
                <button
                    onClick={() => onAddToMonitor(partita)}
                    className="flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-500 hover:text-gray-300 transition-all"
                >
                    + Preferite
                </button>
            </div>
        </div>
    );
};

// ── Selettore leghe extra ─────────────────────────────────────
const LegheExtraPanel = ({
    onClose,
    onSave,
}: {
    onClose: () => void;
    onSave: (ids: number[]) => void;
}) => {
    const [selected, setSelected] = useState<number[]>([]);

    const toggle = (id: number) => {
        setSelected(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
            <div className="w-full max-w-md bg-gray-900 rounded-[2rem] border border-gray-800 p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black uppercase tracking-widest text-white">
                        Leghe Extra per Calibrazione
                    </h3>
                    <button onClick={onClose} className="text-gray-600 hover:text-white">✕</button>
                </div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">
                    Seleziona le leghe da aggiungere all'analisi pre-match
                </p>

                {AREE.map(area => {
                    const leghe = LEGHE_EXTRA_DISPONIBILI.filter(l => l.area === area);
                    return (
                        <div key={area} className="space-y-2">
                            <div className="text-[9px] uppercase tracking-widest text-gray-600 border-b border-gray-800 pb-1">
                                {area}
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                {leghe.map(lega => (
                                    <button
                                        key={lega.id}
                                        onClick={() => toggle(lega.id)}
                                        className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider text-left transition-all border ${
                                            selected.includes(lega.id)
                                                ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
                                                : 'bg-gray-800/60 border-gray-700/40 text-gray-500 hover:text-gray-300'
                                        }`}
                                    >
                                        {lega.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    );
                })}

                <div className="flex gap-3 pt-2">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest bg-gray-800 text-gray-500 hover:text-gray-300 transition-all"
                    >
                        Annulla
                    </button>
                    <button
                        onClick={() => { onSave(selected); onClose(); }}
                        className="flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest bg-yellow-500 text-gray-950 hover:bg-yellow-400 transition-all"
                    >
                        Salva ({selected.length})
                    </button>
                </div>
            </div>
        </div>
    );
};

// ── PreMatch principale ───────────────────────────────────────
const PreMatch = ({
    onAddToMonitor,
    partiteEsterne,
    onPartiteChange,
    dataEsterna,
    onDataChange,
}: {
    onAddToMonitor: (fixtureId: string, homeTeam: string, awayTeam: string, kickoff: string, league: string) => void;
    partiteEsterne: PartitaPrematch[];
    onPartiteChange: (p: PartitaPrematch[]) => void;
    dataEsterna: string;
    onDataChange: (d: string) => void;
}) => {
    const [date, setDate]                   = useState(dataEsterna);
    const [partite, setPartite]             = useState<PartitaPrematch[]>(partiteEsterne);
    const [loading, setLoading]             = useState(false);
    const [processing, setProcessing]       = useState(false);
    const [showLeghePanel, setShowLeghePanel] = useState(false);
    const [filtroArea, setFiltroArea]       = useState<string>('Tutte');
    const [filtroMin, setFiltroMin]         = useState<number>(0);
     const [ordinamento, setOrdinamento] = useState<'voto' | 'lega' | 'orario'>('voto');
    const [analisiPartita, setAnalisiPartita] = useState<PartitaPrematch | null>(null);
    const [pollingRef, setPollingRef]       = useState<ReturnType<typeof setInterval> | null>(null);
    useEffect(() => { onDataChange(date); }, [date]);
    useEffect(() => { onPartiteChange(partite); }, [partite]);

    const areeDisponibili = ['Tutte', 'Europa', 'Sud America', 'Nord America', 'Asia'];

    const stopPolling = useCallback(() => {
        if (pollingRef) { clearInterval(pollingRef); setPollingRef(null); }
    }, [pollingRef]);

    const avviaScan = async () => {
        stopPolling();
        setLoading(true);
        setPartite([]);
        setProcessing(false);

        try {
            const result = await getPrematch(date);
            if (result.status === 'ok' && result.partite.length > 0) {
                setPartite(result.partite);
                setLoading(false);
                return;
            }

            setProcessing(true);
            setLoading(false);

            const interval = setInterval(async () => {
                try {
                    const poll = await getPrematch(date);
                    if (poll.status === 'ok' && poll.partite.length > 0) {
                        setPartite(poll.partite);
                        setProcessing(false);
                        clearInterval(interval);
                        setPollingRef(null);
                    }
                } catch(e) {
                    console.error('Errore polling:', e);
                }
            }, 10_000);

            setPollingRef(interval);

        } catch(e) {
            console.error('Errore avviaScan:', e);
            setLoading(false);
        }
    };

    useEffect(() => {
        return () => { if (pollingRef) clearInterval(pollingRef); };
    }, [pollingRef]);

    const handleSaveLeghe = async (ids: number[]) => {
        await setLegheExtra(ids);
    };

    const partiteFiltrate = partite
        .filter(p => filtroArea === 'Tutte' || p.area === filtroArea)
        .filter(p => Math.max(p.sign1, p.sign2, p.over25) >= filtroMin)
        .sort((a, b) => {
            if (ordinamento === 'voto') {
                return Math.max(b.sign1, b.sign2, b.over25) - Math.max(a.sign1, a.sign2, a.over25);
            }
            if (ordinamento === 'lega') {
                const legaCompare = a.leagueName.localeCompare(b.leagueName);
                if (legaCompare !== 0) return legaCompare;
                return new Date(a.commenceTime).getTime() - new Date(b.commenceTime).getTime();
            }
            // orario
            const timeCompare = new Date(a.commenceTime).getTime() - new Date(b.commenceTime).getTime();
            if (timeCompare !== 0) return timeCompare;
            return a.leagueName.localeCompare(b.leagueName);
        });

    const formattedDate = new Date(date).toLocaleDateString('it-IT', {
        day: '2-digit', month: '2-digit', year: 'numeric',
    });

    return (
        <div className="space-y-6">

            {/* Header controlli */}
            <div className="bg-gray-900 rounded-[2rem] border border-gray-800 p-6 space-y-5">
                <div className="text-center space-y-1">
                    <div className="inline-block px-4 py-1 bg-yellow-500/10 border border-yellow-500/30 rounded-full">
                        <span className="text-yellow-500 text-[10px] font-black uppercase tracking-[0.3em]">
                            Analisi Pre-Match
                        </span>
                    </div>
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-widest opacity-60">
                        {formattedDate}
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 justify-center">
                    <input
                        type="date"
                        value={date}
                        onChange={e => setDate(e.target.value)}
                        className="bg-gray-800 border border-gray-700 text-yellow-400 rounded-2xl px-6 py-3 text-lg font-black outline-none focus:ring-4 focus:ring-yellow-500/20 transition-all"
                    />
                    <button
                        onClick={avviaScan}
                        disabled={loading || processing}
                        className="h-[52px] px-8 bg-yellow-500 hover:bg-yellow-400 disabled:bg-gray-800 disabled:text-gray-600 text-gray-950 font-black text-sm rounded-2xl transition-all"
                    >
                        {loading ? 'Caricamento...' : processing ? 'Elaborazione...' : 'Sblocca Partite'}
                    </button>
                    <button
                        onClick={() => setShowLeghePanel(true)}
                        className="h-[52px] px-5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-400 hover:text-white font-black text-sm rounded-2xl transition-all"
                    >
                        🌍 Leghe Extra
                    </button>
                </div>

                {processing && (
                    <div className="flex items-center justify-center gap-3 bg-yellow-500/5 border border-yellow-500/20 rounded-2xl px-4 py-3">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                        <span className="text-yellow-500 text-[10px] font-black uppercase tracking-widest">
                            Apps Script sta elaborando — aggiornamento automatico ogni 10s
                        </span>
                    </div>
                )}
            </div>

            {/* Filtri */}
            {partite.length > 0 && (
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex gap-1 bg-gray-900/60 rounded-xl p-1 border border-gray-800/50">
                        {areeDisponibili.map(area => (
                            <button
                                key={area}
                                onClick={() => setFiltroArea(area)}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                                    filtroArea === area
                                        ? 'bg-yellow-500 text-gray-950'
                                        : 'text-gray-500 hover:text-gray-300'
                                }`}
                            >
                                {area}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-2 bg-gray-900/60 rounded-xl px-3 py-1.5 border border-gray-800/50">
                        <span className="text-[10px] uppercase tracking-widest text-gray-600">Min voto</span>
                        {[0, 3.0, 3.5, 4.0].map(v => (
                            <button
                                key={v}
                                onClick={() => setFiltroMin(v)}
                                className={`px-2 py-1 rounded-lg text-[10px] font-black transition-all ${
                                    filtroMin === v
                                        ? 'bg-yellow-500 text-gray-950'
                                        : 'text-gray-500 hover:text-gray-300'
                                }`}
                            >
                                {v === 0 ? 'Tutti' : v.toFixed(1)}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-2 bg-gray-900/60 rounded-xl px-3 py-1.5 border border-gray-800/50">
                        <span className="text-[10px] uppercase tracking-widest text-gray-600">Ordina</span>
                        {([['voto', 'Voto'], ['lega', 'Lega'], ['orario', 'Orario']] as const).map(([val, label]) => (
                            <button
                                key={val}
                                onClick={() => setOrdinamento(val)}
                                className={`px-2 py-1 rounded-lg text-[10px] font-black transition-all ${
                                    ordinamento === val
                                        ? 'bg-yellow-500 text-gray-950'
                                        : 'text-gray-500 hover:text-gray-300'
                                }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    <span className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">
                        {partiteFiltrate.length} partite
                    </span>
                </div>
            )}

            {/* Griglia partite */}
            {partiteFiltrate.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {partiteFiltrate.map(p => (
                        <PartitaCard
                            key={p.fixtureId}
                            partita={p}
                            onShowAnalisi={p => setAnalisiPartita(p)}
                            onAddToMonitor={partita => onAddToMonitor(
                                partita.fixtureId,
                                partita.teams.home.name,
                                partita.teams.away.name,
                                partita.commenceTime,
                                partita.leagueName,
                            )}
                        />
                    ))}
                </div>
            )}

            {/* Empty state */}
            {!loading && !processing && partite.length === 0 && (
                <div className="rounded-[2rem] border border-gray-800/50 bg-gray-900/40 p-12 text-center">
                    <div className="text-4xl mb-4">📅</div>
                    <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">
                        Seleziona una data e clicca Sblocca Partite
                    </p>
                </div>
            )}

            {/* Popup analisi */}
            {analisiPartita && (
                <AnalisiPopup
                    partita={analisiPartita}
                    onClose={() => setAnalisiPartita(null)}
                />
            )}

            {/* Panel leghe extra */}
            {showLeghePanel && (
                <LegheExtraPanel
                    onClose={() => setShowLeghePanel(false)}
                    onSave={handleSaveLeghe}
                />
            )}
        </div>
    );
};

export default PreMatch;
