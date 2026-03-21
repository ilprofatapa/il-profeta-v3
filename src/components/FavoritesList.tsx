// ============================================================
// IL PROFETA v2 — components/FavoritesList.tsx
// ============================================================

import { useState } from 'react';
import type { PartitaLive, PartitaDisponibile } from '../services/sheetsService';
import { getPartiteLive, aggiungiPartita, rimuoviPartita } from '../services/sheetsService';
import LiveMonitor from './LiveMonitor';

const LEGHE_PREFERITE: { id: string; nome: string }[] = [
    { id: '2', nome: '🏆 Champions League' },
    { id: '39', nome: '🏴󠁧󠁢󠁥󠁮󠁧󠁿 Premier League' },
    { id: '135', nome: '🇮🇹 Serie A' },
    { id: '140', nome: '🇪🇸 La Liga' },
    { id: '78', nome: '🇩🇪 Bundesliga' },
    { id: '61', nome: '🇫🇷 Ligue 1' },
    { id: '88', nome: '🇳🇱 Eredivisie' },
    { id: '94', nome: '🇵🇹 Primeira Liga' },
];

interface FavoritesListProps {
    partite: PartitaLive[];
    onRefresh: () => void;
}

const FavoritesList = ({ partite, onRefresh }: FavoritesListProps) => {
    const [showSearch, setShowSearch] = useState(false);
    const [searching, setSearching] = useState(false);
    const [risultati, setRisultati] = useState<PartitaDisponibile[]>([]);
    const [filtroLega, setFiltroLega] = useState('');

    const cercaPartite = async () => {
        setSearching(true);
        try {
            const data = await getPartiteLive();
            const attive = data.filter(p => p.status === '1H' || p.status === '2H' || p.status === 'HT' || p.status === 'NS');
            setRisultati(attive);
        } catch (e) {
            console.error('Errore ricerca partite:', e);
        } finally {
            setSearching(false);
        }
    };

    const cercaPartitePerLega = async (leagueId: string) => {
        setSearching(true);
        try {
            const response = await fetch(`/api/proxy?action=getPerLega&leagueId=${leagueId}`);
            const data = await response.json();
            setRisultati(data);
            setShowSearch(true);
        } catch (e) {
            console.error('Errore ricerca per lega:', e);
        } finally {
            setSearching(false);
        }
    };

    const [aggiungendo, setAggiungendo] = useState<string | null>(null);

    const handleAggiungi = async (partita: PartitaDisponibile) => {
        if (aggiungendo === partita.fixtureId) return;
        setAggiungendo(partita.fixtureId);

        await aggiungiPartita(
            partita.fixtureId,
            partita.homeTeam,
            partita.awayTeam,
            new Date().toISOString(),
            partita.league
        );

        setShowSearch(false);
        setRisultati([]);
        setAggiungendo(null);
        onRefresh();
    };

    const handleRimuovi = async (fixtureId: string) => {
        await rimuoviPartita(fixtureId);
        onRefresh();
    };

    const leghe = [...new Set(risultati.map(p => p.league))].sort();
    const risultatiFiltrati = filtroLega ? risultati.filter(p => p.league === filtroLega) : risultati;

    const statusLabel = (status: string, minute: number) => {
        if (status === 'NS') return 'Non iniziata';
        if (status === 'HT') return 'Intervallo';
        if (status === '1H' || status === '2H') return `${minute}'`;
        return status;
    };

    return (
        <div className="space-y-4">

            {partite.length < 4 && (
                <div className="space-y-2">
                    {/* Bottoni leghe preferite */}
                    <div className="grid grid-cols-4 gap-1">
                        {LEGHE_PREFERITE.map(lega => (
                            <button
                                key={lega.id}
                                onClick={() => {
                                    setShowSearch(true);
                                    setFiltroLega(lega.id);
                                    cercaPartitePerLega(lega.id);
                                }}
                                className="py-1.5 px-1 rounded-xl bg-gray-800 border border-gray-700 text-gray-400 text-[9px] font-bold hover:bg-yellow-500/10 hover:border-yellow-500/30 hover:text-yellow-400 transition-all text-center"
                            >
                                {lega.nome}
                            </button>
                        ))}
                    </div>
                    {/* Bottone tutte le partite */}
                    <button
                        onClick={() => { setShowSearch(!showSearch); if (!showSearch) cercaPartite(); }}
                        className="w-full py-2 rounded-2xl border border-dashed border-yellow-500/30 text-yellow-400 text-xs font-black uppercase tracking-widest hover:bg-yellow-500/10 transition-all"
                    >
                        {showSearch ? '✕ Chiudi ricerca' : '🔍 Tutte le partite live'}
                    </button>
                </div>
            )}

            {showSearch && (
                <div className="bg-gray-900 rounded-2xl border border-gray-800 p-4 space-y-3">
                    <div className="space-y-2">
                        <div className="text-xs uppercase tracking-widest text-gray-600">Filtra per lega</div>
                        <select
                            value={filtroLega}
                            onChange={e => setFiltroLega(e.target.value)}
                            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-yellow-500/50"
                        >
                            <option value="">Tutte le leghe ({risultati.length} partite)</option>
                            {leghe.map(lega => (
                                <option key={lega} value={lega}>{lega}</option>
                            ))}
                        </select>
                    </div>

                    {searching ? (
                        <div className="text-center text-gray-500 text-xs py-4">Caricamento partite...</div>
                    ) : risultatiFiltrati.length === 0 ? (
                        <div className="text-center text-gray-500 text-xs py-4">Nessuna partita disponibile</div>
                    ) : (
                        <div className="space-y-2 max-h-80 overflow-y-auto">
                            {risultatiFiltrati.map(partita => {
                                const giaAggiunta = partite.some(p => p.fixtureId === partita.fixtureId);
                                return (
                                    <div key={partita.fixtureId} className="flex items-center justify-between bg-gray-800/60 rounded-xl px-3 py-2">
                                        <div className="flex-1 min-w-0">
                                            <div className="text-xs font-bold text-white truncate">{partita.homeTeam} vs {partita.awayTeam}</div>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-xs text-gray-500">{partita.league}</span>
                                                <span className={`text-xs font-bold ${partita.status === '1H' || partita.status === '2H' ? 'text-red-400' : 'text-gray-500'}`}>
                                                    {statusLabel(partita.status, partita.minute)}
                                                </span>
                                                {(partita.status === '1H' || partita.status === '2H') && (
                                                    <span className="text-xs text-yellow-400 font-bold">{partita.scoreHome} – {partita.scoreAway}</span>
                                                )}
                                            </div>
                                        </div>
                                        {giaAggiunta ? (
                                            <span className="text-xs text-emerald-400 font-bold ml-2">✓ Aggiunta</span>
                                        ) : (
                                            <button
                                                onClick={() => handleAggiungi(partita)}
                                                disabled={aggiungendo === partita.fixtureId}
                                                className="ml-2 px-2 py-1 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs font-black uppercase tracking-widest hover:bg-yellow-500/20 transition-all disabled:opacity-50"
                                            >
                                                {aggiungendo === partita.fixtureId ? '...' : '+ Aggiungi'}
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {partite.length === 0 && !showSearch && (
                <div className="text-center text-gray-500 py-10">
                    <p className="text-2xl mb-2">📋</p>
                    <p className="text-sm">Nessuna partita monitorata</p>
                    <p className="text-xs mt-1 text-gray-600">Aggiungi una partita per iniziare</p>
                </div>
            )}

            {partite.map(partita => (
                <LiveMonitor key={partita.fixtureId} partita={partita} onRemove={handleRimuovi} />
            ))}

        </div>
    );
};

export default FavoritesList;
