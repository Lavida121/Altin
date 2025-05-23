import React, { useEffect, useRef, useState } from "react";

// Sprachdaten
const TRANSLATIONS = {
  de: {
    appName: "HaremFX",
    subtitle: "Wechselkurse & Währungsrechner",
    calculator: "Währungsrechner",
    rateDate: "Kursdatum",
    loading: "Lade Kurse...",
    currencyRates: "Wechselkurse",
    lastUpdate: "Letztes Update",
    powered: "powered by Etto",
    from: "Von",
    to: "Nach",
    copy: "Kurs kopieren",
    mode: "Modus",
    fullscreen: "Vollbild",
    exitFullscreen: "Vollbild verlassen",
    base: "Basis",
  },
  en: {
    appName: "HaremFX",
    subtitle: "Exchange Rates & Currency Converter",
    calculator: "Currency Converter",
    rateDate: "Rate date",
    loading: "Loading rates...",
    currencyRates: "Exchange Rates",
    lastUpdate: "Last update",
    powered: "powered by Etto",
    from: "From",
    to: "To",
    copy: "Copy rate",
    mode: "Mode",
    fullscreen: "Fullscreen",
    exitFullscreen: "Exit fullscreen",
    base: "Base",
  },
  tr: {
    appName: "HaremFX",
    subtitle: "Döviz Kurları & Para Çevirici",
    calculator: "Döviz Çevirici",
    rateDate: "Kur tarihi",
    loading: "Kurlar yükleniyor...",
    currencyRates: "Döviz Kurları",
    lastUpdate: "Son güncelleme",
    powered: "openexchangerates.org tarafından",
    from: "Kaynak",
    to: "Hedef",
    copy: "Kuru kopyala",
    mode: "Mod",
    fullscreen: "Tam Ekran",
    exitFullscreen: "Tam Ekrandan Çık",
    base: "Baz",
  },
};

// Flaggen für Sprachauswahl
const LANG_FLAGS: { [key: string]: string } = {
  de: "🇩🇪",
  en: "🇬🇧",
  tr: "🇹🇷",
};

// Währungen & Flaggen
const CURRENCIES = [
  { code: "USD", name: { de: "US-Dollar", en: "US Dollar", tr: "ABD Doları" }, flag: "🇺🇸" },
  { code: "EUR", name: { de: "Euro", en: "Euro", tr: "Euro" }, flag: "🇪🇺" },
  { code: "GBP", name: { de: "Pfund Sterling", en: "Pound Sterling", tr: "İngiliz Sterlini" }, flag: "🇬🇧" },
  { code: "CHF", name: { de: "Schweizer Franken", en: "Swiss Franc", tr: "İsviçre Frangı" }, flag: "🇨🇭" },
  { code: "JPY", name: { de: "Japanischer Yen", en: "Japanese Yen", tr: "Japon Yeni" }, flag: "🇯🇵" },
  { code: "TRY", name: { de: "Türkische Lira", en: "Turkish Lira", tr: "Türk Lirası" }, flag: "🇹🇷" },
];

const APP_ID = "c8a594d6cc68451e8734188995aa419e"; // OpenExchangeRates Key
const BASES = ["TRY", "EUR", "USD"]; // Umschaltbare Basen

const formatRate = (rate: number) => (rate >= 10 ? rate.toFixed(3) : rate.toFixed(4));

function MiniChart({ values, dark }: { values: number[]; dark: boolean }) {
  if (!values || values.length < 2) return null;
  const w = 66, h = 22, pad = 3;
  const min = Math.min(...values), max = Math.max(...values);
  const range = max - min || 1;
  const norm = (v: number) => h - pad - ((v - min) / range) * (h - pad * 2);
  const points = values.map((v, i) => [
    (i / (values.length - 1)) * (w - pad * 2) + pad,
    norm(v),
  ]);
  const color =
    values[values.length - 1] > values[0]
      ? "#40ee85"
      : values[values.length - 1] < values[0]
      ? "#ee4040"
      : dark
      ? "#e2e2ee"
      : "#8b8bb3";
  return (
    <svg width={w} height={h}>
      <polyline
        fill="none"
        stroke={color}
        strokeWidth={2.1}
        points={points.map(p => p.join(",")).join(" ")}
      />
    </svg>
  );
}

export default function Home() {
  const [lang, setLang] = useState<"de" | "en" | "tr">("de");
  const t = TRANSLATIONS[lang];
  const [dark, setDark] = useState(true);
  const [isFull, setIsFull] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const [base, setBase] = useState("TRY");
  const [rates, setRates] = useState<{ [key: string]: number }>({});
  const [prevRates, setPrevRates] = useState<{ [key: string]: number }>({});
  const [blink, setBlink] = useState<{ [key: string]: "up" | "down" | null }>({});
  const [timestamp, setTimestamp] = useState<string>("");
  const [history, setHistory] = useState<{ [key: string]: number[] }>({});
  const blinkTimeouts = useRef<{ [key: string]: any }>({});
  const [from, setFrom] = useState("EUR");
  const [to, setTo] = useState("TRY");
  const [fromValue, setFromValue] = useState("1");
  const [toValue, setToValue] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [isLoading, setIsLoading] = useState(false);
  const today = new Date().toISOString().split("T")[0];

  // Mobile-Erkennung für Grid & Layout
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 600);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  function copyRate(code: string, rate: number) {
    const msg = `1 ${code} = ${formatRate(rate)} ${base}`;
    navigator.clipboard.writeText(msg);
  }

  function enterFullscreen() {
    if (rootRef.current?.requestFullscreen) {
      rootRef.current.requestFullscreen();
      setIsFull(true);
    }
  }
  function exitFullscreen() {
    if (document.exitFullscreen) {
      document.exitFullscreen();
      setIsFull(false);
    }
  }
  useEffect(() => {
    document.onfullscreenchange = () => {
      setIsFull(!!document.fullscreenElement);
    };
    return () => {
      document.onfullscreenchange = null;
    };
  }, []);

  async function fetchRates(dateStr?: string) {
    setIsLoading(true);
    let url = `https://openexchangerates.org/api/latest.json?app_id=${APP_ID}`;
    if (dateStr && dateStr !== new Date().toISOString().split("T")[0]) {
      url = `https://openexchangerates.org/api/historical/${dateStr}.json?app_id=${APP_ID}`;
    }
    const res = await fetch(url);
    const data = await res.json();
    const r = data.rates;
    const newRates: { [key: string]: number } = {};
    CURRENCIES.forEach(c => {
      newRates[c.code] = r[base] / r[c.code];
    });
    const newBlink: { [key: string]: "up" | "down" | null } = {};
    Object.entries(newRates).forEach(([code, value]) => {
      if (prevRates[code] !== undefined) {
        if (value > prevRates[code]) newBlink[code] = "up";
        else if (value < prevRates[code]) newBlink[code] = "down";
        else newBlink[code] = null;
      } else newBlink[code] = null;
    });
    setBlink(newBlink);
    setPrevRates(newRates);
    setRates(newRates);
    setTimestamp(
      data.timestamp ? new Date(data.timestamp * 1000).toLocaleTimeString() : ""
    );
    setHistory(h =>
      Object.fromEntries(
        Object.entries(newRates).map(([code, v]) => [
          code,
          [...(h[code] || []), v].slice(-24),
        ])
      )
    );
    Object.entries(newBlink).forEach(([code, dir]) => {
      if (dir) {
        if (blinkTimeouts.current[code]) clearTimeout(blinkTimeouts.current[code]);
        blinkTimeouts.current[code] = setTimeout(() => {
          setBlink(b => ({ ...b, [code]: null }));
        }, 1100);
      }
    });
    setIsLoading(false);
  }

  useEffect(() => {
    fetchRates(date);
    // eslint-disable-next-line
  }, [date, base]);

  useEffect(() => {
    if (!rates[from] || !rates[to]) {
      setToValue("");
      return;
    }
    const result = (1 / rates[from]) * rates[to];
    const fVal = parseFloat(fromValue.replace(",", "."));
    if (isNaN(fVal)) setToValue("");
    else setToValue((fVal * result).toFixed(4));
    // eslint-disable-next-line
  }, [fromValue, from, to, rates]);

  function swap() {
    setFrom(to);
    setTo(from);
    setFromValue(toValue || "1");
  }

  const bg = dark
    ? "radial-gradient(ellipse at 70% 0,#232141 0,#28246b 70%,#141228 100%)"
    : "radial-gradient(ellipse at 80% 0,#f1f1ff 0,#e0e0ff 80%,#f7f9fc 100%)";
  const box = dark
    ? "rgba(41,41,75,0.85)"
    : "rgba(255,255,255,0.98)";
  const card = dark
    ? "linear-gradient(140deg,#444067 60%,#7266d3 100%)"
    : "linear-gradient(140deg,#dedbf6 60%,#ece8fa 100%)";
  const color = dark ? "#fff" : "#2d2d53";
  const subcolor = dark ? "#cfc8f3" : "#665db9";

  return (
    <>
      <div
        ref={rootRef}
        className="container"
        style={{
          background: bg,
          minHeight: "100vh",
          fontFamily: "Inter,Segoe UI,Arial,sans-serif",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: 0,
          margin: 0,
          transition: "background .3s",
        }}
      >
        <div className="innerBox" style={{ background: box, color }}>
          {/* Toolbar */}
          <div className="toolbar">
            {(["de", "en", "tr"] as const).map(l => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={lang === l ? "active" : ""}
                aria-label={`Sprache ${l.toUpperCase()}`}
              >
                {LANG_FLAGS[l]}
              </button>
            ))}
            <button onClick={() => setDark(d => !d)} title={t.mode} className="darkToggle">
              {dark ? "🌙" : "☀️"}
            </button>
            <button
              onClick={isFull ? exitFullscreen : enterFullscreen}
              title={isFull ? t.exitFullscreen : t.fullscreen}
              className="fullscreenToggle"
            >
              {isFull ? "🡸" : "⛶"}
            </button>
            <span className="baseLabel">{t.base}:</span>
            {BASES.map(b => (
              <button
                key={b}
                onClick={() => setBase(b)}
                className={base === b ? "baseActive" : ""}
                aria-label={`Basiswährung ${b}`}
              >
                {b}
              </button>
            ))}
          </div>

          {/* Überschrift */}
          <div className="header">
            <span className="appName">{t.appName}</span>
            <span className="subtitle"> – {t.subtitle}</span>
          </div>

          {/* Währungsrechner */}
          <div className="converter">
            <div className="converterTitle">{t.calculator}</div>
            <div className="converterInputs">
              <div className="inputGroup">
                <input
                  type="number"
                  min={0}
                  value={fromValue}
                  onChange={e => setFromValue(e.target.value)}
                  aria-label={t.from}
                />
                <select
                  value={from}
                  onChange={e => setFrom(e.target.value)}
                  aria-label={t.from}
                >
                  {CURRENCIES.map(c => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.name[lang]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="swapBtn" onClick={swap} title="Währungen tauschen">
                ⇅
              </div>

              <div className="inputGroup">
                <input
                  type="number"
                  min={0}
                  value={toValue}
                  readOnly
                  aria-label={t.to}
                />
                <select
                  value={to}
                  onChange={e => setTo(e.target.value)}
                  aria-label={t.to}
                >
                  {CURRENCIES.map(c => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.name[lang]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="dateAndRate">
              <div>
                <label>{t.rateDate}:</label>
                <input
                  type="date"
                  value={date}
                  max={today}
                  onChange={e => setDate(e.target.value)}
                />
              </div>
              <div className="rateInfo">
                {isLoading
                  ? t.loading
                  : `1 ${from} = ${((1 / rates[from]) * rates[to]).toFixed(4)} ${to}`}
              </div>
            </div>
          </div>

          {/* Wechselkurse Übersicht mit Mini-Chart */}
          <div className="ratesTitle">
            {t.currencyRates} ({base}-Basis)
          </div>
          <div className="ratesGrid" style={{
            gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit,minmax(180px,1fr))",
            gap: isMobile ? 11 : 21,
          }}>
            {CURRENCIES.map(currency => (
              <div
                key={currency.code}
                className="rateCard"
                style={{
                  border:
                    blink[currency.code] === "up"
                      ? "2px solid #28e15c"
                      : blink[currency.code] === "down"
                      ? "2px solid #e12828"
                      : "2px solid transparent",
                }}
              >
                <div className="rateHeader">
                  <span className="flag">{currency.flag}</span>
                  {currency.code}
                </div>
                <div className="rateName">{currency.name[lang]}</div>
                <div className="rateValue">
                  {rates[currency.code] ? formatRate(rates[currency.code]) : "--"}
                  <button
                    onClick={() => copyRate(currency.code, rates[currency.code])}
                    title={t.copy}
                    className="copyBtn"
                  >
                    📋
                  </button>
                </div>
                <div className="miniChart">
                  <MiniChart values={history[currency.code] || []} dark={dark} />
                </div>
              </div>
            ))}
          </div>

          <div className="footer">
            <span>
              {timestamp && (
                <>
                  {t.lastUpdate}: <span>{timestamp}</span>
                </>
              )}
            </span>
            <span>{t.powered}</span>
          </div>
        </div>
      </div>

      {/* CSS als scoped styles */}
      <style jsx>{`
        .container {
          background: ${bg};
          min-height: 100vh;
          font-family: Inter, Segoe UI, Arial, sans-serif;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding: 0;
          margin: 0;
          transition: background 0.3s;
        }
        .innerBox {
          background: ${box};
          box-shadow: 0 10px 40px 0 rgba(44, 32, 110, 0.16);
          border-radius: 32px;
          max-width: 850px;
          width: 99vw;
          padding: 34px 34px 28px 34px;
          margin-top: 30px;
          margin-bottom: 36px;
          backdrop-filter: blur(9px);
          border: 1.5px solid ${dark ? "rgba(144, 135, 234, 0.11)" : "#eceafe"};
          color: ${color};
          transition: background 0.3s, border 0.3s;
        }
        .toolbar {
          display: flex;
          gap: 12px;
          align-items: center;
          margin-bottom: -8px;
        }
        .toolbar button {
          background: rgba(225, 225, 245, 0.13);
          color: ${dark ? "#fff" : "#312e67"};
          border: none;
          padding: 6px 16px;
          border-radius: 12px;
          font-weight: 600;
          font-size: 16px;
          cursor: pointer;
          outline: none;
          letter-spacing: 1px;
          box-shadow: none;
          transition: background 0.22s;
        }
        .toolbar button.active,
        .toolbar button:hover {
          background: #6865ff;
          box-shadow: 0 2px 10px #7c7cff40;
        }
        .darkToggle {
          margin-left: 10px;
          background: ${dark ? "#36337c" : "#e7e3ff"};
          color: ${dark ? "#fff" : "#392a7c"};
          border-radius: 11px;
          padding: 6px 17px;
          box-shadow: ${dark ? "0 2px 9px #222" : "none"};
        }
        .fullscreenToggle {
          margin-left: 7px;
          background: ${dark ? "#29295f" : "#e3e1fb"};
          color: ${dark ? "#fff" : "#2d2d53"};
          border-radius: 11px;
          padding: 6px 14px;
          box-shadow: ${dark ? "0 2px 8px #111" : "none"};
        }
        .baseLabel {
          margin-left: 17px;
          color: ${dark ? "#cfc8f3" : "#665db9"};
          font-size: 15px;
          font-weight: 600;
        }
        .toolbar button.baseActive {
          background: #40eea7;
          color: #212;
          box-shadow: 0 2px 7px #31ffc86b;
          padding: 5px 13px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 15px;
          margin-left: 3px;
        }
        .header {
          margin-bottom: 22px;
          margin-top: 7px;
          color: ${color};
        }
        .appName {
          font-size: 32px;
          font-weight: 700;
          letter-spacing: 1.2px;
          text-shadow: ${dark ? "0 2px 8px #3d2f7433" : "none"};
        }
        .subtitle {
          font-size: 21px;
          color: ${dark ? "#cfc8f3" : "#665db9"};
          margin-left: 15px;
          letter-spacing: 1px;
          font-weight: 400;
        }
        .converter {
          background: ${card};
          border-radius: 15px;
          box-shadow: 0 2px 13px 0 rgba(62, 56, 110, 0.06);
          padding: 14px 15px 12px 15px;
          margin-bottom: 28px;
          color: ${color};
        }
        .converterTitle {
          font-size: 17px;
          font-weight: 600;
          margin-bottom: 10px;
          letter-spacing: 0.5px;
        }
        .converterInputs {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        .inputGroup {
          flex: 1;
          min-width: 160px;
        }
        input[type="number"],
        select {
          width: 100%;
          border-radius: 8px;
          font-size: 17px;
          padding: 9px;
          border: 1px solid ${dark ? "#373764" : "#dedbf9"};
          margin-bottom: 5px;
          outline: none;
          background: ${dark ? "#232350" : "#efeefe"};
          color: ${dark ? "#fff" : "#23205a"};
          transition: border 0.2s;
        }
        input[type="number"][readonly] {
          background: ${dark ? "#202040" : "#eaeaf7"};
        }
        input[type="date"] {
          padding: 5px 7px;
          border-radius: 6px;
          border: 1px solid ${dark ? "#35315a" : "#cfc8f3"};
          background: ${dark ? "#1e1d3e" : "#fcfcff"};
          font-size: 13px;
          color: ${dark ? "#fff" : "#23205a"};
          margin-left: 7px;
        }
        .dateAndRate {
          display: flex;
          gap: 8px;
          margin-top: 7px;
          align-items: "center";
          flex-wrap: wrap;
          color: ${subcolor};
          font-size: 13px;
          letter-spacing: 0.4px;
        }
        label {
          font-size: 13px;
          color: ${subcolor};
        }
        .swapBtn {
          align-self: center;
          margin: 0 7px;
          background: #5e5cd2;
          width: 36px;
          height: 36px;
          border-radius: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 2px 9px #35357a2d;
          border: 2px solid #e8e3fe;
          transition: transform 0.2s;
          color: white;
          font-weight: 700;
          font-size: 21px;
          user-select: none;
        }
        .ratesTitle {
          margin-bottom: 11px;
          color: ${subcolor};
          font-size: 17px;
          font-weight: 600;
          letter-spacing: 0.3px;
        }
        .ratesGrid {
          display: grid;
        }
        .rateCard {
          background: ${card};
          border-radius: 14px;
          box-shadow: 0 4px 18px 0 rgba(67, 54, 133, 0.08);
          padding: 15px 11px 11px 11px;
          min-height: 75px;
          position: relative;
          transition: box-shadow 0.2s;
          overflow: visible;
          color: ${color};
        }
        .rateHeader {
          display: flex;
          align-items: center;
          font-weight: 700;
          font-size: 18px;
          margin-bottom: 3px;
        }
        .flag {
          font-size: 23px;
          margin-right: 7px;
        }
        .rateName {
          font-size: 13px;
          color: ${subcolor};
          margin-bottom: 5px;
        }
        .rateValue {
          font-size: 19px;
          font-weight: 600;
          letter-spacing: 0.3px;
          display: flex;
          align-items: center;
          gap: 5px;
          min-height: 21px;
          transition: color 0.3s;
          margin-bottom: 2px;
        }
        .copyBtn {
          font-size: 13px;
          background: ${dark ? "rgba(244,244,255,0.09)" : "#eceafe"};
          color: ${dark ? "#d5d3f9" : "#665db9"};
          border: none;
          border-radius: 6px;
          margin-left: 1px;
          cursor: pointer;
          padding: 2px 7px;
        }
        .miniChart {
          position: absolute;
          right: 7px;
          bottom: 6px;
        }
        .footer {
          margin-top: 21px;
          color: ${subcolor};
          font-size: 14px;
          letter-spacing: 0.5px;
          display: flex;
          justify-content: space-between;
        }
        .footer span:last-child {
          opacity: 0.38;
          font-size: 12px;
        }

        /* Mobile Styles */
        @media (max-width: 600px) {
          .innerBox {
            border-radius: 14px !important;
            max-width: 100vw !important;
            padding: 12px 4px 20px 4px !important;
            margin-top: 10px !important;
            margin-bottom: 18px !important;
          }
          .toolbar {
            flex-wrap: wrap;
            gap: 8px;
          }
          .toolbar button {
            font-size: 14px;
            padding: 5px 12px;
            border-radius: 10px;
          }
          .baseLabel {
            font-size: 14px;
          }
          .header {
            margin-bottom: 18px;
          }
          .appName {
            font-size: 28px;
          }
          .subtitle {
            font-size: 18px;
            margin-left: 10px;
          }
          .converterInputs {
            flex-direction: column;
          }
          .inputGroup {
            min-width: 100%;
          }
          .swapBtn {
            margin: 12px 0;
          }
          .ratesTitle {
            font-size: 15px;
            margin-bottom: 14px;
          }
          .rateCard {
            padding: 12px 10px;
            font-size: 14px;
            min-height: 65px;
          }
          .rateHeader {
            font-size: 16px;
          }
          .flag {
            font-size: 20px;
            margin-right: 5px;
          }
          .rateName {
            font-size: 12px;
            margin-bottom: 3px;
          }
          .rateValue {
            font-size: 16px;
          }
          .copyBtn {
            font-size: 12px;
            padding: 1px 6px;
          }
          .footer {
            font-size: 12px;
            margin-top: 16px;
          }
        }
      `}</style>
    </>
  );
}
