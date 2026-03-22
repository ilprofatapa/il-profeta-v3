// ============================================================
// IL PROFETA v3 — App.tsx
// Root — tab Pre-Match + Live Monitor
// v3.0.0 — Supabase Realtime
// ============================================================

import { useState, useEffect } from 'react';
import { aggiungiPartita, rimuoviPartita, getPartiteMonitor, subscribePartite } from './services/supabaseService';
import type { PartitaLive, PartitaPrematch } from './services/supabaseService';
import LiveGrid from './components/LiveGrid';
import LiveMonitor from './components/LiveMonitor';
import PreMatch from './components/PreMatch';

type Tab = 'prematch' | 'live';
type ViewMode = 'grid' | 'full';

export default function App() {
  const [partite, setPartite] = useState<PartitaLive[]>([]);
  const [loading, setLoading] = useState(true);
  const [_ultimoAggiornamento, setUltimoAggiornamento] = useState<Date | null>(null);
  const [orarioCorrente, setOrarioCorrente] = useState<Date>(new Date());
  const [realtimeConnesso, setRealtimeConnesso] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('prematch');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [partitePrematch, setPartitePrematch] = useState<PartitaPrematch[]>([]);
  const [dataPrematch, setDataPrematch] = useState<string>(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    // Caricamento iniziale
    getPartiteMonitor().then(dati => {
      setPartite(dati);
      setUltimoAggiornamento(new Date());
      setLoading(false);
    });

    // Orologio sempre aggiornato
    const tick = setInterval(() => setOrarioCorrente(new Date()), 1000);

    // Supabase Realtime
    const channel = subscribePartite((dati) => {
      setPartite(dati);
      setUltimoAggiornamento(new Date());
    });

    // Monitora stato connessione Realtime
    channel.on('system', {}, (status: Record<string, string>) => {
      setRealtimeConnesso(status['extension'] === 'postgres_changes' && status['status'] === 'ok');
    });

    return () => {
      clearInterval(tick);
      channel.unsubscribe();
    };
    
  }, []);

  const caricaDati = async () => {
    const dati = await getPartiteMonitor();
    setPartite(dati);
    setUltimoAggiornamento(new Date());
  };

  const handleAddToMonitor = async (
    fixtureId: string,
    homeTeam: string,
    awayTeam: string,
    kickoff: string,
    league: string
  ) => {
    await aggiungiPartita(fixtureId, homeTeam, awayTeam, kickoff, league);
    await caricaDati();
  };

  const handleRemove = async (id: string) => {
    await rimuoviPartita(id);
    await caricaDati();
  };

  const liveCount = partite.filter(
    p => p.status === '1H' || p.status === '2H'
  ).length;

  return (
    <div className="min-h-screen bg-gray-950 text-white">

      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <h1 className="text-xl font-bold text-yellow-400">
          ⚽ IL PROFETA v3
        </h1>
        <div className="flex items-center gap-2">
          <span className={`text-[9px] font-bold uppercase tracking-widest ${
            realtimeConnesso ? 'text-emerald-500' : 'text-red-400 animate-pulse'
          }`}>
            ● {realtimeConnesso ? 'realtime' : 'riconnessione...'}
          </span>
          <span className="text-xs text-gray-500">
            🕐 {orarioCorrente.toLocaleTimeString()}
          </span>
        </div>
      </header>

      {/* Tab switcher */}
      <div className="px-4 pt-4">
        <div className="flex gap-1 bg-gray-900/60 rounded-2xl p-1 border border-gray-800/50 w-fit">
          <button
            onClick={() => setActiveTab('prematch')}
            className={`px-6 py-2.5 rounded-xl text-sm font-black uppercase tracking-wider transition-all ${
              activeTab === 'prematch'
                ? 'bg-yellow-500 text-gray-950 shadow-[0_8px_20px_rgba(234,179,8,0.2)]'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            Pre-Match
          </button>
          <button
            onClick={() => setActiveTab('live')}
            className={`relative px-6 py-2.5 rounded-xl text-sm font-black uppercase tracking-wider transition-all ${
              activeTab === 'live'
                ? 'bg-yellow-500 text-gray-950 shadow-[0_8px_20px_rgba(234,179,8,0.2)]'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            Live & Monitor
            {liveCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[8px] font-black text-white flex items-center justify-center">
                {liveCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Contenuto */}
      <main className="p-4 max-w-6xl mx-auto mt-4">

        {/* TAB PRE-MATCH */}
        <div style={{ display: activeTab === 'prematch' ? 'block' : 'none' }}>
          <PreMatch
            onAddToMonitor={handleAddToMonitor}
            partiteEsterne={partitePrematch}
            onPartiteChange={setPartitePrematch}
            dataEsterna={dataPrematch}
            onDataChange={setDataPrematch}
          />
        </div>

        {/* TAB LIVE */}
        {activeTab === 'live' && (
          <>
            {loading ? (
              <div className="text-center text-gray-400 mt-10">
                <p className="text-2xl mb-2">⏳</p>
                <p>Caricamento...</p>
              </div>
            ) : (
              <>
                {/* Toggle vista */}
                <div className="flex justify-end mb-3">
                  <div className="flex gap-1 bg-gray-900/60 rounded-xl p-1 border border-gray-800/50">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                        viewMode === 'grid'
                          ? 'bg-yellow-500 text-gray-950'
                          : 'text-gray-500 hover:text-gray-300'
                      }`}
                    >
                      ⊞ Griglia
                    </button>
                    <button
                      onClick={() => setViewMode('full')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                        viewMode === 'full'
                          ? 'bg-yellow-500 text-gray-950'
                          : 'text-gray-500 hover:text-gray-300'
                      }`}
                    >
                      ☰ Completa
                    </button>
                  </div>
                </div>

                {/* Vista griglia */}
                {viewMode === 'grid' && (
                  <LiveGrid
                    partite={partite}
                    onRefresh={caricaDati}
                    onRemove={handleRemove}
                  />
                )}

                {/* Vista completa */}
                {viewMode === 'full' && (
                  <div className="space-y-4">
                    <div className="flex justify-end">
                      <button
                        onClick={caricaDati}
                        className="text-xs text-gray-500 hover:text-gray-300 px-3 py-1.5 rounded-xl bg-gray-900/60 border border-gray-800/50 transition-all"
                      >
                        🔄 Aggiorna
                      </button>
                    </div>
                    {partite.length === 0 ? (
                      <div className="text-center text-gray-500 mt-10">
                        <p className="text-2xl mb-2">📭</p>
                        <p>Nessuna partita nel monitor</p>
                        <p className="text-xs mt-1 text-gray-600">Aggiungile dalla tab Pre-Match</p>
                      </div>
                    ) : (
                      partite.map(p => (
                        <LiveMonitor
                          key={p.fixtureId}
                          partita={p}
                          onRemove={handleRemove}
                        />
                      ))
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )}

      </main>
    </div>
  );
}
