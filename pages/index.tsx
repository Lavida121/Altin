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
    metalsTab: "Edelmetalle",
    currenciesTab: "Währungen",
    gold: "Gold",
    silver: "Silber",
    price: "Preis",
    errorLoading: "Fehler beim Laden",
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
    metalsTab: "Metals",
    currenciesTab: "Currencies",
    gold: "Gold",
    silver: "Silver",
    price: "Price",
    errorLoading: "Error loading",
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
    metalsTab: "Metaller",
    currenciesTab: "Dövizler",
    gold: "Altın",
    silver: "Gümüş",
    price: "Fiyat",
    errorLoading: "Yükleme hatası",
  },
};

// Sprache + Flaggen für Auswahl
const LANG_FLAGS: { [key in keyof typeof TRANSLATIONS]: string } = {
  de: "🇩🇪",
  en: "🇬🇧",
  tr: "🇹🇷",
};

// Währungen + Flaggen
const CURRENCIES = [
  { code: "USD", name: { de: "US-Dollar", en: "US Dollar", tr: "ABD Doları" }, flag: "🇺🇸" }, // USA Flagge
  { code: "EUR", name: { de: "Euro", en: "Euro", tr: "Euro" }, flag: "🇪🇺" },
  { code: "GBP", name: { de: "Pfund Sterling", en: "Pound Sterling", tr: "İngiliz Sterlini" }, flag: "🇬🇧" },
  { code: "CHF", name: { de: "Schweizer Franken", en: "Swiss Franc", tr: "İsviçre Frangı" }, flag: "🇨🇭" },
  { code: "JPY", name: { de: "Japanischer Yen", en: "Japanese Yen", tr: "Japon Yeni" }, flag: "🇯🇵" },
  { code: "TRY", name: { de: "Türkische Lira", en: "Turkish Lira", tr: "Türk Lirası" }, flag: "🇹🇷" },
];

const APP_ID = "c8a594d6cc68451e8734188995aa419e";
const BASES = ["TRY", "EUR", "USD"];
const RAPIDAPI_KEY = "3946c9ebe3msh1ff9e0b58cbb0dcp13b2e0jsnfccd1719850f";

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
  const points = values.map((v, i) => [(i / (values.length - 1)) * (w - pad * 2) + pad, norm(v)]);
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
      <polyline fill="none" stroke={color} strokeWidth={2.1} points={points.map((p) => p.join(",")).join(" ")} />
    </svg>
  );
}

export default function Home() {
  const [lang, setLang] = useState<keyof typeof TRANSLATIONS>("de");
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

  // Tab State: Währungen oder Edelmetalle
  const [activeTab, setActiveTab] = useState<"currencies" | "metals">("currencies");

  // Gold & Silber State
  const [goldData, setGoldData] = useState<{ name: string; price: number; currency: string }[]>([]);
  const [loadingGold, setLoadingGold] = useState(false);
  const [errorGold, setErrorGold] = useState("");

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 600);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Copy rate to clipboard
  function copyRate(code: string, rate: number) {
    const msg = `1 ${code} = ${formatRate(rate)} ${base}`;
    navigator.clipboard.writeText(msg);
  }

  // Fullscreen functions
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

  // Fetch exchange rates
  async function fetchRates(dateStr?: string) {
    setIsLoading(true);
    let url = `https://openexchangerates.org/api/latest.json?app_id=${APP_ID}`;
    if (dateStr && dateStr !== today) {
      url = `https://openexchangerates.org/api/historical/${dateStr}.json?app_id=${APP_ID}`;
    }
    const res = await fetch(url);
    const data = await res.json();
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
    setTimestamp(data.timestamp ? new Date(data.timestamp * 1000).toLocaleTimeString() : "");
    setHistory((h) =>
      Object.fromEntries(
        Object.entries(newRates).map(([code, v]) => [code, [...(h[code] || []), v].slice(-24)])
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
    setIsLoading(false);
  }

  // Fetch gold prices from RapidAPI
  async function fetchGoldPrices() {
    setLoadingGold(true);
    setErrorGold("");
    try {
      const response = await fetch("https://harem-altin-live-gold-price-data.p.rapidapi.com/harem_altin/prices", {
        method: "GET",
        headers: {
          "X-RapidAPI-Key": RAPIDAPI_KEY,
          "X-RapidAPI-Host": "harem-altin-live-gold-price-data.p.rapidapi.com",
        },
      });
      const data = await response.json();

      if (!data.rates || !data.base) throw new Error("Invalid API response");

      const items = [
        { name: t.gold, price: data.rates.XAU, currency: data.base },
        { name: t.silver, price: data.rates.XAG, currency: data.base },
      ];
      setGoldData(items);
    } catch (error) {
      setErrorGold(t.errorLoading);
    } finally {
      setLoadingGold(false);
    }
  }

  // Load data
  useEffect(() => {
    fetchRates(date);
    fetchGoldPrices();
    const interval = setInterval(() => {
      fetchRates(date);
      if (activeTab === "metals") fetchGoldPrices();
    }, 2000);
    return () => clearInterval(interval);
  }, [date, base, activeTab]);

  // Calculate conversion result
  useEffect(() => {
    if (!rates[from] || !rates[to]) {
      setToValue("");
      return;
    }
    const result = rates[from] / rates[to];
    const fVal = parseFloat(fromValue.replace(",", "."));
    if (isNaN(fVal)) setToValue("");
    else setToValue((fVal * result).toFixed(4));
  }, [fromValue, from, to, rates]);

  // Swap currencies
  function swap() {
    setFrom(to);
    setTo(from);
    setFromValue(toValue || "1");
  }

  // Styling vars
  const bg = dark
    ? "radial-gradient(ellipse at 70% 0,#232141 0,#28246b 70%,#141228 100%)"
    : "radial-gradient(ellipse at 80% 0,#f1f1ff 0,#e0e0ff 80%,#f7f9fc 100%)";
  const box = dark ? "rgba(41,41,75,0.85)" : "rgba(255,255,255,0.98)";
  const card = dark
    ? "linear-gradient(140deg,#444067 60%,#7266d3 100%)"
    : "linear-gradient(140deg,#dedbf6 60%,#ece8fa 100%)";
  const color = dark ? "#fff" : "#2d2d53";
  const subcolor = dark ? "#cfc8f3" : "#665db9";

  return (
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
          borderRadius: isMobile ? 14 : 32,
          maxWidth: isMobile ? "100vw" : 850,
          width: "99vw",
          padding: isMobile ? "12px 4px 20px 4px" : "34px 34px 28px 34px",
          marginTop: isMobile ? 10 : 30,
          marginBottom: isMobile ? 18 : 36,
          backdropFilter: "blur(9px)",
          border: dark ? "1.5px solid rgba(144, 135, 234, 0.11)" : "1.5px solid #eceafe",
          transition: "background .3s,border .3s",
          color,
        }}
      >
        {/* Toolbar mit Tabs und Sprachen */}
        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            marginBottom: 16,
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          {/* Tabs */}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => setActiveTab("currencies")}
              style={{
                background: activeTab === "currencies" ? "#6865ff" : "rgba(225,225,245,0.13)",
                color: dark ? "#fff" : "#312e67",
                border: "none",
                padding: "6px 16px",
                borderRadius: 12,
                fontWeight: 600,
                fontSize: 16,
                cursor: "pointer",
                outline: "none",
                letterSpacing: 1,
                boxShadow: activeTab === "currencies" ? "0 2px 10px #7c7cff40" : undefined,
                transition: "background .22s",
              }}
              aria-label={t.currenciesTab}
            >
              {t.currenciesTab}
            </button>
            <button
              onClick={() => setActiveTab("metals")}
              style={{
                background: activeTab === "metals" ? "#6865ff" : "rgba(225,225,245,0.13)",
                color: dark ? "#fff" : "#312e67",
                border: "none",
                padding: "6px 16px",
                borderRadius: 12,
                fontWeight: 600,
                fontSize: 16,
                cursor: "pointer",
                outline: "none",
                letterSpacing: 1,
                boxShadow: activeTab === "metals" ? "0 2px 10px #7c7cff40" : undefined,
                transition: "background .22s",
              }}
              aria-label={t.metalsTab}
            >
              {t.metalsTab}
            </button>
          </div>

          {/* Sprachen */}
          {(Object.keys(LANG_FLAGS) as (keyof typeof LANG_FLAGS)[]).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              style={{
                background: lang === l ? "#6865ff" : "rgba(225,225,245,0.13)",
                color: dark ? "#fff" : "#312e67",
                border: "none",
                padding: "6px 16px",
                borderRadius: 12,
                fontWeight: 600,
                fontSize: 16,
                cursor: "pointer",
                outline: "none",
                letterSpacing: 1,
                boxShadow: lang === l ? "0 2px 10px #7c7cff40" : undefined,
                transition: "background .22s",
              }}
              aria-label={`Sprache ${l.toUpperCase()}`}
            >
              {LANG_FLAGS[l]}
            </button>
          ))}

          {/* Darkmode */}
          <button
            onClick={() => setDark((d) => !d)}
            title={t.mode}
            style={{
              marginLeft: 10,
              background: dark ? "#36337c" : "#e7e3ff",
              color: dark ? "#fff" : "#392a7c",
              border: "none",
              padding: "6px 17px",
              borderRadius: 11,
              fontWeight: 600,
              fontSize: 16,
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
              marginLeft: 7,
              background: dark ? "#29295f" : "#e3e1fb",
              color: dark ? "#fff" : "#2d2d53",
              border: "none",
              padding: "6px 14px",
              borderRadius: 11,
              fontWeight: 600,
              fontSize: 16,
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
              marginLeft: 17,
              color: subcolor,
              fontSize: 15,
              fontWeight: 600,
            }}
          >
            {t.base}:
          </span>
          {BASES.map((b) => (
            <button
              key={b}
              onClick={() => setBase(b)}
              style={{
                background: base === b ? "#40eea7" : "rgba(220,230,235,0.15)",
                color: base === b ? "#212" : subcolor,
                border: "none",
                padding: "5px 13px",
                borderRadius: 8,
                fontWeight: 600,
                fontSize: 15,
                cursor: "pointer",
                marginLeft: 3,
                boxShadow: base === b ? "0 2px 7px #31ffc86b" : undefined,
                transition: "background .16s",
              }}
              aria-label={`Basiswährung ${b}`}
            >
              {b}
            </button>
          ))}
        </div>

        {/* Überschrift */}
        <div
          style={{
            marginBottom: 22,
            marginTop: 7,
            fontSize: 32,
            fontWeight: 700,
            letterSpacing: 1.2,
            color,
            textShadow: dark ? "0 2px 8px #3d2f7433" : undefined,
          }}
        >
          {t.appName}
          <span
            style={{
              fontSize: 21,
              color: subcolor,
              marginLeft: 15,
              letterSpacing: 1,
              fontWeight: 400,
            }}
          >
            – {t.subtitle}
          </span>
        </div>

        {/* Inhalte je nach aktivem Tab */}
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          {activeTab === "currencies" && (
            <div
              style={{
                flex: 1,
                minWidth: 320,
                background: card,
                borderRadius: 15,
                boxShadow: "0 2px 13px 0 rgba(62,56,110,0.06)",
                padding: "14px 15px 12px 15px",
                color,
              }}
            >
              {/* Währungsrechner */}
              <div
                style={{
                  fontSize: 17,
                  fontWeight: 600,
                  marginBottom: 10,
                  letterSpacing: 0.5,
                }}
              >
                {t.calculator}
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {/* Von */}
                <div style={{ flex: 1, minWidth: 160 }}>
                  <input
                    type="number"
                    min={0}
                    value={fromValue}
                    onChange={(e) => setFromValue(e.target.value)}
                    aria-label={t.from}
                    style={{
                      width: "100%",
                      padding: "9px 9px",
                      fontSize: 17,
                      borderRadius: 8,
                      border: dark ? "1px solid #373764" : "1px solid #dedbf9",
                      marginBottom: 5,
                      outline: "none",
                      background: dark ? "#232350" : "#efeefe",
                      color: dark ? "#fff" : "#23205a",
                    }}
                  />
                  <select
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    aria-label={t.from}
                    style={{
                      width: "100%",
                      padding: "7px 9px",
                      fontSize: 17,
                      borderRadius: 8,
                      border: dark ? "1px solid #373764" : "1px solid #dedbf9",
                      background: dark ? "#232350" : "#efeefe",
                      color: dark ? "#fff" : "#23205a",
                      outline: "none",
                    }}
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.name[lang]}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tauschen Button */}
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
                    color: "white",
                    fontWeight: 700,
                    fontSize: 21,
                    userSelect: "none",
                  }}
                >
                  ⇅
                </div>

                {/* Nach */}
                <div style={{ flex: 1, minWidth: 160 }}>
                  <input
                    type="number"
                    min={0}
                    value={toValue}
                    readOnly
                    aria-label={t.to}
                    style={{
                      width: "100%",
                      padding: "9px 9px",
                      fontSize: 17,
                      borderRadius: 8,
                      border: dark ? "1px solid #373764" : "1px solid #dedbf9",
                      marginBottom: 5,
                      outline: "none",
                      background: dark ? "#202040" : "#eaeaf7",
                      color: dark ? "#fff" : "#23205a",
                    }}
                  />
                  <select
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    aria-label={t.to}
                    style={{
                      width: "100%",
                      padding: "7px 9px",
                      fontSize: 17,
                      borderRadius: 8,
                      border: dark ? "1px solid #373764" : "1px solid #dedbf9",
                      background: dark ? "#202040" : "#eaeaf7",
                      color: dark ? "#fff" : "#23205a",
                      outline: "none",
                    }}
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.name[lang]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Datum und Kursanzeige */}
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  marginTop: 7,
                  alignItems: "center",
                  flexWrap: "wrap",
                  color: subcolor,
                  fontSize: 13,
                  letterSpacing: 0.4,
                }}
              >
                <div>
                  <label>{t.rateDate}:</label>
                  <input
                    type="date"
                    value={date}
                    max={today}
                    onChange={(e) => setDate(e.target.value)}
                    style={{
                      padding: "5px 7px",
                      borderRadius: 6,
                      border: dark ? "1px solid #35315a" : "1px solid #cfc8f3",
                      background: dark ? "#1e1d3e" : "#fcfcff",
                      fontSize: 13,
                      color: dark ? "#fff" : "#23205a",
                      marginLeft: 7,
                    }}
                  />
                </div>
                <div>
                  {isLoading
                    ? t.loading
                    : `1 ${from} = ${formatRate(rates[from] / rates[to])} ${to}`}
                </div>
              </div>

              {/* Wechselkurse Übersicht */}
              <div
                style={{
                  color: subcolor,
                  fontSize: isMobile ? 15 : 17,
                  fontWeight: 600,
                  letterSpacing: 0.3,
                  marginTop: 20,
                  marginBottom: isMobile ? 14 : 11,
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
                {CURRENCIES.map((currency) => (
                  <div
                    key={currency.code}
                    style={{
                      background: card,
                      borderRadius: 14,
                      boxShadow: "0 4px 18px 0 rgba(67,54,133,0.08)",
                      padding: "15px 11px 11px 11px",
                      minHeight: 75,
                      position: "relative",
                      transition: "box-shadow 0.2s",
                      overflow: "visible",
                      color,
                      border:
                        blink[currency.code] === "up"
                          ? "2px solid #28e15c"
                          : blink[currency.code] === "down"
                          ? "2px solid #e12828"
                          : "2px solid transparent",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        fontWeight: 700,
                        fontSize: isMobile ? 16 : 18,
                        marginBottom: 3,
                      }}
                    >
                      <span
                        style={{
                          fontSize: isMobile ? 20 : 23,
                          marginRight: 7,
                        }}
                      >
                        {currency.flag}
                      </span>
                      {currency.code}
                    </div>
                    <div
                      style={{
                        fontSize: isMobile ? 12 : 13,
                        color: subcolor,
                        marginBottom: isMobile ? 3 : 5,
                      }}
                    >
                      {currency.name[lang]}
                    </div>
                    <div
                      style={{
                        fontSize: isMobile ? 16 : 19,
                        fontWeight: 600,
                        letterSpacing: 0.3,
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        minHeight: 21,
                        transition: "color 0.3s",
                        marginBottom: 2,
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
            </div>
          )}

          {activeTab === "metals" && (
            <div
              style={{
                flex: 1,
                minWidth: 320,
                background: card,
                borderRadius: 15,
                boxShadow: "0 2px 13px 0 rgba(62,56,110,0.06)",
                padding: 20,
                color,
                minHeight: 200,
              }}
            >
              <div
                style={{
                  fontSize: 17,
                  fontWeight: 600,
                  marginBottom: 15,
                  letterSpacing: 0.5,
                }}
              >
                {t.metalsTab}
              </div>
              {loadingGold ? (
                <div>{t.loading}</div>
              ) : errorGold ? (
                <div>{errorGold}</div>
              ) : (
                goldData.map((item) => (
                  <div
                    key={item.name}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "10px 15px",
                      fontSize: 16,
                      borderBottom: "1px solid rgba(0,0,0,0.1)",
                    }}
                  >
                    <div>{item.name}</div>
                    <div>
                      {item.price} {item.currency}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            marginTop: 21,
            color: subcolor,
            fontSize: 14,
            letterSpacing: 0.5,
            display: "flex",
            justifyContent: "space-between",
          }}
        >
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
  );
}
