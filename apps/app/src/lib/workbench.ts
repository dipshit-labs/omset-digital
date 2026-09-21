import type {
  AboutSectionData,
  BlogPreviewSectionData,
  ContactSectionData,
  HeroSectionData,
  ProductGridSectionData,
  SectionConfig,
  TemplateTokens,
  TestimonialsSectionData,
} from "@repo/template-contract";

export interface MockTenant {
  activeTemplate: string;
  name: string;
  slug: string;
  templateTokens: TemplateTokens;
}

export const MOCK_TENANT: MockTenant = {
  activeTemplate: "default",
  name: "Kopi Makmur Nusantara",
  slug: "kopi-makmur",
  templateTokens: {
    accent: "#fef3c7",
    accentForeground: "#78350f",
    background: "#ffffff",
    border: "#e2e8f0",
    borderRadius: "md",
    card: "#ffffff",
    cardForeground: "#09090b",
    containerWidth: "normal",
    destructive: "#ef4444",
    destructiveForeground: "#f8fafc",
    foreground: "#09090b",
    input: "#cbd5e1",
    muted: "#f8fafc",
    mutedForeground: "#64748b",
    popover: "#ffffff",
    popoverForeground: "#09090b",
    primary: "#0f172a",
    primaryForeground: "#ffffff",
    ring: "#0f172a",
    secondary: "#f1f5f9",
    secondaryForeground: "#0f172a",
  },
};

export const MOCK_SECTIONS: SectionConfig[] = [
  {
    data: {
      ctaText: "Pesan Sekarang",
      ctaUrl: "#produk",
      headline: "Cita Rasa Kopi Nusantara, Langsung ke Rumah Anda",
      subheadline:
        "Disangrai segar dari biji kopi pilihan petani lokal Jawa, Sumatera, dan Flores. 100% organik dan berkeadilan sosial.",
    } as HeroSectionData,
    enabled: true,
    id: "sec-hero",
    order: 1,
    type: "hero",
  },
  {
    data: {
      showFeaturedOnly: false,
      title: "Produk Kopi Terfavorit",
    } as ProductGridSectionData,
    enabled: true,
    id: "sec-products",
    order: 2,
    type: "product-grid",
  },
  {
    data: {
      richText:
        "Kami menghubungkan penikmat kopi dengan petani lokal langsung tanpa perantara.",
    } as AboutSectionData,
    enabled: true,
    id: "sec-about",
    order: 3,
    type: "about",
  },
  {
    data: {
      items: [
        {
          name: "Rian Hidayat",
          quote:
            "Aroma Arabika Gayo-nya luar biasa segar! Packaging rapi dan pengiriman super cepat sampai Bandung.",
        },
        {
          name: "Siti Rahmawati",
          quote:
            "Drip bag coffee sangat praktis untuk kerja pagi di kantor. Rasa tetap mantap seperti seduhan cafe.",
        },
        {
          name: "Dimas Anggara",
          quote:
            "Fine Robusta Dampit punya body yang tebal dan aroma cokelat manis. Rekomendasi buat pecinta kopi tubruk!",
        },
      ],
    } as TestimonialsSectionData,
    enabled: true,
    id: "sec-testimonials",
    order: 4,
    type: "testimonials",
  },
  {
    data: {
      showForm: true,
      whatsappButton: true,
    } as ContactSectionData,
    enabled: true,
    id: "sec-contact",
    order: 5,
    type: "contact",
  },
  {
    data: {
      postCount: 3,
      title: "Edukasi & Cerita Dari Petani",
    } as BlogPreviewSectionData,
    enabled: true,
    id: "sec-blog",
    order: 6,
    type: "blog-preview",
  },
];
