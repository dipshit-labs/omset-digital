import type {
  CalculateShippingCostInput,
  CourierCostResult,
  RajaOngkirAccountType,
  RajaOngkirConfig,
  RajaOngkirCostResponse,
} from "./types";

export class RajaOngkirClient {
  public readonly accountType: RajaOngkirAccountType;
  public readonly apiKey: string;
  public readonly timeout?: number;

  constructor(config: RajaOngkirConfig) {
    const trimmedKey = config.apiKey?.trim();
    if (!trimmedKey) {
      throw new Error("RajaOngkir API key is required");
    }

    this.apiKey = trimmedKey;
    this.accountType = config.accountType ?? "starter";
    this.timeout = config.timeout;
  }

  private get costUrl(): string {
    if (this.accountType === "pro") {
      return "https://pro.rajaongkir.com/api/cost";
    }
    if (this.accountType === "basic") {
      return "https://api.rajaongkir.com/basic/cost";
    }
    return "https://api.rajaongkir.com/starter/cost";
  }

  private async querySingleCost(
    bodyParams: URLSearchParams
  ): Promise<CourierCostResult[]> {
    const controller = new AbortController();
    const timeoutId = this.timeout
      ? setTimeout(() => controller.abort(), this.timeout)
      : undefined;

    try {
      const response = await fetch(this.costUrl, {
        body: bodyParams.toString(),
        method: "POST",
        signal: controller.signal,
        headers: {
          key: this.apiKey,
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new Error(
          `RajaOngkir API HTTP error (${response.status}): ${errorText || response.statusText}`
        );
      }

      // SAFETY: RajaOngkir API envelope conforming to RajaOngkirCostResponse schema.
      const data = (await response.json()) as RajaOngkirCostResponse;

      if (data.rajaongkir?.status?.code !== 200) {
        const description =
          data.rajaongkir?.status?.description ?? "Unknown error";
        throw new Error(`RajaOngkir error: ${description}`);
      }

      return data.rajaongkir.results;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Queries shipping costs from RajaOngkir across Starter, Basic, and Pro tiers.
   * Pro tier accepts colon-delimited couriers and subdistrict origin/dest types.
   * Starter tier executes individual queries per courier as colon-delimiting is rejected.
   */
  public async calculateCost(
    input: CalculateShippingCostInput
  ): Promise<CourierCostResult[]> {
    const isPro = this.accountType === "pro";
    const courierList = Array.isArray(input.couriers)
      ? input.couriers
      : input.couriers.split(":");

    // On Pro tier: colon-delimited couriers in a single request (e.g. "jne:pos:tiki")
    if (isPro) {
      const bodyParams = new URLSearchParams();
      bodyParams.append("origin", String(input.origin));
      bodyParams.append("destination", String(input.destination));
      bodyParams.append(
        "weight",
        String(Math.max(1, Math.round(input.weightInGrams || 0)))
      );
      bodyParams.append("courier", courierList.join(":"));
      bodyParams.append("originType", input.originType ?? "subdistrict");
      bodyParams.append(
        "destinationType",
        input.destinationType ?? "subdistrict"
      );
      return this.querySingleCost(bodyParams);
    }

    // On Starter/Basic tiers: query each courier individually (no colon-delimiter allowed)
    const promises = courierList.map((courier) => {
      const bodyParams = new URLSearchParams();
      bodyParams.append("origin", String(input.origin));
      bodyParams.append("destination", String(input.destination));
      bodyParams.append(
        "weight",
        String(Math.max(1, Math.round(input.weightInGrams || 0)))
      );
      bodyParams.append("courier", courier.trim());
      return this.querySingleCost(bodyParams);
    });

    const nestedResults = await Promise.all(promises);
    return nestedResults.flat();
  }
}
