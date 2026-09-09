// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test } from "vitest";
import { CustomerCalendar } from "@/components/pricing/customer-calendar";

afterEach(cleanup);

test("customers can inspect conditions without editing prices", async () => {
  render(<CustomerCalendar today="2026-09-13" days={[{ date: "2026-09-20", net_price: 990, status_type: "holiday", is_hot_deal: true, description: "จองขั้นต่ำ 2 คืน" }]} />);
  expect(screen.queryByText("จองขั้นต่ำ 2 คืน")).toBeNull();
  await userEvent.click(screen.getByRole("button", { name: /เลือกวันที่ 20 กันยายน/ }));
  expect(screen.getByText("จองขั้นต่ำ 2 คืน")).toBeTruthy();
  expect(screen.getByText("990 บาท / คืน")).toBeTruthy();
  expect(screen.queryByRole("button", { name: /บันทึก|ลบ|แก้ไข/ })).toBeNull();
  expect(screen.queryByRole("spinbutton")).toBeNull();
});
