// ============================================================
// IL PROFETA v3 — components/Diario.tsx
// Diario del bankroll: calendario mensile con vincite/perdite
// giornaliere, totali per settimana e mese, dettaglio del giorno.
// Conta solo i risultati di gioco chiusi (trading + multiple):
// bonus, versamenti e prelievi esclusi.
// ============================================================

import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { chiaveGiorno, lunediDi, perPeriodo } from '../services/bankrollService';
import type { Giorno } from '../services/bankrollService';

const eur = (v: number) => v.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
const eurSegno = (v: number) => (v > 0 ? '+' : '') + eur(v);
const eurCorto = (v: number) => (v > 0 ? '+' : '') + v.toLocaleString('it-IT', { maximumFractionDigits: Math.abs(v) >= 100 ? 0 : 1 });
const colore = (v: number) => (v > 0 ? 'text-emerald-400' : v < 0 ? 'text-red-400' : 'text-gray-400');

const MESI = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
const GIORNI = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

type Vista = 'calendario' | 'settimane' | 'mesi';

const pad = (n: number) => String(n).padStart(2, '0');

export default function Diario({ giorni }: { giorni: Map<string, Giorno> }) {
  const oggi = chiaveGiorno(Date.now());
  const [vista, setVista] = useState<Vista>('calendario');
  const [mese, setMese] = useState(oggi.slice(0, 7));          // "2026-11"
  const [scelto, setScelto] = useState<string | null>(null);

  const settimane = useMemo(() => perPeriodo(giorni, 'settimana'), [giorni]);
  const mesi = useMemo(() => perPeriodo(giorni, 'mese'), [giorni]);

  // scala colori: il giorno più "forte" in valore assoluto = colore pieno
  const maxAbs = useMemo(() => Math.max(1, ...[...giorni.values()].map(g => Math.abs(g.totale))), [giorni]);
  const sfondo = (v: number) => {
    if (v === 0) return 'rgba(107,114,128,0.15)';
    const a = 0.15 + 0.6 * Math.min(1, Math.abs(v) / maxAbs);
    return v > 0 ? `rgba(16,185,129,${a})` : `rgba(239,68,68,${a})`;
  };

  // ── griglia del mese (settimane da lunedì) ──
  const [anno, numMese] = mese.split('-').map(Number);
  const primo = `${mese}-01`;
  const giorniNelMese = new Date(Date.UTC(anno, numMese, 0)).getUTCDate();
  const ultimo = `${mese}-${pad(giorniNelMese)}`;
  const righe: string[][] = [];
  {
    const d = new Date(lunediDi(primo) + 'T00:00:00Z');
    while (d.toISOString().slice(0, 10) <= ultimo) {
      const r: string[] = [];
      for (let i = 0; i < 7; i++) { r.push(d.toISOString().slice(0, 10)); d.setUTCDate(d.getUTCDate() + 1); }
      righe.push(r);
    }
  }

  const delMese = [...giorni.values()].filter(g => g.chiave.startsWith(mese));
  const totMese = delMese.reduce((s, g) => s + g.totale, 0);
  const verdi = delMese.filter(g => g.totale > 0).length;
  const rossi = delMese.filter(g => g.totale < 0).length;
  const migliore = delMese.length ? delMese.reduce((a, b) => (b.totale > a.totale ? b : a)) : null;
  const peggiore = delMese.length ? delMese.reduce((a, b) => (b.totale < a.totale ? b : a)) : null;

  const cambiaMese = (delta: number) => {
    const d = new Date(Date.UTC(anno, numMese - 1 + delta, 1));
    setMese(`${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`);
    setScelto(null);
  };

  const giornoScelto = scelto ? giorni.get(scelto) : undefined;
  const fmtGiorno = (k: string) => { const [a, m, g] = k.split('-'); return `${g}/${m}/${a.slice(2)}`; };

  // dati per il grafico a barre
  const datiBarre =
    vista === 'settimane' ? settimane.map(p => ({ etichetta: p.etichetta, totale: p.totale }))
    : vista === 'mesi' ? mesi.map(p => ({ etichetta: p.etichetta, totale: p.totale }))
    : Array.from({ length: giorniNelMese }, (_, i) => {
        const k = `${mese}-${pad(i + 1)}`;
        return { etichetta: String(i + 1), totale: giorni.get(k)?.totale ?? 0 };
      });

  const btn = (v: Vista, testo: string) => (
    <button onClick={() => setVista(v)}
      className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${vista === v ? 'bg-yellow-500 text-gray-950' : 'bg-gray-950 text-gray-400 border border-gray-800'}`}>
      {testo}
    </button>
  );

  return (
    <section className="bg-gray-900 rounded-[1.5rem] border border-gray-800 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-500">📅 Diario vincite e perdite</h3>
        <div className="flex gap-1">{btn('calendario', 'Calendario')}{btn('settimane', 'Settimane')}{btn('mesi', 'Mesi')}</div>
      </div>

      {giorni.size === 0 ? (
        <p className="text-xs text-gray-600">Il diario si riempie con le prime operazioni chiuse.</p>
      ) : vista === 'calendario' ? (
        <>
          {/* Navigazione mese */}
          <div className="flex items-center justify-between mb-2">
            <button onClick={() => cambiaMese(-1)} className="px-3 py-1 rounded-lg bg-gray-950 border border-gray-800 text-gray-400 text-sm">‹</button>
            <div className="text-center">
              <p className="text-sm font-black text-white">{MESI[numMese - 1]} {anno}</p>
              <p className={`text-xs font-bold tabular-nums ${colore(totMese)}`}>{eurSegno(totMese)}</p>
            </div>
            <button onClick={() => cambiaMese(1)} className="px-3 py-1 rounded-lg bg-gray-950 border border-gray-800 text-gray-400 text-sm">›</button>
          </div>

          {/* Griglia: 7 giorni + totale settimana */}
          <div className="grid grid-cols-8 gap-1 text-center">
            {GIORNI.map(g => <div key={g} className="text-[9px] font-black uppercase text-gray-500 py-1">{g}</div>)}
            <div className="text-[9px] font-black uppercase text-yellow-500/80 py-1">Sett.</div>
            {righe.map(r => {
              const totSett = r.reduce((s, k) => s + (giorni.get(k)?.totale ?? 0), 0);
              const attiva = r.some(k => giorni.has(k));
              return [
                ...r.map(k => {
                  const g = giorni.get(k);
                  const fuori = !k.startsWith(mese);
                  return (
                    <button key={k} disabled={!g} onClick={() => setScelto(scelto === k ? null : k)}
                      style={g ? { background: sfondo(g.totale) } : undefined}
                      className={`rounded-lg min-h-[44px] px-0.5 py-1 flex flex-col items-center justify-center border transition-all
                        ${scelto === k ? 'border-yellow-400' : k === oggi ? 'border-gray-500' : 'border-transparent'}
                        ${fuori ? 'opacity-30' : ''} ${g ? 'cursor-pointer' : 'bg-gray-950/50'}`}>
                      <span className="text-[9px] text-gray-400 leading-none">{Number(k.slice(8))}</span>
                      {g && <span className="text-[10px] font-black text-white tabular-nums leading-tight mt-0.5">{eurCorto(g.totale)}</span>}
                    </button>
                  );
                }),
                <div key={'s' + r[0]} className={`rounded-lg min-h-[44px] flex items-center justify-center bg-gray-950/60 text-[10px] font-black tabular-nums ${attiva ? colore(totSett) : 'text-gray-700'}`}>
                  {attiva ? eurCorto(totSett) : '·'}
                </div>,
              ];
            })}
          </div>

          {/* Riepilogo mese */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3 text-xs">
            <div className="bg-gray-950/60 rounded-xl px-3 py-2"><p className="text-[9px] uppercase text-gray-500 font-black">Giorni giocati</p><p className="font-bold text-white">{delMese.length} · <span className="text-emerald-400">{verdi} ▲</span> <span className="text-red-400">{rossi} ▼</span></p></div>
            <div className="bg-gray-950/60 rounded-xl px-3 py-2"><p className="text-[9px] uppercase text-gray-500 font-black">Media al giorno</p><p className={`font-bold ${colore(totMese)}`}>{delMese.length ? eurSegno(totMese / delMese.length) : '—'}</p></div>
            <div className="bg-gray-950/60 rounded-xl px-3 py-2"><p className="text-[9px] uppercase text-gray-500 font-black">Giorno migliore</p><p className="font-bold text-emerald-400">{migliore && migliore.totale > 0 ? `${eurSegno(migliore.totale)} · ${fmtGiorno(migliore.chiave)}` : '—'}</p></div>
            <div className="bg-gray-950/60 rounded-xl px-3 py-2"><p className="text-[9px] uppercase text-gray-500 font-black">Giorno peggiore</p><p className="font-bold text-red-400">{peggiore && peggiore.totale < 0 ? `${eurSegno(peggiore.totale)} · ${fmtGiorno(peggiore.chiave)}` : '—'}</p></div>
          </div>

          {/* Dettaglio del giorno */}
          {giornoScelto && (
            <div className="mt-3 bg-gray-950/60 border border-gray-800 rounded-xl p-3">
              <div className="flex justify-between items-baseline mb-2">
                <p className="text-xs font-black text-white">{fmtGiorno(giornoScelto.chiave)}</p>
                <p className="text-[10px] text-gray-500">
                  trading <span className={colore(giornoScelto.trading)}>{eurSegno(giornoScelto.trading)}</span>
                  {giornoScelto.nMultiple > 0 && <> · multiple <span className={colore(giornoScelto.multiple)}>{eurSegno(giornoScelto.multiple)}</span></>}
                </p>
              </div>
              {giornoScelto.voci.map((v, i) => (
                <div key={i} className="flex justify-between gap-2 text-xs border-t border-gray-800/70 py-1">
                  <span className="text-gray-300 truncate">{v.tipo === 'multipla' ? '🎟 ' : '📈 '}{v.testo}</span>
                  <span className={`font-bold tabular-nums whitespace-nowrap ${colore(v.euro)}`}>{eurSegno(v.euro)}</span>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        /* Tabella settimane / mesi */
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-xs tabular-nums">
            <thead>
              <tr className="text-[9px] uppercase tracking-widest text-gray-500 text-right">
                <th className="text-left font-black py-1 px-1">{vista === 'settimane' ? 'Settimana' : 'Mese'}</th>
                <th className="font-black px-1">Op.</th>
                <th className="font-black px-1">Giorni ▲/▼</th>
                <th className="font-black px-1">Trading</th>
                <th className="font-black px-1">Multiple</th>
                <th className="font-black px-1">Totale</th>
                <th className="font-black px-1">Progressivo</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                let cum = 0;
                const elenco = (vista === 'settimane' ? settimane : mesi).map(p => { cum += p.totale; return { ...p, cum }; });
                return elenco.reverse().map(p => (
                  <tr key={p.chiave} className="border-t border-gray-800/70 text-right whitespace-nowrap">
                    <td className="text-left py-1.5 px-1 font-bold text-gray-200">{p.etichetta}</td>
                    <td className="px-1 text-gray-400">{p.n}</td>
                    <td className="px-1"><span className="text-emerald-400">{p.giorniVerdi}</span> / <span className="text-red-400">{p.giorniRossi}</span></td>
                    <td className={`px-1 ${colore(p.trading)}`}>{eurSegno(p.trading)}</td>
                    <td className={`px-1 ${colore(p.multiple)}`}>{p.multiple ? eurSegno(p.multiple) : '—'}</td>
                    <td className={`px-1 font-black ${colore(p.totale)}`}>{eurSegno(p.totale)}</td>
                    <td className={`px-1 ${colore(p.cum)}`}>{eurSegno(p.cum)}</td>
                  </tr>
                ));
              })()}
            </tbody>
          </table>
        </div>
      )}

      {/* Barre: salite e discese */}
      {giorni.size > 0 && (
        <div className="h-40 mt-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={datiBarre} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
              <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="etichetta" tick={{ fill: '#6b7280', fontSize: 9 }} interval="preserveStartEnd" minTickGap={8} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 9 }} width={40} />
              <Tooltip
                cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                contentStyle={{ background: '#030712', border: '1px solid #1f2937', borderRadius: 12, fontSize: 12 }}
                formatter={v => [eurSegno(Number(v)), 'Risultato']}
              />
              <ReferenceLine y={0} stroke="#374151" />
              <Bar dataKey="totale" radius={[3, 3, 0, 0]}>
                {datiBarre.map((d, i) => <Cell key={i} fill={d.totale >= 0 ? '#34d399' : '#f87171'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      <p className="text-[10px] text-gray-600 mt-2">
        Risultati di gioco chiusi, per giorno di chiusura (ora italiana). Bonus, versamenti e prelievi esclusi. Tocca un giorno per il dettaglio.
      </p>
    </section>
  );
}
