/**
 * Tiện ích chuẩn hóa và loại bỏ dấu tiếng Việt phục vụ tìm kiếm không dấu.
 * Sử dụng Unicode Normalization Form Canonical Decomposition (NFD) và Regex.
 * Hỗ trợ mở rộng các từ viết tắt phổ biến (vd: q1 -> quan 1, hcm/tphcm -> tp ho chi minh, hn -> ha noi).
 */

export function removeVietnameseTones(str: string): string {
  if (!str) return "";

  let result = str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Xóa toàn bộ dấu thanh/mũ
    .replace(/[đĐ]/g, (match) => (match === "đ" ? "d" : "D")) // Chuẩn hóa chữ đ/Đ
    .toLowerCase()
    .trim()
    .replace(/[,.-]/g, " ") // Thay thế dấu chấm, phẩy, gạch nối thành khoảng trắng
    .replace(/\s+/g, " "); // Chuẩn hóa nhiều khoảng trắng thành 1

  // Nhận diện các từ viết tắt thông dụng của người dùng Việt Nam
  result = result
    .replace(/\bq(\d+)\b/g, "quan $1")
    .replace(/\b(tphcm|hcm)\b/g, "tp ho chi minh")
    .replace(/\bhn\b/g, "ha noi");

  return result;
}

/**
 * Kiểm tra xem chuỗi văn bản (đã bỏ dấu) có khớp với các từ khóa tìm kiếm (đã bỏ dấu) hay không.
 * Hỗ trợ tìm kiếm đa từ không theo thứ tự (ví dụ: "ben nghe q1" hoặc "ben nghe").
 */
export function matchesQuery(targetSearchText: string, queryTokens: string[]): boolean {
  if (queryTokens.length === 0) return true;
  for (let i = 0; i < queryTokens.length; i++) {
    if (!targetSearchText.includes(queryTokens[i])) {
      return false;
    }
  }
  return true;
}
