# Đối chiếu Stitch: đăng nhập và mua hàng thông thường

Ngày kiểm tra: 26/10/2026  
Stitch: https://stitch.withgoogle.com/projects/6106604581197312568  
Phạm vi: giao diện desktop tĩnh cho Buyer và màn xác thực dùng chung. Chưa gắn luồng bấm nút trên Stitch. Đối chiếu trực tiếp frame hiện có với yêu cầu người dùng và kế hoạch F1.

## Kết luận

**Chưa đủ trọn bộ theo danh sách người dùng.** Đã có UI nền cho đăng nhập, đăng ký, OTP, lướt và xem sản phẩm, mua ngay, checkout chuyển khoản, QR, kết quả thanh toán và thông tin đơn hàng. Còn thiếu hoặc chưa rõ: giao diện đăng xuất và biên nhận/hóa đơn. Theo điều chỉnh ngày 26/10/2026, phần kết quả thanh toán được thể hiện bằng **ba modal tĩnh**: đang xử lý, thành công và thất bại có lý do; không cần ba trang kết quả đầy đủ. Checkout chỉ có **chuyển khoản ngân hàng**, đúng với kế hoạch F1; không có cơ sở thêm ví, COD hay thẻ.

Phạm vi thực thi hiện tại: ba modal trên Stitch và điều tra frame thanh toán Buyer hiển thị nội dung Seller. Kết nối API cho lý do thất bại, hóa đơn pháp lý, cơ chế webhook/đối soát và xử lý quá hạn được để lại cho đợt sau theo yêu cầu người dùng.

“Xem chi tiết” và “Mua ngay” là thao tác trên màn hình hiện có, không cần tạo một màn hình riêng cho động tác bấm. Theo phạm vi UI tĩnh đã chốt, nút chưa điều hướng không tính là thiếu màn hình.

## Bằng chứng theo 10 yêu cầu

| # | Yêu cầu | Frame/nội dung quan sát trên Stitch | Đánh giá |
| --- | --- | --- | --- |
| 1 | Login/logout | BUYER/SELLER/ADMIN/STAFF - Đăng nhập có email/tài khoản, mật khẩu, quên mật khẩu và đăng ký. Thanh tài khoản Buyer và hồ sơ cá nhân chưa cho thấy mục/trạng thái Đăng xuất. | **Một phần**: có login, chưa thấy UI logout. |
| 2 | Register | BUYER/SELLER/ADMIN/STAFF - Đăng ký có tên, email, mật khẩu, xác nhận mật khẩu và điều khoản. | **Đủ UI**. |
| 3 | Nhập OTP | BUYER/SELLER/ADMIN/STAFF - Xác thực OTP (Desktop) có sáu ô nhập, gửi lại mã, xác nhận; thể hiện ngữ cảnh đăng ký/đặt lại mật khẩu. | **Đủ UI**. |
| 4 | Lướt web mua sắm | BUYER - Trang chủ có sản phẩm niêm yết; BUYER - Danh sách sản phẩm có tìm kiếm, lọc, sắp xếp và lưới sản phẩm. | **Đủ UI**. |
| 5 | Bấm vào sản phẩm | Thẻ trong BUYER - Danh sách sản phẩm có “Xem chi tiết”. | **Đủ điểm thao tác UI**. |
| 6 | Xem chi tiết sản phẩm | BUYER - Chi tiết sản phẩm có hình, giá, tồn kho, số lượng, thông tin Seller. | **Đủ UI**. |
| 7 | Bấm mua hàng | Trang chủ và trang chi tiết có “Mua ngay”; trang chi tiết còn có “Thêm vào giỏ hàng”. | **Đủ điểm thao tác UI**. |
| 8 | Chọn phương thức thanh toán | BUYER - Checkout có khu vực phương thức thanh toán chỉ ghi chuyển khoản ngân hàng; BUYER - QR chuyển khoản có QR và thông tin chuyển khoản minh họa. | **Đủ với quy tắc một phương thức**; nên làm trạng thái đã chọn rõ hơn. |
| 9 | Hóa đơn và thông tin đơn hàng | BUYER - Chi tiết đơn hàng và GHN có mã đơn, ngày, hàng hóa, số lượng, giá, phí GHN, tổng tiền, phương thức thanh toán, người nhận, địa chỉ và vận chuyển. Chưa thấy biên nhận/hóa đơn hoặc số chứng từ riêng. | **Một phần**: thông tin đơn có; hóa đơn/biên nhận chưa rõ. |
| 10 | Xác nhận mua thành công/thất bại | BUYER - Kết quả thanh toán lấy “Đang chờ đối soát chuyển khoản” làm trạng thái chính. “Đã khớp/Thành công”, “Thông tin chưa khớp/Cần rà soát”, “Đã hết hạn/Quá hạn” chỉ là thẻ minh họa nhỏ bên dưới. | **Bổ sung theo yêu cầu mới**: ba modal tĩnh đang xử lý, thành công, thất bại; lý do thất bại là dữ liệu minh họa, API tính sau. |

### Frame đặt sai tên

Frame **BUYER - Thanh toán chuyển khoản (Desktop)** hiện hiển thị tiêu đề và toàn bộ nội dung **SELLER - Đăng ký gian hàng (Desktop)**. Không tính frame này là màn thanh toán Buyer. Điều tra trực tiếp đã xác nhận tên ngoài canvas lệch với cả tiêu đề tài liệu và biểu mẫu Seller bốn bước ở bên trong; chưa xác định được thao tác gây ra lệch. Có kế hoạch sửa chi tiết tại **stitch-payment-frame-mismatch-fix-plan-2026-10-26.md**. Giữ nội dung Seller và đổi tên canvas theo đúng vai trò khi thực thi kế hoạch đó. Dùng **BUYER - QR chuyển khoản** làm màn chuyển khoản Buyer chính; bản **(Desktop)** là biến thể trùng chức năng cần đối chiếu trước khi xử lý.

### Câu chữ thanh toán chưa thống nhất

Kế hoạch F1 yêu cầu xác nhận chuyển khoản qua webhook, với các kết quả chờ xác nhận, thành công, không khớp và hết hạn. Hai frame QR và frame kết quả hiện mô tả đối soát thủ công/không có webhook. **Việc chốt cơ chế này để đợt sau.** Ba modal mới chỉ dùng câu chữ trung tính cho trạng thái đang xử lý; không nối API hoặc mô tả cơ chế đối soát. Không trình bày “đặt hàng thành công” như đồng nghĩa với “đã thanh toán thành công”.

## Kế hoạch bổ sung trên Stitch

Chỉ sửa/tái sử dụng frame trong project hiện tại; tạo frame mới cho trạng thái thực sự chưa có. Tất cả frame desktop theo quy tắc **ROLE - Chức năng (Desktop)**; màn dùng chung ghi đủ vai trò.

### P0 — Mua và thanh toán

1. **BUYER - Checkout**: làm thẻ “Chuyển khoản ngân hàng” ở trạng thái đã chọn, hiện tiền hàng, phí GHN, tổng tiền và thông tin nhận hàng. Giữ một phương thức theo kế hoạch; không thêm ví, COD, VnPay hay thẻ. Nút xác nhận đặt hàng mô tả đúng bước tạo đơn/hiển thị QR, không ngầm báo đã thanh toán.
2. **BUYER - QR chuyển khoản**: dùng một frame chính với QR minh họa, số tiền, nội dung chuyển khoản, mã đơn, thông tin ngân hàng minh họa và trạng thái chờ xác nhận. Không dùng tài khoản ngân hàng thật trong mockup.
3. Giữ **BUYER - Kết quả thanh toán** làm trang nền/tham chiếu. Tạo **ba frame desktop có modal đang mở** với tên canvas **BUYER - Đang xử lý thanh toán (Modal Desktop)**, **BUYER - Thanh toán thành công (Modal Desktop)** và **BUYER - Thanh toán thất bại (Modal Desktop)**. Cả ba dùng chung mẫu nền QR/đơn Buyer và cùng mã đơn, số tiền minh họa. Modal đang xử lý không khẳng định đã trả tiền hoặc hứa thời gian xác nhận; modal thành công xác nhận khoản tiền; modal thất bại có khu vực “Lý do”, nội dung minh họa và câu dự phòng nếu chưa có lý do. **API cấp lý do sẽ nối sau.** Không tạo riêng trạng thái quá hạn trong đợt này, không gắn flow/prototype.

### P1 — Sau mua và đăng xuất

4. **Để đợt sau — hóa đơn pháp lý:** phần thông tin đơn đã có trong **BUYER - Chi tiết đơn hàng và GHN**. Chỉ chốt màn biên nhận/hóa đơn, trường thuế và tải chứng từ khi có yêu cầu nghiệp vụ tương ứng; không triển khai trong đợt ba modal.
5. **BUYER/SELLER/ADMIN/STAFF - Đăng xuất (Desktop)**: thêm mục “Đăng xuất” trong menu tài khoản dùng chung và trạng thái xác nhận/đã đăng xuất nếu cần để người duyệt thấy kết quả. Có thể dùng biến thể shell/menu hiện có; không cần trang mới chỉ chứa một nút. Sau đăng xuất, giao diện minh họa trở về màn đăng nhập hoặc trang công khai, không còn tên tài khoản đang đăng nhập.
6. **Kế hoạch riêng, chưa đổi nội dung:** đổi tên canvas frame Seller bị gắn nhầm tên Buyer sau khi kiểm tra node; xác định frame QR chính và ghi bản trùng là biến thể. Xem **stitch-payment-frame-mismatch-fix-plan-2026-10-26.md**. Không xóa nội dung Seller đang dùng.

## Trình tự duyệt UI

Đăng ký → OTP → Đăng nhập → Trang chủ/Danh sách sản phẩm → Chi tiết sản phẩm → Mua ngay hoặc Giỏ hàng → Checkout (chuyển khoản ngân hàng) → QR → modal Đang xử lý → modal Thành công **hoặc** Thất bại → Thông tin đơn hàng → Đăng xuất. Đoạn này chỉ là thứ tự duyệt các UI; không yêu cầu nối flow trên Stitch.

Checklist nghiệm thu UI tĩnh:

- Mỗi trạng thái có thể nhìn thấy và phân biệt trên frame desktop; tên frame tuân thủ quy tắc vai trò.
- Tạo đơn, chờ xác nhận và đã thanh toán có thông điệp khác nhau; thất bại không dùng thông điệp thành công.
- Tổng tiền và mã đơn nhất quán giữa Checkout, QR, kết quả và thông tin đơn trong dữ liệu minh họa.
- Không có nội dung Seller dưới tên frame Buyer; không tính frame trùng là chức năng đã hoàn thành.
- Lý do thất bại trong modal là dữ liệu minh họa và có vị trí dành cho chuỗi lý do từ API sau này; không nối API trong đợt này.
- “Hóa đơn” pháp lý, cơ chế webhook/đối soát và hành động khi quá hạn là việc để đợt sau; UI không tự tạo cam kết ngoài kế hoạch.

## Nguồn đối chiếu

- Kiểm tra trực tiếp project Stitch ngày 26/10/2026.
- design-plans/screen-inventory-by-role.md, mục F1.
- design-plans/stitch-buyer-seller-design-unification.md, mục F1 và quy tắc chỉ thanh toán đơn hàng bằng chuyển khoản ngân hàng.
- design-plans/stitch-screen-gap-audit-2026-10-26.md là kiểm kê tổng thể trước đó; báo cáo này làm rõ các điểm chưa đủ trong luồng mua thường.
