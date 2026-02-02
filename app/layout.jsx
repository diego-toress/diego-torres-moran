import "./globals.css";

export const metadata = {
  title: "Diego Torres — Senior Full Stack Engineer | React, Next.js, Svelte, React Native, Flutter, Node.js, Python",
  description:
    "Senior Full Stack Engineer & Team Leader with 7+ years building scalable web and mobile applications. Expertise in React, Next.js, Node.js, React Native, Vue, Svelte, Three.js, and Python. Helped startups launch MVPs in 7–8 weeks and scale to 100K+ users.",
  keywords: [
    "Diego Torres",
    "Full Stack Engineer",
    "Senior Developer",
    "Team Leader",
    "React Developer",
    "Next.js Developer",
    "Node.js Developer",
    "React Native Developer",
    "Vue Developer",
    "Svelte Developer",
    "SvelteKit Developer",
    "Angular Developer",
    "Three.js Developer",
    "TypeScript",
    "Python Developer",
    "Mobile App Developer",
    "Web Developer",
    "Frontend Engineer",
    "Backend Engineer",
    "Full Stack Developer Guayaquil",
    "Ecuador Developer",
    "Freelance Developer",
    "MVP Development",
    "Startup Engineer",
    "Portfolio",
  ],
  authors: [{ name: "Diego Torres", url: "https://diego-torres-moran.vercel.app" }],
  creator: "Diego Torres",
  publisher: "Diego Torres",

  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://diego-torres-moran.vercel.app",
    siteName: "Diego Torres — Portfolio",
    title: "Diego Torres — Senior Full Stack Engineer",
    description:
      "7+ years building scalable web & mobile apps with React, Next.js, Node.js, and more. From MVPs to 100K+ user platforms.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Diego Torres — Senior Full Stack Engineer Portfolio",
        type: "image/png",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Diego Torres — Senior Full Stack Engineer",
    description:
      "7+ years building scalable web & mobile apps with React, Next.js, Node.js, and more.",
    images: ["/og-image.png"],
  },

  // ─── Technical SEO ────────────────────────────────
  metadataBase: new URL("https://diego-torres-moran.vercel.app"),
  alternates: {
    canonical: "https://diego-torres-moran.vercel.app",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    // google: "your-google-verification-code",  // Add after setting up Google Search Console
  },
  category: "technology",
};

// ─── JSON-LD Structured Data ──────────────────────────
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "Diego Torres",
  url: "https://diego-torres-moran.vercel.app",
  email: "mailto:mju34170@gmail.com",
  jobTitle: "Senior Full Stack Engineer",
  description:
    "Senior Full Stack Engineer & Team Leader with 7+ years of experience building scalable web and mobile applications.",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Guayaquil",
    addressRegion: "Guayas",
    addressCountry: "EC",
  },
  alumniOf: {
    "@type": "CollegeOrUniversity",
    name: "Universidad Politécnica Salesiana",
  },
  knowsAbout: [
    "React", "Next.js", "Node.js", "TypeScript", "JavaScript",
    "React Native", "Vue.js", "Svelte", "SvelteKit", "Angular",
    "Python", "Django", "FastAPI", "Flask",
    "Three.js", "D3.js", "WebGL",
    "PostgreSQL", "MongoDB", "Redis",
    "AWS", "GCP", "Azure", "Docker",
    "REST APIs", "GraphQL", "WebSockets",
  ],
  sameAs: [
    "https://github.com/mvpcraft",
  ],
  worksFor: {
    "@type": "Organization",
    name: "Freelance / Available for hire",
  },
};

const serviceJsonLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "Full Stack Web & Mobile Development",
  provider: {
    "@type": "Person",
    name: "Diego Torres",
  },
  description:
    "Custom web applications, mobile apps, MVPs, API development, 3D web experiences, and startup technical consulting.",
  areaServed: "Worldwide",
  serviceType: [
    "Web Development",
    "Mobile App Development",
    "MVP Development",
    "Full Stack Development",
    "Frontend Development",
    "Backend Development",
    "API Development",
    "3D Web Development",
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,wght@0,400;0,500;0,700;1,400&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#080812" />

        {/* JSON-LD Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd) }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}