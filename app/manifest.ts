import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "VAHAN AI — Vehicle Intelligence",
    short_name: "VAHAN AI",
    description: "Vehicle records, insurance history, claim support and PBPartners adviser enquiries.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#080d1b",
    theme_color: "#080d1b",
    categories: ["utilities", "business"],
    icons: [
      { src: "/icons/vahan-ai.svg", sizes: "any", type: "image/svg+xml", purpose: "any maskable" }
    ]
  };
}
