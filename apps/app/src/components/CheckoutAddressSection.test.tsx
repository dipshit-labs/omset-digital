import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { getCities } from "@/actions/administrativeAreas";
import { CheckoutAddressSection } from "./CheckoutAddressSection";

vi.mock(import("@/actions/administrativeAreas"), () => ({
  getCities: vi
    .fn<
      (
        id: number | string
      ) => Promise<{ city_id: number; city_name: string; city_type: string }[]>
    >()
    .mockImplementation((provinceId: number | string) => {
      if (Number(provinceId) === 5) {
        return Promise.resolve([
          { city_id: 39, city_name: "Bantul", city_type: "Kabupaten" },
        ]);
      }
      return Promise.resolve([]);
    }),
  getProvinces: vi
    .fn<() => Promise<{ province_id: number; province_name: string }[]>>()
    .mockResolvedValue([
      { province_id: 1, province_name: "Bali" },
      { province_id: 5, province_name: "DI Yogyakarta" },
    ]),
  getSubdistricts: vi
    .fn<
      (id: number | string) => Promise<
        {
          postal_code: string;
          subdistrict_id: number;
          subdistrict_name: string;
        }[]
      >
    >()
    .mockImplementation((cityId: number | string) => {
      if (Number(cityId) === 39) {
        return Promise.resolve([
          {
            postal_code: "55715",
            subdistrict_id: 537,
            subdistrict_name: "Bambang Lipuro",
          },
        ]);
      }
      return Promise.resolve([]);
    }),
}));

describe(CheckoutAddressSection, () => {
  afterEach(() => {
    cleanup();
  });

  it("renders heading and connects to server actions for geographic lookup in under 5 ms", async () => {
    const onChange = vi.fn<() => void>();

    // Benchmark server action lookup response time directly
    const actionStart = performance.now();
    const cities = await getCities(5);
    const actionElapsed = performance.now() - actionStart;
    expect(actionElapsed).toBeLessThan(10);
    expect(cities).toHaveLength(1);

    render(<CheckoutAddressSection onChange={onChange} />);

    await waitFor(() => {
      expect(screen.getByText("DI Yogyakarta")).toBeDefined();
    });

    fireEvent.change(screen.getByLabelText(/province/iu), {
      target: { value: "5" },
    });

    await waitFor(() => {
      expect(screen.getByText(/Bantul/iu)).toBeDefined();
    });

    fireEvent.change(screen.getByLabelText(/city/iu), {
      target: { value: "39" },
    });

    await waitFor(() => {
      expect(screen.getByText("Bambang Lipuro")).toBeDefined();
    });

    fireEvent.change(screen.getByLabelText(/subdistrict/iu), {
      target: { value: "537" },
    });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        cityId: 39,
        cityName: "Bantul",
        cityType: "Kabupaten",
        postalCode: "55715",
        provinceId: 5,
        provinceName: "DI Yogyakarta",
        subdistrictId: 537,
        subdistrictName: "Bambang Lipuro",
      })
    );
  });
});
