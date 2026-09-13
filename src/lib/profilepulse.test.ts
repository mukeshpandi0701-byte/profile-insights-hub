import { describe, expect, it } from "vitest";
import { classifyActivity, normalizeGithubUrl, normalizeLinkedinUrl, validateImportRow } from "./profilepulse";

describe("profile URL validation", () => {
  it("normalizes GitHub profiles", () => expect(normalizeGithubUrl("github.com/Octo-Cat/")).toEqual({ url: "https://github.com/Octo-Cat", username: "Octo-Cat" }));
  it("rejects GitHub repositories", () => expect(normalizeGithubUrl("https://gitlab.com/user")).toBeNull());
  it("normalizes LinkedIn profiles", () => expect(normalizeLinkedinUrl("linkedin.com/in/jane-doe/?x=1")).toBe("https://www.linkedin.com/in/jane-doe"));
  it("rejects LinkedIn company links", () => expect(normalizeLinkedinUrl("linkedin.com/company/example")).toBeNull());
});

describe("Excel row validation", () => {
  it("accepts a complete row", () => expect(validateImportRow({ "S.No": 2, Name: "Jane Doe", Department: "Engineering", "LinkedIn Link": "https://linkedin.com/in/jane", "GitHub Link": "https://github.com/jane" }, 3).errors).toEqual([]));
  it("reports invalid fields at row level", () => expect(validateImportRow({ "S.No": 0, Name: "", Department: "", "LinkedIn Link": "bad", "GitHub Link": "bad" }, 2).errors).toHaveLength(5));
  it("allows either profile link to be blank", () => expect(validateImportRow({ "S.No": 1, Name: "Jane", Department: "Arts", "LinkedIn Link": "", "GitHub Link": "" }, 2).errors).toEqual([]));
});

describe("activity classification", () => {
  it("classifies recent observations as active", () => expect(classifyActivity(new Date().toISOString(), 30, true).classification).toBe("active"));
  it("classifies old reliable observations as inactive", () => expect(classifyActivity("2020-01-01T00:00:00Z", 30, true).classification).toBe("inactive"));
  it("does not call missing public data inactive", () => expect(classifyActivity(null, 30, false).classification).toBe("no_observable_activity"));
});