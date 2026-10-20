export type Category = "kaos" | "hijab" | "jaket" | "sepatu" | "aksesori";
export type Status =
  | "diajukan"
  | "disetujui_merek"
  | "ditolak_merek"
  | "qr_terbit"
  | "qr_kedaluwarsa"
  | "diserahkan_di_titik"
  | "tidak_sesuai"
  | "ditahan"
  | "diperiksa"
  | "menunggu_batch"
  | "dikonsolidasi"
  | "dikirim_balik"
  | "diterima_merek"
  | "selesai"
  | "sengketa";
export type Decision =
  "layak_jual" | "perlu_perbaikan" | "rusak" | "tidak_sesuai";
export interface Brand {
  id: string;
  name: string;
  policy: { days: number; categories: Category[]; condition: string };
  address: string;
  currentCost: number;
  weeklyMean: number;
  category: Category;
  weight: number;
  volume: number;
  value: number;
}
export interface Buyer {
  id: string;
  code: string;
  zone: string;
}
export interface Order {
  id: string;
  brandId: string;
  buyerId: string;
  items: string[];
  purchasedAt: string;
  value: number;
}
export interface Item {
  id: string;
  authorizationId: string;
  category: Category;
  weight: number;
  volume: number;
  value: number;
}
export interface Receipt {
  id: string;
  authorizationId: string;
  receivedAt: string;
  operator: string;
  match: "sesuai_otorisasi" | "berbeda" | "tanpa_otorisasi";
}
export interface Inspection {
  id: string;
  receiptId: string;
  checklist: Record<string, boolean>;
  photos: string[];
  decision: Decision;
  minutes: number;
}
export interface Settlement {
  authorizationId: string;
  status:
    | "menunggu_merek"
    | "diterima_merek"
    | "refund_diproses"
    | "ditolak"
    | "sengketa";
  completedAt?: string;
  resolution?: string;
}
export interface ReturnRecord {
  id: string;
  orderId: string;
  brandId: string;
  reason: string;
  status: Status;
  deadline: string;
  qr: string;
  qrExpiresAt: string;
  qrUsed: boolean;
  item: Item;
  approvedAt?: string;
  receivedByBrandAt?: string;
  receipt?: Receipt;
  inspection?: Inspection;
  settlement?: Settlement;
  batchId?: string;
  waitingDays?: number;
  incident?: "rusak" | "hilang";
  actualLoss?: number;
  dispute?: { reason: string; brandPhotos: string[]; openedAt: string };
  history: { status: Status; at: string; note?: string }[];
}
export interface Batch {
  id: string;
  brandId: string;
  scheduledAt: string;
  cutoffAt: string;
  itemIds: string[];
  weight: number;
  volume: number;
  status: "terencana" | "dikirim" | "diterima";
  freight: number;
  capacityKg?: number;
  capacityVolume?: number;
  freightFixed?: number;
  freightPerKg?: number;
  packagingPerBatch?: number;
  shippedAt?: string;
  arrivedAt?: string;
}
export interface CostParameters {
  wagePerMinute: number;
  receivingMinutes: number;
  inspectionMinutes: Record<Category, number>;
  weeklyRent: number;
  weeklyEquipment: number;
  packagingPerBatch: number;
  packagingPerItem: number;
  freightFixed: number;
  freightPerKg: number;
  damageProbability: number;
  lossProbability: number;
  storagePerDay: number;
  platformPerItem: number;
  minPhotos: number;
  disputeDays: number;
  cutoffHours: number;
  batchKg: number;
  batchVolume: number;
  operatorMinutesPerDay: number;
  individualFreight: number;
  individualPackaging: number;
  individualDays: number;
  storeFixedWeekly: number;
  storeTravelPerItem: number;
  storeDays: number;
  individualDamageProbability: number;
  storeDamageProbability: number;
  baselineResellable: number;
}
export interface Network {
  version: number;
  brands: Brand[];
  buyers: Buyer[];
  orders: Order[];
  returns: ReturnRecord[];
  batches: Batch[];
  parameters: CostParameters;
  notices: string[];
}
