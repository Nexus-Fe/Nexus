# Widgets

Widget ghép UI và dữ liệu từ hai feature trở lên. Các màn hình giao dịch hiện do feature sở hữu trực tiếp.

- Widget có thể dùng interface công khai từ `features/*/index.ts`.
- Widget không tự gọi `fetch` hay xây URL backend; request thuộc về service của feature qua `lib/api/client.ts`.
- Page trong `app/` render widget để giữ phần định tuyến ngắn gọn.

Chưa có widget dùng chung được đăng ký.
