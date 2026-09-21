import type { ContactSectionData, SectionProps } from "@repo/template-contract";
import type React from "react";

export function ContactSection({
  data,
}: SectionProps<ContactSectionData>): React.ReactElement {
  const { showForm, whatsappButton } = data;

  return (
    <section className="border-border border-t bg-muted px-6 py-16 text-foreground sm:px-12">
      <div className="mx-auto max-w-7xl space-y-10">
        <div className="space-y-3 text-center">
          <span className="font-bold text-muted-foreground text-xs uppercase tracking-wider">
            Hubungi Kami
          </span>
          <h2 className="font-bold font-heading text-3xl tracking-tight">
            Ada Pertanyaan? Kami Siap Membantu
          </h2>
          <p className="font-body text-muted-foreground text-sm">
            Kirimkan pesan atau konsultasikan kebutuhan Anda langsung dengan tim
            kami
          </p>
        </div>

        <div className="mx-auto max-w-xl space-y-6">
          {whatsappButton ? (
            <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
              <p className="font-medium text-emerald-900 text-sm">
                Respon lebih cepat via WhatsApp Official kami
              </p>
              <a
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-6 py-2.5 font-semibold text-sm text-white shadow-xs transition-colors hover:bg-emerald-700"
                href="#whatsapp"
              >
                Chat via WhatsApp
              </a>
            </div>
          ) : null}

          {showForm ? (
            <form className="space-y-4 rounded-xl border border-border bg-card p-6 text-card-foreground shadow-xs sm:p-8">
              <div>
                <label
                  className="mb-1 block font-semibold text-card-foreground text-xs"
                  htmlFor="contact-name"
                >
                  Nama Lengkap
                </label>
                <input
                  className="w-full rounded-md border border-input bg-transparent px-3.5 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-ring"
                  id="contact-name"
                  placeholder="Budi Santoso"
                  type="text"
                />
              </div>
              <div>
                <label
                  className="mb-1 block font-semibold text-card-foreground text-xs"
                  htmlFor="contact-email"
                >
                  Email atau Nomor WhatsApp
                </label>
                <input
                  className="w-full rounded-md border border-input bg-transparent px-3.5 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-ring"
                  id="contact-email"
                  placeholder="budi@example.com / 0812xxxx"
                  type="text"
                />
              </div>
              <div>
                <label
                  className="mb-1 block font-semibold text-card-foreground text-xs"
                  htmlFor="contact-message"
                >
                  Pesan Anda
                </label>
                <textarea
                  className="w-full rounded-md border border-input bg-transparent px-3.5 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-ring"
                  id="contact-message"
                  placeholder="Tuliskan pertanyaan atau kebutuhan pesanan Anda..."
                  rows={4}
                />
              </div>
              <button
                className="w-full rounded-md bg-primary py-2.5 font-semibold text-primary-foreground text-sm transition-opacity hover:opacity-90"
                type="button"
              >
                Kirim Pesan
              </button>
            </form>
          ) : null}
        </div>
      </div>
    </section>
  );
}
