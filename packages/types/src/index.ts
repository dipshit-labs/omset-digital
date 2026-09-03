// ─── Storefront / Theme ───────────────────────────────────────────────────────

export type SectionType =
  | "hero"
  | "product-grid"
  | "about"
  | "testimonials"
  | "contact"
  | "blog-preview";

export interface HeroSectionData {
  banner?: unknown; // resolved Media at runtime
  ctaText?: string;
  ctaUrl?: string;
  headline: string;
  subheadline?: string;
}

export interface ProductGridSectionData {
  showFeaturedOnly: boolean;
  title?: string;
}

export interface AboutSectionData {
  image?: unknown; // resolved Media
  richText?: unknown; // Lexical JSON
}

export interface TestimonialItem {
  avatar?: unknown; // resolved Media
  name: string;
  quote: string;
}

export interface TestimonialsSectionData {
  items: TestimonialItem[];
}

export interface ContactSectionData {
  showForm: boolean;
  whatsappButton: boolean;
}

export interface BlogPreviewSectionData {
  postCount: number;
  title?: string;
}

export type SectionData =
  | HeroSectionData
  | ProductGridSectionData
  | AboutSectionData
  | TestimonialsSectionData
  | ContactSectionData
  | BlogPreviewSectionData;

export interface SectionConfig {
  data: SectionData;
  enabled: boolean;
  order: number;
  type: SectionType;
}

export type PageType =
  | "home"
  | "product"
  | "cart"
  | "about"
  | "contact"
  | "blog"
  | "blog-post";

// PageData is page-specific; typed as unknown here — consumers narrow by `page`.
export type PageData = unknown;

export interface ThemeProps {
  data: PageData;
  page: PageType;
  sections: SectionConfig[];
  tenant: {
    name: string;
    slug: string;
    logo: unknown | null; // resolved Media at runtime
    themeConfig: Record<string, unknown>;
  };
}

// ─── Payment ──────────────────────────────────────────────────────────────────

export type CanonicalPaymentStatus =
  | "pending"
  | "paid"
  | "expired"
  | "failed"
  | "cancelled";

export interface PaymentSession {
  providerOrderId: string;
  redirectUrl: string;
}

export interface ParsedWebhookEvent {
  metadata?: Record<string, unknown>;
  orderId: string;
  providerEventId: string;
  status: CanonicalPaymentStatus;
}

/**
 * Raw HTTP request passed to parseWebhook.
 * Contains the full body (as a string for signature verification) and headers.
 */
export interface RawRequest {
  body: string;
  headers: Record<string, string | string[] | undefined>;
}

/**
 * Minimal order data needed to create a payment session.
 * Adapters receive this and return a PaymentSession.
 */
export interface OrderDraft {
  amount: number; // in smallest currency unit (IDR cents = IDR, Stripe uses cents)
  buyerEmail?: string;
  buyerName: string;
  buyerPhone?: string;
  currency: string; // ISO 4217, e.g. "IDR"
  description?: string;
  failureUrl: string;
  orderId: string;
  successUrl: string;
  tenantId: string;
}

export interface PaymentProvider {
  createSession: (order: OrderDraft) => Promise<PaymentSession>;
  parseWebhook: (request: RawRequest) => Promise<ParsedWebhookEvent>;
}

// ─── Shipping ─────────────────────────────────────────────────────────────────

export interface CourierOption {
  cost: number; // IDR
  courier: string;
  etdDays: string; // e.g. "2-3"
  service: string;
}

export interface ShippingError {
  code: "INVALID_KEY" | "NETWORK_ERROR" | "INVALID_PARAMS" | "UNKNOWN";
  message: string;
}

export interface ShippingCostParams {
  couriers?: string[];
  destinationCityId: string;
  originCityId: string;
  weight: number; // grams
}

export interface ShippingProvider {
  getCosts: (
    params: ShippingCostParams
  ) => Promise<CourierOption[] | ShippingError>;
}
