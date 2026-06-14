import { Prize } from './types';

export const INITIAL_PRIZES: Prize[] = [
  {
    id: 'gold10g',
    level: 'Hadiah Utama',
    levelZh: '特等奖',
    label: 'Gold 10gr',
    labelZh: 'Gold 10gr',
    iconName: 'Coins',
    baseProbability: 0.0, // 0.0%
    initialStock: 2,
    currentStock: 2,
    weeklyCap: 2,
    color: '#D4AF37', // Metallic Imperial Gold
    textColor: '#1E293B'
  },
  {
    id: 'trade_signal',
    level: 'Juara 4',
    levelZh: '第四名',
    label: 'Langganan Sinyal AI Kuantitatif 30 Hari',
    labelZh: '量化 AI 交易信号订阅服务 30 天',
    iconName: 'Activity',
    baseProbability: 0.18, // 18%
    initialStock: 100,
    currentStock: 100,
    weeklyCap: 100,
    color: '#06b6d4', // Neon Cyan Grid
    textColor: '#1E293B'
  },
  {
    id: 'ninja250',
    level: 'Juara 1',
    levelZh: '冠军',
    label: 'Kawasaki Ninja 250',
    labelZh: 'Kawasaki Ninja 250',
    iconName: 'Award',
    baseProbability: 0.0, // 0.0%
    initialStock: 1,
    currentStock: 1,
    weeklyCap: 1,
    color: '#15803d', // Kawasaki Racing Green
    textColor: '#FFFFFF'
  },
  {
    id: 'whitepaper',
    level: 'Juara 5',
    levelZh: '第五名',
    label: 'Whitepaper Strategi Lindung Makro',
    labelZh: '宏观配置与资产对冲策略白皮书',
    iconName: 'BookOpen',
    baseProbability: 0.25, // 25%
    initialStock: 500,
    currentStock: 500,
    weeklyCap: 500,
    color: '#3b82f6', // Strategy Royal Blue
    textColor: '#FFFFFF'
  },
  {
    id: 'macbook',
    level: 'Juara 2',
    levelZh: '亚军',
    label: 'Macbook Pro M4 Max',
    labelZh: 'Macbook Pro M4 Max',
    iconName: 'Cpu',
    baseProbability: 0.0, // 0.0%
    initialStock: 3,
    currentStock: 3,
    weeklyCap: 3,
    color: '#475569', // Space Slate
    textColor: '#FFFFFF'
  },
  {
    id: 'gold_guide',
    level: 'Juara 6',
    levelZh: '第六名',
    label: 'Panduan Trading XAUUSD',
    labelZh: 'XAUUSD 交易指南',
    iconName: 'TrendingUp',
    baseProbability: 0.30, // 30%
    initialStock: 2000,
    currentStock: 2000,
    weeklyCap: 2000,
    color: '#f97316', // Bronze Honey Orange
    textColor: '#FFFFFF'
  },
  {
    id: 'iphone16',
    level: 'Juara 3',
    levelZh: '季军',
    label: 'iPhone 16 Pro Max 1TB',
    labelZh: 'iPhone 16 Pro Max 1TB',
    iconName: 'Smartphone',
    baseProbability: 0.0, // 0.0%
    initialStock: 5,
    currentStock: 5,
    weeklyCap: 5,
    color: '#818cf8', // Indigo Titanium
    textColor: '#FFFFFF'
  },
  {
    id: 'vip_slot',
    level: 'Juara 7',
    levelZh: '第七名',
    label: 'Grup VIP Strategi (Permanen) 1 Tiket',
    labelZh: 'VIP 策略群组（永久）1 个名额',
    iconName: 'Users',
    baseProbability: 0.27, // 27%
    initialStock: 1000,
    currentStock: 1000,
    weeklyCap: 1000,
    color: '#8b5cf6', // VIP Purple
    textColor: '#FFFFFF'
  },
];

export const MOCK_FIRST_NAMES = [
  'Budi', 'Siti', 'Agus', 'Dewi', 'Hendra', 'Eko', 'Rini', 'Andi', 'Sari', 'Wawan',
  'Rian', 'Lia', 'Rudi', 'Mega', 'Taufik', 'Dian', 'Ahmad', 'Yanti', 'Aris', 'Novi'
];

export const MOCK_LAST_NAMES = [
  'Santoso', 'Wijaya', 'Pratama', 'Hidayat', 'Siregar', 'Kusuma', 'Ginting', 'Sutrisno',
  'Nasution', 'Gunawan', 'Saputra', 'Lestari', 'Wahyuni', 'Utami', 'Simanjuntak', 'Setiawan'
];

export const generateMockDrawHistory = () => {
  const history = [];
  const now = new Date();
  for (let i = 0; i < 20; i++) {
    const fn = MOCK_FIRST_NAMES[Math.floor(Math.random() * MOCK_FIRST_NAMES.length)];
    const ln = MOCK_LAST_NAMES[Math.floor(Math.random() * MOCK_LAST_NAMES.length)];
    const wa = `0812${Math.floor(1000 + Math.random() * 9000)}${Math.floor(1000 + Math.random() * 9000)}`;
    const ktp = `3171${Math.floor(100000 + Math.random() * 900000)}${Math.floor(100000 + Math.random() * 900000)}`;
    
    const roll = Math.random();
    let winner = INITIAL_PRIZES.find(p => p.id === 'gold_guide') || INITIAL_PRIZES[5]; // default XAUUSD Trading Guide
    if (roll < 0.05) {
      winner = INITIAL_PRIZES.find(p => p.id === 'trade_signal') || INITIAL_PRIZES[1]; // Quant AI Trading Signal
    } else if (roll < 0.25) {
      winner = INITIAL_PRIZES.find(p => p.id === 'whitepaper') || INITIAL_PRIZES[3]; // Macro allocation whitepaper
    } else if (roll < 0.35) {
      winner = INITIAL_PRIZES.find(p => p.id === 'vip_slot') || INITIAL_PRIZES[7]; // VIP Group
    }
    
    const timeOffset = new Date(now.getTime() - (i * 12 + Math.floor(Math.random() * 45)) * 60 * 1000);
    
    history.push({
      id: `mock-${i}`,
      timestamp: timeOffset.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      participantName: `${fn} ${ln}`,
      participantWhatsapp: wa,
      participantKtp: ktp,
      deviceId: `device-${Math.floor(Math.random() * 1000)}`,
      prizeId: winner.id,
      prizeLabel: winner.label,
      isDowngraded: false,
      status: 'SUCCESS' as const,
    });
  }
  return history;
};
