import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Resuelve el alias "@/*" del tsconfig sin necesidad de vite-tsconfig-paths.
    tsconfigPaths: true,
  },
  test: {
    globals: true,
    // Por defecto jsdom, para los tests de componentes.
    // Los tests de API routes ponen `// @vitest-environment node` arriba.
    environment: "jsdom",
    setupFiles: ["./test/setup.ts"],
    include: ["test/**/*.test.{ts,tsx}"],
    restoreMocks: true,
    clearMocks: true,
    coverage: {
      provider: "v8",
      include: ["app/api/**/*.ts", "lib/**/*.ts", "components/**/*.tsx"],
      reporter: ["text", "html"],
    },
  },
});
