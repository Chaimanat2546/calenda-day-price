"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getProperties } from "@/components/pricing/api-client";
import { PricingCalendar } from "@/components/pricing/pricing-calendar";
import { PropertyList } from "./property-list";
import type { Property } from "@/server/types/pricing";

export function PropertyWorkspace() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [active, setActive] = useState<Property | null>(null);
  const [month, setMonth] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [switching, setSwitching] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    let cancelled = false;
    getProperties().then(data => { if (!cancelled) { setProperties(data); setError(false); } })
      .catch(() => { if (!cancelled) setError(true); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [retry]);
  useEffect(() => {
    if (!switching) return;
    const opener = document.activeElement;
    dialogRef.current?.showModal();
    return () => { if (opener instanceof HTMLElement && opener.isConnected) opener.focus(); };
  }, [switching]);
  function select(property: Property) { setActive(property); setSwitching(false); }
  return <>
    {active ? <PricingCalendar key={active.id} initialProperty={active} initialMonth={month} onMonthChange={setMonth} onBackToProperties={() => setActive(null)} onSwitchProperty={() => setSwitching(true)} /> : <main className="property-workspace">
      <header className="property-page-header"><p className="eyebrow">VILLARATE STUDIO</p><h1>บ้านพักทั้งหมด</h1><p>เลือกบ้านพักเพื่อจัดการราคาพิเศษและโปรไฟลุก</p></header>
      <Link className="button button--secondary customer-preview-link" href="/stay">ดูหน้าลูกค้า</Link>
      <section className="property-panel" aria-label="รายการบ้านพัก">
        {loading ? <p role="status">กำลังโหลดบ้านพัก…</p> : error ? <div role="alert"><p>โหลดรายการบ้านพักไม่สำเร็จ</p><button className="button button--primary" onClick={() => { setLoading(true); setRetry(v => v + 1); }} type="button">ลองอีกครั้ง</button></div> : <PropertyList properties={properties} onSelect={select} />}
      </section>
    </main>}
    {switching ? <dialog className="property-dialog" ref={dialogRef} onCancel={() => setSwitching(false)} aria-labelledby="switch-property-title">
      <div className="property-dialog__heading"><h2 id="switch-property-title">เปลี่ยนบ้านพัก</h2><button className="drawer-close" aria-label="ปิดรายการบ้านพัก" onClick={() => setSwitching(false)} type="button">×</button></div>
      <PropertyList properties={properties} activeId={active?.id} onSelect={select} />
    </dialog> : null}
  </>;
}
