import { PropertyList } from "@/components/properties/property-list";
import { getPublicProperties } from "@/server/services/public-pricing-service";

export const metadata = { title: "เลือกบ้านพักและดูราคา | Primo Stay" };

export default async function StayPage() {
  const properties = await getPublicProperties();
  return <main className="property-workspace"><header className="property-page-header"><p className="eyebrow">PRIMO STAY</p><h1>เลือกบ้านพักของคุณ</h1><p>ค้นหาบ้านพัก แล้วดูราคาและโปรโมชันตามวันที่ต้องการ</p></header><section className="property-panel" aria-label="บ้านพัก"><PropertyList properties={properties} publicView /></section></main>;
}
