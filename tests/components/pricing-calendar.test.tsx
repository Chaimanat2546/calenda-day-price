// @vitest-environment jsdom

import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { PricingCalendar } from "@/components/pricing/pricing-calendar";

const property = {
  id: "5f0cbf1d-5f78-4dca-a14c-d1fa66379070",
  name: "บ้านพักตัวอย่าง",
  description: "บ้านพักสำหรับทดสอบระบบราคา",
  created_at: "2026-04-01T00:00:00.000Z",
  updated_at: "2026-04-01T00:00:00.000Z",
};

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

beforeEach(() => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation(() => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  );
});

describe("PricingCalendar", () => {
  test("opens and closes the mobile pricing drawer with keyboard", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ data: [property] }))
      .mockResolvedValueOnce(jsonResponse({ data: [] }));
    vi.stubGlobal("fetch", fetchMock);

    render(<PricingCalendar initialMonth="2026-04" />);

    await screen.findByRole("heading", { name: "ราคาพิเศษรายวัน" });
    const opener = screen.getByRole("button", { name: "เลือกวันที่ 15 เมษายน 2569" });
    await user.click(opener);
    const drawer = await screen.findByRole("dialog", { name: "ตั้งค่าราคาพิเศษ" });
    expect(drawer).toBeTruthy();
    expect(document.activeElement).toBe(within(drawer).getByRole("button", { name: "ปิดการตั้งค่าราคา" }));
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(within(drawer).getByRole("button", { name: "ลบสถานะในช่วงนี้" }));
    await user.tab();
    expect(document.activeElement).toBe(within(drawer).getByRole("button", { name: "ปิดการตั้งค่าราคา" }));
    await user.keyboard("{Escape}");
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "ตั้งค่าราคาพิเศษ" })).toBeNull();
    });
    expect(document.activeElement).toBe(opener);
  });

  test("restores focus after closing the mobile pricing drawer from its backdrop", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ data: [property] }))
      .mockResolvedValueOnce(jsonResponse({ data: [] }));
    vi.stubGlobal("fetch", fetchMock);

    render(<PricingCalendar initialMonth="2026-04" />);

    await screen.findByRole("heading", { name: "ราคาพิเศษรายวัน" });
    const opener = screen.getByRole("button", { name: "เลือกวันที่ 15 เมษายน 2569" });
    await user.click(opener);
    await screen.findByRole("dialog", { name: "ตั้งค่าราคาพิเศษ" });
    const backdrop = document.querySelector<HTMLButtonElement>(".mobile-drawer__backdrop");
    expect(backdrop).not.toBeNull();
    await user.click(backdrop!);
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "ตั้งค่าราคาพิเศษ" })).toBeNull();
    });
    expect(document.activeElement).toBe(opener);
  });

  test("restores focus after closing the mobile pricing drawer from its close button", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ data: [property] }))
      .mockResolvedValueOnce(jsonResponse({ data: [] }));
    vi.stubGlobal("fetch", fetchMock);

    render(<PricingCalendar initialMonth="2026-04" />);

    await screen.findByRole("heading", { name: "ราคาพิเศษรายวัน" });
    const opener = screen.getByRole("button", { name: "เลือกวันที่ 15 เมษายน 2569" });
    await user.click(opener);
    const drawer = await screen.findByRole("dialog", { name: "ตั้งค่าราคาพิเศษ" });
    await user.click(within(drawer).getByRole("button", { name: "ปิดการตั้งค่าราคา" }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "ตั้งค่าราคาพิเศษ" })).toBeNull();
    });
    expect(document.activeElement).toBe(opener);
  });

  test("checks conflicts before rendering the overwrite confirmation", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ data: [property] }))
      .mockResolvedValueOnce(jsonResponse({ data: [] }))
      .mockResolvedValueOnce(
        jsonResponse({ data: { dates: ["2026-04-16"] } })
      );
    vi.stubGlobal("fetch", fetchMock);

    render(<PricingCalendar initialMonth="2026-04" />);

    await screen.findByRole("heading", { name: "ราคาพิเศษรายวัน" });
    await user.click(screen.getByRole("button", { name: "เลือกวันที่ 15 เมษายน 2569" }));
    expect(await screen.findByRole("dialog", { name: "ตั้งค่าราคาพิเศษ" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "เลือกวันที่ 17 เมษายน 2569" }));
    await user.selectOptions(screen.getByLabelText("สถานะ"), "hot_deal");
    await user.clear(screen.getByLabelText("ราคาสุทธิ"));
    await user.type(screen.getByLabelText("ราคาสุทธิ"), "2200");
    await user.click(screen.getByRole("button", { name: "บันทึกราคาพิเศษ" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenLastCalledWith(
        `/api/properties/${property.id}/daily-prices/conflicts`,
        expect.objectContaining({ method: "POST" })
      );
    });
    expect(await screen.findByText("พบราคาพิเศษ 1 วันในช่วงที่เลือก")).toBeTruthy();
    expect(screen.getByText("16 เมษายน 2569")).toBeTruthy();
    expect(screen.getByRole("button", { name: "ยืนยันการทับราคา" })).toBeTruthy();
  });
});
