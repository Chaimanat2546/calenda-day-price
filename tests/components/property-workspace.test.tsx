// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { PropertyWorkspace } from "@/components/properties/property-workspace";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

test("allows retrying a failed property request and shows an empty list honestly", async () => {
  const user = userEvent.setup();
  vi.stubGlobal("fetch", vi.fn<typeof fetch>()
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValueOnce(Response.json({ data: [] })));
  render(<PropertyWorkspace />);
  await user.click(await screen.findByRole("button", { name: "ลองอีกครั้ง" }));
  expect(await screen.findByRole("heading", { name: "ยังไม่มีบ้านพัก" })).toBeTruthy();
  expect(screen.queryByRole("button", { name: /จัดการราคา/ })).toBeNull();
});

test("starts with properties, filters by location and loads only the chosen property's prices", async () => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
  const user = userEvent.setup();
  const fetchMock = vi.fn<typeof fetch>().mockImplementation(async (url) => Response.json({ data: String(url) === "/api/properties"
    ? [{ id: "house-a", name: "บ้านทะเล", location: "หัวหิน" }, { id: "house-b", name: "บ้านภูเขา", location: "เชียงใหม่" }] : [] }));
  vi.stubGlobal("fetch", fetchMock);
  render(<PropertyWorkspace />);
  await screen.findByRole("button", { name: "จัดการราคา บ้านทะเล" });
  expect(fetchMock).toHaveBeenCalledTimes(1);
  await user.selectOptions(screen.getByLabelText("ทำเล"), "เชียงใหม่");
  expect(screen.queryByRole("button", { name: "จัดการราคา บ้านทะเล" })).toBeNull();
  await user.click(screen.getByRole("button", { name: "จัดการราคา บ้านภูเขา" }));
  await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/house-b/calendar-prices"))).toBe(true));
  await user.click(screen.getByRole("button", { name: "เดือนถัดไป" }));
  const month = document.getElementById("calendar-heading")?.textContent;
  await user.click(screen.getByRole("button", { name: "เปลี่ยนบ้าน" }));
  await user.click(screen.getByRole("button", { name: "จัดการราคา บ้านทะเล" }));
  await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/house-a/calendar-prices"))).toBe(true));
  expect(document.getElementById("calendar-heading")?.textContent).toBe(month);
  const day = screen.getAllByRole("button", { name: /เลือกวันที่/ })[0];
  await user.click(day);
  await user.clear(screen.getByLabelText("ราคาสุทธิ"));
  await user.type(screen.getByLabelText("ราคาสุทธิ"), "1900");
  await user.click(screen.getByRole("button", { name: "เปลี่ยนบ้าน" }));
  expect(screen.getByRole("dialog", { name: "มีข้อมูลที่ยังไม่บันทึก" })).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "กลับไปบันทึก" }));
  expect((screen.getByLabelText("ราคาสุทธิ") as HTMLInputElement).value).toBe("1900");
  await user.click(screen.getByRole("button", { name: "เปลี่ยนบ้าน" }));
  await user.click(screen.getByRole("button", { name: "ทิ้งการแก้ไขและไปต่อ" }));
  await user.click(screen.getByRole("button", { name: "จัดการราคา บ้านภูเขา" }));
  expect((screen.getByLabelText("ราคาสุทธิ") as HTMLInputElement).value).toBe("1500");
  expect(screen.getByRole("button", { name: "บันทึกราคาพิเศษ" }).hasAttribute("disabled")).toBe(true);
});
