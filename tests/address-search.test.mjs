import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function removeVietnameseTones(str) {
  if (!str) return "";
  let result = str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, (match) => (match === "đ" ? "d" : "D"))
    .toLowerCase()
    .trim()
    .replace(/[,.-]/g, " ")
    .replace(/\s+/g, " ");

  result = result
    .replace(/\bq(\d+)\b/g, "quan $1")
    .replace(/\b(tphcm|hcm)\b/g, "tp ho chi minh")
    .replace(/\bhn\b/g, "ha noi");

  return result;
}

function matchesQuery(targetSearchText, queryTokens) {
  if (queryTokens.length === 0) return true;
  for (let i = 0; i < queryTokens.length; i++) {
    if (!targetSearchText.includes(queryTokens[i])) {
      return false;
    }
  }
  return true;
}

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
