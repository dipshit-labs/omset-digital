import type {
  BlogPreviewSectionData,
  SectionProps,
} from "@repo/template-contract";
import type React from "react";

interface MockArticle {
  date: string;
  excerpt: string;
  id: string;
  readTime: string;
  title: string;
}

const SAMPLE_ARTICLES: MockArticle[] = [
  {
    date: "18 Sep 2026",
    excerpt:
      "Panduan lengkap memahami profil rasa, kadar kafein, dan teknik seduh terbaik untuk kopi favoritmu.",
    id: "1",
    readTime: "4 min baca",
    title: "Mengenal Perbedaan Karakter Rasa Kopi Arabika dan Robusta",
  },
  {
    date: "10 Sep 2026",
    excerpt:
      "Langkah-langkah sederhana mengatur suhu air, rasio seduhan, dan ukuran gilingan kopi yang pas.",
    id: "2",
    readTime: "5 min baca",
    title: "Tips Menyeduh Kopi Manual Brew V60 di Rumah Agar Tidak Pahit",
  },
  {
    date: "02 Sep 2026",
    excerpt:
      "Bagaimana proses pascapanen honey dan natural process memberikan kekayaan aroma yang unik.",
    id: "3",
    readTime: "6 min baca",
    title:
      "Perjalanan Biji Kopi dari Kebun Petani Lokal Hingga ke Cangkir Anda",
  },
];

export function BlogPreviewSection({
  data,
}: SectionProps<BlogPreviewSectionData>): React.ReactElement {
  const { postCount = 3, title = "Artikel & Edukasi Kopi" } = data;
  const articles = SAMPLE_ARTICLES.slice(0, postCount);

  return (
    <section className="bg-background px-6 py-16 text-foreground sm:px-12">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h2 className="font-bold font-heading text-2xl tracking-tight sm:text-3xl">
              {title}
            </h2>
            <p className="mt-1 font-body text-muted-foreground text-sm">
              Wawasan seputar dunia kopi dan tips menyeduh dari barista kami
            </p>
          </div>
          <a
            className="inline-flex items-center font-medium text-primary text-sm hover:underline"
            href="#artikel"
          >
            Lihat Semua Artikel &rarr;
          </a>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {articles.map((article) => (
            <article
              className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card p-5 text-card-foreground transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
              key={article.id}
            >
              <div className="mb-4 flex aspect-video w-full items-center justify-center rounded-lg bg-muted text-muted-foreground text-sm">
                [Cover Artikel]
              </div>
              <div className="mb-2 flex items-center gap-2 text-muted-foreground text-xs">
                <span>{article.date}</span>
                <span>•</span>
                <span>{article.readTime}</span>
              </div>
              <h3 className="line-clamp-2 cursor-pointer font-bold text-base text-card-foreground leading-snug hover:text-primary">
                {article.title}
              </h3>
              <p className="mt-2 line-clamp-3 font-body text-muted-foreground text-xs leading-relaxed">
                {article.excerpt}
              </p>
              <div className="mt-4 border-border border-t pt-3">
                <a
                  className="font-semibold text-primary text-xs hover:underline"
                  href="#baca"
                >
                  Baca Selengkapnya &rarr;
                </a>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
