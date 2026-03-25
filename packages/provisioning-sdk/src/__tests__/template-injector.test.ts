import { describe, it, expect } from "vitest";
import {
  loadWorkflowTemplate,
  loadSystemPrompt,
  loadConfigSchema,
  validateConfig,
  injectConfig,
  type AgentConfig,
} from "../template-injector";
import type { AgentType } from "@project-agent/shared-types";

const ALL_AGENT_TYPES: AgentType[] = ["wia", "ai_sdr", "cea", "hrsa", "fia"];

const baseConfig: AgentConfig = {
  clientId: "test-uuid-1234",
  clientSlug: "test-client",
  companyName: "Test Company LLC",
  companyNameAr: "شركة تجريبية",
  businessDescription: "A test company for unit testing",
  businessHours: "Sun-Thu 9:00-18:00 GST",
  knowledgeBaseContent: "FAQ: What is your service? We provide AI agents.",
  calendlyLink: "https://calendly.com/test",
  preferredLanguage: "both",
  escalationPhone: "+971501234567",
  escalationEmail: "support@test.com",
};

describe("loadWorkflowTemplate", () => {
  it.each(ALL_AGENT_TYPES)(
    "loads workflow JSON for agent type: %s",
    (agentType) => {
      const workflow = loadWorkflowTemplate(agentType);
      expect(workflow).toBeDefined();
      expect(typeof workflow).toBe("object");
      expect(workflow).toHaveProperty("nodes");
      expect(workflow).toHaveProperty("connections");
    }
  );
});

describe("loadSystemPrompt", () => {
  it.each(ALL_AGENT_TYPES)(
    "loads system prompt for agent type: %s",
    (agentType) => {
      const prompt = loadSystemPrompt(agentType);
      expect(prompt).toBeDefined();
      expect(typeof prompt).toBe("string");
      expect(prompt.length).toBeGreaterThan(100);
    }
  );

  it("contains placeholder variables in prompts", () => {
    const prompt = loadSystemPrompt("wia");
    expect(prompt).toContain("{{COMPANY_NAME}}");
  });
});

describe("loadConfigSchema", () => {
  it.each(ALL_AGENT_TYPES)(
    "loads config schema for agent type: %s",
    (agentType) => {
      const schema = loadConfigSchema(agentType);
      expect(schema).toHaveProperty("required");
      expect(schema).toHaveProperty("optional");
      expect(Array.isArray(schema.required)).toBe(true);
      expect(Array.isArray(schema.optional)).toBe(true);
    }
  );

  it("WIA requires clientId and companyName at minimum", () => {
    const schema = loadConfigSchema("wia");
    expect(schema.required).toContain("clientId");
    expect(schema.required).toContain("companyName");
  });
});

describe("validateConfig", () => {
  it("passes with a complete config", () => {
    const result = validateConfig("wia", baseConfig);
    expect(result.valid).toBe(true);
    expect(result.missing).toHaveLength(0);
  });

  it("fails when required fields are missing", () => {
    const incomplete: AgentConfig = {
      clientId: "",
      clientSlug: "test",
      companyName: "",
    };
    const result = validateConfig("wia", incomplete);
    expect(result.valid).toBe(false);
    expect(result.missing.length).toBeGreaterThan(0);
  });
});

describe("injectConfig", () => {
  it("replaces all placeholder variables in workflow", () => {
    const fakeWorkflow = {
      name: "Test Workflow for {{COMPANY_NAME}}",
      nodes: [
        {
          parameters: {
            prompt: "You are helping {{COMPANY_NAME}} ({{COMPANY_NAME_AR}}).",
            clientId: "{{CLIENT_ID}}",
            hours: "{{BUSINESS_HOURS}}",
          },
        },
      ],
      connections: {},
    };

    const injected = injectConfig(fakeWorkflow, baseConfig);

    expect((injected as any).name).toBe("Test Workflow for Test Company LLC");
    const node = (injected as any).nodes[0];
    expect(node.parameters.prompt).toContain("Test Company LLC");
    expect(node.parameters.prompt).toContain("شركة تجريبية");
    expect(node.parameters.clientId).toBe("test-uuid-1234");
    expect(node.parameters.hours).toBe("Sun-Thu 9:00-18:00 GST");
  });

  it("does not mutate the original workflow object", () => {
    const original = {
      name: "{{COMPANY_NAME}}",
      nodes: [],
      connections: {},
    };
    const originalName = original.name;

    injectConfig(original, baseConfig);

    expect(original.name).toBe(originalName);
  });

  it("handles nested arrays and objects", () => {
    const workflow = {
      nodes: [
        {
          items: ["{{CLIENT_ID}}", "{{CLIENT_SLUG}}"],
          meta: { owner: "{{COMPANY_NAME}}" },
        },
      ],
      connections: {},
    };

    const injected = injectConfig(workflow, baseConfig);
    const node = (injected as any).nodes[0];
    expect(node.items[0]).toBe("test-uuid-1234");
    expect(node.items[1]).toBe("test-client");
    expect(node.meta.owner).toBe("Test Company LLC");
  });

  it("uses defaults when optional fields are missing", () => {
    const minimalConfig: AgentConfig = {
      clientId: "id-123",
      clientSlug: "minimal",
      companyName: "Minimal Co",
    };

    const workflow = {
      nodes: [
        {
          hours: "{{BUSINESS_HOURS}}",
          lang: "{{PREFERRED_LANGUAGE}}",
          ar: "{{COMPANY_NAME_AR}}",
        },
      ],
      connections: {},
    };

    const injected = injectConfig(workflow, minimalConfig);
    const node = (injected as any).nodes[0];
    expect(node.hours).toBe("Sun-Thu 9:00-18:00 GST");
    expect(node.lang).toBe("both");
    expect(node.ar).toBe("Minimal Co"); // falls back to English name
  });
});
