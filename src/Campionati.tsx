// ============================================================
// IL PROFETA v3.9 — components/Campionati.tsx
// Rendimento per campionato: barre del profitto, ciambella delle
// operazioni e tabella. Filtri: periodo, multiple sì/no, senza campionato sì/no.
// ============================================================

import { useMemo, useState } from 'react';
import {
  Bar, BarChart, CartesianGrid, Cell, LabelList, Pie, PieChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { chiaveGiorno, inizioGiorno, lunediDi, perCampionato } from '../services/bankrollService';
import type { Multipla, Posizione } from '../services/bankrollService';

const eur = (v: number) => v.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
const eurSegno = (v: number) => (v > 0 ? '+' : '') + eur(v);
const eurCorto = (v: number) => (v > 0 ? '+' : '') + v.toLocaleString('it-IT', { maximumFractionDigits: 0 }) + ' €';
const pct = (v: number) => (v > 0 ? '+' : '') + v.toLocaleString('it-IT', { maximumFractionDigits: 1 }) + '%';
const colore = (v: number) => (v > 0 ? 'text-emerald-400' : v < 0 ? 'text-red-400' : 'text-gray-400');

const PALETTE = ['#eab308', '#34d399', '#60a5fa', '#f472b6', '#a78bfa', '#fb923c', '#22d3ee', '#f87171',
                 '#a3e635', '#e879f9', '#94a3b8', '#fbbf24', '#2dd4bf', '#c084fc', '#fda4af', '#86efac'];

type Periodo = 'tutto' | '30' | 'mese' | 'settimana';

export default function Campionati({ chiuse, multiple }: { chiuse: Posizione[]; multiple: Multipla[] }) {
  const [periodo, setPeriodo] = useState<Periodo>('tutto');
  const [conMultiple, setConMultiple] = useState(false);
  const [conSenzaLega, setConSenzaLega] = useState(true);

  const [adesso] = useState(() => Date.now());
  const da = useMemo(() => {
    const oggi = chiaveGiorno(adesso);
    if (periodo === '30') return adesso - 30 * 86400000;
    if (periodo === 'mese') return inizioGiorno(oggi.slice(0, 7) + '-01');
    if (periodo === 'settimana') return inizioGiorno(lunediDi(oggi));
    return 0;
  }, [periodo, adesso]);

  const righe = useMemo(() => perCampionato(chiuse, multiple, { da, conMultiple, conSenzaLega }),
                        [chiuse, multiple, da, conMultiple, conSenzaLega]);
  const colori = useMemo(() => new Map(righe.map((r, i) => [r.nome, PALETTE[i % PALETTE.length]])), [righe]);

  const tot = righe.reduce((s, r) => s + r.pl, 0);
  const nTot = righe.reduce((s, r) => s + r.n, 0);
  const rischioTot = righe.reduce((s, r) => s + r.rischio, 0);
  const migliore = righe.length ? righe[0] : null;
  const peggiore = righe.length ? righe[righe.length - 1] : null;
  const ciambella = [...righe].sort((a, b) => b.n - a.n);

  const btn = (v: Periodo, testo: string) => (
    <button key={v} onClick={() => setPeriodo(v)}
      className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${periodo === v ? 'bg-yellow-500 text-gray-950' : 'bg-gray-950 text-gray-400 border border-gray-800'}`}>
      {testo}
    </button>
  );
  const interruttore = (attivo: boolean, cambia: () => void, testo: string) => (
    <button onClick={cambia}
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${attivo ? 'border-yellow-500/60 text-yellow-300 bg-yellow-500/10' : 'border-gray-800 text-gray-500 bg-gray-950'}`}>
      <span className={`inline-block w-6 h-3.5 rounded-full relative transition-all ${attivo ? 'bg-yellow-500' : 'bg-gray-700'}`}>
        <span className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-gray-950 transition-all ${attivo ? 'left-3' : 'left-0.5'}`} />
      </span>
      {testo}
    </button>
  );

  return (
    <section className="bg-gray-900 rounded-[1.5rem] border border-gray-800 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-500">🏆 Rendimento per campionato</h3>
        <div className="flex gap-1">{btn('tutto', 'Tutto')}{btn('30', '30 gg')}{btn('mese', 'Mese')}{btn('settimana', 'Sett.')}</div>
      </div>
      <div className="flex flex-wrap gap-2 mb-4">
        {interruttore(conMultiple, () => setConMultiple(!conMultiple), 'Multiple')}
        {interruttore(conSenzaLega, () => setConSenzaLega(!conSenzaLega), 'Senza campionato')}
      </div>

      {righe.length === 0 ? (
        <p className="text-xs text-gray-600">Nessuna operazione chiusa nel periodo scelto.</p>
      ) : (
        <>
          {/* KPI */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4 text-xs">
            <div className="bg-gray-950/60 rounded-xl px-3 py-2"><p className="text-[9px] uppercase text-gray-500 font-black">Totale periodo</p><p className={`font-black ${colore(tot)}`}>{eurSegno(tot)}</p><p className="text-[10px] text-gray-500">{nTot} operazioni · {rischioTot > 0 ? pct((tot / rischioTot) * 100) + ' sul rischio' : '—'}</p></div>
            <div className="bg-gray-950/60 rounded-xl px-3 py-2"><p className="text-[9px] uppercase text-gray-500 font-black">Campionati</p><p className="font-black text-white">{righe.length}</p><p className="text-[10px] text-gray-500">{righe.filter(r => r.pl > 0).length} in attivo · {righe.filter(r => r.pl < 0).length} in passivo</p></div>
            <div className="bg-gray-950/60 rounded-xl px-3 py-2"><p className="text-[9px] uppercase text-gray-500 font-black">Rende di più</p><p className="font-black text-emerald-400 truncate">{migliore && migliore.pl > 0 ? migliore.nome : '—'}</p><p className="text-[10px] text-gray-500">{migliore && migliore.pl > 0 ? eurSegno(migliore.pl) + ' · ' + migliore.n + ' op.' : ''}</p></div>
            <div className="bg-gray-950/60 rounded-xl px-3 py-2"><p className="text-[9px] uppercase text-gray-500 font-black">Rende di meno</p><p className="font-black text-red-400 truncate">{peggiore && peggiore.pl < 0 ? peggiore.nome : '—'}</p><p className="text-[10px] text-gray-500">{peggiore && peggiore.pl < 0 ? eurSegno(peggiore.pl) + ' · ' + peggiore.n + ' op.' : ''}</p></div>
          </div>

          <div className="grid md:grid-cols-5 gap-4">
            {/* Barre: profitto per campionato */}
            <div className="md:col-span-3">
              <p className="text-[9px] uppercase tracking-widest text-gray-500 font-black mb-1">Profitto per campionato</p>
              <div style={{ height: Math.max(160, righe.length * 30 + 30) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={righe} layout="vertical" margin={{ top: 4, right: 52, left: 4, bottom: 4 }}>
                    <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 10 }} tickFormatter={v => `${v}€`} />
                    <YAxis type="category" dataKey="nome" width={118} tick={{ fill: '#d1d5db', fontSize: 10 }} interval={0} />
                    <ReferenceLine x={0} stroke="#4b5563" />
                    <Tooltip cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                      contentStyle={{ background: '#030712', border: '1px solid #1f2937', borderRadius: 12, fontSize: 12 }}
                      formatter={(v) => [eurSegno(Number(v)), 'Profitto']} />
                    <Bar dataKey="pl" radius={[4, 4, 4, 4]} barSize={18}>
                      {righe.map(r => <Cell key={r.nome} fill={r.pl >= 0 ? '#10b981' : '#ef4444'} />)}
                      <LabelList dataKey="pl" position="right" formatter={(v: unknown) => eurCorto(Number(v))}
                        style={{ fill: '#9ca3af', fontSize: 10, fontWeight: 700 }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Ciambella: operazioni per campionato */}
            <div className="md:col-span-2">
              <p className="text-[9px] uppercase tracking-widest text-gray-500 font-black mb-1">Dove giochi (n. operazioni)</p>
              <div className="h-48 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={ciambella} dataKey="n" nameKey="nome" innerRadius="58%" outerRadius="90%" paddingAngle={2} stroke="none">
                      {ciambella.map(r => <Cell key={r.nome} fill={colori.get(r.nome)} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#030712', border: '1px solid #1f2937', borderRadius: 12, fontSize: 12 }}
                      formatter={(v, nome) => [`${v} op. · ${Math.round((Number(v) / nTot) * 100)}%`, String(nome)]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <p className="text-xl font-black text-white leading-none">{nTot}</p>
                  <p className="text-[9px] uppercase text-gray-500 font-black">operazioni</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                {ciambella.map(r => (
                  <span key={r.nome} className="flex items-center gap-1 text-[10px] text-gray-400">
                    <span className="w-2 h-2 rounded-full" style={{ background: colori.get(r.nome) }} />{r.nome} <span className="text-gray-600">{r.n}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Tabella */}
          <div className="overflow-x-auto -mx-1 mt-4">
            <table className="w-full text-xs tabular-nums">
              <thead>
                <tr className="text-[9px] uppercase tracking-widest text-gray-500 text-right">
                  <th className="text-left font-black py-1 px-1">Campionato</th>
                  <th className="font-black px-1">Op.</th>
                  <th className="font-black px-1">Verdi</th>
                  <th className="font-black px-1">Profitto</th>
                  <th className="font-black px-1">Media</th>
                  <th className="font-black px-1">% rischio</th>
                </tr>
              </thead>
              <tbody>
                {righe.map(r => (
                  <tr key={r.nome} className="border-t border-gray-800/70 text-right whitespace-nowrap">
                    <td className="text-left py-1.5 px-1 font-bold text-gray-200">
                      <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ background: colori.get(r.nome) }} />{r.nome}
                    </td>
                    <td className="px-1 text-gray-400">{r.n}</td>
                    <td className="px-1 text-gray-300">{Math.round(r.pctVerdi)}%</td>
                    <td className={`px-1 font-black ${colore(r.pl)}`}>{eurSegno(r.pl)}</td>
                    <td className={`px-1 ${colore(r.media)}`}>{eurSegno(r.media)}</td>
                    <td className={`px-1 ${colore(r.rendimento)}`}>{r.rischio > 0 ? pct(r.rendimento) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-gray-600 mt-2">
            ⚠️ Pochi casi per campionato: una sola partita pari sposta molto il risultato. Guarda soprattutto i campionati con molte operazioni.
          </p>
        </>
      )}
    </section>
  );
}
