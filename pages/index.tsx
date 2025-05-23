import React, { useEffect, useState } from "react";

// Definiere alle angezeigten Währungen
const CURRENCIES = [
  { code: "USD", name: "US-Dollar" },
  { code: "EUR", name: "Euro" },
  { code: "GBP", name: "Pfund Sterling" },
  { code: "CHF", name: "Schweizer Franken" },
  { code: "JPY", name: "Japanischer Yen" },
  { code: "TRY", name: "Türkische Lira" },
];

// Simpler TrendChart (kannst du später ersetzen)
function MiniTrend({ values }: { values: number[] }) {
  // Werte für das Mini-SVG-Nachzeichnen
  const width = 60;
  const height = 24;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const points = values
    .map(
      (v, i) =>
        `${(i / (values.length - 1)) * width},${height -
          ((v - min) / (max - min || 1)) * height}`
    )
    .join(" ");
  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      <polyline
        fill="none"
        stroke="#fff"
        strokeWidth={2}
        points={points}
        style={{ opacity: 0.6 }}
      />
    </svg>
  );
}

export default function Home() {
  const [rates, setRates] = useState<{ [k: string]: number }>({});
  const [history, setHistory] = useState<{ [k: string]: number[] }>({});
  const [blink, setBlink] = useState<{ [k: string]: "up" | "down" | "" }>({});
  const [input, setInput] = useState("1");
  const [from, setFrom] = useState("EUR");
  const [to, setTo] = useState("USD");
  const [converted, setConverted] = useState("");

  // Wechselkurse live holen (TRY als Basis)
  useEffect(() => {
    async function fetchRates() {
      const res = await fetch(
        "https://api.exchangerate.host/latest?base=TRY&symbols=USD,EUR,GBP,CHF,JPY,TRY"
      );
      const data = await res.json();
      setRates(data.rates || {});
    }
    fetchRates();

    // Verlauf holen für Mini-Trends (letzte 7 Tage)
    async function fetchHistory() {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 6);
      const res = await fetch(
        `https://api.exchangerate.host/timeseries?base=TRY&symbols=USD,EUR,GBP,CHF,JPY,TRY&start_date=${start
          .toISOString()
          .slice(0, 10)}&end_date=${end.toISOString().slice(0, 10)}`
      );
      const data = await res.json();
      const hist: { [k: string]: number[] } = {};
      Object.keys(data.rates || {}).forEach((date) => {
        Object.entries(data.rates[date]).forEach(([cur, val]) => {
          if (!hist[cur]) hist[cur] = [];
          hist[cur].push(val as number);
        });
      });
      setHistory(hist);
    }
    fetchHistory();
  }, []);

  // Blink-Animation bei Kursänderung (simples Beispiel)
  useEffect(() => {
    const prev = JSON.parse(
      sessionStorage.getItem("lastRates") || "{}"
    ) as typeof rates;
    const nextBlink: typeof blink = {};
    Object.keys(rates).forEach((k) => {
      if (prev[k] && rates[k] !== prev[k]) {
        nextBlink[k] = rates[k] > prev[k] ? "up" : "down";
      } else {
        nextBlink[k] = "";
      }
    });
    setBlink(nextBlink);
    sessionStorage.setItem("lastRates", JSON.stringify(rates));
    const t = setTimeout(() => setBlink({}), 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line
  }, [rates]);

  // Converter-Logik
  useEffect(() => {
    if (!rates[from] || !rates[to]) return setConverted("");
    // Umrechnung immer über TRY-Basis!
    const value = Number(input.replace(",", "."));
    if (isNaN(value)) return setConverted("");
    // EUR->USD: (1 / rates[EUR]) * rates[USD]
    const tryValue = value / rates[from]; // in TRY
    const result = tryValue * rates[to]; // in Zielwährung
    setConverted(result.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 6 }));
  }, [input, from, to, rates]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at 20% 10%, #6d74e6 0%, #292877 100%)",
        color: "#fff",
        padding: 0,
        fontFamily: "system-ui,sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 800,
          margin: "0 auto",
          padding: 24,
        }}
      >
        <h2 style={{ marginBottom: 18, fontSize: 24 }}>Währungsrechner</h2>
        <div
          style={{
            display: "flex",
            gap: 14,
            flexWrap: "wrap",
            alignItems: "center",
            background: "#444a9b80",
            borderRadius: 18,
            padding: 20,
            marginBottom: 22,
          }}
        >
          <input
            type="text"
            inputMode="decimal"
            style={{
              fontSize: 20,
              padding: 10,
              borderRadius: 8,
              border: "none",
              outline: "none",
              width: 110,
              background: "#3e4377",
              color: "#fff",
            }}
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <select
            value={from}
            style={{
              fontSize: 16,
              borderRadius: 7,
              padding: 7,
              background: "#3e4377",
              color: "#fff",
            }}
            onChange={(e) => setFrom(e.target.value)}
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
          <button
            style={{
              padding: "8px 12px",
              borderRadius: "50%",
              background: "#444a9b",
              border: "none",
              cursor: "pointer",
              fontSize: 19,
              color: "#fff",
            }}
            title="Tauschen"
            onClick={() => {
              setFrom(to);
              setTo(from);
            }}
          >
            ⇄
          </button>
          <input
            type="text"
            value={converted}
            readOnly
            style={{
              fontSize: 20,
              padding: 10,
              borderRadius: 8,
              border: "none",
              outline: "none",
              width: 110,
              background: "#3e4377",
              color: "#fff",
            }}
          />
          <select
            value={to}
            style={{
              fontSize: 16,
              borderRadius: 7,
              padding: 7,
              background: "#3e4377",
              color: "#fff",
            }}
            onChange={(e) => setTo(e.target.value)}
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div
          style={{
            margin: "18px 0 10px",
            fontSize: 16,
            fontWeight: 600,
          }}
        >
          Wechselkurse (TRY-Basis)
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
            gap: 18,
          }}
        >
          {CURRENCIES.map((currency) => (
            <div
              key={currency.code}
              style={{
                background: "#4e509cbb",
                borderRadius: 16,
                padding: 22,
                minHeight: 120,
                position: "relative",
                boxShadow:
                  blink[currency.code] === "up"
                    ? "0 0 10px 2px #27ff78b5"
                    : blink[currency.code] === "down"
                    ? "0 0 10px 2px #e12828b5"
                    : "0 1px 9px 0 #2225",
                border:
                  blink[currency.code] === "up"
                    ? "2px solid #27ff78"
                    : blink[currency.code] === "down"
                    ? "2px solid #e12828"
                    : "2px solid transparent",
                transition: "box-shadow 0.6s, border 0.6s",
                color: "#fff",
                overflow: "hidden",
              }}
            >
              <div style={{ fontWeight: "bold", fontSize: 19, letterSpacing: 1 }}>
                {currency.code} <span style={{ fontWeight: 400 }}>{currency.name}</span>
              </div>
              <div style={{ fontSize: 28, margin: "12px 0 4px" }}>
                {rates[currency.code]
                  ? rates[currency.code].toLocaleString("de-DE", {
                      minimumFractionDigits: 4,
                      maximumFractionDigits: 6,
                    })
                  : "--"}
              </div>
              <div
                style={{
                  position: "absolute",
                  right: 12,
                  bottom: 12,
                  width: 70,
                  height: 28,
                  opacity: 0.65,
                }}
              >
                {history[currency.code] ? (
                  <MiniTrend values={history[currency.code]} />
                ) : null}
              </div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 13, color: "#bbb", marginTop: 24 }}>
          Letztes Update: {new Date().toLocaleTimeString("de-DE")}
          <span style={{ float: "right" }}>
            powered by <a href="https://exchangerate.host" target="_blank" rel="noreferrer" style={{ color: "#bbb" }}>exchangerate.host</a>
          </span>
        </div>
      </div>
    </div>
  );
}
