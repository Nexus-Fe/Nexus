import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { removeVietnameseTones, matchesQuery } from "../src/utils/vietnamese.ts";
import { matchAdministrativeLocation } from "../src/utils/address-matching.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test("removeVietnameseTones converts accents and diacritics correctly", () => {
  assert.equal(removeVietnameseTones("Bến Nghé"), "ben nghe");
  assert.equal(removeVietnameseTones("Đà Nẵng"), "da nang");
  assert.equal(removeVietnameseTones("Dịch Vọng Hậu"), "dich vong hau");
  assert.equal(removeVietnameseTones("Quận 1, TP. Hồ Chí Minh"), "quan 1 tp ho chi minh");
  assert.equal(removeVietnameseTones("  Thị   trấn  Tân Túc  "), "thi tran tan tuc");
});

test("matchesQuery handles multi-word query in any order and common abbreviations", () => {
  const target = removeVietnameseTones("Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh");

  const q1 = removeVietnameseTones("ben nghe").split(" ").filter(Boolean);
  assert.equal(matchesQuery(target, q1), true);

  const q2 = removeVietnameseTones("Bến Nghé Q1").split(" ").filter(Boolean);
  assert.equal(matchesQuery(target, q2), true);

  const q3 = removeVietnameseTones("hcm ben nghe").split(" ").filter(Boolean);
  assert.equal(matchesQuery(target, q3), true);

  const q4 = removeVietnameseTones("ha noi").split(" ").filter(Boolean);
  assert.equal(matchesQuery(target, q4), false);
});

test("matchAdministrativeLocation maps GHN locations to 2-level administrative units", () => {
  const matched = matchAdministrativeLocation("Hà Nội", "Phường Ba Đình");
  assert.ok(matched);
  assert.equal(matched.provinceCode, "01");
  assert.equal(matched.wardCode, "00004");
});

test("public/address.json exists, is valid JSON and contains required fields", () => {
  const jsonPath = path.resolve(__dirname, "../public/address.json");
  assert.equal(fs.existsSync(jsonPath), true);

  const raw = fs.readFileSync(jsonPath, "utf8");
  const data = JSON.parse(raw);
  assert.equal(Array.isArray(data), true);
  assert.ok(data.length > 0);

  const benNghe = data.find((item) => item.wardCode === "20101");
  assert.ok(benNghe);
  assert.equal(benNghe.provinceId, 202);
  assert.equal(benNghe.districtId, 1442);
  assert.equal(benNghe.wardName, "Phường Bến Nghé");
  assert.ok(benNghe.fullName.includes("Bến Nghé"));
  assert.ok(benNghe.searchText.includes("ben nghe"));
});
