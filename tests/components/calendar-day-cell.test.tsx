// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { CalendarDayCell } from "@/components/pricing/calendar-day-cell";

afterEach(cleanup);

test("shows an exact mobile price and exposes selection without hiding deal status", () => {
  render(<CalendarDayCell date="2026-09-15" day={15} label="15 กันยายน 2569"
    calendarPrice={{ date: "2026-09-15", net_price: 1990, status_type: "holiday", is_hot_deal: true }}
    isSelected isInRange onSelect={vi.fn()} />);
  const day = screen.getByRole("button", { name: /เลือกวันที่ 15 กันยายน 2569/ });
  expect(day.getAttribute("aria-pressed")).toBe("true");
  expect(screen.getByText("1,990")).toBeTruthy();
  expect(screen.queryByRole("img", { name: "วันหยุด" })).toBeNull();
  expect(screen.getByText("โปรไฟลุกในวันหยุด")).toBeTruthy();
  expect(day.querySelectorAll(".pricing-day__badge")).toHaveLength(1);
  expect(screen.getByRole("img", { name: "โปรไฟลุก" })).toBeTruthy();
  expect(screen.getByRole("img", { name: "โปรไฟลุก" }).textContent).toBe("🔥");
});
