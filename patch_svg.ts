import * as fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');
const startSvg = '<svg\n          className="absolute inset-x-0 top-0 w-full h-[150vh] min-h-[1400px]"\n          xmlns="http://www.w3.org/2000/svg"\n          preserveAspectRatio="none"\n        >';
const endSvg = '</svg>';

const startIndex = content.indexOf(startSvg);
const endIndex = content.indexOf(endSvg, startIndex) + endSvg.length;

if (startIndex !== -1 && endIndex !== -1) {
  const newSvg = `<svg
          className="absolute inset-x-0 top-0 w-full h-[150vh] min-h-[1400px]"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
        >
          {/* Soccer field center circle schematic */}
          <circle cx="50%" cy="500" r="250" fill="none" stroke="#2563eb" strokeWidth="2" opacity="0.08" strokeDasharray="15 10" />
          <line x1="0" y1="500" x2="100%" y2="500" stroke="#2563eb" strokeWidth="2" opacity="0.08" strokeDasharray="15 10" />
          <rect x="calc(50% - 150px)" y="0" width="300" height="250" fill="none" stroke="#2563eb" strokeWidth="2" opacity="0.08" strokeDasharray="15 10" />
          
          {/* Moving Average Line 1 - Blue wave */}
          <path
            d="M 0,380 Q 200,280 400,420 T 800,220 T 1200,480 T 1600,290 T 2000,410"
            fill="none"
            stroke="#2563eb"
            strokeWidth="3"
            opacity="0.25"
          />
          {/* Moving Average Line 2 - Cyan Trend channel wave */}
          <path
            d="M 0,420 Q 300,320 600,510 T 1200,310 T 1800,490"
            fill="none"
            stroke="#06b6d4"
            strokeWidth="2"
            strokeDasharray="5 5"
            opacity="0.3"
          />

          {/* Group of high-contrast stylized financial Candlesticks (Blue & Red Theme) */}
          <g opacity="0.4">
            <line x1="10%" y1="120" x2="10%" y2="280" stroke="#3b82f6" strokeWidth="2" />
            <rect x="calc(10% - 6px)" y="150" width="12" height="80" fill="#3b82f6" rx="2" />

            <line x1="25%" y1="350" x2="25%" y2="510" stroke="#ef4444" strokeWidth="2" />
            <rect x="calc(25% - 6px)" y="380" width="12" height="100" fill="#ef4444" rx="2" />

            <line x1="45%" y1="180" x2="45%" y2="400" stroke="#3b82f6" strokeWidth="2" />
            <rect x="calc(45% - 6px)" y="220" width="12" height="150" fill="#3b82f6" rx="2" />
            
            <line x1="60%" y1="250" x2="60%" y2="390" stroke="#ef4444" strokeWidth="2" />
            <rect x="calc(60% - 6px)" y="270" width="12" height="90" fill="#ef4444" rx="2" />

            <line x1="75%" y1="100" x2="75%" y2="320" stroke="#3b82f6" strokeWidth="2" />
            <rect x="calc(75% - 6px)" y="130" width="12" height="120" fill="#3b82f6" rx="2" />

            <line x1="88%" y1="400" x2="88%" y2="600" stroke="#3b82f6" strokeWidth="2" />
            <rect x="calc(88% - 6px)" y="450" width="12" height="110" fill="#3b82f6" rx="2" />
          </g>
        </svg>`;

  content = content.substring(0, startIndex) + newSvg + content.substring(endIndex);
  fs.writeFileSync('src/App.tsx', content);
  console.log("Replaced SVG section");
} else {
  console.log("SVG Section Not Found!");
}
