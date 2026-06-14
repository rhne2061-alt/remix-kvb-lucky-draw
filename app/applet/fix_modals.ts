import * as fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

// Win Modal block
content = content.replace(
  'bg-gradient-to-b from-zinc-900 to-zinc-950 border-2 border-amber-400/80 rounded-2xl p-6 shadow-2xl overflow-hidden text-center transition-all duration-300 border-amber-400 shadow-[0_0_50px_rgba(212,175,55,0.15)]',
  'bg-white border-2 border-blue-400 rounded-2xl p-6 shadow-2xl overflow-hidden text-center transition-all duration-300 shadow-[0_0_50px_rgba(59,130,246,0.15)]'
);

// Win Modal image drop shadows
content = content.replace(
  'drop-shadow-[0_15px_30px_rgba(0,0,0,0.4)]',
  'drop-shadow-[0_15px_30px_rgba(30,58,138,0.2)]'
);
content = content.replace(
  'drop-shadow-[0_15px_30px_rgba(0,0,0,0.4)]', // if there are multiples
  'drop-shadow-[0_15px_30px_rgba(30,58,138,0.2)]'
);

// Win Modal badge
content = content.replace(
  'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-600 text-xs font-black text-slate-950 uppercase tracking-widest whitespace-nowrap shadow-[0_0_15px_rgba(251,191,36,0.5)] border-2 border-amber-300',
  'bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 text-xs font-black text-white uppercase tracking-widest whitespace-nowrap shadow-lg border-2 border-blue-400'
);

// Internal Operator Login Modal
content = content.replace(
  'bg-gradient-to-b from-zinc-900 to-zinc-950 border border-slate-800 rounded-2xl p-6 shadow-2xl relative',
  'bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl shadow-blue-900/10 relative'
);

// Any remaining text-white / text-amber
content = content.replace(/text-white/g, 'text-slate-800');
content = content.replace(/bg-zinc-950/g, 'bg-slate-50');

fs.writeFileSync('src/App.tsx', content);
console.log("Modals and texts updated!");
