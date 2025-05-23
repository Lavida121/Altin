import React, { useEffect, useState } from "react";

const API_KEY = "c8a594d6cc68451e8734188995aa419e";
const API_URL = `https://openexchangerates.org/api/latest.json?app_id=${API_KEY}&symbols=USD,EUR,GBP,CHF,JPY,TRY`;
const CURRENCIES = [
  { code: "USD", label: "US-Dollar" },
  { code: "EUR", label: "Euro" },
  { code: "GBP", label: "Pfund Sterling" },
  { code: "CHF", label: "Schweizer Franken" },
  { code: "JPY", label: "Japanischer Yen" },
  { code: "TRY", label: "Türkische Lira" },
];

export default function Home() {
  const [rates, setRates] = useState<{ [key: string]: number }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Für den Rechner
  const [from, setFrom] = useState("EUR");
  const [to, setTo] = useState("USD");
  const [amount, setAmount] = useState(1);

  // Lade Daten
  useEffect(() => {
    async function fetchRates() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(API_URL);
        if (!res.ok) throw new Error("API-Fehler");
        const data = await res.json();
        setRates(data.rates);
      } catch (err: any) {
        setError(err.message || "Unbekannter Fehler");
      }
      setLoading(false);
    }
    fetchRates();
  }, []);

  // Rechner-Logik (Umrechnung basiert auf USD-Base)
  function convert(val: number, from: string, to: string) {
    if (!rates[from] || !rates[to]) return "";
    // Alle Kurse sind USD-basiert, daher erst nach USD, dann zum Ziel
    const usd = val / rates[from];
    const result = usd * rates[to];
    return result;
  }

  function swap() {
    setFrom(to);
    setTo(from);
  }

  return (
    <div className="min-h-screen flex flex-col items-center bg-gradient-to-br from-indigo-900 to-indigo-700 p-6 text-white font-sans">
      <div className="w-full max-w-xl bg-indigo-800/80 rounded-xl shadow-xl p-6 mb-8">
        <h2 className="text-2xl font-bold mb-4">Währungsrechner</h2>
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <input
            type="number"
            className="rounded-lg p-2 text-black w-full md:w-32"
            value={amount}
            min={0}
            onChange={e => setAmount(Number(e.target.value))}
          />
          <select
            className="rounded-lg p-2 text-black w-full md:w-40"
            value={from}
            onChange={e => setFrom(e.target.value)}
          >
            {CURRENCIES.map(c => (
              <option key={c.code} value={c.code}>{c.label}</option>
            ))}
          </select>
          <button
            onClick={swap}
            className="rounded-full bg-indigo-600 hover:bg-indigo-400 p-2 text-lg shadow-md transition"
            title="Wechseln"
          >⇄</button>
          <input
            className="rounded-lg p-2 text-black w-full md:w-32 bg-gray-100"
            value={
              !loading && !error
                ? convert(amount, from, to).toLocaleString(undefined, { maximumFractionDigits: 4 })
                : ""
            }
            disabled
          />
          <select
            className="rounded-lg p-2 text-black w-full md:w-40"
            value={to}
            onChange={e => setTo(e.target.value)}
          >
            {CURRENCIES.map(c => (
              <option key={c.code} value={c.code}>{c.label}</option>
            ))}
          </select>
        </div>
        <div className="mt-2 text-xs text-gray-200">
          {!loading && rates[from] && rates[to] && (
            <>
              1 {CURRENCIES.find(c => c.code === from)?.label} ={" "}
              {(convert(1, from, to)).toLocaleString(undefined, { maximumFractionDigits: 4 })}{" "}
              {CURRENCIES.find(c => c.code === to)?.label}
            </>
          )}
        </div>
      </div>

      <div className="w-full max-w-4xl bg-indigo-800/80 rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-semibold mb-4">Wechselkurse (USD-Basis)</h3>
        {loading && <div>Lade aktuelle Kurse...</div>}
        {error && <div className="text-red-300">{error}</div>}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {CURRENCIES.map(cur => (
            <div
              key={cur.code}
              className="bg-indigo-600/60 rounded-xl shadow p-5 flex flex-col justify-between h-32"
            >
              <div className="text-lg font-bold">{cur.code}</div>
              <div className="text-xs mb-1">{cur.label}</div>
              <div className="text-2xl font-mono">
                {!loading && rates[cur.code] ? rates[cur.code].toLocaleString(undefined, { maximumFractionDigits: 4 }) : "--"}
              </div>
            </div>
          ))}
        </div>
        <div className="text-xs text-gray-200 mt-5 flex justify-between">
          <span>
            Letztes Update: {new Date().toLocaleTimeString()}
          </span>
          <span>
            powered by <a href="https://openexchangerates.org/" className="underline" target="_blank" rel="noopener noreferrer">openexchangerates.org</a>
          </span>
        </div>
      </div>
    </div>
  );
}
