export interface Prize {
  id: string;
  level: string; // "Hadiah Utama", "Juara 1", etc.
  levelZh: string; // "特等奖", "一等奖" etc.
  label: string; // Full Indo description
  labelZh: string; // Full Chinese description
  iconName: string; // lucide icon name
  customImageBase64?: string; // base64 uploaded image (legacy)
  /**
   * === FIX: Public download URL of an operator-uploaded prize photo
   *             stored in Firebase Storage. When present, this takes
   *             priority over the base64 blob so the operator can
   *             serve arbitrarily large images without hitting the
   *             Firestore 1 MB document limit. ===
   */
  customImageUrl?: string;
  baseProbability: number; // base mathematical probability (e.g. 0.0002 for 5g gold)
  initialStock: number;
  currentStock: number;
  weeklyCap: number; // Operating Stock Cap
  color: string; // Slice background color
  textColor: string; // Slice text color
  imageUrl?: string; // High fidelity 3D physical mock illustration
}

export interface Participant {
  name: string;
  whatsapp: string;
  ktp: string; // Used internally/compatibility as invitationCode
  deviceId: string;
}

export interface InvitationCode {
  code: string;
  isUsed: boolean;
  generatedAt: string;
  usedBy?: string;
}

export interface RiskConfig {
  stockCapEnabled: boolean;
  timeReleaseEnabled: boolean;
  antiFraudEnabled: boolean;
  timeSlotStart: string; // "19:30"
  timeSlotEnd: string; // "21:00"
  simulatedHour: number; // 0-23
  simulatedMinute: number; // 0-59
  boostedMultiplier: number; // Probability multiplier during active time slots
}

export interface DrawResult {
  id: string;
  timestamp: string;
  participantName: string;
  participantWhatsapp: string;
  participantKtp: string;
  deviceId: string;
  prizeId: string;
  prizeLabel: string;
  originalPrizeId?: string; // If downgraded, what was the initially selected prize
  originalPrizeLabel?: string;
  isDowngraded: boolean;
  downgradeReason?: string; // "Stok Habis / Limit Tercapai"
  status: 'SUCCESS' | 'BLOCKED' | 'FAILED';
  blockReason?: string; // "WhatsApp Duplikat", "KTP Duplikat", "Device ID Duplikat"
}

export interface SecurityMetric {
  totalDraws: number;
  blockedAttempts: number;
  successfulDraws: number;
  downgradedDraws: number;
}

export interface GoogleSheetsConfig {
  syncMethod: 'webapp' | 'direct';
  spreadsheetId: string;
  webappUrl: string;
  accessToken: string;
  autoSync: boolean;
  isConnected: boolean;
  lastSyncedAt?: string;
  fields: string[]; // Ordered list of columns to send
}

