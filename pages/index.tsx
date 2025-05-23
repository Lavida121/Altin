import React, { useEffect, useRef, useState } from "react";

const TRANSLATIONS = {
  de: { /* ... wie in deinem Code ... */ },
  en: { /* ... wie in deinem Code ... */ },
  tr: { /* ... wie in deinem Code ... */ },
};

const LANG_FLAGS = { de: "🇩🇪", en: "🇬🇧", tr: "🇹🇷" };

const CURRENCIES = [
  { code: "USD", name: { de: "US-Dollar", en: "US Dollar", tr: "ABD Doları" }, flag: "🇬🇧" },
  { code: "EUR", name: { de: "Euro", en: "Euro", tr: "Euro" }, flag: "🇪🇺" },
  { code: "GBP", name: { de: "Pfund Sterling", en: "Pound Sterling", tr: "İngiliz Sterlini" }, flag: "🇬🇧" },
  { code: "CHF", name: { de: "Schweizer Franken", en: "Swiss Franc", tr: "İsviçre Frangı" }, flag: "🇨🇭" },
  { code: "JPY", name: { de: "Japanischer Yen", en: "Japanese Yen", tr: "Japon Yeni" }, flag: "🇯🇵" },
  { code: "TRY", name: { de: "Türkische Lira", en: "Turkish Lira", tr: "Türk Lirası" }, flag: "🇹🇷" },
];

const APP_ID = "c8a594d6cc68451e8734188995aa419e";
const BASES = ["TRY", "EUR", "USD"];

const formatRate = (rate: number) => (rate >= 10 ? rate.toFixed(3) : rate.toFixed(4));

function MiniChart({ values, dark }: { values: number[]; dark: boolean }) {
  if (!values || values.length < 2) return null;
  // ... wie bei dir ...
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
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 600);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
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
    fetchRates(date);
    const interval = setInterval(() => fetchRates(date), 2000);
    return () => clearInterval(interval);
  }, [date, base, prevRates]);

  useEffect(() => {
    if (!rates[from] || !rates[to]) {
      setToValue("");
      return;
    }
    const fVal = parseFloat(fromValue.replace(",", "."));
    if (isNaN(fVal)) {
      setToValue("");
      return;
    }
    const result = rates[to] / rates[from];
    setToValue((fVal * result).toFixed(4));
  }, [fromValue, from, to, rates]);

  function swap() {
    setFrom(to);
    setTo(from);
    setFromValue(toValue || "1");
  }

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
    const handler = () => setIsFull(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // ... Rest deines Codes (Styles und JSX) unverändert, wie du es hast ...
  // Wichtig: Im Rechner-Teil rate[to] / rate[from] verwenden (oben korrigiert)

  return (
    // ... JSX mit styles wie in deinem Code ...
    // Beispiel des Rechner-Inputs aus deinem Code verwenden, einfach nur mit korrigierter Logik
  );
}
