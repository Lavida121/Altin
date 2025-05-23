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
    favorites: "Favoriten",
    setAlert: "Alarm setzen",
    alertPlaceholder: "Kursalarm setzen...",
    alertSet: "Alarm aktiviert!",
    alertRemove: "Alarm entfernt!",
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
    setAlert: "Set alert",
    alertPlaceholder: "Set rate alert...",
    alertSet: "Alert activated!",
    alertRemove: "Alert removed!",
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
    setAlert: "Alarm kur",
    alertPlaceholder: "Kurs alarmı ayarla...",
    alertSet: "Alarm aktif!",
    alertRemove: "Alarm kaldırıldı!",
  },
};

// Währungen & Flaggen (EN Flagge für GBP)
const CURRENCIES = [
  { code: "USD", name: { de: "US-Dollar", en: "US Dollar", tr: "ABD Doları" }, flag: "🇺🇸" },
  { code: "EUR", name: { de: "Euro", en: "Euro", tr: "Euro" }, flag: "🇪🇺" },
  { code: "GBP", name: { de: "Pfund Sterling", en: "British Pound", tr: "İngiliz Sterlini" }, flag: "🇬🇧" },
  { code: "CHF", name: { de: "Schweizer Franken", en: "Swiss Franc", tr: "İsviçre Frangı" }, flag: "🇨🇭" },
  { code: "JPY", name: { de: "Japanischer Yen", en: "Japanese Yen", tr: "Japon Yeni" }, flag: "🇯🇵" },
  { code: "TRY", name: { de: "Türkische Lira", en: "Turkish Lira", tr: "Türk Lirası" }, flag: "🇹🇷" },
];

const APP_ID = "c8a594d6cc68451e8734188995aa419e";
const BASES = ["TRY", "EUR", "USD"];

// Kleine Hilfsfunktion für Formatierung
const formatRate = (rate: number) => (rate >= 10 ? rate.toFixed(3) : rate.toFixed(4));

// Mini Chart Komponente
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
  // States
  const [lang, setLang] = useState<"de" | "en" | "tr">("de");
  const t = TRANSLATIONS[lang];
  const [dark, setDark] = useState(() => window.matchMedia("(prefers-color-scheme: dark)").matches);
  const [isFull, setIsFull] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const [base, setBase] = useState("TRY");
  const [rates, setRates] = useState<{ [key: string]: number }>({});
  const [prevRates, setPrevRates] = useState<{ [key: string]: number }>({});
  const [blink, setBlink] = useState<{ [key: string]: "up" | "down" | null }>({});
  const [timestamp, setTimestamp] = useState("");
  const [history, setHistory] = useState<{ [key: string]: number[] }>({});
  const blinkTimeouts = useRef<{ [key: string]: any }>({});

  // Converter States (mehrere Rechner möglich)
  const [converters, setConverters] = useState([
    { from: "EUR", to: "TRY", fromValue: "1", toValue: "" },
    { from: "USD", to: "EUR", fromValue: "1", toValue: "" },
  ]);

  // Favoriten (Codes)
  const [favorites, setFavorites] = useState<string[]>([]);

  // Alarm-States
  const [alertRates, setAlertRates] = useState<{ [code: string]: number }>({});
  const [alertInput, setAlertInput] = useState("");
  const [alertMessage, setAlertMessage] = useState("");

  // Mobile Detection
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 600);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Fullscreen API
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

  // Daten abrufen und regelmäßig aktualisieren (2 Sek)
  async function fetchRates(dateStr?: string) {
    let url = `https://openexchangerates.org/api/latest.json?app_id=${APP_ID}`;
    if (dateStr && dateStr !== new Date().toISOString().split("T")[0]) {
      url = `https://openexchangerates.org/api/historical/${dateStr}.json?app_id=${APP_ID}`;
    }
    try {
      const res = await fetch(url);
      const data = await res.json();
      const r = data.rates;
      if (!r) throw new Error("Rates missing");

      const newRates: { [key: string]: number } = {};
      CURRENCIES.forEach((c) => {
        newRates[c.code] = r[base] / r[c.code];
      });

      // Blinklogik
      const newBlink: { [key: string]: "up" | "down" | null } = {};
      Object.entries(newRates).forEach(([code, value]) => {
        if (prevRates[code] !== undefined) {
          newBlink[code] = value > prevRates[code] ? "up" : value < prevRates[code] ? "down" : null;
        } else {
          newBlink[code] = null;
        }
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
    } catch (e) {
      console.error("Fetch failed", e);
    }
  }

  // Initiale Daten & Intervall
  useEffect(() => {
    fetchRates();
    const interval = setInterval(() => fetchRates(), 2000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base]);

  // Rechner-Update wenn Kurse oder Eingaben ändern
  useEffect(() => {
    setConverters((old) =>
      old.map(({ from, to, fromValue }) => {
        if (!rates[from] || !rates[to]) return { from, to, fromValue, toValue: "" };
        const fromVal = parseFloat(fromValue.replace(",", "."));
        if (isNaN(fromVal)) return { from, to, fromValue, toValue: "" };

        // Umrechnung: (fromValue / Kurs from) * Kurs to
        const converted = (fromVal / rates[from]) * rates[to];
        return { from, to, fromValue, toValue: converted.toFixed(4) };
      })
    );
  }, [rates]);

  // Wechsel Converter Werte bei Swap
  function swapConverter(index: number) {
    setConverters((old) => {
      const newArr = [...old];
      const { from, to, fromValue, toValue } = newArr[index];
      newArr[index] = { from: to, to: from, fromValue: toValue || "1", toValue: "" };
      return newArr;
    });
  }

  // Update Converter input
  function updateConverterValue(index: number, val: string) {
    setConverters((old) => {
      const newArr = [...old];
      newArr[index].fromValue = val;
      return newArr;
    });
  }

  // Favoriten hinzufügen/entfernen
  function toggleFavorite(code: string) {
    setFavorites((old) =>
      old.includes(code) ? old.filter((c) => c !== code) : [...old, code]
    );
  }

  // Alarm setzen und prüfen
  function setAlert() {
    if (!alertInput) return;
    const val = parseFloat(alertInput.replace(",", "."));
    if (isNaN(val)) {
      setAlertMessage("Ungültiger Wert");
      setTimeout(() => setAlertMessage(""), 2500);
      return;
    }
    setAlertRates((old) => ({ ...old, [base]: val }));
    setAlertMessage(t.alertSet);
    setAlertInput("");
    setTimeout(() => setAlertMessage(""), 2500);
  }

  useEffect(() => {
    // Prüfen ob Alarm erreicht
    Object.entries(alertRates).forEach(([code, alertVal]) => {
      if (rates[code] && rates[code] >= alertVal) {
        alert(`⚠️ ${code} hat den Alarmwert von ${alertVal} erreicht!`);
        setAlertRates((old) => {
          const copy = { ...old };
          delete copy[code];
          return copy;
        });
      }
    });
  }, [rates]);

  // Copy to Clipboard
  function copyRate(code: string, rate: number) {
    const msg = `1 ${code} = ${formatRate(rate)} ${base}`;
    navigator.clipboard.writeText(msg);
  }

  // Layout & Farben
  const bg = dark
    ? "radial-gradient(ellipse at 70% 0,#232141 0,#28246b 70%,#141228 100%)"
    : "radial-gradient(ellipse at 80% 0,#f1f1ff 0,#e0e0ff 80%,#f7f9fc 100%)";
  const box = dark ? "rgba(41,41,75,0.85)" : "rgba(255,255,255,0.98)";
  const card = dark ? "linear-gradient(140deg,#444067 60%,#7266d3 100%)" : "linear-gradient(140deg,#dedbf6 60%,#ece8fa 100%)";
  const color = dark ? "#fff" : "#2d2d53";
  const subcolor = dark ? "#cfc8f3" : "#665db9";

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
            borderRadius: isMobile ? 14 : 32,
            maxWidth: isMobile ? "100vw" : 850,
            width: "99vw",
            padding: isMobile ? "12px 4px 20px 4px" : "34px 34px 28px 34px",
            marginTop: isMobile ? 10 : 30,
            marginBottom: isMobile ? 18 : 36,
            backdropFilter: "blur(9px)",
            border: dark ? "1.5px solid rgba(144, 135, 234, 0.11)" : "1.5px solid #eceafe",
            color,
            transition: "background .3s,border .3s",
          }}
        >
          {/* Toolbar */}
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: -8, flexWrap: "wrap" }}>
            {(["de", "en", "tr"] as const).map((l) => (
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
                {l === "de" ? "🇩🇪" : l === "en" ? "🇬🇧" : "🇹🇷"}
              </button>
            ))}

            <button
              onClick={() => setDark((d) => !d)}
              title={t.mode}
              style={{
                marginLeft: 10,
                background: dark ? "#36337c" : "#e7e3ff",
                color: dark ? "#fff" : "#392a7c",
                border: "none",
                padding: isMobile ? "4px 12px" : "6px 17px",
                borderRadius: 11,
                fontWeight: 600,
                fontSize: isMobile ? 14 : 16,
                cursor: "pointer",
                outline: "none",
                letterSpacing: 1,
                boxShadow: dark ? "0 2px 9px #222" : undefined,
                transition: "background .23s",
              }}
              aria-label={t.mode}
            >
              {dark ? "🌙" : "☀️"}
            </button>

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
                transition: "background .23s",
              }}
              aria-label={isFull ? t.exitFullscreen : t.fullscreen}
            >
              {isFull ? "🡸" : "⛶"}
            </button>

            <span
              style={{
                marginLeft: 17,
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
                style={{
                  background: base === b ? "#40eea7" : "rgba(225,225,245,0.13)",
                  color: base === b ? "#212" : dark ? "#fff" : "#312e67",
                  border: "none",
                  padding: isMobile ? "5px 13px" : "6px 16px",
                  borderRadius: 12,
                  fontWeight: 600,
                  fontSize: isMobile ? 14 : 15,
                  marginLeft: 3,
                  cursor: "pointer",
                  outline: "none",
                  letterSpacing: 1,
                  boxShadow: base === b ? "0 2px 7px #31ffc86b" : undefined,
                  transition: "background .22s",
                }}
                aria-label={`Basiswährung ${b}`}
              >
                {b}
              </button>
            ))}
          </div>

          {/* Überschrift */}
          <div style={{ marginBottom: isMobile ? 16 : 22, marginTop: isMobile ? 8 : 7, color }}>
            <span style={{ fontSize: isMobile ? 28 : 32, fontWeight: 700, letterSpacing: 1.2, textShadow: dark ? "0 2px 8px #3d2f7433" : undefined }}>
              {t.appName}
            </span>
            <span style={{ fontSize: isMobile ? 18 : 21, color: subcolor, marginLeft: isMobile ? 10 : 15, letterSpacing: 1, fontWeight: 400 }}>
              {" – " + t.subtitle}
            </span>
          </div>

          {/* Favoriten */}
          {favorites.length > 0 && (
            <div style={{ marginBottom: 18 }}>
              <strong style={{ color, fontSize: isMobile ? 16 : 18, marginBottom: 8, display: "block" }}>{t.favorites}:</strong>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {favorites.map((code) => {
                  const cur = CURRENCIES.find((c) => c.code === code);
                  if (!cur) return null;
                  return (
                    <div
                      key={code}
                      style={{
                        background: card,
                        padding: "8px 12px",
                        borderRadius: 12,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        cursor: "pointer",
                        boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
                        userSelect: "none",
                      }}
                      onClick={() => toggleFavorite(code)}
                      title={`${cur.name[lang]} (${code}) - Klick zum Entfernen`}
                    >
                      <span style={{ fontSize: 22 }}>{cur.flag}</span>
                      <span style={{ color }}>{code}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Alarm-Box */}
          <div
            style={{
              marginBottom: 24,
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              alignItems: "center",
              color,
              fontSize: isMobile ? 14 : 15,
            }}
          >
            <input
              type="number"
              min="0"
              step="any"
              placeholder={t.alertPlaceholder}
              aria-label={t.setAlert}
              value={alertInput}
              onChange={(e) => setAlertInput(e.target.value)}
              style={{
                flexGrow: 1,
                padding: "8px 10px",
                borderRadius: 10,
                border: "1px solid",
                borderColor: dark ? "#555" : "#ccc",
                fontSize: isMobile ? 14 : 16,
                color,
                background: dark ? "#222244" : "#f9f9f9",
                outline: "none",
              }}
            />
            <button
              onClick={setAlert}
              style={{
                padding: "8px 18px",
                borderRadius: 10,
                border: "none",
                background: "#6865ff",
                color: "#fff",
                cursor: "pointer",
                fontWeight: "600",
                fontSize: isMobile ? 14 : 15,
                userSelect: "none",
              }}
              aria-label={t.setAlert}
            >
              {t.setAlert}
            </button>
            {alertMessage && <span style={{ marginLeft: 10 }}>{alertMessage}</span>}
          </div>

          {/* Währungsrechner */}
          <div
            style={{
              background: card,
              borderRadius: 15,
              boxShadow: "0 2px 13px 0 rgba(62,56,110,0.06)",
              padding: 14,
              marginBottom: 28,
              color,
            }}
          >
            <div style={{ fontWeight: 600, fontSize: isMobile ? 17 : 18, marginBottom: 10 }}>{t.calculator}</div>

            {converters.map((conv, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: 10,
                  marginBottom: 12,
                  flexWrap: isMobile ? "wrap" : "nowrap",
                  alignItems: "center",
                }}
              >
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={conv.fromValue}
                  aria-label={t.from}
                  onChange={(e) => updateConverterValue(i, e.target.value)}
                  style={{
                    flexGrow: 1,
                    padding: 9,
                    borderRadius: 8,
                    border: "1px solid",
                    borderColor: dark ? "#373764" : "#dedbf9",
                    fontSize: isMobile ? 16 : 17,
                    background: dark ? "#232350" : "#efeefe",
                    color,
                    outline: "none",
                    marginBottom: isMobile ? 6 : 0,
                  }}
                />
                <select
                  value={conv.from}
                  aria-label={t.from}
                  onChange={(e) =>
                    setConverters((old) => {
                      const copy = [...old];
                      copy[i].from = e.target.value;
                      return copy;
                    })
                  }
                  style={{
                    flexGrow: 2,
                    borderRadius: 8,
                    border: "1px solid",
                    borderColor: dark ? "#373764" : "#dedbf9",
                    fontSize: isMobile ? 16 : 17,
                    background: dark ? "#232350" : "#efeefe",
                    color,
                    outline: "none",
                    padding: "9px",
                    marginBottom: isMobile ? 6 : 0,
                  }}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.name[lang]}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => swapConverter(i)}
                  title="Währungen tauschen"
                  style={{
                    background: "#5e5cd2",
                    color: "#fff",
                    borderRadius: 18,
                    width: 36,
                    height: 36,
                    border: "none",
                    cursor: "pointer",
                    fontSize: 21,
                    fontWeight: "700",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    userSelect: "none",
                    boxShadow: "0 2px 9px #35357a2d",
                  }}
                  aria-label="Währungen tauschen"
                >
                  ⇅
                </button>

                <input
                  type="text"
                  readOnly
                  value={conv.toValue}
                  aria-label={t.to}
                  style={{
                    flexGrow: 1,
                    padding: 9,
                    borderRadius: 8,
                    border: "1px solid",
                    borderColor: dark ? "#373764" : "#dedbf9",
                    fontSize: isMobile ? 16 : 17,
                    background: dark ? "#202040" : "#eaeaf7",
                    color,
                    outline: "none",
                  }}
                />
                <select
                  value={conv.to}
                  aria-label={t.to}
                  onChange={(e) =>
                    setConverters((old) => {
                      const copy = [...old];
                      copy[i].to = e.target.value;
                      return copy;
                    })
                  }
                  style={{
                    flexGrow: 2,
                    borderRadius: 8,
                    border: "1px solid",
                    borderColor: dark ? "#373764" : "#dedbf9",
                    fontSize: isMobile ? 16 : 17,
                    background: dark ? "#232350" : "#efeefe",
                    color,
                    outline: "none",
                    padding: "9px",
                  }}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.name[lang]}
                    </option>
                  ))}
                </select>
              </div>
            ))}

            <div
              style={{
                fontSize: isMobile ? 13 : 14,
                color: subcolor,
                marginTop: 10,
              }}
            >
              {t.rateDate}: {timestamp || "-"}
            </div>
          </div>

          {/* Wechselkurse Übersicht mit Mini-Chart */}
          <div
            style={{
              fontWeight: 600,
              fontSize: isMobile ? 15 : 17,
              color: subcolor,
              marginBottom: 11,
            }}
          >
            {t.currencyRates} ({base}-Basis)
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit,minmax(180px,1fr))",
              gap: isMobile ? 11 : 21,
              marginBottom: isMobile ? 30 : 40,
            }}
          >
            {CURRENCIES.map((currency) => (
              <div
                key={currency.code}
                style={{
                  background: card,
                  borderRadius: 14,
                  boxShadow: "0 4px 18px 0 rgba(67, 54, 133, 0.08)",
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
                      marginRight: isMobile ? 5 : 7,
                      userSelect: "none",
                    }}
                  >
                    {currency.flag}
                  </span>
                  {currency.code}
                </div>
                <div style={{ fontSize: isMobile ? 12 : 13, color: subcolor, marginBottom: 5 }}>
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
                    aria-label={`Kurs von ${currency.code} kopieren`}
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
              marginTop: isMobile ? 16 : 21,
              color: subcolor,
              fontSize: isMobile ? 12 : 14,
              letterSpacing: 0.5,
              display: "flex",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            <span>
              {timestamp && (
                <>
                  {t.lastUpdate}: <span>{timestamp}</span>
                </>
              )}
            </span>
            <span style={{ opacity: 0.38, fontSize: isMobile ? 11 : 12 }}>{t.powered}</span>
          </div>
        </div>
      </div>
    </>
  );
}
