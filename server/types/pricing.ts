export const STATUS_TYPES = [
  "holiday",
  "promotion",
] as const;

export type StatusType = (typeof STATUS_TYPES)[number];

export const BASE_DAILY_PRICE = 1500;

export interface Property {
  id: string;
  name: string;
  description: string | null;
  location?: string | null;
  image_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DailyPrice {
  id: string;
  property_id: string;
  date: string;
  status_type: StatusType;
  net_price: number;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface HotDeal {
  id: string;
  property_id: string;
  date: string;
  net_price: number;
  show_before_days: number;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface CalendarDayPrice {
  date: string;
  status_type: StatusType | null;
  net_price: number;
  is_hot_deal: boolean;
}

export const SEEDED_PROPERTY: Pick<Property, "name" | "description"> = {
  name: "บ้านพักตัวอย่าง",
  description: "บ้านพักสำหรับทดสอบระบบราคา",
};
