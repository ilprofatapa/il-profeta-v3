// ============================================================
// IL PROFETA v3 — services/bankrollService.ts
// Sezione BANKROLL: lettura dati + calcolo statistiche
// Fonti: operazioni (Telegram b/x), segnali, bankroll_movimenti, multiple
// ============================================================

import { supabase } from './supabaseService';

// ── Tipi grezzi (tabelle Supabase) ───────────────────────────

export interface Operazione {
  id: number;
  created_at: string | null;
  fixture_id: string;
  segnale_id: number | null;
  tipo: string;               // 'bancata' | 'uscita'
  quota: number | null;
  importo: number | null;     // per la bancata: importo bancato
  esito_euro: number | null;  // per l'uscita: profitto/perdita in €
  minute: number | null;
  score: string | null;
  testo: string | null;
  partita: string | null;
  fascia: string | null;
  lega: string | null;        // copiati da cache_prematch al momento dell'inserimento
  q_casa: number | null;
  q_ospite: number | null;
  q_over25: number | null;
}

export interface Segnale {
  id: number;
  tipo: string;
  quota_max: number | null;
}

export type TipoMovimento = 'iniziale' | 'deposito' | 'prelievo' | 'bonus';

export interface Movimento {
  id: number;
  created_at: string;
  tipo: TipoMovimento;
  importo: number;
  nota: string | null;
}

export type EsitoMultipla = 'in_corso' | 'vinta' | 'persa' | 'annullata' | 'cashout';

export interface Multipla {
  id: number;
  created_at: string;
  quota: number;
  importo: number;
  nota: string | null;
  esito: EsitoMultipla;
  ritorno: number | null;
  chiusa_il: string | null;
}

export interface DatiBankroll {
  operazioni: Operazione[];
  segnali: Segnale[];
  movimenti: Movimento[];
  multiple: Multipla[];
}

const num = (v: unknown): number | null =>
  v === null || v === undefined || v === '' ? null : Number(v);

// ── Lettura / scrittura ──────────────────────────────────────

export async function caricaBankroll(): Promise<DatiBankroll> {
  const [ops, seg, mov, mult] = await Promise.all([
    supabase.from('operazioni').select('*').neq('fixture_id', 'TEST').order('id', { ascending: true }),
    supabase.from('segnali').select('id,tipo,quota_max'),
    supabase.from('bankroll_movimenti').select('*').order('created_at', { ascending: true }),
    supabase.from('multiple').select('*').order('created_at', { ascending: true }),
  ]);
  const errore = ops.error || seg.error || mov.error || mult.error;
  if (errore) throw new Error(errore.message);

  return {
    operazioni: (ops.data ?? []).map(o => ({
      ...o,
      quota: num(o.quota), importo: num(o.importo), esito_euro: num(o.esito_euro), minute: num(o.minute),
      lega: o.lega ?? null, q_casa: num(o.q_casa), q_ospite: num(o.q_ospite), q_over25: num(o.q_over25),
    })) as Operazione[],
    segnali: (seg.data ?? []).map(s => ({ ...s, quota_max: num(s.quota_max) })) as Segnale[],
    movimenti: (mov.data ?? []).map(m => ({ ...m, importo: Number(m.importo) })) as Movimento[],
    multiple: (mult.data ?? []).map(m => ({
      ...m, quota: Number(m.quota), importo: Number(m.importo), ritorno: num(m.ritorno),
    })) as Multipla[],
  };
}

export async function aggiungiMovimento(tipo: TipoMovimento, importo: number, nota: string): Promise<void> {
  const { error } = await supabase.from('bankroll_movimenti').insert({ tipo, importo, nota: nota || null });
  if (error) throw new Error(error.message);
}

export async function aggiungiMultipla(quota: number, importo: number, nota: string): Promise<void> {
  const { error } = await supabase.from('multiple').insert({ quota, importo, nota: nota || null });
  if (error) throw new Error(error.message);
}

export async function chiudiMultipla(m: Multipla, esito: Exclude<EsitoMultipla, 'in_corso'>, cashout?: number): Promise<void> {
  const ritorno =
    esito === 'vinta' ? m.quota * m.importo :
    esito === 'persa' ? 0 :
    esito === 'annullata' ? m.importo :
    (cashout ?? 0);
  const { error } = await supabase.from('multiple')
    .update({ esito, ritorno, chiusa_il: new Date().toISOString() })
    .eq('id', m.id);
  if (error) throw new Error(error.message);
}

export async function eliminaMovimento(id: number): Promise<void> {
  const { error } = await supabase.from('bankroll_movimenti').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ── Posizioni di trading (una per partita) ───────────────────

export interface Posizione {
  fixtureId: string;
  data: Date | null;
  dataChiusura: Date | null;
  partita: string;
  fascia: string | null;
  strategia: string;          // 'Pareggio' | 'Sfavorita' | 'Manuale'
  gruppo: string;             // strategia + fascia, per le tabelle
  quotaEntrata: number | null;
  quotaMax: number | null;
  lega: string | null;
  qFav: number | null;        // quota prematch della favorita (la più bassa tra 1 e 2)
  qOver: number | null;       // quota prematch Over 2.5
  candidata: string | null;   // 'Favorita' | 'Over' | 'Favorita + Over' | 'Altra'
  minutoEntrata: number | null;
  nBancate: number;
  stake: number;
  responsabilita: number;
  mancaImporto: boolean;
  esito: number | null;       // null = ancora aperta
  chiusuraFinePartita: boolean;
}

export function costruisciPosizioni(d: DatiBankroll): Posizione[] {
  const segById = new Map(d.segnali.map(s => [s.id, s]));
  const perPartita = new Map<string, Operazione[]>();
  d.operazioni.forEach(o => {
    const k = String(o.fixture_id);
    if (!perPartita.has(k)) perPartita.set(k, []);
    perPartita.get(k)!.push(o);
  });

  const out: Posizione[] = [];
  perPartita.forEach((ops, fixtureId) => {
    const bancate = ops.filter(o => o.tipo === 'bancata');
    const uscite = ops.filter(o => o.tipo === 'uscita' && o.esito_euro !== null);
    if (bancate.length === 0 && uscite.length === 0) return;

    const prima = bancate[0] ?? ops[0];
    const seg = prima.segnale_id !== null ? segById.get(prima.segnale_id) : undefined;
    const tipoSeg = seg?.tipo ?? '';
const strategia = tipoSeg.includes('OVER') ? 'Over-pari' : tipoSeg.includes('SFAV') ? 'Sfavorita' : tipoSeg.startsWith('S_') ? 'Pareggio' : 'Manuale';
    // la fascia valida è solo A o B (in alcune righe il bot ha salvato il punteggio)
    const fascia = ops.find(o => o.fascia === 'A' || o.fascia === 'B')?.fascia ?? null;
    const conPre = ops.find(o => o.q_casa !== null || o.lega);
    const qFav = conPre && conPre.q_casa !== null && conPre.q_ospite !== null ? Math.min(conPre.q_casa, conPre.q_ospite) : null;
    const qOver = conPre?.q_over25 ?? null;

    let stake = 0, resp = 0, manca = false;
    bancate.forEach(b => {
      if (b.importo === null || b.quota === null) { manca = true; return; }
      stake += b.importo;
      resp += b.importo * (b.quota - 1);
    });

    const ultimaUscita = uscite[uscite.length - 1];
    out.push({
      fixtureId,
      data: prima.created_at ? new Date(prima.created_at) : null,
      dataChiusura: ultimaUscita?.created_at ? new Date(ultimaUscita.created_at) : null,
      partita: ops.find(o => o.partita)?.partita ?? (fixtureId.startsWith('MANUALE') ? fixtureId.replace('MANUALE-', '').replace(/-/g, ' ') : '#' + fixtureId),
      fascia,
      strategia,
      gruppo: strategia + (fascia ? ' · ' + fascia : ''),
      quotaEntrata: bancate[0]?.quota ?? null,
      quotaMax: seg?.quota_max ?? null,
      lega: conPre?.lega ?? null,
      qFav, qOver,
      candidata: tipoCandidata(qFav, qOver),
      minutoEntrata: bancate[0]?.minute ?? null,
      nBancate: bancate.length,
      stake, responsabilita: resp, mancaImporto: manca,
      esito: uscite.length ? uscite.reduce((s, u) => s + (u.esito_euro ?? 0), 0) : null,
      chiusuraFinePartita: uscite.some(u => (u.testo ?? '').includes('fine partita')),
    });
  });
  return out.sort((a, b) => (a.data?.getTime() ?? 0) - (b.data?.getTime() ?? 0));
}

// ── Statistiche ──────────────────────────────────────────────

export interface StatGruppo {
  n: number;
  verdi: number;
  perse: number;
  pctVerdi: number;
  pl: number;
  media: number;
  mediaVerde: number;
  mediaPerdita: number;
  esposizione: number;   // somma responsabilità (trading) o puntate (multiple)
  rendimento: number;    // pl / esposizione
  migliore: number;
  peggiore: number;
}

export function statGruppo(esiti: number[], esposizione: number): StatGruppo {
  const v = esiti.filter(e => e > 0), p = esiti.filter(e => e < 0);
  const pl = esiti.reduce((s, e) => s + e, 0);
  const avg = (a: number[]) => (a.length ? a.reduce((s, e) => s + e, 0) / a.length : 0);
  return {
    n: esiti.length,
    verdi: v.length,
    perse: p.length,
    pctVerdi: esiti.length ? (v.length / esiti.length) * 100 : 0,
    pl,
    media: avg(esiti),
    mediaVerde: avg(v),
    mediaPerdita: avg(p),
    esposizione,
    rendimento: esposizione > 0 ? (pl / esposizione) * 100 : 0,
    migliore: esiti.length ? Math.max(...esiti) : 0,
    peggiore: esiti.length ? Math.min(...esiti) : 0,
  };
}

export function serieNegativaMax(esiti: number[]): number {
  let max = 0, cur = 0;
  esiti.forEach(e => { cur = e < 0 ? cur + 1 : 0; max = Math.max(max, cur); });
  return max;
}

export interface PuntoGrafico {
  t: number;
  etichetta: string;
  saldo: number;
  trading: number;
  multiple: number;
}

export interface Riepilogo {
    rollIniziale: number;
  bonus: number;
  versamenti: number;
  prelievi: number;
  plTrading: number;
  plMultiple: number;
  inGiocoMultiple: number;
  saldo: number;
  capitaleVersato: number;
  rendimentoRoll: number;
  maxDrawdown: number;
  maxDrawdownPct: number;
  serieNegativa: number;
  respMax: number;
  respMaxPctRoll: number;
  aperte: Posizione[];
  chiuse: Posizione[];
  trading: StatGruppo;
  multiple: StatGruppo;
  grafico: PuntoGrafico[];
}

export function calcolaRiepilogo(d: DatiBankroll, pos: Posizione[]): Riepilogo {
  const iniziali = d.movimenti.filter(m => m.tipo === 'iniziale');
  const rollIniziale = iniziali.length ? iniziali[iniziali.length - 1].importo : 0;
  const versamenti = d.movimenti.filter(m => m.tipo === 'deposito').reduce((s, m) => s + m.importo, 0);
  const prelievi = d.movimenti.filter(m => m.tipo === 'prelievo').reduce((s, m) => s + m.importo, 0);   const bonus = d.movimenti.filter(m => m.tipo === 'bonus').reduce((s, m) => s + m.importo, 0);

  const chiuse = pos.filter(p => p.esito !== null);
  const aperte = pos.filter(p => p.esito === null);
  const plTrading = chiuse.reduce((s, p) => s + (p.esito ?? 0), 0);

  const multChiuse = d.multiple.filter(m => m.esito !== 'in_corso' && m.esito !== 'annullata');
  const plMultiple = d.multiple
    .filter(m => m.esito !== 'in_corso')
    .reduce((s, m) => s + (m.ritorno ?? 0) - m.importo, 0);
  const inGiocoMultiple = d.multiple.filter(m => m.esito === 'in_corso').reduce((s, m) => s + m.importo, 0);

  // Il roll iniziale è una FOTOGRAFIA del conto alla data in cui lo inserisci:
  // contiene già tutto ciò che è successo prima. Il saldo conta solo ciò che viene dopo.
  const dataRoll = iniziali.length ? new Date(iniziali[iniziali.length - 1].created_at).getTime() : 0;
  const versamentiDopo = d.movimenti
    .filter(m => m.tipo === 'deposito' && new Date(m.created_at).getTime() > dataRoll)
    .reduce((x, m) => x + m.importo, 0);
  const capitaleVersato = rollIniziale + versamentiDopo;

  // ── Linea del tempo (eventi chiusi) ──
  type Ev = { t: number; dSaldo: number; dTrad: number; dMult: number };
  const ev: Ev[] = [];
  d.movimenti.forEach(m => {
    if (m.tipo === 'iniziale') return;
    ev.push({ t: new Date(m.created_at).getTime(), dSaldo: m.tipo === 'prelievo' ? -m.importo : m.importo, dTrad: 0, dMult: 0 });
  });
  chiuse.forEach(p => {
    const t = (p.dataChiusura ?? p.data)?.getTime() ?? 0;
    ev.push({ t, dSaldo: p.esito ?? 0, dTrad: p.esito ?? 0, dMult: 0 });
  });
  d.multiple.filter(m => m.esito !== 'in_corso').forEach(m => {
    const net = (m.ritorno ?? 0) - m.importo;
    ev.push({ t: new Date(m.chiusa_il ?? m.created_at).getTime(), dSaldo: net, dTrad: 0, dMult: net });
  });
  ev.sort((a, b) => a.t - b.t);

  const prima = ev.filter(e => e.t <= dataRoll);
  const dopo = ev.filter(e => e.t > dataRoll);
  const somma = (a: Ev[]) => a.reduce((x, e) => x + e.dSaldo, 0);
  const saldo = rollIniziale + somma(dopo) - inGiocoMultiple;
  const bonusDopo = d.movimenti     .filter(m => m.tipo === 'bonus' && new Date(m.created_at).getTime() > dataRoll)     .reduce((x, m) => x + m.importo, 0);   const plDopoRoll = dopo.reduce((x, e) => x + e.dTrad + e.dMult, 0) + bonusDopo;

  const inizio = ev[0]?.t ?? dataRoll ?? Date.now();
  let s = rollIniziale - somma(prima), tr = 0, mu = 0;   // storico ricostruito all'indietro
  const fmt = (t: number) => new Date(t).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
  const grafico: PuntoGrafico[] = [{ t: Math.min(inizio, ev[0]?.t ?? inizio), etichetta: 'inizio', saldo: s, trading: 0, multiple: 0 }];
  ev.forEach(e => {
    s += e.dSaldo; tr += e.dTrad; mu += e.dMult;
    grafico.push({ t: e.t, etichetta: fmt(e.t), saldo: round2(s), trading: round2(tr), multiple: round2(mu) });
  });
  // Calo massimo dal picco, sui soli risultati di gioco (senza versamenti/prelievi)
  let cum = 0, picco = 0, maxDD = 0;
  ev.filter(e => e.dTrad !== 0 || e.dMult !== 0).forEach(e => {
    cum += e.dTrad + e.dMult;
    picco = Math.max(picco, cum);
    maxDD = Math.max(maxDD, picco - cum);
  });
  const maxDDpct = capitaleVersato > 0 ? (maxDD / capitaleVersato) * 100 : 0;

  const respMax = pos.reduce((m, p) => Math.max(m, p.responsabilita), 0);

  return {
    rollIniziale, bonus, versamenti, prelievi, plTrading, plMultiple, inGiocoMultiple, saldo, capitaleVersato,
    rendimentoRoll: capitaleVersato > 0 ? (plDopoRoll / capitaleVersato) * 100 : 0,
    maxDrawdown: maxDD, maxDrawdownPct: maxDDpct,
    serieNegativa: serieNegativaMax(chiuse.map(p => p.esito ?? 0)),
    respMax,
    respMaxPctRoll: saldo > 0 ? (respMax / saldo) * 100 : 0,
    aperte, chiuse,
    trading: statGruppo(chiuse.map(p => p.esito ?? 0), chiuse.reduce((x, p) => x + p.responsabilita, 0)),
    multiple: statGruppo(multChiuse.map(m => (m.ritorno ?? 0) - m.importo), multChiuse.reduce((x, m) => x + m.importo, 0)),
    grafico,
  };
}

// Raggruppa le posizioni chiuse per una chiave e calcola le statistiche
export function perGruppo(chiuse: Posizione[], chiave: (p: Posizione) => string | null): { nome: string; stat: StatGruppo }[] {
  const g = new Map<string, Posizione[]>();
  chiuse.forEach(p => {
    const k = chiave(p);
    if (k === null) return;
    if (!g.has(k)) g.set(k, []);
    g.get(k)!.push(p);
  });
  return [...g.entries()]
    .map(([nome, ps]) => ({ nome, stat: statGruppo(ps.map(p => p.esito ?? 0), ps.reduce((x, p) => x + p.responsabilita, 0)) }))
    .sort((a, b) => b.stat.n - a.stat.n);
}

export const fasciaMinuto = (p: Posizione): string | null => {
  const m = p.minutoEntrata;
  if (m === null) return null;
  if (m <= 55) return "46'–55'";
  if (m <= 64) return "56'–64'";
  return "65' e oltre";
};

export const rispettoSoglia = (p: Posizione): string | null => {
  if (p.quotaEntrata === null || p.quotaMax === null) return null;
  return p.quotaEntrata <= p.quotaMax ? '✅ Entrata sotto soglia' : '⚠️ Entrata sopra soglia';
};

// ── Gruppi per dati prematch ─────────────────────────────────

// Favorita = quota favorita ≤ 1.60 · Over = Over 2.5 ≤ 1.60
export function tipoCandidata(qFav: number | null, qOver: number | null): string | null {
  if (qFav === null && qOver === null) return null;
  const fav = qFav !== null && qFav <= 1.6;
  const ov = qOver !== null && qOver <= 1.6;
  if (fav && ov) return 'Favorita + Over';
  if (fav) return 'Favorita';
  if (ov) return 'Over';
  return 'Altra';
}

export const fasciaQuotaFav = (p: Posizione): string | null => {
  const q = p.qFav;
  if (q === null) return null;
  if (q <= 1.3) return 'Fav ≤ 1.30';
  if (q <= 1.45) return 'Fav 1.31–1.45';
  if (q <= 1.6) return 'Fav 1.46–1.60';
  if (q <= 2.0) return 'Fav 1.61–2.00';
  return 'Fav > 2.00';
};

export const fasciaQuotaOver = (p: Posizione): string | null => {
  const q = p.qOver;
  if (q === null) return null;
  if (q < 1.4) return 'Over < 1.40';
  if (q < 1.5) return 'Over 1.40–1.49';
  if (q <= 1.6) return 'Over 1.50–1.60';
  return 'Over > 1.60';
};

// ── Diario: risultati per giorno / settimana / mese ──────────

export interface Giorno {
  chiave: string;        // AAAA-MM-GG (ora italiana)
  trading: number;
  multiple: number;
  totale: number;
  nTrading: number;
  nMultiple: number;
  voci: { testo: string; euro: number; tipo: 'trading' | 'multipla' }[];
}

export const chiaveGiorno = (t: Date | string | number) =>
  new Date(t).toLocaleDateString('sv-SE', { timeZone: 'Europe/Rome' });   // "2026-11-01"

// Risultati di gioco chiusi (trading + multiple), per giorno di chiusura. Bonus, versamenti e prelievi esclusi.
export function risultatiGiornalieri(d: DatiBankroll, pos: Posizione[]): Map<string, Giorno> {
  const out = new Map<string, Giorno>();
  const prendi = (k: string) => {
    if (!out.has(k)) out.set(k, { chiave: k, trading: 0, multiple: 0, totale: 0, nTrading: 0, nMultiple: 0, voci: [] });
    return out.get(k)!;
  };
  pos.filter(p => p.esito !== null).forEach(p => {
    const t = p.dataChiusura ?? p.data;
    if (!t) return;
    const g = prendi(chiaveGiorno(t));
    g.trading += p.esito!; g.totale += p.esito!; g.nTrading++;
    g.voci.push({ testo: `${p.partita}${p.lega ? ' · ' + p.lega : ''}`, euro: p.esito!, tipo: 'trading' });
  });
  d.multiple.filter(m => m.esito !== 'in_corso').forEach(m => {
    const net = (m.ritorno ?? 0) - m.importo;
    const g = prendi(chiaveGiorno(m.chiusa_il ?? m.created_at));
    g.multiple += net; g.totale += net; g.nMultiple++;
    g.voci.push({ testo: `Multipla @${m.quota.toFixed(2)} (${m.esito})${m.nota ? ' · ' + m.nota : ''}`, euro: net, tipo: 'multipla' });
  });
  out.forEach(g => { g.trading = round2(g.trading); g.multiple = round2(g.multiple); g.totale = round2(g.totale); });
  return out;
}

// Lunedì della settimana di una data "AAAA-MM-GG"
export function lunediDi(chiave: string): string {
  const [a, m, g] = chiave.split('-').map(Number);
  const d = new Date(Date.UTC(a, m - 1, g));
  const dow = (d.getUTCDay() + 6) % 7;   // 0 = lunedì
  d.setUTCDate(d.getUTCDate() - dow);
  return d.toISOString().slice(0, 10);
}

export interface Periodo { chiave: string; etichetta: string; totale: number; trading: number; multiple: number; giorniVerdi: number; giorniRossi: number; n: number; }

export function perPeriodo(giorni: Map<string, Giorno>, tipo: 'settimana' | 'mese'): Periodo[] {
  const g = new Map<string, Periodo>();
  const mesi = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
  giorni.forEach(gg => {
    const k = tipo === 'settimana' ? lunediDi(gg.chiave) : gg.chiave.slice(0, 7);
    if (!g.has(k)) {
      const [a, m, d] = k.split('-');
      const etichetta = tipo === 'settimana' ? `sett. ${d}/${m}` : `${mesi[Number(m) - 1]} ${a.slice(2)}`;
      g.set(k, { chiave: k, etichetta, totale: 0, trading: 0, multiple: 0, giorniVerdi: 0, giorniRossi: 0, n: 0 });
    }
    const p = g.get(k)!;
    p.totale += gg.totale; p.trading += gg.trading; p.multiple += gg.multiple;
    p.n += gg.nTrading + gg.nMultiple;
    if (gg.totale > 0) p.giorniVerdi++; else if (gg.totale < 0) p.giorniRossi++;
  });
  return [...g.values()]
    .map(p => ({ ...p, totale: round2(p.totale), trading: round2(p.trading), multiple: round2(p.multiple) }))
    .sort((a, b) => a.chiave.localeCompare(b.chiave));
}

const round2 = (v: number) => Math.round(v * 100) / 100;
