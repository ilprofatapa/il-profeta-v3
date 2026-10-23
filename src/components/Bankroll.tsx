// ============================================================
// IL PROFETA v3 — components/Bankroll.tsx
// Sezione BANKROLL: saldo, andamento, statistiche trading e multiple
// I dati arrivano da Telegram (b / x / roll / dep / prel / m)
// e si possono inserire anche da qui.
// ============================================================

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  aggiungiMovimento, aggiungiMultipla, calcolaRiepilogo, caricaBankroll, chiudiMultipla, costruisciPosizioni,
  eliminaMovimento, fasciaMinuto, perGruppo, rispettoSoglia,
} from '../services/bankrollService';
import type { DatiBankroll, Multipla, StatGruppo, TipoMovimento } from '../services/bankrollService';

// ── Formattazione ────────────────────────────────────────────
const eur = (v: number) => v.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
const eurSegno = (v: number) => (v > 0 ? '+' : '') + eur(v);
const pct = (v: number) => v.toLocaleString('it-IT', { maximumFractionDigits: 1 }) + '%';
const colore = (v: number) => (v > 0 ? 'text-emerald-400' : v < 0 ? 'text-red-400' : 'text-gray-400');
const dataBreve = (d: Date | string | null) =>
  d ? new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—';

// ── Pezzi di interfaccia ─────────────────────────────────────
function Card({ titolo, children, className = '' }: { titolo?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`bg-gray-900 rounded-[1.5rem] border border-gray-800 p-4 ${className}`}>
      {titolo && <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3">{titolo}</h3>}
      {children}
    </section>
  );
}

function Kpi({ label, valore, sotto, tono }: { label: string; valore: string; sotto?: string; tono?: string }) {
  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800 px-4 py-3 min-w-0">
      <p className="text-[9px] font-black uppercase tracking-widest text-gray-500 truncate">{label}</p>
      <p className={`text-xl font-black mt-0.5 tabular-nums ${tono ?? 'text-white'}`}>{valore}</p>
      {sotto && <p className="text-[10px] text-gray-500 mt-0.5 truncate">{sotto}</p>}
    </div>
  );
}

function TabellaGruppi({ righe, vuoto }: { righe: { nome: string; stat: StatGruppo }[]; vuoto: string }) {
  if (righe.length === 0) return <p className="text-xs text-gray-600">{vuoto}</p>;
  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-xs tabular-nums">
        <thead>
          <tr className="text-[9px] uppercase tracking-widest text-gray-500 text-right">
            <th className="text-left font-black py-1 px-1">Gruppo</th>
            <th className="font-black px-1">Op.</th>
            <th className="font-black px-1">Verdi</th>
            <th className="font-black px-1">Profitto</th>
            <th className="font-black px-1">Media</th>
            <th className="font-black px-1">Rend.</th>
          </tr>
        </thead>
        <tbody>
          {righe.map(r => (
            <tr key={r.nome} className="border-t border-gray-800/70 text-right whitespace-nowrap">
              <td className="text-left py-1.5 px-1 font-bold text-gray-200 whitespace-normal">{r.nome}</td>
              <td className="px-1 text-gray-400">{r.stat.n}</td>
              <td className="px-1 text-gray-300">{pct(r.stat.pctVerdi)}</td>
              <td className={`px-1 font-bold ${colore(r.stat.pl)}`}>{eurSegno(r.stat.pl)}</td>
              <td className={`px-1 ${colore(r.stat.media)}`}>{eurSegno(r.stat.media)}</td>
              <td className={`px-1 ${colore(r.stat.rendimento)}`}>{pct(r.stat.rendimento)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const inputCls = 'bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-yellow-500/60 min-w-0';
const btnCls = 'px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-yellow-500 text-gray-950 hover:bg-yellow-400 disabled:opacity-40 transition-all';

// ── Componente principale ────────────────────────────────────
export default function Bankroll() {
  const [dati, setDati] = useState<DatiBankroll | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [caricando, setCaricando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  // moduli
  const [movTipo, setMovTipo] = useState<TipoMovimento>('deposito');
  const [movImporto, setMovImporto] = useState('');
  const [movNota, setMovNota] = useState('');
  const [mQuota, setMQuota] = useState('');
  const [mImporto, setMImporto] = useState('');
  const [mNota, setMNota] = useState('');
  const [cashoutVal, setCashoutVal] = useState<Record<number, string>>({});

  const carica = useCallback(async () => {
    setCaricando(true);
    try {
      setDati(await caricaBankroll());
      setErrore(null);
    } catch (e) {
      setErrore(e instanceof Error ? e.message : String(e));
    } finally {
      setCaricando(false);
    }
  }, []);

  useEffect(() => { carica(); }, [carica]);

  const posizioni = useMemo(() => (dati ? costruisciPosizioni(dati) : []), [dati]);
  const r = useMemo(() => (dati ? calcolaRiepilogo(dati, posizioni) : null), [dati, posizioni]);

  const esegui = async (azione: () => Promise<void>) => {
    setSalvando(true);
    try { await azione(); await carica(); }
    catch (e) { setErrore(e instanceof Error ? e.message : String(e)); }
    finally { setSalvando(false); }
  };

  const numero = (s: string) => parseFloat(s.replace(',', '.'));

  if (caricando && !dati) {
    return <div className="text-center text-gray-400 mt-10"><p className="text-2xl mb-2">⏳</p><p>Caricamento bankroll...</p></div>;
  }
  if (errore && !dati) {
    return (
      <Card titolo="Errore">
        <p className="text-sm text-red-400">{errore}</p>
        <p className="text-xs text-gray-500 mt-2">Hai lanciato lo script SQL che crea le tabelle <b>bankroll_movimenti</b> e <b>multiple</b>?</p>
        <button onClick={carica} className={`${btnCls} mt-3`}>Riprova</button>
      </Card>
    );
  }
  if (!dati || !r) return null;

  const multipleOrdinate = [...dati.multiple].reverse();
  const posizioniRecenti = [...posizioni].reverse().slice(0, 40);
  const nessunRoll = r.rollIniziale === 0;

  return (
    <div className="space-y-4">

      {/* Barra superiore */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-black text-white">🏦 Bankroll</h2>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest">Trading e multiple, tenuti separati</p>
        </div>
        <button onClick={carica} disabled={caricando}
          className="text-xs text-gray-500 hover:text-gray-300 px-3 py-1.5 rounded-xl bg-gray-900/60 border border-gray-800/50 transition-all">
          {caricando ? '⏳' : '🔄'} Aggiorna
        </button>
      </div>

      {errore && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2">{errore}</p>}
      {nessunRoll && (
        <p className="text-xs text-yellow-300 bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-3 py-2">
          Imposta il roll iniziale: scrivi <b>roll 500</b> su Telegram oppure usa il modulo qui sotto.
        </p>
      )}

      {/* KPI principali */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Kpi label="Saldo attuale" valore={eur(r.saldo)} tono="text-yellow-400"
          sotto={r.inGiocoMultiple ? `di cui ${eur(r.inGiocoMultiple)} in multiple aperte` : `capitale versato ${eur(r.capitaleVersato)}`} />
        <Kpi label="Profitto trading" valore={eurSegno(r.plTrading)} tono={colore(r.plTrading)} sotto={`${r.trading.n} operazioni chiuse`} />
        <Kpi label="Profitto multiple" valore={eurSegno(r.plMultiple)} tono={colore(r.plMultiple)} sotto={`${r.multiple.n} multiple chiuse`} />
        <Kpi label="Rendimento sul roll" valore={pct(r.rendimentoRoll)} tono={colore(r.rendimentoRoll)}
          sotto={`roll ${eur(r.rollIniziale)} · versamenti ${eur(r.versamenti)}`} />
      </div>

      {/* Grafico */}
      <Card titolo="Andamento">
        {r.grafico.length < 2 ? (
          <p className="text-xs text-gray-600">Il grafico comparirà dopo le prime operazioni chiuse.</p>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={r.grafico} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
                <XAxis dataKey="etichetta" tick={{ fill: '#6b7280', fontSize: 10 }} minTickGap={24} />
                <YAxis yAxisId="saldo" tick={{ fill: '#eab308', fontSize: 10 }} width={48} domain={['auto', 'auto']} />
                <YAxis yAxisId="pl" orientation="right" tick={{ fill: '#6b7280', fontSize: 10 }} width={44} domain={['auto', 'auto']} />
                <Tooltip
                  contentStyle={{ background: '#030712', border: '1px solid #1f2937', borderRadius: 12, fontSize: 12 }}
                  formatter={(v, nome) => [eur(Number(v)), String(nome)]}
                />
                <ReferenceLine yAxisId="pl" y={0} stroke="#374151" />
                <Line type="linear" yAxisId="saldo" dataKey="saldo" name="Saldo" stroke="#eab308" strokeWidth={2.5} dot={false} />
                <Line type="linear" yAxisId="pl" dataKey="trading" name="Profitto trading" stroke="#34d399" strokeWidth={1.5} dot={false} />
                <Line type="linear" yAxisId="pl" dataKey="multiple" name="Profitto multiple" stroke="#a78bfa" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        <div className="flex flex-wrap gap-4 mt-2 text-[10px] font-bold uppercase tracking-wider">
          <span className="text-yellow-400">● Saldo (scala a sinistra)</span>
          <span className="text-emerald-400">● Profitto trading</span>
          <span className="text-violet-400">● Profitto multiple</span>
          <span className="text-gray-500">profitti: scala a destra</span>
        </div>
      </Card>

      {/* Rischio e qualità */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Kpi label="Operazioni in verde" valore={pct(r.trading.pctVerdi)} sotto={`${r.trading.verdi} su ${r.trading.n}`} />
        <Kpi label="Verde medio / perdita media" valore={`${eurSegno(r.trading.mediaVerde)} / ${eurSegno(r.trading.mediaPerdita)}`}
          sotto={r.trading.mediaPerdita ? `1 perdita = ${(Math.abs(r.trading.mediaPerdita) / (r.trading.mediaVerde || 1)).toFixed(1)} verdi` : 'nessuna perdita'} />
        <Kpi label="Calo massimo" valore={eur(-r.maxDrawdown)} tono={r.maxDrawdown > 0 ? 'text-red-400' : 'text-gray-400'}
          sotto={`${pct(r.maxDrawdownPct)} del capitale · serie negativa ${r.serieNegativa}`} />
        <Kpi label="Responsabilità massima" valore={eur(r.respMax)}
          tono={r.respMaxPctRoll > 10 ? 'text-red-400' : r.respMaxPctRoll > 5 ? 'text-yellow-400' : 'text-white'}
          sotto={`${pct(r.respMaxPctRoll)} del saldo attuale`} />
      </div>

      {/* Confronto trading vs multiple */}
      <Card titolo="Confronto trading / multiple">
        <TabellaGruppi vuoto="Nessuna giocata chiusa."
          righe={[{ nome: '📈 Trading (bancate)', stat: r.trading }, { nome: '🎟 Multiple', stat: r.multiple }]} />
        <p className="text-[10px] text-gray-600 mt-2">
          Rendimento = profitto ÷ esposizione (responsabilità per il trading, puntate per le multiple).
        </p>
      </Card>

      {/* Analisi trading */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card titolo="Per strategia e fascia">
          <TabellaGruppi righe={perGruppo(r.chiuse, p => p.gruppo)} vuoto="Nessuna operazione chiusa." />
        </Card>
        <Card titolo="Quota presa rispetto alla soglia del segnale">
          <TabellaGruppi righe={perGruppo(r.chiuse, rispettoSoglia)} vuoto="Servono operazioni con quota e soglia registrate." />
          <p className="text-[10px] text-gray-600 mt-2">È la verifica chiave: il guadagno nasce dal prezzo di entrata.</p>
        </Card>
        <Card titolo="Per minuto di entrata">
          <TabellaGruppi righe={perGruppo(r.chiuse, fasciaMinuto)} vuoto="Nessun minuto registrato." />
        </Card>
        <Card titolo="Come si chiudono">
          <TabellaGruppi
            righe={perGruppo(r.chiuse, p => (p.chiusuraFinePartita ? '🏁 Tenute fino alla fine' : '⚡ Uscita durante la partita'))}
            vuoto="Nessuna operazione chiusa." />
        </Card>
      </div>

      {/* Posizioni */}
      <Card titolo={`Operazioni (${posizioni.length}) · aperte ${r.aperte.length}`}>
        {posizioniRecenti.length === 0 ? (
          <p className="text-xs text-gray-600">Ancora nessuna operazione registrata da Telegram.</p>
        ) : (
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-xs tabular-nums">
              <thead>
                <tr className="text-[9px] uppercase tracking-widest text-gray-500 text-right">
                  <th className="text-left font-black py-1 px-1">Data</th>
                  <th className="text-left font-black px-1">Partita</th>
                  <th className="text-left font-black px-1">Strategia</th>
                  <th className="font-black px-1">Quota</th>
                  <th className="font-black px-1">Soglia</th>
                  <th className="font-black px-1">Min.</th>
                  <th className="font-black px-1">Resp.</th>
                  <th className="font-black px-1">Esito</th>
                </tr>
              </thead>
              <tbody>
                {posizioniRecenti.map(p => (
                  <tr key={p.fixtureId} className="border-t border-gray-800/70 text-right">
                    <td className="text-left py-1.5 px-1 text-gray-500 whitespace-nowrap">{dataBreve(p.data)}</td>
                    <td className="text-left px-1 text-gray-200 font-bold max-w-[180px] truncate">{p.partita}</td>
                    <td className="text-left px-1 text-gray-400 whitespace-nowrap">{p.gruppo}</td>
                    <td className="px-1 text-gray-300">{p.quotaEntrata?.toFixed(2) ?? '—'}{p.nBancate > 1 ? ` +${p.nBancate - 1}` : ''}</td>
                    <td className="px-1 text-gray-500">{p.quotaMax?.toFixed(2) ?? '—'}</td>
                    <td className="px-1 text-gray-500">{p.minutoEntrata ?? '—'}</td>
                    <td className="px-1 text-gray-400">{p.mancaImporto ? '⚠️' : eur(p.responsabilita)}</td>
                    <td className={`px-1 font-bold whitespace-nowrap ${p.esito === null ? 'text-yellow-400' : colore(p.esito)}`}>
                      {p.esito === null ? 'aperta' : eurSegno(p.esito)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Multiple */}
      <Card titolo="Multiple">
        <form className="flex flex-wrap gap-2 mb-3"
          onSubmit={e => {
            e.preventDefault();
            const q = numero(mQuota), i = numero(mImporto);
            if (!(q > 1) || !(i > 0)) { setErrore('Multipla: inserisci quota (>1) e puntata.'); return; }
            esegui(async () => { await aggiungiMultipla(q, i, mNota); setMQuota(''); setMImporto(''); setMNota(''); });
          }}>
          <input className={`${inputCls} w-24`} placeholder="Quota" inputMode="decimal" value={mQuota} onChange={e => setMQuota(e.target.value)} />
          <input className={`${inputCls} w-24`} placeholder="Puntata €" inputMode="decimal" value={mImporto} onChange={e => setMImporto(e.target.value)} />
          <input className={`${inputCls} flex-1 min-w-[140px]`} placeholder="Nota (facoltativa)" value={mNota} onChange={e => setMNota(e.target.value)} />
          <button className={btnCls} disabled={salvando}>+ Multipla</button>
        </form>

        {multipleOrdinate.length === 0 ? (
          <p className="text-xs text-gray-600">Nessuna multipla. Da Telegram: <b>m 8.50 5</b></p>
        ) : (
          <div className="space-y-1.5">
            {multipleOrdinate.slice(0, 30).map((m: Multipla) => {
              const netto = (m.ritorno ?? 0) - m.importo;
              return (
                <div key={m.id} className="flex flex-wrap items-center gap-2 bg-gray-950/60 border border-gray-800/70 rounded-xl px-3 py-2 text-xs">
                  <span className="text-gray-500 w-16">{dataBreve(m.created_at)}</span>
                  <span className="font-bold text-gray-200 tabular-nums">@{m.quota.toFixed(2)}</span>
                  <span className="text-gray-400 tabular-nums">{eur(m.importo)}</span>
                  {m.nota && <span className="text-gray-500 truncate max-w-[160px]">{m.nota}</span>}
                  <span className="flex-1" />
                  {m.esito === 'in_corso' ? (
                    <span className="flex flex-wrap items-center gap-1">
                      <button disabled={salvando} onClick={() => esegui(() => chiudiMultipla(m, 'vinta'))}
                        className="px-2 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 font-black">Vinta</button>
                      <button disabled={salvando} onClick={() => esegui(() => chiudiMultipla(m, 'persa'))}
                        className="px-2 py-1 rounded-lg bg-red-500/15 text-red-400 font-black">Persa</button>
                      <button disabled={salvando} onClick={() => esegui(() => chiudiMultipla(m, 'annullata'))}
                        className="px-2 py-1 rounded-lg bg-gray-700/40 text-gray-300 font-black">Annullata</button>
                      <input className={`${inputCls} w-20 py-1`} placeholder="Cash out" inputMode="decimal"
                        value={cashoutVal[m.id] ?? ''} onChange={e => setCashoutVal({ ...cashoutVal, [m.id]: e.target.value })} />
                      <button disabled={salvando || !(numero(cashoutVal[m.id] ?? '') >= 0)}
                        onClick={() => esegui(() => chiudiMultipla(m, 'cashout', numero(cashoutVal[m.id] ?? '0')))}
                        className="px-2 py-1 rounded-lg bg-yellow-500/15 text-yellow-400 font-black">OK</button>
                    </span>
                  ) : (
                    <span className={`font-black tabular-nums ${colore(netto)}`}>{m.esito} {eurSegno(netto)}</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Movimenti */}
      <Card titolo="Roll iniziale, versamenti e prelievi">
        <form className="flex flex-wrap gap-2 mb-3"
          onSubmit={e => {
            e.preventDefault();
            const i = numero(movImporto);
            if (!(i > 0)) { setErrore('Movimento: inserisci un importo.'); return; }
            esegui(async () => { await aggiungiMovimento(movTipo, i, movNota); setMovImporto(''); setMovNota(''); });
          }}>
          <select className={`${inputCls} w-36`} value={movTipo} onChange={e => setMovTipo(e.target.value as TipoMovimento)}>
            <option value="iniziale">Roll iniziale</option>
            <option value="deposito">Versamento</option>
            <option value="prelievo">Prelievo</option>
          </select>
          <input className={`${inputCls} w-28`} placeholder="Importo €" inputMode="decimal" value={movImporto} onChange={e => setMovImporto(e.target.value)} />
          <input className={`${inputCls} flex-1 min-w-[140px]`} placeholder="Nota (facoltativa)" value={movNota} onChange={e => setMovNota(e.target.value)} />
          <button className={btnCls} disabled={salvando}>Salva</button>
        </form>
        {dati.movimenti.length === 0 ? (
          <p className="text-xs text-gray-600">Nessun movimento. Da Telegram: <b>roll 500</b> · <b>dep 100</b> · <b>prel 50</b></p>
        ) : (
          <div className="space-y-1">
            {[...dati.movimenti].reverse().map(m => (
              <div key={m.id} className="flex items-center gap-3 text-xs border-t border-gray-800/70 pt-1.5">
                <span className="text-gray-500 w-16">{dataBreve(m.created_at)}</span>
                <span className="font-bold text-gray-300 w-28">
                  {m.tipo === 'iniziale' ? '🏦 Roll iniziale' : m.tipo === 'deposito' ? '➕ Versamento' : '💸 Prelievo'}
                </span>
                <span className={`tabular-nums font-bold ${m.tipo === 'prelievo' ? 'text-red-400' : 'text-emerald-400'}`}>
                  {m.tipo === 'prelievo' ? '−' : ''}{eur(m.importo)}
                </span>
                <span className="text-gray-500 truncate flex-1">{m.nota}</span>
                <button disabled={salvando} title="Elimina"
                  onClick={() => { if (window.confirm('Eliminare questo movimento?')) esegui(() => eliminaMovimento(m.id)); }}
                  className="text-gray-600 hover:text-red-400">✕</button>
              </div>
            ))}
          </div>
        )}
        <p className="text-[10px] text-gray-600 mt-2">Se inserisci più volte il roll iniziale, vale l'ultimo.</p>
      </Card>
    </div>
  );
}
