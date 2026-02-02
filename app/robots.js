export default function robots() {
    const baseUrl = "https://diego-torres-moran.vercel.app";

    return {
        rules: [
            {
                userAgent: "*",
                allow: "/",
            },
        ],
        sitemap: `${baseUrl}/sitemap.xml`,
    };
}