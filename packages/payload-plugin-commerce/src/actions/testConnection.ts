"use server";

export type TestConnectionProvider = "midtrans" | "xendit" | "rajaongkir";

export interface TestMidtransInput {
  isProduction?: boolean;
  provider?: "midtrans";
  serverKey: string;
}

export interface TestXenditInput {
  isProduction?: boolean;
  provider?: "xendit";
  secretKey: string;
}

export interface TestRajaOngkirInput {
  accountType?: "basic" | "pro" | "starter";
  apiKey: string;
  provider?: "rajaongkir";
}

export type TestConnectionInput =
  | ({ provider: "midtrans" } & TestMidtransInput)
  | ({ provider: "xendit" } & TestXenditInput)
  | ({ provider: "rajaongkir" } & TestRajaOngkirInput);

export interface TestConnectionData {
  [key: string]: boolean | number | string | undefined;
}

export interface TestConnectionResult {
  data?: TestConnectionData;
  error?: string;
  message: string;
  success: boolean;
}

interface MidtransProbeResponse {
  status_code?: string;
  status_message?: string;
}

interface XenditProbeResponse {
  balance?: number;
  error_code?: string;
  message?: string;
}

interface RajaOngkirStatusResponse {
  rajaongkir?: {
    results?: unknown[];
    status?: {
      code?: number;
      description?: string;
    };
  };
}

export const testMidtransConnection = async ({
  isProduction = false,
  serverKey,
}: TestMidtransInput): Promise<TestConnectionResult> => {
  const trimmedKey = serverKey.trim();
  if (!trimmedKey) {
    return {
      error: "MISSING_KEY",
      message: "Midtrans Server Key is required.",
      success: false,
    };
  }

  const baseUrl = isProduction
    ? "https://api.midtrans.com"
    : "https://api.sandbox.midtrans.com";
  const probeOrderId = `probe-${Date.now()}`;
  const url = `${baseUrl}/v2/${probeOrderId}/status`;

  try {
    const authHeader = `Basic ${Buffer.from(`${trimmedKey}:`).toString("base64")}`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: authHeader,
      },
    });

    // SAFETY: Parsing Midtrans JSON response shape into verified probe model.
    const body = (await response
      .json()
      .catch(() => ({}))) as MidtransProbeResponse;

    // Midtrans returns 401 for bad serverKey.
    if (response.status === 401 || body.status_code === "401") {
      return {
        error: "UNAUTHORIZED",
        message: "Invalid Midtrans Server Key or unauthorized.",
        success: false,
      };
    }

    // Midtrans returns 404 for non-existent probe order, or 200 if order exists. Both prove auth succeeded!
    if (
      response.status === 200 ||
      response.status === 404 ||
      body.status_code === "404"
    ) {
      return {
        message: `Successfully connected to Midtrans API (${isProduction ? "Production" : "Sandbox"}).`,
        success: true,
        data: {
          statusCode: body.status_code ?? String(response.status),
          statusMessage: body.status_message,
        },
      };
    }

    return {
      error: String(body.status_code ?? response.status),
      success: false,
      message:
        body.status_message ||
        `Midtrans probe returned unexpected status ${response.status}`,
    };
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to connect to Midtrans API";

    return {
      error: "NETWORK_ERROR",
      message: errorMessage,
      success: false,
    };
  }
};

export const testXenditConnection = async ({
  secretKey,
}: TestXenditInput): Promise<TestConnectionResult> => {
  const trimmedKey = secretKey.trim();
  if (!trimmedKey) {
    return {
      error: "MISSING_KEY",
      message: "Xendit Secret Key is required.",
      success: false,
    };
  }

  const url = "https://api.xendit.co/balance?account_type=CASH";

  try {
    const authHeader = `Basic ${Buffer.from(`${trimmedKey}:`).toString("base64")}`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: authHeader,
      },
    });

    // SAFETY: Parsing Xendit JSON response shape into verified probe model.
    const body = (await response
      .json()
      .catch(() => ({}))) as XenditProbeResponse;

    if (response.status === 200 && response.ok) {
      return {
        data: { balance: body.balance },
        message: "Successfully connected to Xendit API.",
        success: true,
      };
    }

    if (response.status === 401 || response.status === 403) {
      return {
        error: "UNAUTHORIZED",
        message: "Invalid Xendit Secret Key or unauthorized.",
        success: false,
      };
    }

    return {
      error: String(response.status),
      success: false,
      message:
        body.message ||
        `Xendit probe returned unexpected status ${response.status}`,
    };
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to connect to Xendit API";

    return {
      error: "NETWORK_ERROR",
      message: errorMessage,
      success: false,
    };
  }
};

export const testRajaOngkirConnection = async ({
  accountType = "starter",
  apiKey,
}: TestRajaOngkirInput): Promise<TestConnectionResult> => {
  const trimmedKey = apiKey.trim();
  if (!trimmedKey) {
    return {
      error: "MISSING_KEY",
      message: "RajaOngkir API Key is required.",
      success: false,
    };
  }

  let url: string;
  if (accountType === "pro") {
    url = "https://pro.rajaongkir.com/api/province";
  } else if (accountType === "basic") {
    url = "https://api.rajaongkir.com/basic/province";
  } else {
    url = "https://api.rajaongkir.com/starter/province";
  }

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        key: trimmedKey,
      },
    });

    // SAFETY: Parsing RajaOngkir status envelope into verified model.
    const body = (await response
      .json()
      .catch(() => ({}))) as RajaOngkirStatusResponse;

    const statusObj = body.rajaongkir?.status;
    if (response.ok && statusObj?.code === 200) {
      return {
        message: `Successfully connected to RajaOngkir API (${accountType.toUpperCase()} tier).`,
        success: true,
      };
    }

    const description = statusObj?.description || `HTTP ${response.status}`;
    return {
      error: "INVALID_CREDENTIALS",
      message: `Invalid RajaOngkir API key or account tier mismatch: ${description}`,
      success: false,
    };
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to connect to RajaOngkir API";

    return {
      error: "NETWORK_ERROR",
      message: errorMessage,
      success: false,
    };
  }
};

export const testConnection = (
  input: TestConnectionInput
): Promise<TestConnectionResult> => {
  switch (input.provider) {
    case "midtrans": {
      return testMidtransConnection(input);
    }
    case "xendit": {
      return testXenditConnection(input);
    }
    case "rajaongkir": {
      return testRajaOngkirConnection(input);
    }
    default: {
      const exhaustiveCheck: never = input;
      return Promise.resolve({
        error: "UNSUPPORTED_PROVIDER",
        message: `Unsupported provider: ${String(exhaustiveCheck)}`,
        success: false,
      });
    }
  }
};
