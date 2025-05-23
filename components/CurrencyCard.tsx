import { useEffect, useState } from 'react';
import { Sparklines, SparklinesLine } from 'react-sparklines';

interface Props {
  code: string;
  label: string;
  value?: number;
  prevValue?: number;
  trendData: number[];
}

export default function CurrencyCard({ code, label, value, prevValue, trendData }: Props) {
  const [blink, setBlink] = useState('');

  useEffect(() => {
    if (prevValue === undefined || value === undefined) return;
    if (value > prevValue) setBlink('blink-green');
    else if (value < prevValue) setBlink('blink-red');
    else setBlink('');
    const t = setTimeout(() => setBlink(''), 500);
    return () => clearTimeout(t);
  }, [value, prevValue]);

  return (
    <div className={`rounded-xl bg-white/10 shadow-lg p-4 text-white transition ${blink}`}>
      <div className="flex justify-between items-center mb-1">
        <span className="font-semibold">{code}</span>
        <span className="text-2xl font-bold">{value ? value.toFixed(4) : '--'}</span>
      </div>
      <div className="text-sm opacity-70 mb-1">{label}</div>
      <Sparklines data={trendData} width={60} height={20}>
        <SparklinesLine color="#fff" style={{ strokeWidth: 3, fill: "none" }} />
      </Sparklines>
    </div>
  );
}
