"use client";

import { useState } from "react";
import Link from "next/link";
import { Home, MapPin, Search, ArrowRight } from "lucide-react";
import type { Property } from "@/server/types/pricing";

export function PropertyPicture({ property }: { property: Property }) {
  const [failed, setFailed] = useState(false);
  return <div className="property-picture">
    {property.image_url?.startsWith("https://") && !failed ? (
      // User-managed remote URLs; render directly without the Next image proxy.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={property.image_url} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
    ) : <Home aria-hidden="true" size={36} strokeWidth={1.4} />}
  </div>;
}

export function PropertyList({ properties, onSelect, activeId, publicView = false }: {
  properties: Property[]; onSelect?: (property: Property) => void; activeId?: string; publicView?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const locations = [...new Set(properties.map(p => p.location?.trim()).filter((value): value is string => Boolean(value)))].sort();
  const results = properties.filter(p => p.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()) && (!location || p.location?.trim() === location));
  return <>
    <div className="property-filters">
      <label><span>ค้นหาบ้านพัก</span><div className="property-search"><Search aria-hidden="true" size={18} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="พิมพ์ชื่อบ้านพัก" /></div></label>
      <label><span>ทำเล</span><select value={location} onChange={e => setLocation(e.target.value)}><option value="">ทุกทำเล</option>{locations.map(value => <option key={value} value={value}>{value}</option>)}</select></label>
    </div>
    <p className="property-count" role="status">พบ {results.length} จาก {properties.length} หลัง</p>
    {results.length ? <div className="property-list">{results.map(property => <article className="property-card" key={property.id}>
      <PropertyPicture property={property} />
      <div className="property-card__details"><h2>{property.name}</h2><p className="property-location"><MapPin aria-hidden="true" size={15} />{property.location || "ยังไม่ระบุทำเล"}</p><p>{property.description || "ยังไม่มีรายละเอียดบ้านพัก"}</p>{activeId === property.id ? <span className="property-current">กำลังจัดการ</span> : null}</div>
      {publicView ? <Link className="button button--primary" href={`/stay/${property.id}`} aria-label={`ดูราคา ${property.name}`}>ดูราคา <ArrowRight aria-hidden="true" size={16} /></Link> : <button className="button button--primary" aria-label={`จัดการราคา ${property.name}`} onClick={() => onSelect?.(property)} type="button">จัดการราคา <ArrowRight aria-hidden="true" size={16} /></button>}
    </article>)}</div> : <div className="property-empty"><Home aria-hidden="true" size={32} /><h2>{properties.length ? "ไม่พบบ้านพักที่ตรงกับการค้นหา" : "ยังไม่มีบ้านพัก"}</h2><p>{properties.length ? "ลองเปลี่ยนชื่อหรือเลือกทำเลอื่น" : "เพิ่มข้อมูลบ้านพักในระบบก่อนเริ่มจัดการราคา"}</p>{properties.length ? <button className="button button--secondary" onClick={() => { setQuery(""); setLocation(""); }} type="button">ล้างตัวกรอง</button> : null}</div>}
  </>;
}
