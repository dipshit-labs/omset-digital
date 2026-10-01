// @vitest-environment jsdom
import type { GetShippingRatesResult } from "@repo/payload-plugin-commerce/actions";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CheckoutShippingSection } from "./CheckoutShippingSection";
import type { FormattedShippingRateOption } from "./CheckoutShippingSection";

describe(CheckoutShippingSection, () => {
  afterEach(() => {
    cleanup();
  });

  const mockRates: FormattedShippingRateOption[] = [
    {
      cost: 18_000,
      courierCode: "jne",
      courierName: "Jalur Nugraha Ekakurir (JNE)",
      description: "Layanan Reguler",
      etd: "1-2",
      formattedCost: "Rp 18.000",
      service: "REG",
    },
    {
      cost: 30_000,
      courierCode: "jne",
      courierName: "Jalur Nugraha Ekakurir (JNE)",
      description: "Yakin Esok Sampai",
      etd: "1",
      formattedCost: "Rp 30.000",
      service: "YES",
    },
    {
      cost: 15_000,
      courierCode: "pos",
      courierName: "POS Indonesia",
      description: "Pos Reguler",
      etd: "2-3",
      formattedCost: "Rp 15.000",
      service: "Pos Reguler",
    },
  ];

  it("renders heading and courier service codes with description", () => {
    render(<CheckoutShippingSection rates={mockRates} />);

    expect(
      screen.getByRole("heading", { name: /shipping options/iu })
    ).toBeDefined();
    expect(screen.getByText(/REG/u)).toBeDefined();
    expect(screen.getByText(/YES/u)).toBeDefined();
    expect(screen.getByText("Layanan Reguler")).toBeDefined();
    expect(screen.getByText("Yakin Esok Sampai")).toBeDefined();
  });

  it("renders cost in IDR and estimated delivery days", () => {
    render(<CheckoutShippingSection rates={mockRates} />);

    expect(screen.getByText("Rp 18.000")).toBeDefined();
    expect(screen.getByText("Rp 30.000")).toBeDefined();
    expect(screen.getByText("Rp 15.000")).toBeDefined();
    expect(screen.getByText(/1-2 days/iu)).toBeDefined();
    expect(screen.getByText(/2-3 days/iu)).toBeDefined();
  });

  it("allows selecting a courier option and fires onSelectRate callback", () => {
    const onSelectRate = vi.fn<(rate: FormattedShippingRateOption) => void>();
    render(
      <CheckoutShippingSection onSelectRate={onSelectRate} rates={mockRates} />
    );

    const radioOption = screen.getByLabelText(/Layanan Reguler/u);
    fireEvent.click(radioOption);

    expect(onSelectRate).toHaveBeenCalledExactlyOnceWith(mockRates[0]);
  });

  it("indicates which rate is currently selected", () => {
    render(
      <CheckoutShippingSection rates={mockRates} selectedRate={mockRates[1]} />
    );

    const option0 = screen.getByLabelText(
      /Layanan Reguler/u
    ) as HTMLInputElement;
    const option1 = screen.getByLabelText(
      /Yakin Esok Sampai/u
    ) as HTMLInputElement;

    expect(option0.checked).toBeFalsy();
    expect(option1.checked).toBeTruthy();
  });

  it("displays loading state when isLoading is true", () => {
    render(<CheckoutShippingSection isLoading rates={[]} />);

    expect(screen.getByRole("status").textContent).toMatch(
      /calculating shipping rates/iu
    );
  });

  it("displays error message when calculation fails", () => {
    render(
      <CheckoutShippingSection
        error="Courier API temporarily unavailable"
        rates={[]}
      />
    );

    expect(screen.getByRole("alert").textContent).toContain(
      "Courier API temporarily unavailable"
    );
  });

  it("displays empty state when no rates are available", () => {
    render(<CheckoutShippingSection rates={[]} />);

    expect(screen.getByText(/no shipping options available/iu)).toBeDefined();
  });

  it("automatically queries fetchRates when destination and fetchRates are provided", async () => {
    const fetchRatesMock = vi
      .fn<() => Promise<GetShippingRatesResult>>()
      .mockResolvedValue({
        billableWeight: 1000,
        cached: false,
        rates: mockRates,
        success: true,
      });

    render(
      <CheckoutShippingSection
        customerDestination={{ cityId: 152, subdistrictId: 2105 }}
        fetchRates={fetchRatesMock}
        items={[{ quantity: 1, weight: 200 }]}
        storeSlug="toko-kopi"
      />
    );

    await waitFor(() => {
      expect(fetchRatesMock).toHaveBeenCalledWith(
        expect.objectContaining({
          customerDestination: { cityId: 152, subdistrictId: 2105 },
          storeSlug: "toko-kopi",
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByText("Rp 18.000")).toBeDefined();
    });
  });
});
