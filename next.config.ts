import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * mssql must be loaded from node_modules at runtime, not bundled.
   *
   * It hands tedious its own TYPES objects and tedious then calls `.validate` on
   * them. Bundling rewrites those module instances, so the object a query passes in
   * is no longer the one the driver's lookup table recognises, and every
   * parameterised query dies with "parameter.type.validate is not a function" —
   * while unparameterised ones keep working, which makes it look like a SQL problem
   * rather than a bundling one.
   */
  serverExternalPackages: ["mssql"],
};

export default nextConfig;
