import React from 'react';
import { ShieldCheck, Calendar, Activity, Languages } from 'lucide-react';
import { TRANSLATIONS } from '../translations';

interface KvbHeaderProps {
  lang?: 'zh' | 'id';
  customLogo?: string;
}

export default function KvbHeader({ lang = 'id', customLogo }: KvbHeaderProps) {
  const t = TRANSLATIONS[lang];

  if (customLogo) {
    return (
      <header id="kvb-header" className="bg-white/5 backdrop-blur-sm border-b border-white/10 px-6 py-3 md:py-4 sticky top-0 z-50 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] select-none transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-center md:justify-start">
          <img src={customLogo} alt="Custom Header Logo" className="max-h-[70px] w-auto object-contain" />
        </div>
      </header>
    );
  }

  return (
    <header id="kvb-header" className="bg-white/5 backdrop-blur-sm border-b border-white/10 px-6 py-3 md:py-4 sticky top-0 z-50 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] select-none transition-all">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* KVB Premium Logo */}
        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center bg-transparent p-1">
            <div className="flex items-center gap-3">
              {/* Official Corporate KVB Logo Lettermark (Restored to original high-fidelity) */}
              <svg className="h-9 w-auto select-none shrink-0" viewBox="0 0 120 50" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* K Letter */}
                <path d="M15 10H23V25L32 10H41L31 26L42 40H33L23 27V40H15V10Z" fill="#fbbf24" />
                {/* V Letter */}
                <path d="M44 10H52L59 30L66 10H74L63 40H55L44 10Z" fill="#fbbf24" />
                {/* B Letter with horizontal triple cuts as seen in KVB logo */}
                <path d="M78 10H94C99.5 10 103 13 103 17C103 20 101.2 22.5 98 23.5C102 24.5 104 27.5 104 32C104 37 100 40 94 40H78V10ZM93 21.5C96 21.5 97.4 20.3 97.4 18C97.4 15.7 96 14.5 93 14.5H84.5V21.5H93ZM94 35.5C97 35.5 98.4 34.3 98.4 31.5C98.4 28.7 97 27.5 94 27.5H84.5V35.5H94Z" fill="#fbbf24" />
                {/* Custom cuts/stripes in B matching theme background */}
                <rect x="88" y="24" width="13" height="2" fill="#0f172a" />
              </svg>

              {/* Minimalist vertical divider */}
              <div className="h-8 w-[1px] bg-slate-200 self-center"></div>

              {/* BEST BROKER GRADE A++ 2025 Laurel Wreath Badge */}
              <div className="flex items-center">
                <svg className="h-9 w-auto select-none shrink-0" viewBox="0 0 140 50" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Left laurel branch in premium shiny gold / amber */}
                  <path d="M 28,42 C 16,38 12,25 18,10" fill="none" stroke="#fbbf24" strokeWidth="1.2" strokeLinecap="round" />
                  {/* Left branch leaves */}
                  <path d="M 25,39 C 22,41 18,40 18,37 C 18,34 22,36 25,39" fill="#fbbf24" />
                  <path d="M 27,37 C 25,34 22,33 22,36 C 22,39 25,39 27,37" fill="#fbbf24" />
                  <path d="M 19,30 C 15,31 12,28 13,25 C 14,22 17,26 19,30" fill="#fbbf24" />
                  <path d="M 21,28 C 18,26 16,23 18,21 C 20,19 21,24 21,28" fill="#fbbf24" />
                  <path d="M 16,21 C 12,21 10,17 11,14 C 12,11 15,16 16,21" fill="#fbbf24" />
                  <path d="M 19,19 C 16,17 15,13 17,11 C 19,9 20,14 19,19" fill="#fbbf24" />
                  <path d="M 17,12 C 14,11 13,7 15,4 C 17,1 18,7 17,12" fill="#fbbf24" />
                  <path d="M 21,11 C 19,9 19,5 21,3 C 23,1 23,7 21,11" fill="#fbbf24" />

                  {/* Right laurel branch */}
                  <path d="M 112,42 C 124,38 128,25 122,10" fill="none" stroke="#fbbf24" strokeWidth="1.2" strokeLinecap="round" />
                  {/* Right branch leaves */}
                  <path d="M 115,39 C 118,41 122,40 122,37 C 122,34 118,36 115,39" fill="#fbbf24" />
                  <path d="M 113,37 C 115,34 118,33 118,36 C 118,39 115,39 113,37" fill="#fbbf24" />
                  <path d="M 121,30 C 125,31 128,28 127,25 C 126,22 123,26 121,30" fill="#fbbf24" />
                  <path d="M 119,28 C 122,26 124,23 122,21 C 120,19 119,24 119,28" fill="#fbbf24" />
                  <path d="M 124,21 C 128,21 130,17 129,14 C 128,11 125,16 124,21" fill="#fbbf24" />
                  <path d="M 121,19 C 124,17 125,13 123,11 C 121,9 120,14 121,19" fill="#fbbf24" />
                  <path d="M 123,12 C 126,11 127,7 125,4 C 123,1 122,7 123,12" fill="#fbbf24" />
                  <path d="M 119,11 C 121,9 121,5 119,3 C 117,1 117,7 119,11" fill="currentColor" fillOpacity="0" />
                  <path d="M 119,11 C 117,9 117,5 119,3 C 121,1 121,7 119,11" fill="#fbbf24" />

                  {/* High Quality Typography inside Laurel Wreath */}
                  <text x="70" y="16" textAnchor="middle" fontSize="9" fontWeight="800" fill="#f8fafc" letterSpacing="0.08em" fontFamily="Inter, system-ui, sans-serif">BEST</text>
                  <text x="70" y="27" textAnchor="middle" fontSize="7" fontWeight="700" fill="#cbd5e1" letterSpacing="0.04em" fontFamily="Inter, system-ui, sans-serif">BROKER GRADE</text>
                  <text x="70" y="41" textAnchor="middle" fontSize="11" fontWeight="900" fill="#FBBF24" letterSpacing="0.06em" fontFamily="Inter, system-ui, sans-serif">A++ 2026</text>
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Indonesia System Stats Display */}
        <div className="flex flex-wrap gap-2 md:gap-3 items-center justify-end text-[11px] font-mono text-slate-600">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 px-2.5 py-1.5 rounded bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-1">
              <Activity className="h-3 w-3 text-emerald-600 animate-pulse" />
              <span>Server: <span className="text-emerald-600 font-bold">ONLINE</span></span>
            </div>
            
            <span className="hidden sm:inline text-slate-300">|</span>

            <div className="flex items-center gap-1">
              <ShieldCheck className="h-3 w-3 text-emerald-600" />
              <span>Anti-Fraud Lock: <span className="text-emerald-600 font-semibold font-sans">ID & WA-Aktif</span></span>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 font-bold tracking-tight">
            <span className="flex items-center gap-1">
               <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
               UNITED 2026 EXCLUSIVE
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
