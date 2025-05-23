import React, { useEffect, useRef, useState } from "react";

// Sprachdaten mit Flaggen
const LANGUAGES = [
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "tr", label: "Türkçe", flag: "🇹🇷" },
];

// Währungen & Flaggen
const CURRENCIES = [
  { code: "USD", name: { de: "US-Dollar", en: "US Dollar", tr: "ABD Doları" }, flag: "🇺🇸" },
  { code: "EUR", name: { de: "Euro", en: "Euro", tr: "Euro" }, flag: "🇪🇺" },
  { code: "GBP", name: { de: "Pfund Sterling", en: "Pound Sterling", tr: "İngiliz Sterlini" }, flag: "🇬🇧" },
  { code: "CHF", name: { de: "Schweizer Franken", en: "Swiss Franc", tr: "İsviçre Frangı" }, flag: "🇨🇭" },
  { code: "JPY", name: { de: "Japanischer Yen", en: "Japanese Yen", tr: "Japon Yeni" }, flag: "🇯🇵" },
  { code: "TRY", name: { de: "Türkische Lira", en: "Turkish Lira", tr: "Türk Lirası" }, flag: "🇹🇷" },
];

const APP_ID = "c8a594d6cc68451e8734188995aa419e";
const BASES = ["TRY", "EUR", "USD"];

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
    favorites: "Favoriten",
    search: "Suche Währung",
    exportCSV: "Export als CSV",
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
    favorites: "Favorites",
    search: "Search currency",
    exportCSV: "Export as CSV",
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
    favorites: "Favoriler",
    search: "Para birimi ara",
    exportCSV: "CSV olarak indir",
  },
};

const formatRate = (rate: number) => (rate >= 10 ? rate.toFixed(3) : rate.toFixed(4));

function MiniChart({ values, dark }: { values: number[]; dark: boolean }) {
  if (!values || values.length < 2) return null;
  const w = 66,
    h = 22,
    pad = 3;
  const min = Math.min(...values),
    max = Math.max(...values);
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
    <svg width={w} height={h} aria-hidden="true" focusable="false">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth={2.1}
        points={points.map((p) => p.join(",")).join(" ")}
      />
    </svg>
  );
}

export default function Home() {
  const [lang, setLang] = useState<"de" | "en" | "tr">("de");
  const t = TRANSLATIONS[lang];
  const [dark, setDark] = useState(() => {
    // Auto dark mode by time
    const hour = new Date().getHours();
    return hour >= 18 || hour < 7;
  });
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

  // Favoriten aus localStorage laden
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("haremfx_favorites");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Suche State
  const [searchTerm, setSearchTerm] = useState("");

  // Mobile-Check für responsive Design
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 600);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Kurse laden mit Auto-Update alle 2 Sekunden
  useEffect(() => {
    let isMounted = true;

    async function fetchRates() {
      setIsLoading(true);
      let url = `https://openexchangerates.org/api/latest.json?app_id=${APP_ID}`;
      if (date !== today) {
        url = `https://openexchangerates.org/api/historical/${date}.json?app_id=${APP_ID}`;
      }
      try {
        const res = await fetch(url);
        const data = await res.json();
        if (!isMounted) return;
        if (!data.rates) throw new Error("No rates");
        const r = data.rates;
        const newRates: { [key: string]: number } = {};
        CURRENCIES.forEach((c) => {
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
        setHistory((h) =>
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
              setBlink((b) => ({ ...b, [code]: null }));
            }, 1100);
          }
        });
      } catch (e) {
        console.error("Fetch error:", e);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchRates();
    const interval = setInterval(fetchRates, 2000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [base, date, prevRates, today]);

  // Berechnung des Converters (korrekt rum)
  useEffect(() => {
    if (!rates[from] || !rates[to]) {
      setToValue("");
      return;
    }
    const fromRate = rates[from];
    const toRate = rates[to];
    const fVal = parseFloat(fromValue.replace(",", "."));
    if (isNaN(fVal)) {
      setToValue("");
      return;
    }
    // Umrechnung korrekt: (Basis / von) * zu * eingabewert
    const result = (base === from ? 1 : base === to ? fVal : (fVal * toRate) / fromRate);
    if (from === to) {
      setToValue(fromValue);
    } else {
      // Berechne richtig rum:
      const converted = (fVal / fromRate) * toRate;
      setToValue(converted.toFixed(4));
    }
  }, [fromValue, from, to, rates, base]);

  // Swap Währungen
  function swap() {
    setFrom(to);
    setTo(from);
    setFromValue(toValue || "1");
  }

  // Favoriten speichern
  function toggleFavorite(code: string) {
    let newFavs;
    if (favorites.includes(code)) {
      newFavs = favorites.filter((c) => c !== code);
    } else {
      newFavs = [...favorites, code];
    }
    setFavorites(newFavs);
    try {
      localStorage.setItem("haremfx_favorites", JSON.stringify(newFavs));
    } catch {}
  }

  // CSV Export
  function exportCSV() {
    const header = ["Währung", "Kurs"];
    const rows = CURRENCIES.filter((c) => rates[c.code] !== undefined).map((c) => [
      c.code,
      formatRate(rates[c.code]),
    ]);
    let csvContent =
      "data:text/csv;charset=utf-8," +
      [header, ...rows].map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "haremfx_kurse.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Copy to Clipboard
  function copyRate(code: string, rate: number) {
    const msg = `1 ${code} = ${formatRate(rate)} ${base}`;
    navigator.clipboard.writeText(msg);
  }

  // Vollbild-API
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

  // Farben je nach Darkmode
  const bg = dark
    ? "radial-gradient(ellipse at 70% 0,#232141 0,#28246b 70%,#141228 100%)"
    : "radial-gradient(ellipse at 80% 0,#f1f1ff 0,#e0e0ff 80%,#f7f9fc 100%)";
  const box = dark ? "rgba(41,41,75,0.85)" : "rgba(255,255,255,0.98)";
  const card = dark
    ? "linear-gradient(140deg,#444067 60%,#7266d3 100%)"
    : "linear-gradient(140deg,#dedbf6 60%,#ece8fa 100%)";
  const color = dark ? "#fff" : "#2d2d53";
  const subcolor = dark ? "#cfc8f3" : "#665db9";

  // Filter Währungen nach Suche und Favoriten
  const filteredCurrencies = CURRENCIES.filter((c) =>
    c.name[lang].toLowerCase().includes(searchTerm.toLowerCase())
  );
  const favoriteCurrencies = filteredCurrencies.filter((c) => favorites.includes(c.code));
  const otherCurrencies = filteredCurrencies.filter((c) => !favorites.includes(c.code));

  return (
    <>
      <div
        ref={rootRef}
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
        <div
          style={{
            background: box,
            boxShadow: "0 10px 40px 0 rgba(44,32,110,0.16)",
            borderRadius: 32,
            maxWidth: isMobile ? "100vw" : 850,
            width: "99vw",
            padding: isMobile ? "12px 8px 20px 8px" : "34px 34px 28px 34px",
            marginTop: isMobile ? 10 : 30,
            marginBottom: isMobile ? 18 : 36,
            backdropFilter: "blur(9px)",
            border: dark
              ? "1.5px solid rgba(144, 135, 234, 0.11)"
              : "1.5px solid #eceafe",
            transition: "background .3s,border .3s",
            color,
          }}
        >
          {/* Toolbar */}
          <div
            style={{
              display: "flex",
              gap: 12,
              alignItems: "center",
              marginBottom: -8,
              flexWrap: isMobile ? "wrap" : "nowrap",
            }}
          >
            {/* Sprache mit Flaggen */}
            {LANGUAGES.map(({ code, flag }) => (
              <button
                key={code}
                onClick={() => setLang(code as "de" | "en" | "tr")}
                aria-label={`Sprache ${code.toUpperCase()}`}
                style={{
                  background: lang === code ? "#6865ff" : "rgba(225,225,245,0.13)",
                  color: dark ? "#fff" : "#312e67",
                  border: "none",
                  padding: "6px 14px",
                  borderRadius: 12,
                  fontWeight: 600,
                  fontSize: isMobile ? 14 : 16,
                  cursor: "pointer",
                  outline: "none",
                  letterSpacing: 1,
                  boxShadow: lang === code ? "0 2px 10px #7c7cff40" : undefined,
                  transition: "background .22s",
                }}
                title={`${flag} ${code.toUpperCase()}`}
              >
                <span style={{ marginRight: 6 }}>{flag}</span> {code.toUpperCase()}
              </button>
            ))}

            {/* Darkmode */}
            <button
              onClick={() => setDark((d) => !d)}
              title={t.mode}
              style={{
                marginLeft: isMobile ? 6 : 10,
                background: dark ? "#36337c" : "#e7e3ff",
                color: dark ? "#fff" : "#392a7c",
                border: "none",
                padding: isMobile ? "5px 14px" : "6px 17px",
                borderRadius: 11,
                fontWeight: 600,
                fontSize: isMobile ? 14 : 16,
                cursor: "pointer",
                outline: "none",
                letterSpacing: 1,
                boxShadow: dark ? "0 2px 9px #222" : undefined,
                transition: "background .23s",
              }}
            >
              {dark ? "🌙" : "☀️"}
            </button>

            {/* Vollbild */}
            <button
              onClick={isFull ? exitFullscreen : enterFullscreen}
              title={isFull ? t.exitFullscreen : t.fullscreen}
              style={{
                marginLeft: isMobile ? 6 : 7,
                background: dark ? "#29295f" : "#e3e1fb",
                color: dark ? "#fff" : "#2d2d53",
                border: "none",
                padding: isMobile ? "4px 12px" : "6px 14px",
                borderRadius: 11,
                fontWeight: 600,
                fontSize: isMobile ? 14 : 16,
                cursor: "pointer",
                outline: "none",
                letterSpacing: 1,
                boxShadow: dark ? "0 2px 8px #111" : undefined,
                transition: "background .21s",
              }}
            >
              {isFull ? "🡸" : "⛶"}
            </button>

            {/* Basis-Währung */}
            <span
              style={{
                marginLeft: isMobile ? 10 : 17,
                color: dark ? "#cfc8f3" : "#665db9",
                fontSize: isMobile ? 14 : 15,
                fontWeight: 600,
              }}
            >
              {t.base}:
            </span>
            {BASES.map((b) => (
              <button
                key={b}
                onClick={() => setBase(b)}
                aria-label={`Basiswährung ${b}`}
                style={{
                  background: base === b ? "#40eea7" : "rgba(220,230,235,0.15)",
                  color: base === b ? "#212" : dark ? "#cfc8f3" : "#665db9",
                  border: "none",
                  padding: isMobile ? "5px 11px" : "5px 13px",
                  borderRadius: 8,
                  fontWeight: 600,
                  fontSize: isMobile ? 14 : 15,
                  cursor: "pointer",
                  marginLeft: 3,
                  boxShadow: base === b ? "0 2px 7px #31ffc86b" : undefined,
                  transition: "background .16s",
                }}
              >
                {b}
              </button>
            ))}

            {/* Export CSV */}
            <button
              onClick={exportCSV}
              aria-label="Exportiere Kurse als CSV"
              style={{
                marginLeft: "auto",
                background: dark ? "#5755a8" : "#c4c1fa",
                color: dark ? "#eee" : "#312e67",
                border: "none",
                padding: isMobile ? "5px 11px" : "6px 14px",
                borderRadius: 10,
                fontWeight: 600,
                fontSize: isMobile ? 14 : 16,
                cursor: "pointer",
                outline: "none",
                letterSpacing: 1,
                boxShadow: dark ? "0 2px 9px #222" : undefined,
                transition: "background .22s",
              }}
            >
              {t.exportCSV}
            </button>
          </div>

          {/* Überschrift */}
          <div
            style={{
              marginBottom: 22,
              marginTop: 7,
              fontSize: isMobile ? 24 : 32,
              fontWeight: 700,
              letterSpacing: 1.2,
              color,
              textShadow: dark ? "0 2px 8px #3d2f7433" : undefined,
            }}
          >
            {t.appName}
            <span
              style={{
                fontSize: isMobile ? 14 : 21,
                color: dark ? "#cfc8f3" : "#665db9",
                marginLeft: 15,
                letterSpacing: 1,
                fontWeight: 400,
              }}
            >
              {" "}
              – {t.subtitle}
            </span>
          </div>

          {/* Währungsrechner */}
          <div
            style={{
              background: card,
              borderRadius: 15,
              boxShadow: "0 2px 13px 0 rgba(62,56,110,0.06)",
              padding: isMobile ? "12px 12px 12px 12px" : "14px 15px 12px 15px",
              marginBottom: 28,
              color,
            }}
          >
            <div
              style={{
                fontSize: isMobile ? 16 : 17,
                fontWeight: 600,
                marginBottom: 10,
                letterSpacing: 0.5,
              }}
            >
              {t.calculator}
            </div>

            {/* Suche + Favoriten */}
            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                marginBottom: 8,
                alignItems: "center",
              }}
            >
              <input
                type="text"
                placeholder={t.search}
                aria-label={t.search}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  flexGrow: 1,
                  padding: 8,
                  fontSize: isMobile ? 14 : 15,
                  borderRadius: 8,
                  border: `1px solid ${dark ? "#373764" : "#dedbf9"}`,
                  background: dark ? "#232350" : "#efeefe",
                  color: dark ? "#fff" : "#23205a",
                  outline: "none",
                }}
              />
              <div
                style={{
                  fontWeight: 600,
                  fontSize: isMobile ? 14 : 15,
                  color: dark ? "#cfc8f3" : "#665db9",
                  cursor: "default",
                  userSelect: "none",
                  whiteSpace: "nowrap",
                }}
              >
                {t.favorites}
              </div>
            </div>

            {/* Converter Inputs */}
            <div
              style={{
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <div style={{ flex: 1, minWidth: 140 }}>
                <input
                  type="number"
                  min={0}
                  value={fromValue}
                  onChange={(e) => setFromValue(e.target.value)}
                  aria-label={t.from}
                  style={{
                    width: "100%",
                    padding: 9,
                    fontSize: isMobile ? 16 : 17,
                    borderRadius: 8,
                    border: dark ? "1px solid #373764" : "1px solid #dedbf9",
                    background: dark ? "#232350" : "#efeefe",
                    color: dark ? "#fff" : "#23205a",
                    outline: "none",
                  }}
                />
                <select
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  aria-label={t.from}
                  style={{
                    width: "100%",
                    padding: 7,
                    fontSize: isMobile ? 14 : 15,
                    borderRadius: 7,
                    border: dark ? "1px solid #393965" : "1px solid #d2cefb",
                    background: dark ? "#2c2c4d" : "#f9f8ff",
                    color: dark ? "#eee" : "#29296c",
                    outline: "none",
                    cursor: "pointer",
                  }}
                >
                  {favoriteCurrencies.length > 0 &&
                    favoriteCurrencies.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.name[lang]}
                      </option>
                    ))}
                  {otherCurrencies.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.name[lang]}
                    </option>
                  ))}
                </select>
              </div>

              {/* Swap Button */}
              <div
                onClick={swap}
                title="Währungen tauschen"
                style={{
                  alignSelf: "center",
                  margin: "0 7px",
                  background: "#5e5cd2",
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  boxShadow: "0 2px 9px #35357a2d",
                  border: "2px solid #e8e3fe",
                  transition: "transform 0.2s",
                  color: "#fff",
                  fontWeight: "700",
                  fontSize: 21,
                  userSelect: "none",
                }}
              >
                ⇅
              </div>

              <div style={{ flex: 1, minWidth: 140 }}>
                <input
                  type="number"
                  min={0}
                  value={toValue}
                  readOnly
                  aria-label={t.to}
                  style={{
                    width: "100%",
                    padding: 9,
                    fontSize: isMobile ? 16 : 17,
                    borderRadius: 8,
                    border: dark ? "1px solid #373764" : "1px solid #dedbf9",
                    background: dark ? "#202040" : "#eaeaf7",
                    color: dark ? "#fff" : "#23205a",
                    outline: "none",
                  }}
                />
                <select
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  aria-label={t.to}
                  style={{
                    width: "100%",
                    padding: 7,
                    fontSize: isMobile ? 14 : 15,
                    borderRadius: 7,
                    border: dark ? "1px solid #393965" : "1px solid #d2cefb",
                    background: dark ? "#2c2c4d" : "#f9f8ff",
                    color: dark ? "#eee" : "#29296c",
                    outline: "none",
                    cursor: "pointer",
                  }}
                >
                  {favoriteCurrencies.length > 0 &&
                    favoriteCurrencies.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.name[lang]}
                      </option>
                    ))}
                  {otherCurrencies.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.name[lang]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Datum und Rate */}
            <div
              style={{
                display: "flex",
                gap: 8,
                marginTop: 7,
                alignItems: "center",
                flexWrap: "wrap",
                color: subcolor,
                fontSize: isMobile ? 12 : 13,
                letterSpacing: 0.4,
              }}
            >
              <div>
                <label htmlFor="datePicker">{t.rateDate}:</label>
                <input
                  id="datePicker"
                  type="date"
                  value={date}
                  max={today}
                  onChange={(e) => setDate(e.target.value)}
                  style={{
                    padding: 5,
                    borderRadius: 6,
                    border: `1px solid ${dark ? "#35315a" : "#cfc8f3"}`,
                    background: dark ? "#1e1d3e" : "#fcfcff",
                    fontSize: isMobile ? 12 : 13,
                    color: dark ? "#fff" : "#23205a",
                    marginLeft: 7,
                    outline: "none",
                  }}
                />
              </div>
              <div aria-live="polite" aria-atomic="true" style={{ marginLeft: 12 }}>
                {isLoading
                  ? t.loading
                  : `1 ${from} = ${rates[from] && rates[to]
                      ? ((1 / rates[from]) * rates[to]).toFixed(4)
                      : "--"} ${to}`}
              </div>
            </div>
          </div>

          {/* Wechselkurse Übersicht */}
          <div
            style={{
              marginBottom: 11,
              color: subcolor,
              fontSize: isMobile ? 15 : 17,
              fontWeight: 600,
              letterSpacing: 0.3,
            }}
          >
            {t.currencyRates} ({base}-Basis)
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit,minmax(180px,1fr))",
              gap: isMobile ? 11 : 21,
            }}
          >
            {[...favoriteCurrencies, ...otherCurrencies].map((currency) => (
              <div
                key={currency.code}
                style={{
                  background: card,
                  borderRadius: 14,
                  boxShadow: "0 4px 18px 0 rgba(67,54,133,0.08)",
                  padding: isMobile ? "12px 10px" : "15px 11px",
                  minHeight: isMobile ? 65 : 75,
                  position: "relative",
                  transition: "box-shadow 0.2s",
                  border:
                    blink[currency.code] === "up"
                      ? "2px solid #28e15c"
                      : blink[currency.code] === "down"
                      ? "2px solid #e12828"
                      : "2px solid transparent",
                  overflow: "visible",
                  color,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    fontWeight: 700,
                    fontSize: isMobile ? 16 : 18,
                    marginBottom: isMobile ? 2 : 3,
                  }}
                >
                  <span style={{ fontSize: isMobile ? 20 : 23, marginRight: 7 }}>
                    {currency.flag}
                  </span>
                  {currency.code}
                  <button
                    onClick={() => toggleFavorite(currency.code)}
                    aria-label={
                      favorites.includes(currency.code)
                        ? `Favorit entfernen: ${currency.code}`
                        : `Zu Favoriten hinzufügen: ${currency.code}`
                    }
                    style={{
                      marginLeft: "auto",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      fontSize: isMobile ? 20 : 22,
                      color: favorites.includes(currency.code) ? "#40eea7" : "#888",
                      userSelect: "none",
                    }}
                    title={
                      favorites.includes(currency.code)
                        ? "Favorit entfernen"
                        : "Zu Favoriten hinzufügen"
                    }
                  >
                    {favorites.includes(currency.code) ? "★" : "☆"}
                  </button>
                </div>
                <div
                  style={{
                    fontSize: isMobile ? 12 : 13,
                    color: subcolor,
                    marginBottom: isMobile ? 4 : 5,
                  }}
                >
                  {currency.name[lang]}
                </div>
                <div
                  style={{
                    fontSize: isMobile ? 16 : 19,
                    fontWeight: 600,
                    letterSpacing: 0.3,
                    minHeight: isMobile ? 20 : 21,
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    transition: "color 0.3s",
                  }}
                >
                  {rates[currency.code] ? formatRate(rates[currency.code]) : "--"}
                  <button
                    onClick={() => copyRate(currency.code, rates[currency.code])}
                    title={t.copy}
                    style={{
                      fontSize: isMobile ? 12 : 13,
                      background: dark ? "rgba(244,244,255,0.09)" : "#eceafe",
                      color: dark ? "#d5d3f9" : "#665db9",
                      border: "none",
                      borderRadius: 6,
                      marginLeft: 1,
                      cursor: "pointer",
                      padding: "2px 7px",
                    }}
                  >
                    📋
                  </button>
                </div>
                <div
                  style={{
                    position: "absolute",
                    right: 7,
                    bottom: 6,
                  }}
                >
                  <MiniChart values={history[currency.code] || []} dark={dark} />
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div
            style={{
              marginTop: 21,
              color: subcolor,
              fontSize: isMobile ? 12 : 14,
              letterSpacing: 0.5,
              display: "flex",
              justifyContent: "space-between",
              flexWrap: "wrap",
            }}
          >
            <span aria-live="polite" aria-atomic="true">
              {timestamp && (
                <>
                  {t.lastUpdate}: <span>{timestamp}</span>
                </>
              )}
            </span>
            <span style={{ opacity: 0.38, fontSize: isMobile ? 10 : 12 }}>
              {t.powered}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
