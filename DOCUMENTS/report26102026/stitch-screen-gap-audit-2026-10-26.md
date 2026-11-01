# Báo cáo màn hình Stitch so với kế hoạch Nexus

**Ngày kiểm kê:** 26/10/2026  
**Project đang kiểm tra:** [NEXUS ALL ROLE PAGES](https://stitch.withgoogle.com/projects/6106604581197312568)

## Cách đọc báo cáo

Báo cáo đối chiếu bản kế hoạch tổng thể người dùng cung cấp với [danh mục theo role](screen-inventory-by-role.md), [kế hoạch Buyer/Seller](stitch-buyer-seller-design-unification.md), [kế hoạch Staff](stitch-staff-srs-implementation.md) và [kế hoạch Admin](stitch-admin-srs-implementation.md). Quyết định cập nhật sau kế hoạch gốc là thiết kế **trực tiếp trên project này, chỉ Desktop, chỉ UI, chưa nối prototype flow**. Vì vậy Mobile, project duplicate và liên kết prototype không được tính là màn còn thiếu trong báo cáo này.

Tôi đọc lại danh sách frame trên canvas Stitch trong lượt kiểm kê này: **50 frame có tên bắt đầu bằng role** gồm 8 dùng chung bốn role, 18 Buyer, 15 Seller, 3 Staff, 2 Staff/Admin và 4 Admin. Không còn frame tên “Generating Screen...”. Canvas còn 8 mục “Generating Image...”; một mục đã mở là ảnh 512×512, nên không được tính là màn hình. Có 5 cặp frame trùng tên/chức năng, liệt kê ở cuối báo cáo.

**Ý nghĩa trạng thái:**

- **Đã có:** frame phù hợp đang hiện trên canvas. Điều này xác nhận sự hiện diện của UI chính, chưa chứng nhận mọi trạng thái và chi tiết nghiệp vụ.
- **Một phần:** có frame liên quan hoặc nội dung gộp, nhưng một biến thể/hành động trong kế hoạch chưa được xác minh đầy đủ.
- **Chưa thấy:** không tìm thấy frame tương ứng trong 50 frame và không có bằng chứng đã thiết kế biến thể đó trong frame gộp. Đây là kết luận về thiết kế quan sát được, không phải khẳng định không có tính năng trong mã nguồn.
- **Có điều kiện:** chỉ được tính là thiếu bắt buộc khi quyền hoặc trách nhiệm theo Flow/SRS được xác nhận.

## Tóm tắt theo role

| Role | Phần đã có rõ ràng | Phần còn thiếu hoặc chưa chứng minh |
| --- | --- | --- |
| Dùng chung | Đủ 8 frame tài khoản/thông báo chính. | Trạng thái rỗng/tải/lỗi/không có quyền và chi tiết nội dung từng role chưa nghiệm thu đủ. |
| Buyer | Chuỗi mua thường chính; phòng đấu giá, phiên của tôi và thanh toán thắng; ví và nạp tiền. | Danh sách phiên đấu giá, kết quả thắng/thua rõ ràng, biểu mẫu đánh giá, các màn khiếu nại/báo cáo và một số kết quả/chi tiết giao dịch. |
| Seller | Sản phẩm, kho, đơn bán, vận đơn GHN, bốn màn đấu giá, ví/lịch sử và form yêu cầu rút. | Hồ sơ shop/onboarding theo bản kế hoạch tổng thể, đánh giá Buyer, coupon Seller, báo cáo bán hàng và hỗ trợ. |
| Staff | Duyệt Seller, xử lý rút tiền, hàng đợi/chi tiết khiếu nại. | Kiểm duyệt sản phẩm và xử lý sai lệch giao dịch; các kết quả/xác nhận của ba flow đã có chưa nghiệm thu đủ. Các flow có điều kiện được ghi riêng. |
| Admin | Tài khoản/hồ sơ, RBAC, sổ cái/đối soát gộp và rút tiền dự phòng. | Tổng quan, danh mục, cấu hình, coupon toàn sàn, giám sát đấu giá, Audit Log, Event Log/System Health. Sổ giao dịch và đối soát gộp cần kiểm tra sâu. |

## 1. Màn hình dùng chung cho Buyer/Seller/Admin/Staff

| Màn trong kế hoạch | Frame hiện có trên Stitch | Trạng thái |
| --- | --- | --- |
| Đăng nhập | BUYER/SELLER/ADMIN/STAFF - Đăng nhập | Đã có |
| Đăng ký tài khoản | BUYER/SELLER/ADMIN/STAFF - Đăng ký | Đã có; UI mặc định Buyer, không có form đăng ký Admin/Staff công khai. |
| Xác thực OTP đăng ký/khôi phục | BUYER/SELLER/ADMIN/STAFF - Xác thực OTP (Desktop) | Đã có |
| Quên mật khẩu | BUYER/SELLER/ADMIN/STAFF - Quên mật khẩu (Desktop) | Đã có |
| Đặt lại mật khẩu | BUYER/SELLER/ADMIN/STAFF - Đặt lại mật khẩu (Desktop) | Đã có |
| Hồ sơ cá nhân | BUYER/SELLER/ADMIN/STAFF - Hồ sơ cá nhân (Desktop) | Đã có; nội dung uy tín/đánh giá theo từng role cần nghiệm thu thêm. |
| Đổi mật khẩu | BUYER/SELLER/ADMIN/STAFF - Đổi mật khẩu (Desktop) | Đã có |
| Thông báo và tùy chọn nhận | BUYER/SELLER/ADMIN/STAFF - Thông báo và tùy chọn nhận (Desktop) | Đã có; không thay thế màn cấu hình hệ thống Admin. |

## 2. Buyer

### 2.1 Mua hàng thường — F1

| Màn trong kế hoạch | Frame hiện có trên Stitch | Trạng thái |
| --- | --- | --- |
| Trang chủ | BUYER - Trang chủ | Đã có |
| Danh sách, tìm kiếm và lọc sản phẩm | BUYER - Danh sách sản phẩm | Đã có |
| Chi tiết sản phẩm | BUYER - Chi tiết sản phẩm; BUYER - Chi tiết sản phẩm (Desktop) | Đã có nhưng có hai frame trùng chức năng. |
| Giỏ hàng | BUYER - Giỏ hàng | Đã có |
| Checkout | BUYER - Checkout | Đã có. BUYER - Sổ địa chỉ nhận hàng là frame bổ trợ đã có. |
| QR và thông tin chuyển khoản | BUYER - QR chuyển khoản; BUYER - QR chuyển khoản (Desktop); BUYER - Thanh toán chuyển khoản (Desktop) | Đã có UI thanh toán chuyển khoản; hai frame QR trùng chức năng, cần phân định frame dùng chính. |
| Kết quả thanh toán | BUYER - Kết quả thanh toán | Đã có; các biến thể chờ/khớp/lệch/hết hạn cần nghiệm thu riêng. |
| Danh sách đơn | BUYER - Đơn hàng của tôi | Đã có |
| Chi tiết đơn và timeline GHN | BUYER - Chi tiết đơn hàng và GHN | Đã có |
| Đánh giá sản phẩm và Seller sau giao | Vùng đánh giá đã được ghi nhận trong BUYER - Chi tiết đơn hàng và GHN | Một phần: chưa xác minh đủ form cho cả sản phẩm và Seller cùng trạng thái gửi/kết quả. |

### 2.2 Mua hàng đấu giá — F2

| Màn trong kế hoạch | Frame hiện có trên Stitch | Trạng thái |
| --- | --- | --- |
| Danh sách phiên đang chạy/sắp diễn ra | Không thấy frame chuyên trách; trang chủ chỉ có phần giới thiệu phiên | **Chưa thấy màn danh sách phiên đấu giá.** |
| Phòng đấu giá trực tiếp | BUYER - Phòng đấu giá trực tiếp (Desktop) | Đã có |
| Phiên của tôi, lịch sử và trạng thái lượt bid | BUYER - Đấu giá của tôi | Đã có |
| Kết quả thắng, thua hoặc bị vượt giá | BUYER - Đấu giá của tôi có một số trạng thái lượt bid | Một phần: chưa xác minh màn/biến thể kết quả sau khi phiên kết thúc cho cả ba trường hợp. |
| Thanh toán khi thắng, QR và hạn 24 giờ | BUYER - Thanh toán đơn đấu giá (Desktop) | Đã có frame; chi tiết trạng thái thanh toán cần nghiệm thu. |
| Đơn đấu giá và theo dõi GHN | BUYER - Chi tiết đơn hàng và GHN là màn đơn dùng chung có thể tái sử dụng | Một phần: chưa xác minh biến thể đơn phát sinh từ đấu giá và thông tin liên quan người thắng. |

### 2.3 Ví và hỗ trợ trong bản kế hoạch tổng thể

| Màn trong kế hoạch | Frame hiện có trên Stitch | Trạng thái |
| --- | --- | --- |
| Ví, số dư và lịch sử giao dịch | BUYER - Ví và lịch sử giao dịch | Đã có |
| Chi tiết giao dịch | Có vùng/bộ điều khiển chi tiết trong BUYER - Ví và lịch sử giao dịch theo ghi nhận trước | Một phần: chưa nghiệm thu drawer hoặc trạng thái chi tiết từng loại giao dịch. |
| Nạp tiền | BUYER - Nạp tiền | Đã có |
| Kết quả nạp tiền | Chưa thấy frame riêng | Một phần: chưa xác minh biến thể kết quả nằm trong frame Nạp tiền. |
| Danh sách và chi tiết khiếu nại của Buyer | Không thấy frame Buyer hoặc Buyer/Seller tương ứng | Chưa thấy |
| Gửi khiếu nại từ đơn | Không thấy form/biến thể đã xác minh | Chưa thấy |
| Báo cáo sản phẩm | Không thấy frame Buyer hoặc biến thể đã xác minh | Chưa thấy |
| Báo sai lệch từ giao dịch | Không thấy frame Buyer hoặc biến thể đã xác minh | Chưa thấy |

## 3. Seller

### 3.1 Đăng ký và bán hàng thường — F3

| Màn trong kế hoạch | Frame hiện có trên Stitch | Trạng thái |
| --- | --- | --- |
| Đăng ký Seller | Không thấy frame có chức năng này trong danh sách 50 frame hiện tại | Chưa thấy theo bản kế hoạch tổng thể; danh mục F1–F4 mới nhất loại onboarding khỏi phạm vi, nên đây là chênh lệch giữa hai tài liệu. |
| Trạng thái hồ sơ và lý do từ chối | Không thấy frame Seller tương ứng | Chưa thấy theo bản kế hoạch tổng thể. |
| Hồ sơ shop/cài đặt gian hàng | Có mục menu trong một số frame Seller nhưng không thấy màn shop riêng | Chưa thấy |
| Danh sách sản phẩm | SELLER - Quản lý sản phẩm | Đã có |
| Tạo/sửa sản phẩm và SKU | SELLER - Tạo/sửa sản phẩm (Desktop) | Đã có |
| Quản lý tồn kho và hàng đang giữ | SELLER - Quản lý kho; SELLER - Quản lý kho (Desktop) | Đã có nhưng trùng hai frame. |
| Danh sách đơn cần xử lý | SELLER - Quản lý đơn bán | Đã có |
| Chi tiết đơn, chấp nhận/từ chối | SELLER - Chi tiết đơn bán (Desktop) | Đã có frame; xác nhận/kết quả chấp nhận hoặc từ chối cần nghiệm thu. |
| Tạo vận đơn GHN | SELLER - Tạo vận đơn GHN (Desktop) | Đã có |
| Chi tiết vận đơn và theo dõi GHN | SELLER - Theo dõi vận đơn GHN (Desktop) | Đã có |
| Seller đánh giá Buyer | Không thấy frame hoặc biểu mẫu đã xác minh | Chưa thấy |

### 3.2 Quản lý đấu giá — F4

| Màn trong kế hoạch | Frame hiện có trên Stitch | Trạng thái |
| --- | --- | --- |
| Danh sách phiên Seller | SELLER - Quản lý phiên đấu giá | Đã có |
| Tạo/sửa phiên | SELLER - Tạo và sửa phiên đấu giá | Đã có |
| Chi tiết phiên đang diễn ra | SELLER - Chi tiết phiên đang chạy | Đã có |
| Kết quả phiên và trạng thái hàng/tồn | SELLER - Kết quả phiên đấu giá; SELLER - Kết quả phiên đấu giá (Desktop) | Đã có nhưng trùng hai frame. |
| Liên hệ kết quả phiên với đơn phát sinh | Có màn kết quả phiên và màn chi tiết đơn bán | Một phần: chưa nghiệm thu biến thể đơn có người thắng và trạng thái chuyển sang F3; không yêu cầu gắn liên kết prototype trong phạm vi UI tĩnh. |

### 3.3 Tài chính và hỗ trợ trong bản kế hoạch tổng thể

| Màn trong kế hoạch | Frame hiện có trên Stitch | Trạng thái |
| --- | --- | --- |
| Ví doanh thu, số dư và lịch sử giao dịch | SELLER - Ví doanh thu & lệnh rút (Desktop) | Đã có; đã xem lại trực tiếp thẻ số dư và bảng lịch sử. |
| Chi tiết giao dịch | Màn Ví doanh thu & lệnh rút có nút “Xem chi tiết” ở các dòng giao dịch | Một phần: chưa nghiệm thu nội dung chi tiết khi mở. |
| Danh sách lệnh rút và trạng thái | Màn Ví doanh thu & lệnh rút có bảng và bộ lọc lệnh rút | Đã có trong frame gộp; chi tiết trạng thái cần nghiệm thu. |
| Form tạo yêu cầu rút tiền | Màn Ví doanh thu & lệnh rút có heading “Tạo yêu cầu rút tiền doanh thu”, các trường nhập và nút “Gửi yêu cầu rút tiền” | **Đã có trong frame gộp; không còn ghi là thiếu form.** |
| Chi tiết yêu cầu rút tiền và kết quả xử lý | Màn Ví doanh thu & lệnh rút có dữ liệu lệnh rút và nút xem chi tiết | Một phần: chưa nghiệm thu trang/drawer chi tiết và các biến thể hoàn tất/từ chối. |
| Mã giảm giá shop/sản phẩm và tạo/sửa mã | Không thấy frame Seller tương ứng | Chưa thấy |
| Báo cáo đơn/doanh thu theo kỳ | Không thấy frame báo cáo bán hàng riêng | Chưa thấy; menu báo cáo tồn kho trong một frame khác không chứng minh UI báo cáo đơn/doanh thu. |
| Khiếu nại và báo sai lệch theo quyền | Không thấy frame Seller hoặc Buyer/Seller tương ứng | Chưa thấy |

Màn SELLER - Diễn đàn & đăng tin (Desktop) hiện có trên canvas nhưng không thay thế các màn còn thiếu trong F3/F4 hoặc tài chính/hỗ trợ.

## 4. Staff

Các bước xác nhận và kết quả có thể là modal/drawer/trạng thái của một frame, nên bảng dưới đây không đếm thiếu một trang riêng cho mỗi bước.

| Flow trong kế hoạch | Frame hiện có trên Stitch | Đã có và còn thiếu |
| --- | --- | --- |
| Duyệt hồ sơ Seller | STAFF - Duyệt hồ sơ Seller; STAFF - Chi tiết hồ sơ Seller (Desktop) | **Đã có** hàng đợi và chi tiết. **Một phần** đối với xác nhận chấp thuận/từ chối, lý do bắt buộc khi từ chối và kết quả/thông báo Seller. |
| Xử lý lệnh rút tiền | STAFF/ADMIN - Duyệt lệnh rút Seller; STAFF/ADMIN - Duyệt lệnh rút Seller (Desktop) | **Đã có** hàng đợi, chi tiết và UI ghi nhận chuyển khoản thủ công trong ít nhất một frame. **Một phần** đối với xác nhận, mã tham chiếu/thời điểm chuyển và kết quả đầy đủ; hai frame trùng cần phân định. |
| Khiếu nại/tố cáo | STAFF - Xử lý báo cáo & khiếu nại (Desktop) | **Đã có** hàng đợi, hồ sơ/bằng chứng, timeline, ghi chú Staff và nút chuyển cấp duyệt; đã xem trực tiếp trong lượt kiểm kê trước. **Một phần** đối với kết quả Admin quyết định và thông báo cho các bên. |
| Kiểm duyệt sản phẩm | Không thấy frame Staff chuyên trách | **Chưa thấy** hàng đợi báo cáo sản phẩm, chi tiết báo cáo, lý do/kết quả kiểm duyệt và thông báo Seller. Ticket liên quan sản phẩm trong màn khiếu nại không chứng minh flow kiểm duyệt. |
| Sai lệch giao dịch | Không thấy frame Staff | **Chưa thấy** hàng đợi, đối chiếu ledger/chứng từ chỉ đọc, tạo bút toán điều chỉnh riêng và kết quả. Frame Admin sổ cái không thay thế quyền xử lý Staff. |
| Hoàn tiền được giao | Không thấy frame Staff | **Có điều kiện** theo Flow/SRS; nếu đã giao việc cho Staff thì toàn bộ hàng đợi, chi tiết, xác nhận và kết quả còn thiếu. |
| Ban/unban tài khoản | Không thấy frame Staff | **Có điều kiện** theo xác nhận quyền; nếu quyền có hiệu lực thì thiếu tìm tài khoản, căn cứ, xác nhận có lý do và kết quả. |
| Event Log và System Health | Không thấy frame Staff | **Có điều kiện** theo quyền xem. Audit Log tập trung không thuộc Staff. |

## 5. Admin

| Màn trong kế hoạch | Frame hiện có trên Stitch | Trạng thái |
| --- | --- | --- |
| Tổng quan bốn vùng Hệ thống/Dòng tiền/Lợi nhuận/Người dùng | Không thấy frame Admin tổng quan | **Chưa thấy** |
| Tài khoản và hồ sơ người dùng | ADMIN - Quản lý tài khoản; ADMIN - Tài khoản & hồ sơ người dùng (Desktop) | Đã có hai frame cùng khu vực; CRUD/xóa mềm và tab đề xuất uy tín cần nghiệm thu trên bản dùng chính. |
| RBAC bốn role cố định | ADMIN - RBAC | Đã có |
| Quản lý danh mục | Không thấy frame Admin danh mục | **Chưa thấy** |
| Cấu hình hệ thống và tùy chọn nhận thông báo | Không thấy frame Admin cấu hình | **Chưa thấy**; màn thông báo dùng chung không thay thế quyền cấu hình. |
| Mã giảm giá toàn sàn | Không thấy frame Admin coupon | **Chưa thấy** |
| Giám sát đấu giá, chi tiết và hủy phiên | Không thấy frame Admin giám sát đấu giá | **Chưa thấy** |
| Sổ giao dịch và chi tiết dòng tiền chỉ đọc | ADMIN - Sổ cái & đối soát | Một phần: có frame liên quan, cần nghiệm thu bảng ledger, drawer chi tiết và tính chỉ đọc. |
| Lệnh rút tiền dự phòng Staff | Hai frame STAFF/ADMIN - Duyệt lệnh rút Seller | Đã có frame dùng chung; cần phân định bản chính và quyền Admin dự phòng. |
| Đối soát tổng theo ngày/tháng | ADMIN - Sổ cái & đối soát | Một phần: chưa nghiệm thu vùng tổng theo kỳ, tách khỏi xử lý sai lệch giao dịch đơn lẻ của Staff. |
| Audit Log Admin-only | Không thấy frame Audit Log | **Chưa thấy** |
| Event Log và System Health RabbitMQ | Không thấy frame Admin tương ứng | **Chưa thấy** |

## 6. Trùng lặp và giới hạn nghiệm thu

**Năm cặp frame trùng tên/chức năng khi bỏ hậu tố “(Desktop)”**:

1. BUYER - QR chuyển khoản và BUYER - QR chuyển khoản (Desktop).
2. BUYER - Chi tiết sản phẩm và BUYER - Chi tiết sản phẩm (Desktop).
3. SELLER - Quản lý kho và SELLER - Quản lý kho (Desktop).
4. SELLER - Kết quả phiên đấu giá và SELLER - Kết quả phiên đấu giá (Desktop).
5. STAFF/ADMIN - Duyệt lệnh rút Seller và STAFF/ADMIN - Duyệt lệnh rút Seller (Desktop).

Các frame trùng vẫn được tính trong tổng **50 frame**, nhưng không được tính thành chức năng bổ sung. Các màn riêng lẻ cũng có thể dùng chung một frame nếu nội dung đúng nghiệp vụ; báo cáo đã ghi rõ trường hợp gộp.

**Chưa nghiệm thu đầy đủ:** nhiều artboard được đo khoảng 1280 px trong các lần kiểm tra trước, so với mục tiêu Desktop 1440 px; chưa có bằng chứng đủ cho mọi biến thể loading/empty/error/no-permission, xác nhận và kết quả. Không suy ra các biến thể này đã hoàn thành chỉ từ tên frame hay lời đáp của Stitch.

**Kết luận:** Bộ UI hiện tại **chưa đầy đủ so với kế hoạch ban đầu**. Khoảng trống chắc chắn nhất là Buyer danh sách phiên đấu giá; Staff kiểm duyệt sản phẩm và sai lệch giao dịch; Admin tổng quan, danh mục, cấu hình, coupon toàn sàn, giám sát đấu giá, Audit Log, Event Log/System Health. Các mục ghi “một phần” cần xem nội dung frame gộp trước khi quyết định tạo thêm để tránh trùng.
