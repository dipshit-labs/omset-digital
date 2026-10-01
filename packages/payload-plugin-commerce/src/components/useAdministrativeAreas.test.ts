// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { CityItem, ProvinceItem, SubdistrictItem } from "../types";
import type { ResolvedAddress } from "./useAdministrativeAreas";
import { useAdministrativeAreas } from "./useAdministrativeAreas";

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

describe(useAdministrativeAreas, () => {
  it("fetches provinces on mount", async () => {
    const fetchProvinces = vi
      .fn<() => Promise<ProvinceItem[]>>()
      .mockResolvedValue(mockProvinces);

    const { result } = renderHook(() =>
      useAdministrativeAreas({ fetchProvinces })
    );

    await waitFor(() => {
      expect(result.current.provinces).toHaveLength(2);
    });

    expect(fetchProvinces).toHaveBeenCalledOnce();
    expect(result.current.provinces[0]?.province_name).toBe("Bali");
  });

  it("loads cities when a province is selected and resets child state", async () => {
    const fetchProvinces = vi
      .fn<() => Promise<ProvinceItem[]>>()
      .mockResolvedValue(mockProvinces);
    const fetchCities = vi
      .fn<(id: number | string) => Promise<CityItem[]>>()
      .mockResolvedValue(mockCities);

    const { result } = renderHook(() =>
      useAdministrativeAreas({ fetchCities, fetchProvinces })
    );

    await waitFor(() => {
      expect(result.current.provinces).toHaveLength(2);
    });

    await act(async () => {
      await result.current.selectProvince(5);
    });

    expect(fetchCities).toHaveBeenCalledWith(5);
    expect(result.current.selectedProvinceId).toBe(5);
    expect(result.current.selectedProvinceName).toBe("DI Yogyakarta");
    expect(result.current.cities).toHaveLength(2);
    expect(result.current.selectedCityId).toBeNull();
  });

  it("loads subdistricts when a city is selected", async () => {
    const fetchProvinces = vi
      .fn<() => Promise<ProvinceItem[]>>()
      .mockResolvedValue(mockProvinces);
    const fetchCities = vi
      .fn<(id: number | string) => Promise<CityItem[]>>()
      .mockResolvedValue(mockCities);
    const fetchSubdistricts = vi
      .fn<(id: number | string) => Promise<SubdistrictItem[]>>()
      .mockResolvedValue(mockSubdistricts);

    const { result } = renderHook(() =>
      useAdministrativeAreas({
        fetchCities,
        fetchProvinces,
        fetchSubdistricts,
      })
    );

    await waitFor(() => {
      expect(result.current.provinces).toHaveLength(2);
    });

    await act(async () => {
      await result.current.selectProvince(5);
    });

    await act(async () => {
      await result.current.selectCity(39);
    });

    expect(fetchSubdistricts).toHaveBeenCalledWith(39);
    expect(result.current.selectedCityId).toBe(39);
    expect(result.current.selectedCityName).toBe("Bantul");
    expect(result.current.selectedCityType).toBe("Kabupaten");
    expect(result.current.subdistricts).toHaveLength(2);
  });

  it("updates postal code and calls onChange when subdistrict is selected", async () => {
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

    const { result } = renderHook(() =>
      useAdministrativeAreas({
        fetchCities,
        fetchProvinces,
        fetchSubdistricts,
        onChange,
      })
    );

    await waitFor(() => {
      expect(result.current.provinces).toHaveLength(2);
    });

    await act(async () => {
      await result.current.selectProvince(5);
    });

    await act(async () => {
      await result.current.selectCity(39);
    });

    act(() => {
      result.current.selectSubdistrict(537);
    });

    expect(result.current.selectedSubdistrictId).toBe(537);
    expect(result.current.selectedSubdistrictName).toBe("Bambang Lipuro");
    expect(result.current.postalCode).toBe("55715");

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
