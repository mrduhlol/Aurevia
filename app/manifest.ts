import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Aurevia",
    short_name: "Aurevia",
    description: "Opt-in connections between verified passengers on the same flight.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#101d32",
    theme_color: "#101d32",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" }
    ],
  };
}
