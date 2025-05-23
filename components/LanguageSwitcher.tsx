import { useRouter } from 'next/router';

const langs = [
  { code: 'de', label: '🇩🇪' },
  { code: 'en', label: '🇬🇧' },
  { code: 'tr', label: '🇹🇷' },
];

export default function LanguageSwitcher() {
  const router = useRouter();
  const { locale, asPath } = router;

  return (
    <div className="flex space-x-2">
      {langs.map(lang => (
        <button
          key={lang.code}
          onClick={() => router.push(asPath, asPath, { locale: lang.code })}
          className={`rounded px-2 py-1 text-xl transition ${
            locale === lang.code ? 'bg-white/20' : 'hover:bg-white/10'
          }`}
        >
          {lang.label}
        </button>
      ))}
    </div>
  );
}
