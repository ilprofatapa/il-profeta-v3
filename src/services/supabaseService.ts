// ============================================================
// IL PROFETA v3 — services/supabaseService.ts
// Sostituisce sheetsService.ts — usa Supabase + Realtime
// v3.0.0
// ============================================================

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ajigflzsdrnfpezqgnfh.supabase.co';
const SUPABASE_KEY = 'sb_publishable_wbvPhRuKsgXA8S7a-Cbmvw_gH0eX-BM';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Tipi live ────────────────────────────────────────────────

export interface PartitaStats {
  sibHome: number;
  sibAway: number;
  sotHome: number;
  sotAway: number;
  shotsHome: number;
  shotsAway: number;
  cornersHome: number;
  cornersAway: number;
  possHome: number;
  possAway: number;
}

export interface EventoLive {
  minute: number;
  extraTime: number | null;
  team: string;
  teamId: number;
  player: string;
  assist: string | null;
  type: 'goal' | 'autogoal' | 'penalty' | 'yellow' | 'red' | 'second_yellow' | 'subst';
  detail: string;
}

export interface PartitaLive {
  fixtureId: string;
  homeTeam: string;
  awayTeam: string;
  status: string;
  minute: number;
  scoreHome: number;
  scoreAway: number;
  ipHome: number;
  ipAway: number;
  ipHome5: number;
  ipAway5: number;
  trendHome: number;
  trendAway: number;
  trendHome5: number;
  trendAway5: number;
  semaforoHome: number;
  semaforoAway: number;
  votoHome: number;
  votoAway: number;
  league: string;
  kickoff?: string;
  stats?: PartitaStats;
  events?: EventoLive[];
}

export interface PartitaDisponibile {
  fixtureId: string;
  homeTeam: string;
  awayTeam: string;
  status: string;
  minute: number;
  scoreHome: number;
  scoreAway: number;
  league: string;
}

export interface SnapshotGrafico {
  minute: number;
  ipHome10: number;
  ipAway10: number;
  ipHome5: number;
  ipAway5: number;
}

export interface PrematchParametro {
  parameter: string;
  value: string;
  score: number;
  motivation: string;
  rawData?: string;
}

export interface PrematchMercato {
  finalScore: number;
  recommendation: string;
  parameters: PrematchParametro[];
}

export interface PartitaPrematch {
  fixtureId: string;
  referenceDate: string;
  leagueName: string;
  leagueId: number;
  area: string;
  commenceTime: string;
  teams: {
    home: { id: number; name: string; logo: string };
    away: { id: number; name: string; logo: string };
  };
  odds: {
    home: number | null;
    away: number | null;
    over25: number | null;
    over35: number | null;
  };
  sign1: number;
  sign2: number;
  over25: number;
  dettaglio?: {
    sign1: PrematchMercato;
    sign2: PrematchMercato;
    over25: PrematchMercato;
  };
}

export interface PrematchResponse {
  status: 'ok' | 'processing';
  partite: PartitaPrematch[];
  fromCache: boolean;
}

export interface LegaExtra {
  id: number;
  name: string;
  area: string;
}

// ── Proxy Apps Script (solo per API-Football e Prematch) ──────
const APPS_SCRIPT_URL = '/api/proxy';

async function chiamaAppsScript(params: Record<string, string>): Promise<unknown> {
  const queryString = Object.entries(params)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&');
  const response = await fetch(`${APPS_SCRIPT_URL}?${queryString}`, {
    method: 'GET',
    redirect: 'follow',
  });
  if (!response.ok) throw new Error('Errore Apps Script: ' + response.status);
  return response.json();
}

// ── Partite Monitor — lettura da Supabase ─────────────────────

export async function getPartiteMonitor(): Promise<PartitaLive[]> {
  try {
    const { data: partite, error } = await supabase
      .from('partite_monitor')
      .select('*')
      .order('kickoff', { ascending: true });

    if (error || !partite) return [];

    const risultati: PartitaLive[] = await Promise.all(partite.map(async p => {
      const { data: snaps } = await supabase
        .from('snapshots')
        .select('*')
        .eq('fixture_id', p.fixture_id)
        .gte('timestamp', new Date(Date.now() - 10 * 60 * 1000).toISOString())
        .order('timestamp', { ascending: false })
        .limit(1);

      const ultimoSnap = snaps && snaps.length > 0 ? snaps[0] : null;

      return {
        fixtureId:    p.fixture_id,
        homeTeam:     p.home_team,
        awayTeam:     p.away_team,
        status:       p.status ?? 'NS',
        minute:       p.minute ?? 0,
        scoreHome:    p.score_home ?? 0,
        scoreAway:    p.score_away ?? 0,
        league:       p.league ?? '',
        kickoff:      p.kickoff,
        ipHome:       ultimoSnap?.ip_home10   ?? 0,
        ipAway:       ultimoSnap?.ip_away10   ?? 0,
        ipHome5:      ultimoSnap?.ip_home5    ?? 0,
        ipAway5:      ultimoSnap?.ip_away5    ?? 0,
        trendHome:    ultimoSnap?.trend_home10 ?? 0,
        trendAway:    ultimoSnap?.trend_away10 ?? 0,
        trendHome5:   ultimoSnap?.trend_home5  ?? 0,
        trendAway5:   ultimoSnap?.trend_away5  ?? 0,
        semaforoHome: p.semaforo_home ?? 0,
        semaforoAway: p.semaforo_away ?? 0,
        votoHome:     p.voto_home ?? 0,
        votoAway:     p.voto_away ?? 0,
        stats:        p.stats ?? undefined,
        events:       p.events ?? [],
      };
    }));

    return risultati;
  } catch (e) {
    console.error('Errore getPartiteMonitor:', e);
    return [];
  }
}

// ── Realtime subscription ─────────────────────────────────────

export function subscribePartite(callback: (partite: PartitaLive[]) => void) {
  const channel = supabase
    .channel('partite-live')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'snapshots',
    }, async () => {
      const partite = await getPartiteMonitor();
      callback(partite);
    })
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'partite_monitor',
    }, async () => {
      const partite = await getPartiteMonitor();
      callback(partite);
    })
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'semafori',
    }, async () => {
      const partite = await getPartiteMonitor();
      callback(partite);
    })
    .subscribe();

  return channel;
}

// ── Aggiunta/rimozione partite ────────────────────────────────

export async function aggiungiPartita(
  fixtureId: string,
  homeTeam: string,
  awayTeam: string,
  kickoff: string,
  league: string = ''
): Promise<boolean> {
  try {
    const params = new URLSearchParams({
      action: 'aggiungiPartita',
      fixtureId, homeTeam, awayTeam, kickoff, league,
    });
    await fetch(`${APPS_SCRIPT_URL}?${params.toString()}`, {
      method: 'GET',
      mode: 'no-cors',
    });
    return true;
  } catch (e) {
    console.error('Errore aggiungiPartita:', e);
    return false;
  }
}

export async function rimuoviPartita(fixtureId: string): Promise<boolean> {
  try {
    const params = new URLSearchParams({
      action: 'rimuoviPartita',
      fixtureId,
    });
    await fetch(`${APPS_SCRIPT_URL}?${params.toString()}`, {
      method: 'GET',
      mode: 'no-cors',
    });
    return true;
  } catch (e) {
    console.error('Errore rimuoviPartita:', e);
    return false;
  }
}

// ── Snapshots grafico ─────────────────────────────────────────

export async function getSnapshotsGrafico(fixtureId: string): Promise<SnapshotGrafico[]> {
  try {
    const { data, error } = await supabase
      .from('snapshots')
      .select('minute, ip_home10, ip_away10, ip_home5, ip_away5')
      .eq('fixture_id', fixtureId)
      .gte('timestamp', new Date(Date.now() - 30 * 60 * 1000).toISOString())
      .order('timestamp', { ascending: true });

    if (error || !data) return [];

    return data.map(r => ({
      minute:   r.minute,
      ipHome10: r.ip_home10,
      ipAway10: r.ip_away10,
      ipHome5:  r.ip_home5,
      ipAway5:  r.ip_away5,
    }));
  } catch (e) {
    console.error('Errore getSnapshotsGrafico:', e);
    return [];
  }
}

// ── Prematch — rimane su Apps Script ─────────────────────────

export async function getPrematch(date: string): Promise<PrematchResponse> {
  try {
    const data = await chiamaAppsScript({ action: 'getPrematch', date });
    return data as PrematchResponse;
  } catch (e) {
    console.error('Errore getPrematch:', e);
    return { status: 'processing', partite: [], fromCache: false };
  }
}

export async function setLegheExtra(ids: number[]): Promise<boolean> {
  try {
    await chiamaAppsScript({
      action: 'setLegheExtra',
      ids: JSON.stringify(ids),
    });
    return true;
  } catch (e) {
    console.error('Errore setLegheExtra:', e);
    return false;
  }
}

export const LEGHE_EXTRA_DISPONIBILI: LegaExtra[] = [
  { id: 71,  name: 'Brasileirao',          area: 'Sud America' },
  { id: 128, name: 'Liga Profesional ARG',  area: 'Sud America' },
  { id: 265, name: 'Primera Division URU',  area: 'Sud America' },
  { id: 239, name: 'Primera Division CHI',  area: 'Sud America' },
  { id: 281, name: 'Liga MX',               area: 'Nord America' },
  { id: 253, name: 'MLS',                   area: 'Nord America' },
  { id: 203, name: 'Super Lig TUR',         area: 'Europa' },
  { id: 144, name: 'Pro League BEL',        area: 'Europa' },
  { id: 218, name: 'Bundesliga AUT',        area: 'Europa' },
  { id: 113, name: 'Allsvenskan SWE',       area: 'Europa' },
  { id: 207, name: 'Super League SUI',      area: 'Europa' },
  { id: 292, name: 'K League KOR',          area: 'Asia' },
  { id: 169, name: 'J-League JPN',          area: 'Asia' },
  { id: 17,  name: 'AFC Champions',         area: 'Asia' },
];

// ── Helpers ───────────────────────────────────────────────────

export const semaforoEmoji = (livello: number): string => {
  if (livello === 3) return '🟢';
  if (livello === 2) return '🟠';
  if (livello === 1) return '🟡';
  return '⚫';
};

export const getTrendLabel = (delta: number): { label: string; color: string } => {
  if (delta >= 0.20) return { label: '🚀 ESPLOSO',   color: 'text-red-400' };
  if (delta >= 0.15) return { label: '📈 IN SALITA', color: 'text-orange-400' };
  if (delta >= 0.10) return { label: '↗ CRESCENTE',  color: 'text-yellow-400' };
  if (delta >= 0.05) return { label: '→ STABILE',    color: 'text-gray-400' };
  if (delta >= 0)    return { label: '↘ PIATTO',     color: 'text-gray-600' };
  return                    { label: '📉 IN CALO',   color: 'text-blue-400' };
};

export const getVotoLabel = (v: number): { label: string; color: string } => {
  if (v >= 4.5) return { label: '🔴 GOL IN ARRIVO',             color: 'text-red-400' };
  if (v >= 3.5) return { label: '🟠 PORTA SOTTO ASSEDIO',       color: 'text-orange-400' };
  if (v >= 2.5) return { label: '🟡 SPINGONO MA SENZA MORDERE', color: 'text-yellow-400' };
  if (v >= 1.5) return { label: '⚪ PASSAMI IL CUSCINO',        color: 'text-gray-400' };
  return              { label: '💤 SPARITI DAL CAMPO',          color: 'text-gray-600' };
};

export const getVotoColor = (voto: number): string => {
  if (voto >= 4.0) return 'text-emerald-400';
  if (voto >= 3.5) return 'text-yellow-400';
  if (voto >= 3.0) return 'text-orange-400';
  return 'text-gray-500';
};

export const getOddColor = (odd: number | null): string => {
  if (!odd) return 'text-gray-600';
  if (odd >= 1.60 && odd <= 2.40) return 'text-emerald-400';
  if (odd <= 2.80) return 'text-yellow-400';
  return 'text-gray-500';
};
