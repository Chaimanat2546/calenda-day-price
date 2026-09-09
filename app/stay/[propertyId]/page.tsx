import Link from "next/link";
import { notFound } from "next/navigation";
import { PropertyPicture } from "@/components/properties/property-list";
import { CustomerCalendar } from "@/components/pricing/customer-calendar";
import { getPublicPropertyCalendar } from "@/server/services/public-pricing-service";

export const metadata = { title: "ปฏิทินราคาบ้านพัก | Primo Stay" };

export default async function PublicPropertyPage({ params, searchParams }: PageProps<"/stay/[propertyId]">) {
  const { propertyId } = await params;
  const query = await searchParams;
  const result = await getPublicPropertyCalendar(propertyId, typeof query.month === "string" ? query.month : undefined);
  if (!result) notFound();
  const { property, month, today, days } = result;
  const [year, monthNumber] = month.split("-").map(Number);
  const shift = (delta: number) => new Date(Date.UTC(year, monthNumber - 1 + delta, 1)).toISOString().slice(0, 7);
  const monthLabel = new Intl.DateTimeFormat("th-TH", { month: "long", year: "numeric", timeZone: "Asia/Bangkok" }).format(new Date(`${month}-01T12:00:00+07:00`));
  return <main className="customer-workspace">
    <Link className="property-back" href="/stay">← บ้านพักทั้งหมด</Link>
    <header className="customer-property"><PropertyPicture property={property} /><div><p className="eyebrow">PRIMO STAY</p><h1>{property.name}</h1>{property.location ? <p>{property.location}</p> : null}<p>{property.description}</p></div></header>
    <section className="calendar-card" aria-labelledby="customer-month">
      <div className="calendar-card__topline"><h2 id="customer-month">{monthLabel}</h2><nav className="customer-month-controls" aria-label="เลือกเดือน">
        <Link aria-label="เดือนก่อนหน้า" href={`?month=${shift(-1)}`} prefetch={false}>‹</Link><Link href={`?month=${today.slice(0, 7)}`} prefetch={false}>เดือนนี้</Link><Link aria-label="เดือนถัดไป" href={`?month=${shift(1)}`} prefetch={false}>›</Link>
      </nav></div>
      <CustomerCalendar key={month} days={days} today={today} />
    </section>
  </main>;
}
