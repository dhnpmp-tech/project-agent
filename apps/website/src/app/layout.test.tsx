// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";

// Mock next/navigation usePathname for the client mount component
vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

// eslint-disable-next-line import/first
import { RamiWidgetMount } from "@/components/rami-widget/mount";

describe("Layout integration", () => {
  it("RamiWidgetMount renders without throwing and shows the pill", () => {
    const { getByRole } = render(<RamiWidgetMount />);
    expect(getByRole("button", { name: /ask rami/i })).toBeInTheDocument();
  });
});
