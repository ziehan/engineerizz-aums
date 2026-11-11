const test = require("node:test");
const assert = require("node:assert/strict");
const { intake, verification } = require("../src/prompts/systemPrompts");

test("systemPrompts verification includes Web Canvas watermark and anti-fraud instructions", () => {
  assert.match(verification, /Web Canvas Watermark Verification/);
  assert.match(verification, /HTML5 Canvas/);
  assert.match(verification, /latitude, longitude/);
  assert.match(verification, /confidenceScore strictly below 0\.50/);
  assert.match(verification, /visualMatch: false/);
  assert.match(verification, /auditNotes/);
  assert.match(verification, /moir/i);
});

test("systemPrompts intake includes visual object deduplication instructions", () => {
  assert.match(intake, /Visual & Geospatial Deduplication/);
  assert.match(intake, /kendaraan/);
  assert.match(intake, /existingReports/);
  assert.match(intake, /isDuplicate: true/);
  assert.match(intake, /parentReportId/);
  assert.match(intake, /reasoning/);
});
