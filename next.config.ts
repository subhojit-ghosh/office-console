/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import bundleAnalyzer from "@next/bundle-analyzer";
import type { NextConfig } from "next";
import "./src/env";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: true,
});

const config: NextConfig = {};

export default process.env.ANALYZE === "true"
  ? withBundleAnalyzer(config)
  : config;
