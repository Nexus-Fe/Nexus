# Kế hoạch sửa frame thanh toán Buyer bị gắn nội dung Seller

Ngày điều tra: 26/10/2026  
Project: https://stitch.withgoogle.com/projects/6106604581197312568  
Written against: repository commit 022afd43499ac30117ee9bd50dd4d1c711dda3af và trạng thái Stitch quan sát trực tiếp trong ngày.  
Phạm vi kế hoạch: sửa thông tin frame trên Stitch và cập nhật kiểm kê UI; không triển khai phần hóa đơn pháp lý, webhook/đối soát, quá hạn hay kết nối API.

## Bằng chứng trực tiếp

| Lớp UI | Quan sát |
| --- | --- |
| Tên ngoài trên canvas | **BUYER - Thanh toán chuyển khoản (Desktop)**, node Stitch **a35841fab3c94e49813a0e2bbc86dac8**. |
| Tiêu đề tài liệu được render bên trong | **SELLER - Đăng ký gian hàng (Desktop) [Dữ liệu minh họa]**. |
| Nội dung thực tế | Giao diện Seller Onboarding gồm bốn bước: mô hình hoạt động; thông tin định danh/tổ chức và tài liệu; thiết lập gian hàng; xem lại và gửi hồ sơ. Có các trường giấy tờ, tên gian hàng, địa chỉ kho và nút “Gửi hồ sơ đăng ký”. Không có mã QR, số tiền chuyển khoản hay thông tin đơn mua Buyer. |
| Danh mục canvas | Khi kiểm tra 61 node trên canvas, không có node nào mang tên **SELLER - Đăng ký gian hàng (Desktop)**. Có **BUYER - QR chuyển khoản**, **BUYER - QR chuyển khoản (Desktop)** và **BUYER - Kết quả thanh toán** riêng. |

Đây là sự lệch giữa **metadata tên frame** và **toàn bộ HTML/rendered UI**, không phải một dòng tiêu đề viết sai. Chưa có bằng chứng đủ để kết luận thao tác nào gây ra lệch này (đổi tên thủ công, chọn nhầm frame khi sinh, hoặc lỗi lưu của Stitch). Không sửa theo một nguyên nhân suy đoán.

## Quyết định thiết kế

Giữ nội dung Seller Onboarding vì đó là một màn hoàn chỉnh và hiện không có frame Seller đăng ký riêng trong danh mục. Đổi **tên canvas** của node a35841fab3c94e49813a0e2bbc86dac8 thành **SELLER - Đăng ký gian hàng (Desktop)**. Không thay nội dung bằng thanh toán Buyer.

Đối với mua thường, dùng **BUYER - QR chuyển khoản** (node **293fe36696884bea8a4277d60aedfafb**) làm frame QR chính. **BUYER - QR chuyển khoản (Desktop)** (node **6ee3d1a2bc9d471c8fea04a9a2d080a8**) đang mô tả cùng chức năng, có khác biệt ở lời kêu gọi thao tác; không tính nó thành một bước mua riêng. Giữ frame này để đối chiếu trước khi quyết định hợp nhất hoặc lưu làm biến thể tham khảo; không xóa trong đợt sửa tên.

## Thao tác chỉnh sửa đề xuất

1. Trong Stitch, chọn đúng node **a35841fab3c94e49813a0e2bbc86dac8**; xác nhận lại nội dung Seller Onboarding bốn bước rồi dùng lệnh Rename của frame để đổi tên canvas thành **SELLER - Đăng ký gian hàng (Desktop)**. Không đổi project name hoặc H1 trong màn vì H1 đã đúng.
2. Mở hai frame QR Buyer cạnh nhau. Dùng **BUYER - QR chuyển khoản** làm bản tham chiếu chính. Ghi lại mọi nội dung thực sự khác ở bản **(Desktop)**, nhất là nút “Tôi đã chuyển khoản”; chỉ hợp nhất nếu nó là UI được chốt, vì hiện các nút đều tĩnh và hành vi chưa được phê duyệt. Trong kiểm kê, ghi bản thứ hai là biến thể/trùng chức năng, không phải một màn thanh toán bổ sung.
3. Cập nhật hàng “QR và thông tin chuyển khoản” trong **stitch-screen-gap-audit-2026-10-26.md**: bỏ frame mang tên Buyer nhưng thực chất là Seller ra khỏi bằng chứng thanh toán. Cập nhật **stitch-buyer-purchase-auth-gap-plan-2026-10-26.md** sau khi đổi tên thành công.

## Kiểm chứng

- Danh mục canvas có **SELLER - Đăng ký gian hàng (Desktop)**; H1 và biểu mẫu bên trong cùng nói về Seller Onboarding.
- Không còn frame tên Buyer thanh toán mà hiển thị giấy tờ/thiết lập gian hàng Seller.
- **BUYER - QR chuyển khoản** vẫn có QR minh họa và thông tin đơn Buyer; không bị sửa khi đổi tên frame Seller.
- Hai frame QR được phân định là một chức năng chính và một biến thể đang cần quyết định, không làm tăng giả tạo số bước mua đã hoàn tất.
- Không có frame bị xóa, không có prototype hoặc kết nối API phát sinh từ việc sửa metadata.

## Điều kiện dừng

Nếu trước lúc đổi tên xuất hiện một frame Seller đăng ký khác hoặc nội dung node a35841fab3c94e49813a0e2bbc86dac8 đã thay đổi, kiểm tra lại để tránh hai frame Seller trùng chức năng. Nếu frame QR chính không còn tồn tại, không đổi nội dung Seller thành Buyer; lập lại kiểm kê và chọn nguồn Buyer hợp lệ.
