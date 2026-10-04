import type * as UI from "@payloadcms/ui";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { CityItem, ProvinceItem, SubdistrictItem } from "../types";
import { OriginAddressField } from "./OriginAddressField";

const mockSetProvinceId = vi.fn<(v: string) => void>();
const mockSetProvinceName = vi.fn<(v: string) => void>();
const mockSetCityId = vi.fn<(v: string) => void>();
const mockSetCityName = vi.fn<(v: string) => void>();
const mockSetSubdistrictId = vi.fn<(v: string) => void>();
const mockSetSubdistrictName = vi.fn<(v: string) => void>();
const mockSetPostalCode = vi.fn<(v: string) => void>();
const mockSetStreetAddress = vi.fn<(v: string) => void>();

const getFieldValue = (path: string): string => {
  if (path === "originAddress.provinceId") {
    return "5";
  }
  if (path === "originAddress.provinceName") {
    return "DI Yogyakarta";
  }
  if (path === "originAddress.cityId") {
    return "39";
  }
  if (path === "originAddress.cityName") {
    return "Bantul";
  }
  if (path === "originAddress.subdistrictId") {
    return "537";
  }
  if (path === "originAddress.subdistrictName") {
    return "Bambang Lipuro";
  }
  if (path === "originAddress.postalCode") {
    return "55715";
  }
  if (path === "originAddress.streetAddress") {
    return "Jl. Bantul No. 12";
  }
  return "";
};

const getFieldSetter = (path: string): ((v: unknown) => void) => {
  if (path === "originAddress.provinceId") {
    return mockSetProvinceId as (v: unknown) => void;
  }
  if (path === "originAddress.provinceName") {
    return mockSetProvinceName as (v: unknown) => void;
  }
  if (path === "originAddress.cityId") {
    return mockSetCityId as (v: unknown) => void;
  }
  if (path === "originAddress.cityName") {
    return mockSetCityName as (v: unknown) => void;
  }
  if (path === "originAddress.subdistrictId") {
    return mockSetSubdistrictId as (v: unknown) => void;
  }
  if (path === "originAddress.subdistrictName") {
    return mockSetSubdistrictName as (v: unknown) => void;
  }
  if (path === "originAddress.postalCode") {
    return mockSetPostalCode as (v: unknown) => void;
  }
  if (path === "originAddress.streetAddress") {
    return mockSetStreetAddress as (v: unknown) => void;
  }
  return vi.fn<(v: unknown) => void>();
};

// Mock @payloadcms/ui hooks
vi.mock(import("@payloadcms/ui"), () => {
  const uiMock: Partial<typeof UI> = {
    useField: <TValue,>(options?: { path?: string }): UI.FieldType<TValue> => {
      const path = options?.path ?? "";
      const val = getFieldValue(path);
      const setter = getFieldSetter(path);

      return {
        disabled: false,
        formInitializing: false,
        formProcessing: false,
        formSubmitted: false,
        initialValue: undefined,
        path,
        readOnly: false,
        // SAFETY: Test mock binds setters conforming to useField setValue.
        setValue: setter as (v: unknown) => void,
        showError: false,
        // SAFETY: String test values cast to TValue.
        value: val as TValue,
      };
    },
  };
  return uiMock as typeof UI;
});

const mockProvinces: ProvinceItem[] = [
  { province_id: 1, province_name: "Bali" },
  { province_id: 5, province_name: "DI Yogyakarta" },
];

const mockCities: CityItem[] = [
  { city_id: 39, city_name: "Bantul", city_type: "Kabupaten" },
];

const mockSubdistricts: SubdistrictItem[] = [
  {
    postal_code: "55715",
    subdistrict_id: 537,
    subdistrict_name: "Bambang Lipuro",
  },
];

describe(OriginAddressField, () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders header and origin address summary from form state", () => {
    render(
      <OriginAddressField
        fetchCities={vi
          .fn<() => Promise<CityItem[]>>()
          .mockResolvedValue(mockCities)}
        fetchProvinces={vi
          .fn<() => Promise<ProvinceItem[]>>()
          .mockResolvedValue(mockProvinces)}
        fetchSubdistricts={vi
          .fn<() => Promise<SubdistrictItem[]>>()
          .mockResolvedValue(mockSubdistricts)}
      />
    );

    expect(screen.getByText("Fulfillment Origin Address")).toBeDefined();
    expect(
      screen.getByText(/Kec\. Bambang Lipuro, Bantul, DI Yogyakarta/iu)
    ).toBeDefined();
  });

  it("updates Payload field values when a new subdistrict is selected", async () => {
    const fetchProvinces = vi
      .fn<() => Promise<ProvinceItem[]>>()
      .mockResolvedValue(mockProvinces);
    const fetchCities = vi
      .fn<() => Promise<CityItem[]>>()
      .mockResolvedValue(mockCities);
    const fetchSubdistricts = vi
      .fn<() => Promise<SubdistrictItem[]>>()
      .mockResolvedValue(mockSubdistricts);

    render(
      <OriginAddressField
        fetchCities={fetchCities}
        fetchProvinces={fetchProvinces}
        fetchSubdistricts={fetchSubdistricts}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("DI Yogyakarta")).toBeDefined();
    });

    fireEvent.change(screen.getByLabelText(/province/iu), {
      target: { value: "5" },
    });

    await waitFor(() => {
      expect(screen.getByRole("option", { name: /Bantul/iu })).toBeDefined();
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

    const isUpdated =
      mockSetProvinceId.mock.calls.length > 0 &&
      mockSetCityId.mock.calls.length > 0 &&
      mockSetSubdistrictId.mock.calls.length > 0 &&
      mockSetPostalCode.mock.calls.length > 0;

    expect(isUpdated).toBeTruthy();
    expect(mockSetProvinceId).toHaveBeenCalledWith("5");
    expect(mockSetCityId).toHaveBeenCalledWith("39");
    expect(mockSetSubdistrictId).toHaveBeenCalledWith("537");
    expect(mockSetPostalCode).toHaveBeenCalledWith("55715");
  });

  it("exercises default fetchers with global fetch and renders unconfigured fallback", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn<(url: string) => Promise<Response>>()
        .mockImplementation((url: string) => {
          if (url.includes("type=provinces")) {
            return Promise.resolve(Response.json(mockProvinces));
          }
          if (url.includes("type=cities")) {
            return Promise.resolve(Response.json(mockCities));
          }
          if (url.includes("type=subdistricts")) {
            return Promise.resolve(Response.json(mockSubdistricts));
          }
          return Promise.resolve(new Response("Not found", { status: 404 }));
        })
    );

    render(<OriginAddressField />);

    await waitFor(() => {
      expect(screen.getByText(/Active Origin Location/iu)).toBeDefined();
    });
    cleanup();

    // Test error paths in default fetchers
    vi.stubGlobal(
      "fetch",
      vi
        .fn<() => Promise<Response>>()
        .mockResolvedValue(new Response("Error", { status: 500 }))
    );

    render(<OriginAddressField />);
    await waitFor(() => {
      expect(screen.getByText(/Active Origin Location/iu)).toBeDefined();
    });
  });
});
