import type * as UI from "@payloadcms/ui";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CredentialsManager } from "./CredentialsManager";

const { MockButton, mockDoc } = vi.hoisted(() => ({
  mockDoc: { id: "store-123" },
  MockButton: (props: {
    children?: React.ReactNode;
    disabled?: boolean;
    onClick?: React.MouseEventHandler<HTMLButtonElement>;
    type?: "button" | "reset" | "submit";
  }) => (
    <button disabled={props.disabled} onClick={props.onClick} type="button">
      {props.children}
    </button>
  ),
}));

// Mock @payloadcms/ui hooks
vi.mock(import("@payloadcms/ui"), () => {
  const uiMock: Partial<typeof UI> = {
    Button: MockButton,
    // SAFETY: Partial mock implements DocumentInfoContext subset needed for test.
    useDocumentInfo: () => mockDoc as UI.DocumentInfoContext,
    useField: <TValue,>(): UI.FieldType<TValue> => ({
      disabled: false,
      formInitializing: false,
      formProcessing: false,
      formSubmitted: false,
      initialValue: undefined,
      path: "",
      readOnly: false,
      setValue: vi.fn<(newVal: unknown) => void>(),
      showError: false,
      // SAFETY: Test mock returns default "none" selection for testing.
      value: "none" as TValue,
    }),
  };
  // SAFETY: Test mock satisfies required client exports for CredentialsManager testing.
  return uiMock as typeof UI;
});

describe(CredentialsManager, () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders radio card grid for payment providers", () => {
    render(<CredentialsManager />);

    expect(screen.getByText("Payment Gateway")).toBeDefined();
    expect(
      screen.getByRole("radio", { name: /no online payment/iu })
    ).toBeDefined();
    expect(screen.getByRole("radio", { name: /midtrans/iu })).toBeDefined();
    expect(screen.getByRole("radio", { name: /xendit/iu })).toBeDefined();
  });

  it("renders radio card grid for shipping providers", () => {
    render(<CredentialsManager />);

    expect(screen.getByText("Shipping Calculation")).toBeDefined();
    expect(
      screen.getByRole("radio", { name: /no automated shipping/iu })
    ).toBeDefined();
    expect(screen.getByRole("radio", { name: /rajaongkir/iu })).toBeDefined();
  });

  it("shows Midtrans credentials when Midtrans radio card is selected", () => {
    render(<CredentialsManager />);

    const midtransRadio = screen.getByRole("radio", { name: /midtrans/iu });
    fireEvent.click(midtransRadio);

    expect(screen.getByLabelText(/server key/iu)).toBeDefined();
    expect(screen.getByLabelText(/client key/iu)).toBeDefined();
    expect(screen.getByLabelText(/production environment/iu)).toBeDefined();
    expect(
      screen.getByRole("button", { name: /test midtrans connection/iu })
    ).toBeDefined();
  });

  it("masks secret inputs with type='password'", () => {
    render(<CredentialsManager />);

    const midtransRadio = screen.getByRole("radio", { name: /midtrans/iu });
    fireEvent.click(midtransRadio);

    // SAFETY: Input rendered in jsdom is HTMLInputElement.
    const serverKeyInput = screen.getByLabelText(
      /server key/iu
    ) as HTMLInputElement;
    expect(serverKeyInput.type).toBe("password");
  });

  it("shows Xendit credentials when Xendit radio card is selected", () => {
    render(<CredentialsManager />);

    const xenditRadio = screen.getByRole("radio", { name: /xendit/iu });
    fireEvent.click(xenditRadio);

    expect(screen.getByLabelText(/secret api key/iu)).toBeDefined();
    expect(screen.getByLabelText(/webhook verification token/iu)).toBeDefined();
    expect(
      screen.getByRole("button", { name: /test xendit connection/iu })
    ).toBeDefined();
  });

  it("shows RajaOngkir credentials when RajaOngkir radio card is selected", () => {
    render(<CredentialsManager />);

    const rajaongkirRadio = screen.getByRole("radio", { name: /rajaongkir/iu });
    fireEvent.click(rajaongkirRadio);

    expect(screen.getByLabelText(/rajaongkir api key/iu)).toBeDefined();
    expect(screen.getByLabelText(/account tier/iu)).toBeDefined();
    expect(
      screen.getByRole("button", { name: /test rajaongkir connection/iu })
    ).toBeDefined();
  });

  it("preserves inactive provider credentials when toggling providers", () => {
    render(<CredentialsManager />);

    // 1. Select Midtrans and type client key
    fireEvent.click(screen.getByRole("radio", { name: /midtrans/iu }));
    const clientKeyInput = screen.getByLabelText(/client key/iu);
    fireEvent.change(clientKeyInput, { target: { value: "client-key-123" } });

    // 2. Switch to Xendit
    fireEvent.click(screen.getByRole("radio", { name: /xendit/iu }));
    expect(screen.queryByLabelText(/client key/iu)).toBeNull();

    // 3. Switch back to Midtrans - input value must be preserved!
    fireEvent.click(screen.getByRole("radio", { name: /midtrans/iu }));
    // SAFETY: Input rendered in jsdom is HTMLInputElement.
    const restoredInput = screen.getByLabelText(
      /client key/iu
    ) as HTMLInputElement;
    expect(restoredInput.value).toBe("client-key-123");
  });

  it("calls onTestConnection when Test Connection button is clicked and displays result", async () => {
    const mockTestConnection = vi
      .fn<() => Promise<{ message: string; success: boolean }>>()
      .mockResolvedValue({
        message: "Successfully connected to Midtrans API.",
        success: true,
      });

    render(<CredentialsManager onTestConnection={mockTestConnection} />);

    fireEvent.click(screen.getByRole("radio", { name: /midtrans/iu }));
    const serverKeyInput = screen.getByLabelText(/server key/iu);
    fireEvent.change(serverKeyInput, { target: { value: "test-server-key" } });

    const testButton = screen.getByRole("button", {
      name: /test midtrans connection/iu,
    });
    fireEvent.click(testButton);

    await waitFor(() => {
      expect(mockTestConnection).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: "midtrans",
          serverKey: "test-server-key",
        })
      );
      expect(
        screen.getByText(/successfully connected to midtrans api/iu)
      ).toBeDefined();
    });
  });

  it("handles Xendit and RajaOngkir connection testing and failure states", async () => {
    const mockTestConnection = vi
      .fn<() => Promise<{ message: string; success: boolean }>>()
      .mockResolvedValueOnce({ message: "Xendit connected", success: true })
      .mockResolvedValueOnce({ message: "RajaOngkir connected", success: true })
      .mockRejectedValueOnce(new Error("Connection timeout"));

    render(<CredentialsManager onTestConnection={mockTestConnection} />);

    // Test Xendit
    fireEvent.click(screen.getByRole("radio", { name: /xendit/iu }));
    fireEvent.change(screen.getByLabelText(/secret api key/iu), {
      target: { value: "xnd_sec_123" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /test xendit connection/iu })
    );

    await waitFor(() => {
      expect(screen.getByText(/xendit connected/iu)).toBeDefined();
    });

    // Test RajaOngkir
    fireEvent.click(screen.getByRole("radio", { name: /rajaongkir/iu }));
    fireEvent.change(screen.getByLabelText(/rajaongkir api key/iu), {
      target: { value: "ro_key_123" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /test rajaongkir connection/iu })
    );

    await waitFor(() => {
      expect(screen.getByText(/rajaongkir connected/iu)).toBeDefined();
    });

    // Test Connection Error
    fireEvent.click(
      screen.getByRole("button", { name: /test rajaongkir connection/iu })
    );
    await waitFor(() => {
      expect(screen.getByText(/connection timeout/iu)).toBeDefined();
    });
  });

  it("handles save credentials success and failure states", async () => {
    const onSave = vi
      .fn<() => Promise<void>>()
      .mockResolvedValueOnce()
      .mockRejectedValueOnce(new Error("Failed to persist"));

    render(
      <CredentialsManager
        onSave={onSave}
        onTestConnection={vi
          .fn<() => Promise<{ message: string; success: boolean }>>()
          .mockResolvedValue({ message: "ok", success: true })}
      />
    );

    // Initial credentials save
    const saveButton = screen.getByRole("button", {
      name: /save credentials/iu,
    });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledOnce();
      expect(
        screen.getByText(/credentials saved successfully/iu)
      ).toBeDefined();
    });

    // Save with error
    fireEvent.click(saveButton);
    await waitFor(() => {
      expect(screen.getByText(/failed to persist/iu)).toBeDefined();
    });
  });
});
