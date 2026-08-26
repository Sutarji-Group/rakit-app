import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @react-pdf/renderer memuat font dan modul asli saat runtime; membiarkannya
  // di luar bundel server mencegah kegagalan saat build produksi.
  serverExternalPackages: ['@react-pdf/renderer'],
  /* config options here */
};

export default nextConfig;
