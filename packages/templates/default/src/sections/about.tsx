import type { AboutSectionData, SectionProps } from "@repo/template-contract";
import type React from "react";

export function AboutSection({
  data: _data,
}: SectionProps<AboutSectionData>): React.ReactElement {
  return (
    <section className="border-border border-t bg-muted px-6 py-16 text-foreground sm:px-12">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 md:grid-cols-2">
        <div className="space-y-6">
          <span className="font-bold text-muted-foreground text-xs uppercase tracking-wider">
            Tentang Kami
          </span>
          <h2 className="font-bold font-heading text-3xl text-foreground tracking-tight sm:text-4xl">
            Dedikasi Menghadirkan Kualitas Terbaik Untuk Anda
          </h2>
          <div className="space-y-4 font-body text-base text-muted-foreground leading-relaxed">
            <p>
              Berawal dari kecintaan kami terhadap cita rasa nusantara, kami
              bermitra langsung dengan petani lokal untuk memastikan setiap biji
              kopi dipetik saat matang sempurna dan disangrai dengan presisi
              tinggi.
            </p>
            <p>
              Kami percaya transparansi, kualitas, dan keberlanjutan adalah
              fondasi utama dalam memberikan pengalaman terbaik bagi setiap
              pelanggan.
            </p>
          </div>
          <div className="pt-2">
            <div className="flex gap-8">
              <div>
                <div className="font-bold text-2xl text-primary">100%</div>
                <div className="text-muted-foreground text-xs">
                  Kopi Asli Lokal
                </div>
              </div>
              <div>
                <div className="font-bold text-2xl text-primary">5.000+</div>
                <div className="text-muted-foreground text-xs">
                  Pelanggan Puas
                </div>
              </div>
              <div>
                <div className="font-bold text-2xl text-primary">24 Jam</div>
                <div className="text-muted-foreground text-xs">
                  Pengiriman Cepat
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex aspect-4/3 w-full items-center justify-center rounded-xl border border-border bg-card text-muted-foreground shadow-xs">
          [Ilustrasi / Foto Toko &amp; Tim]
        </div>
      </div>
    </section>
  );
}
