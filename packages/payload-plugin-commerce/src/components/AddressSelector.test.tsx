import type { CityItem, ProvinceItem, SubdistrictItem } from "../types";
import type { ResolvedAddress } from "./useAdministrativeAreas";

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AddressSelector } from "./AddressSelector";

const mockProvinces: ProvinceItem[] = [
  { province_id: 1, province_name: "Bali" },
  { province_id: 5, province_name: "DI Yogyakarta" },
];

const mockCities: CityItem[] = [
  { city_id: 39, city_name: "Bantul", city_type: "Kabupaten" },
  { city_id: 501, city_name: "Yogyakarta", city_type: "Kota" },
];

const mockSubdistricts: SubdistrictItem[] = [
  {
    postal_code: "55715",
    subdistrict_id: 537,
    subdistrict_name: "Bambang Lipuro",
  },
  {
    postal_code: "55719",
    subdistrict_id: 538,
    subdistrict_name: "Banguntapan",
  },
];

describe("AddressSelector storefront component", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders address select controls with initial disabled states", async () => {
    const fetchProvinces = vi
      .fn<() => Promise<ProvinceItem[]>>()
      .mockResolvedValue(mockProvinces);

    render(<AddressSelector fetchProvinces={fetchProvinces} />);

    // SAFETY: Input elements in jsdom conform to HTMLSelectElement.
    const provinceSelect = screen.getByLabelText(
      /province/iu
    ) as HTMLSelectElement;
    const citySelect = screen.getByLabelText(/city/iu) as HTMLSelectElement;
    const subdistrictSelect = screen.getByLabelText(
      /subdistrict/iu
    ) as HTMLSelectElement;

    expect(provinceSelect).toBeDefined();
    expect(citySelect.disabled).toBeTruthy();
    expect(subdistrictSelect.disabled).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByText("Bali")).toBeDefined();
      expect(screen.getByText("DI Yogyakarta")).toBeDefined();
    });
  });

  it("cascades selection: choosing province loads cities, choosing city loads subdistricts", async () => {
    const fetchProvinces = vi
      .fn<() => Promise<ProvinceItem[]>>()
      .mockResolvedValue(mockProvinces);
    const fetchCities = vi
      .fn<(id: number | string) => Promise<CityItem[]>>()
      .mockResolvedValue(mockCities);
    const fetchSubdistricts = vi
      .fn<(id: number | string) => Promise<SubdistrictItem[]>>()
      .mockResolvedValue(mockSubdistricts);
    const onChange = vi.fn<(addr: ResolvedAddress) => void>();

    render(
      <AddressSelector
        fetchCities={fetchCities}
        fetchProvinces={fetchProvinces}
        fetchSubdistricts={fetchSubdistricts}
        onChange={onChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("DI Yogyakarta")).toBeDefined();
    });

    fireEvent.change(screen.getByLabelText(/province/iu), {
      target: { value: "5" },
    });

    // SAFETY: In jsdom city select is HTMLSelectElement.
    const citySelect = screen.getByLabelText(/city/iu) as HTMLSelectElement;
    await waitFor(() => {
      expect(citySelect.disabled).toBeFalsy();
      expect(screen.getByText("Kabupaten Bantul")).toBeDefined();
      expect(screen.getByText("Kota Yogyakarta")).toBeDefined();
    });

    fireEvent.change(citySelect, {
      target: { value: "39" },
    });

    // SAFETY: In jsdom subdistrict select is HTMLSelectElement.
    const subdistrictSelect = screen.getByLabelText(
      /subdistrict/iu
    ) as HTMLSelectElement;
    await waitFor(() => {
      expect(subdistrictSelect.disabled).toBeFalsy();
      expect(screen.getByText("Bambang Lipuro")).toBeDefined();
    });

    fireEvent.change(subdistrictSelect, {
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
