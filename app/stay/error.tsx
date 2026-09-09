"use client";
export default function ErrorPage({ reset }: { reset: () => void }) { return <main className="property-workspace"><h1>โหลดข้อมูลที่พักไม่สำเร็จ</h1><p>กรุณาลองอีกครั้ง</p><button className="button button--primary" onClick={reset} type="button">ลองอีกครั้ง</button></main>; }
