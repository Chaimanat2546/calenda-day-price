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
  test("shows the Stitch desktop inspector controls and resets the active range from Bulk Pricing", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }))
    );
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ data: [property] }))
      .mockResolvedValueOnce(jsonResponse({ data: [] }));
    vi.stubGlobal("fetch", fetchMock);

    render(<PricingCalendar initialMonth="2026-04" />);

    await screen.findByRole("heading", { name: "ราคาพิเศษรายวัน" });
    expect(screen.getByRole("button", { name: "Bulk Pricing" })).toBeTruthy();
    expect(screen.getByText("CELL INSPECTOR")).toBeTruthy();
    expect(screen.getByRole("button", { name: "-฿200" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "+฿200" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "เลือกวันที่ 15 เมษายน 2569" }));
    expect(screen.getByRole("button", { name: "บันทึกราคาพิเศษ" }).hasAttribute("disabled")).toBe(false);
    await user.click(screen.getByRole("button", { name: "+฿200" }));
    expect((screen.getByLabelText("ราคาสุทธิ") as HTMLInputElement).value).toBe("1700");
    await user.click(screen.getByRole("button", { name: "-฿200" }));
    expect((screen.getByLabelText("ราคาสุทธิ") as HTMLInputElement).value).toBe("1500");
    await user.click(screen.getByRole("button", { name: "Bulk Pricing" }));
    expect(screen.getByRole("button", { name: "บันทึกราคาพิเศษ" }).hasAttribute("disabled")).toBe(true);
  });

  test("shows the base price for a normal calendar day", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ data: [property] }))
      .mockResolvedValueOnce(jsonResponse({ data: [] }));
    vi.stubGlobal("fetch", fetchMock);

    render(<PricingCalendar initialMonth="2026-04" />);

    const day = await screen.findByRole("button", {
      name: /เลือกวันที่ 15 เมษายน 2569/,
    });
    expect(within(day).getByText("฿1,500", { exact: true })).toBeTruthy();
  });

  test("returns mobile Bulk Pricing to the calendar so a new range can be selected", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ data: [property] }))
      .mockResolvedValueOnce(jsonResponse({ data: [] }));
    vi.stubGlobal("fetch", fetchMock);

    render(<PricingCalendar initialMonth="2026-04" />);

    await screen.findByRole("heading", { name: "ราคาพิเศษรายวัน" });
    await user.click(screen.getByRole("button", { name: "Bulk Pricing" }));
    const drawer = await screen.findByRole("dialog", { name: "ตั้งค่าราคาพิเศษ" });
    await user.click(within(drawer).getByRole("button", { name: "เลือกวันในปฏิทิน" }));

    const firstDay = screen.getByRole("button", { name: "เลือกวันที่ 1 เมษายน 2569" });
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "ตั้งค่าราคาพิเศษ" })).toBeNull();
      expect(document.activeElement).toBe(firstDay);
    });
    await user.click(firstDay);
    expect((await screen.findByRole("button", { name: "บันทึกราคาพิเศษ" })).hasAttribute("disabled")).toBe(false);
  });

  test("lists all pricing states in the legend", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ data: [property] }))
      .mockResolvedValueOnce(jsonResponse({ data: [] }));
    vi.stubGlobal("fetch", fetchMock);

    render(<PricingCalendar initialMonth="2026-04" />);

    await screen.findByRole("heading", { name: "ราคาพิเศษรายวัน" });
    const legend = screen.getByLabelText("คำอธิบายสถานะ");
    expect(within(legend).getByText("วันปกติ")).toBeTruthy();
    expect(within(legend).getByText("วันหยุด")).toBeTruthy();
    expect(within(legend).getByText("ราคาพิเศษ")).toBeTruthy();
    expect(within(legend).getByText("โปรไฟลุก")).toBeTruthy();
  });

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
    expect(within(drawer).getByText("฿1,500", { exact: true })).toBeTruthy();
    expect(document.activeElement).toBe(within(drawer).getByRole("button", { name: "ปิดการตั้งค่าราคา" }));
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(within(drawer).getByRole("button", { name: "รีเซ็ตเป็นราคาปกติ" }));
    await user.tab();
    expect(document.activeElement).toBe(within(drawer).getByRole("button", { name: "ปิดการตั้งค่าราคา" }));
    await user.keyboard("{Escape}");
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "ตั้งค่าราคาพิเศษ" })).toBeNull();
    });
    expect(document.activeElement).toBe(opener);
  });

  test("shows the Stitch mobile inspector and applies a Hot Deal lead-time preset", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ data: [property] }))
      .mockResolvedValueOnce(jsonResponse({ data: [] }));
    vi.stubGlobal("fetch", fetchMock);

    render(<PricingCalendar initialMonth="2026-04" />);

    const day = await screen.findByRole("button", { name: "เลือกวันที่ 15 เมษายน 2569" });
    expect(within(day).getByText("฿1.5k", { exact: true })).toBeTruthy();
    await user.click(day);
    const drawer = await screen.findByRole("dialog", { name: "ตั้งค่าราคาพิเศษ" });
    expect(within(drawer).getByRole("heading", { name: "ปรับแต่งราคา (วันพุธที่ 15 เมษายน 2569)" })).toBeTruthy();
    expect(within(drawer).getByText("บ้านพักตัวอย่าง · วันพุธที่ 15 เมษายน 2569")).toBeTruthy();
    expect(drawer.querySelector(".pricing-editor__range")?.textContent).toBe("วันพุธที่ 15 เมษายน 2569");

    await user.click(within(drawer).getByRole("button", { name: "🔥 โปรไฟลุก" }));
    const leadTimeInput = within(drawer).getByLabelText("เริ่มแสดงล่วงหน้า");
    await user.clear(leadTimeInput);
    await user.type(leadTimeInput, "5");
    await user.click(within(drawer).getByRole("button", { name: "7 วัน (แนะนำ)" }));

    expect((leadTimeInput as HTMLInputElement).value).toBe("7");
    expect(within(drawer).getByRole("button", { name: "7 วัน (แนะนำ)" }).getAttribute("aria-pressed")).toBe("true");
  });

  test("closes the mobile pricing drawer from its backdrop and restores opener focus", async () => {
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

  test("checks daily price conflicts before rendering the overwrite confirmation", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ data: [property] }))
      .mockResolvedValueOnce(jsonResponse({ data: [] }))
      .mockResolvedValueOnce(
        jsonResponse({ data: { dates: ["2026-04-16"] } })
      )
      .mockResolvedValueOnce(jsonResponse({ data: [] }))
      .mockResolvedValueOnce(jsonResponse({ data: [] }));
    vi.stubGlobal("fetch", fetchMock);

    render(<PricingCalendar initialMonth="2026-04" />);

    await screen.findByRole("heading", { name: "ราคาพิเศษรายวัน" });
    await user.click(screen.getByRole("button", { name: "เลือกวันที่ 15 เมษายน 2569" }));
    expect(await screen.findByRole("dialog", { name: "ตั้งค่าราคาพิเศษ" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "เลือกวันที่ 17 เมษายน 2569" }));
    await user.selectOptions(screen.getByLabelText("สถานะ"), "holiday");
    await user.clear(screen.getByLabelText("ราคาสุทธิ"));
    await user.type(screen.getByLabelText("ราคาสุทธิ"), "2200");
    await user.click(screen.getByRole("button", { name: "บันทึกราคาพิเศษ" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenLastCalledWith(
        `/api/properties/${property.id}/daily-prices/conflicts`,
        expect.objectContaining({ method: "POST" })
      );
      const conflictRequest = fetchMock.mock.calls.find(
        ([url, init]) => String(url).endsWith("/daily-prices/conflicts") && init?.method === "POST"
      );
      expect(conflictRequest).toBeTruthy();
      expect(JSON.parse(String(conflictRequest?.[1]?.body))).toEqual({
        startDate: "2026-04-15",
        endDate: "2026-04-17",
      });
    });
    expect(await screen.findByText("พบราคาพิเศษ 1 วันในช่วงที่เลือก")).toBeTruthy();
    expect(screen.getByText("16 เมษายน 2569")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "ยืนยันการทับราคา" }));
    await waitFor(() => {
      const overwriteRequest = fetchMock.mock.calls.find(
        ([url, init]) => String(url).endsWith("/daily-prices/range") && init?.method === "PUT"
      );
      expect(overwriteRequest).toBeTruthy();
      expect(JSON.parse(String(overwriteRequest?.[1]?.body))).toEqual({
        startDate: "2026-04-15",
        endDate: "2026-04-17",
        statusType: "holiday",
        netPrice: 2200,
        description: null,
        confirmOverwrite: true,
      });
    });
  });

  test("uses the Hot Deal conflict endpoint after switching editor mode", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ data: [property] }))
      .mockResolvedValueOnce(jsonResponse({ data: [] }))
      .mockResolvedValueOnce(jsonResponse({ data: { dates: [] } }))
      .mockResolvedValueOnce(jsonResponse({ data: [] }))
      .mockResolvedValueOnce(jsonResponse({ data: [] }));
    vi.stubGlobal("fetch", fetchMock);

    render(<PricingCalendar initialMonth="2026-04" />);

    await screen.findByRole("heading", { name: "ราคาพิเศษรายวัน" });
    await user.click(screen.getByRole("button", { name: "เลือกวันที่ 15 เมษายน 2569" }));
    await user.click(screen.getByRole("button", { name: "🔥 โปรไฟลุก" }));
    await user.clear(screen.getByLabelText("ราคา Hot Deal"));
    await user.type(screen.getByLabelText("ราคา Hot Deal"), "1200");
    await user.clear(screen.getByLabelText("เริ่มแสดงล่วงหน้า"));
    await user.type(screen.getByLabelText("เริ่มแสดงล่วงหน้า"), "5");
    await user.click(screen.getByRole("button", { name: "บันทึก Hot Deal" }));

    await waitFor(() => {
      const conflictRequest = fetchMock.mock.calls.find(
        ([url, init]) => String(url).endsWith("/hot-deals/conflicts") && init?.method === "POST"
      );
      expect(conflictRequest).toBeTruthy();
      expect(JSON.parse(String(conflictRequest?.[1]?.body))).toEqual({
        startDate: "2026-04-15",
        endDate: "2026-04-15",
      });
      expect(
        fetchMock.mock.calls.some(([url]) => String(url).endsWith("/daily-prices/conflicts"))
      ).toBe(false);
    });

    await waitFor(() => {
      const updateRequest = fetchMock.mock.calls.find(
        ([url, init]) => String(url).endsWith("/hot-deals/range") && init?.method === "PUT"
      );
      expect(updateRequest).toBeTruthy();
      expect(JSON.parse(String(updateRequest?.[1]?.body))).toEqual({
        startDate: "2026-04-15",
        endDate: "2026-04-15",
        netPrice: 1200,
        showBeforeDays: 5,
        description: null,
        confirmOverwrite: false,
      });
    });
  });

  test("composes the Holiday base style with the Hot Deal overlay", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ data: [property] }))
      .mockResolvedValueOnce(
        jsonResponse({
          data: [
            {
              date: "2026-04-15",
              status_type: "holiday",
              net_price: 1200,
              is_hot_deal: true,
            },
          ],
        })
      );
    vi.stubGlobal("fetch", fetchMock);

    render(<PricingCalendar initialMonth="2026-04" />);

    const day = await screen.findByRole("button", {
      name: /เลือกวันที่ 15 เมษายน 2569/,
    });
    await waitFor(() => {
      expect(day.classList.contains("pricing-day--holiday")).toBe(true);
      expect(day.classList.contains("pricing-day--hot-deal")).toBe(true);
    });
    expect(within(day).getByRole("img", { name: "โปรไฟลุก" })).toBeTruthy();
    expect(within(day).getByText("฿1,200")).toBeTruthy();
    expect(within(day).getByText("฿1,500", { exact: true })).toBeTruthy();
    expect(day.getAttribute("aria-label")).toContain("วันหยุด");
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/properties/${property.id}/calendar-prices?from=2026-04-01&to=2026-04-30`,
      undefined
    );
  });

  test("shows an existing holiday's true status in the inspector", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ data: [property] }))
      .mockResolvedValueOnce(
        jsonResponse({
          data: [
            {
              date: "2026-04-15",
              status_type: "holiday",
              net_price: 1200,
              is_hot_deal: false,
            },
          ],
        })
      );
    vi.stubGlobal("fetch", fetchMock);

    render(<PricingCalendar initialMonth="2026-04" />);

    const day = await screen.findByRole("button", {
      name: /เลือกวันที่ 15 เมษายน 2569/,
    });
    await user.click(day);

    const drawer = await screen.findByRole("dialog", { name: "ตั้งค่าราคาพิเศษ" });
    expect(drawer.querySelector(".pricing-editor__status-pill")?.textContent).toBe("วันหยุด");
    expect(drawer.querySelector(".pricing-editor__status-pill")?.textContent).not.toContain("โปรโมชั่น");
  });

  test("uses the selected Hot Deal mode for a persisted normal-day record", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ data: [property] }))
      .mockResolvedValueOnce(
        jsonResponse({
          data: [
            {
              date: "2026-04-15",
              status_type: null,
              net_price: 1500,
              is_hot_deal: false,
            },
          ],
        })
      );
    vi.stubGlobal("fetch", fetchMock);

    render(<PricingCalendar initialMonth="2026-04" />);

    const day = await screen.findByRole("button", {
      name: /เลือกวันที่ 15 เมษายน 2569/,
    });
    await user.click(day);

    const drawer = await screen.findByRole("dialog", { name: "ตั้งค่าราคาพิเศษ" });
    await user.click(within(drawer).getByRole("button", { name: "🔥 โปรไฟลุก" }));
    expect(drawer.querySelector(".pricing-editor__status-pill")?.textContent).toBe("โปรไฟลุก");
  });

  test("keeps the Hot Deal visual state inside a selected range", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ data: [property] }))
      .mockResolvedValueOnce(
        jsonResponse({
          data: [
            {
              date: "2026-04-16",
              status_type: null,
              net_price: 1200,
              is_hot_deal: true,
            },
          ],
        })
      );
    vi.stubGlobal("fetch", fetchMock);

    render(<PricingCalendar initialMonth="2026-04" />);

    const startDay = await screen.findByRole("button", {
      name: /เลือกวันที่ 15 เมษายน 2569/,
    });
    const hotDealDay = screen.getByRole("button", {
      name: /เลือกวันที่ 16 เมษายน 2569/,
    });
    const endDay = screen.getByRole("button", {
      name: /เลือกวันที่ 17 เมษายน 2569/,
    });
    await waitFor(() => {
      expect(hotDealDay.classList.contains("pricing-day--hot-deal")).toBe(true);
    });

    await user.click(startDay);
    await user.click(endDay);

    await waitFor(() => {
      expect(hotDealDay.classList.contains("pricing-day--in-range")).toBe(true);
      expect(hotDealDay.classList.contains("pricing-day--hot-deal-in-range")).toBe(true);
    });
  });

  test("lets Hot Deal replace Promotion in the management calendar cell", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ data: [property] }))
      .mockResolvedValueOnce(
        jsonResponse({
          data: [
            {
              date: "2026-04-15",
              status_type: "promotion",
              net_price: 1200,
              is_hot_deal: true,
            },
          ],
        })
      );
    vi.stubGlobal("fetch", fetchMock);

    render(<PricingCalendar initialMonth="2026-04" />);

    const day = await screen.findByRole("button", {
      name: /เลือกวันที่ 15 เมษายน 2569/,
    });
    await waitFor(() => {
      expect(day.classList.contains("pricing-day--promotion")).toBe(false);
      expect(day.classList.contains("pricing-day--hot-deal")).toBe(true);
    });
    expect(within(day).queryByRole("img", { name: "โปรโมชั่น" })).toBeNull();
    expect(within(day).getByRole("img", { name: "โปรไฟลุก" })).toBeTruthy();
    expect(day.getAttribute("aria-label")).not.toContain("โปรโมชั่น");
  });

  test("disables saving while a range update is pending to prevent duplicate submissions", async () => {
    const user = userEvent.setup();
    let resolveUpdate: (response: Response) => void = () => undefined;
    const pendingUpdate = new Promise<Response>((resolve) => {
      resolveUpdate = resolve;
    });
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ data: [property] }))
      .mockResolvedValueOnce(jsonResponse({ data: [] }))
      .mockResolvedValueOnce(jsonResponse({ data: { dates: [] } }))
      .mockReturnValueOnce(pendingUpdate)
      .mockResolvedValueOnce(jsonResponse({ data: [] }));
    vi.stubGlobal("fetch", fetchMock);

    render(<PricingCalendar initialMonth="2026-04" />);

    await screen.findByRole("heading", { name: "ราคาพิเศษรายวัน" });
    await user.click(screen.getByRole("button", { name: "เลือกวันที่ 15 เมษายน 2569" }));
    const saveButton = screen.getByRole("button", { name: "บันทึกราคาพิเศษ" });
    await user.click(saveButton);

    await waitFor(() => {
      expect(fetchMock.mock.calls.filter(([, init]) => init?.method === "PUT")).toHaveLength(1);
    });
    expect(saveButton.hasAttribute("disabled")).toBe(true);
    await user.click(saveButton);
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === "PUT")).toHaveLength(1);

    resolveUpdate(jsonResponse({ data: [] }));
    expect(await screen.findByText("บันทึกราคาพิเศษแล้ว")).toBeTruthy();
  });
});
