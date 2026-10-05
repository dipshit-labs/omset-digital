import { http, HttpResponse } from "msw";

const createRajaOngkirCostResponse = (
  origin: string,
  destination: string,
  weight: number,
  courier: string
) => ({
  rajaongkir: {
    destination_details: {
      type: "Kota",
      city_id: destination,
      city_name: "Jakarta Barat",
      postal_code: "11480",
      province: "DKI Jakarta",
      province_id: "6",
    },
    origin_details: {
      type: "Kota",
      city_id: origin,
      city_name: "Yogyakarta",
      postal_code: "55000",
      province: "DI Yogyakarta",
      province_id: "5",
    },
    query: {
      courier,
      destination,
      origin,
      weight,
    },
    results: [
      {
        name: `${courier.toUpperCase()} Courier Service`,
        code: courier || "jne",
        costs: [
          {
            description: "Layanan Reguler",
            service: "REG",
            cost: [
              {
                etd: "2-3",
                note: "",
                value: 18_000,
              },
            ],
          },
          {
            description: "Yakin Esok Sampai",
            service: "YES",
            cost: [
              {
                etd: "1-1",
                note: "",
                value: 30_000,
              },
            ],
          },
        ],
      },
    ],
    status: {
      code: 200,
      description: "OK",
    },
  },
});

const handleCostRequest = async ({ request }: { request: Request }) => {
  let origin = "501";
  let destination = "114";
  let weight = 1000;
  let courier = "jne";

  try {
    const text = await request.text();
    const params = new URLSearchParams(text);
    origin = params.get("origin") ?? origin;
    destination = params.get("destination") ?? destination;
    weight = Number(params.get("weight") ?? weight) || weight;
    courier = params.get("courier") ?? courier;
  } catch {
    // Fall back to default mock parameters
  }

  return HttpResponse.json(
    createRajaOngkirCostResponse(origin, destination, weight, courier),
    { status: 200 }
  );
};

export const rajaongkirHandlers = [
  http.post("https://api.rajaongkir.com/starter/cost", handleCostRequest),
  http.post("https://api.rajaongkir.com/basic/cost", handleCostRequest),
  http.post("https://pro.rajaongkir.com/api/cost", handleCostRequest),
];
