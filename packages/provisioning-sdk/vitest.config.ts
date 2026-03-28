import { defineConfig } from "vitest/config";
import { join } from "path";
import { tmpdir } from "os";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    env: {
      COMPOSE_TEMPLATE_PATH: join(
        __dirname,
        "../../infrastructure/docker-compose.client.template.yml"
      ),
      DEPLOYMENTS_BASE: join(tmpdir(), "project-agent-test-deployments"),
    },
  },
});
