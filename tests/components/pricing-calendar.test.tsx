// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";

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
  vi.unstubAllGlobals();
});

describe("PricingCalendar", () => {
  test("checks conflicts before rendering the overwrite confirmation", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ data: [property] }))
      .mockResolvedValueOnce(jsonResponse({ data: [] }))
      .mockResolvedValueOnce(
        jsonResponse({ data: { conflicts: ["2026-04-16"] } })
      );
    vi.stubGlobal("fetch", fetchMock);

    render(<PricingCalendar initialMonth="2026-04" />);

    await screen.findByRole("heading", { name: "ราคาพิเศษรายวัน" });
    await user.click(screen.getByRole("button", { name: "เลือกวันที่ 15 เมษายน 2569" }));
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
    expect(screen.getByRole("button", { name: "ยืนยันการทับราคา" })).toBeTruthy();
  });
});
