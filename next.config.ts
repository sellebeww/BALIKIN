import type { NextConfig } from "next";

const config: NextConfig = {
  redirects: async () => [
    { source: "/profil", destination: "/", permanent: true },
  ],
};

export default config;
