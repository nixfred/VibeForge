import { beforeAll, describe, expect, it } from "vitest";
import { loadLanguage, translate, translateCount, type Language, type Translator } from "../../src/ui/i18n/index.js";
import { composerSuggestions } from "../../src/ui/views/orchestrator/VibyComposer.js";

function translator(language: Language): Translator {
  return Object.assign((key: Parameters<typeof translate>[1], vars?: Record<string, string | number>) => translate(language, key, vars), {
    language,
    count: (base: Parameters<typeof translateCount>[1], count: number, vars?: Record<string, string | number>) => translateCount(language, base, count, vars),
  });
}

const known = {
  waiting: false,
  workspaces: [{ id: "web", name: "web-shop" }],
  agents: [{ id: "atlas", name: "Atlas" }],
  engines: [
    { id: "claude", label: "Claude Code", available: true },
    { id: "codex", label: "Codex", available: false },
  ],
};

describe("Viby's message box", () => {
  beforeAll(() => Promise.all((["de", "ja"] as const).map((code) => loadLanguage(code))));

  it("offers the / commands, Go and Cancel only while a plan waits", () => {
    const en = translator("en");
    expect(composerSuggestions("/", known, en).map((item) => item.label)).not.toContain("/go");
    expect(composerSuggestions("/", { ...known, waiting: true }, en).map((item) => item.label)).toContain("/go");
    expect(composerSuggestions("/re", known, en).map((item) => [item.label, item.detail])).toEqual([
      ["/review", "Mark all runs reviewed"],
      ["/remember", "Save note to viby.md"],
    ]);
    expect(composerSuggestions("/review now", known, en)).toEqual([]);
  });

  it("says what each command and name is in the window's language", () => {
    const de = translator("de");
    const commands = composerSuggestions("/", { ...known, waiting: true }, de);
    expect(commands.find((item) => item.label === "/new")?.detail).toBe("Neues Gespräch beginnen");
    // Every command has its own words there, none left in English.
    for (const item of commands) expect(item.detail, item.label).not.toBe(composerSuggestions(item.label, { ...known, waiting: true }, translator("en"))[0].detail);
    expect(composerSuggestions("@", known, de).map((item) => [item.label, item.detail])).toEqual([
      ["@web-shop", "Arbeitsbereich"],
      ["@Atlas", "Agent"],
      ["@Claude Code", "CLI"],
    ]);
    expect(composerSuggestions("@web", known, translator("ja"))[0].detail).toBe("ワークスペース");
  });
});
