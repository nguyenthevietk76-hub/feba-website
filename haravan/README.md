# Giao diện FEBA cho Haravan

Giao diện bán hàng TIỆN LAB trên Haravan: trang chủ kể chuyện "Test thật. Dùng tiện. Giá sinh viên.", mua nhanh ngay trên thẻ sản phẩm, giỏ hàng trượt có thanh miễn phí giao, tìm kiếm gợi ý tức thì, lọc sản phẩm, và ghi nguồn đơn từ TikTok vào từng đơn hàng.

## Xem thử tại máy (không cần Haravan)

```bash
python haravan/preview/serve.py
```

Mở http://127.0.0.1:5180. Máy xem thử đọc thẳng file trong `theme/`: sửa `.liquid`, `.css`, `.js` rồi bấm F5 là thấy.

- Có sẵn 10 sản phẩm (lấy từ `noi-dung-san-pham.html`), 4 nhóm, menu, giỏ hàng và các API giỏ hàng của Haravan.
- Ảnh sản phẩm lấy từ `tu-lieu/anh-san-pham/haravan/` (không đưa lên GitHub). Thiếu thư mục này thì sản phẩm hiện không ảnh.
- `/checkout` là trang giả, dùng để xem giỏ hàng và **thuộc tính đơn hàng** (nguồn đơn) giao diện gửi đi.
- `preview/settings_preview.json` bật thử các khối đang để trống mặc định (mã giảm giá, Zalo, mức miễn phí giao). Chỉ dùng trong máy, không lên Haravan.
- Tồn kho trong máy xem thử là số giả để xem nhãn "Chỉ còn ... sản phẩm" và màu hết hàng.

Cần: Python 3, `pip install python-liquid pillow`.

## Dựng lại và đưa lên Haravan

```bash
python haravan/build_theme.py
```

Kết quả: `haravan/feba-theme.zip`. Trước khi đóng gói, script kiểm tra: thẻ Liquid đóng mở đủ cặp, JSON hợp lệ, file bắt buộc có đủ, mọi `settings.xxx` dùng trong giao diện đều có trong `settings_data.json` và có ô nhập trong `settings.html`.

1. Tạo sản phẩm và nhóm sản phẩm theo `noi-dung-san-pham.html` (tạo lại bằng `python haravan/make_content.py <file xlsx>`).
2. Website > Giao diện > **Tải lên giao diện** > chọn `feba-theme.zip`.
3. Ở dòng giao diện mới: **Thiết lập theme**, điền các mục 1 đến 10 (xem bảng dưới).
4. Bấm **Xem trước**, đặt thử một đơn, rồi mới **Áp dụng**. Giao diện cũ giữ lại để quay về khi cần.

## Tính năng cho khách mua

| Chỗ | Có gì |
|---|---|
| Đầu trang | Menu thả xuống (menu con trong Haravan > Menu), ô tìm kiếm (phím `/` hoặc Ctrl+K), thanh thông báo tự chuyển câu (các câu cách nhau bằng dấu `|`), ẩn khi cuộn xuống, hiện khi cuộn lên |
| Tìm kiếm | Gõ tới đâu gợi ý tới đó, có ảnh và giá, chọn bằng phím mũi tên. Dùng `templates/search.suggest.liquid` |
| Thẻ sản phẩm | Nút "Thêm vào giỏ" ngay trên thẻ; sản phẩm nhiều màu thì mở khung xem nhanh để chọn màu; chấm màu dưới tên |
| Nhóm sản phẩm | Chuyển nhóm nhanh, lọc theo loại, mức giá (tự chia theo giá đang có), còn hàng. Trên điện thoại lọc ở bảng trượt từ dưới lên |
| Trang sản phẩm | Ảnh vuốt được, phóng to khi rê chuột, xem toàn màn hình; nút chọn màu có chấm màu; tình trạng kho và "Chỉ còn ... sản phẩm"; ngày nhận dự kiến; đếm ngược giờ chốt gửi hàng; chia sẻ; tab Mô tả, Giao hàng, Bảo hành, Hỏi đáp; thanh mua dính đáy khi cuộn; "Bạn vừa xem" |
| Giỏ hàng | Giỏ trượt và trang giỏ hàng đổi số lượng, xoá tại chỗ; thanh "Mua thêm ... để được miễn phí giao"; gợi ý mua kèm; mã giảm giá bấm để chép |
| Liên hệ | Nút nổi Zalo, Messenger, hotline |

## Vận hành: chỉnh trong Thiết lập theme

| Mục | Dùng để |
|---|---|
| 8. Vận hành | Mức miễn phí giao (0 = mọi đơn), số ngày giao, giờ chốt gửi hàng, mức báo sắp hết hàng, mã giảm giá đang chạy, nhóm gợi ý mua kèm, chính sách giao hàng và đổi trả, từ khoá gợi ý tìm kiếm |
| 9. Nút liên hệ nổi | Link Zalo, Messenger (hotline lấy ở mục 7) |
| 10. Đo lường và nguồn đơn | TikTok Pixel, Google Analytics 4, Meta Pixel; bật ghi nguồn đơn; tắt jQuery cho trang nhanh hơn nếu không có ứng dụng cần |

Chỉ ghi con số và cam kết đúng với chính sách thật của cửa hàng: chúng hiện thẳng cho khách.

### Ghi nguồn đơn từ TikTok

Gắn tham số vào link đặt trong bio, video, phiên live:

```
https://<tên-miền-cửa-hàng>/products/tam-nuoc-magic?utm_source=tiktok&utm_medium=video&utm_campaign=b02-thang11&utm_content=video-03
```

Khách bấm vào rồi đặt hàng, đơn trong Haravan > Đơn hàng có thêm **Thuộc tính**: Nguồn, Kênh, Chiến dịch, Nội dung, Trang vào, Nguồn đầu tiên. Dùng để biết video, phiên live hay KOC nào ra đơn. Link ngắn `?ref=ten-koc` cũng được ghi thành Nguồn.

### Sự kiện đo lường

Khi điền mã ở mục 10, giao diện tự gửi: xem sản phẩm, thêm vào giỏ, bắt đầu thanh toán, tìm kiếm (TikTok: ViewContent, AddToCart, InitiateCheckout, Search; GA4: view_item, add_to_cart, begin_checkout, search). Sự kiện mua hàng do trang thanh toán của Haravan gửi, cấu hình trong Haravan > Cấu hình.

## Cấu trúc

| Thư mục | Nội dung |
|---|---|
| `theme/layout/theme.liquid` | Khung trang: đầu trang, menu, chân trang, dữ liệu cấu trúc cho Google |
| `theme/templates/` | Trang chủ, sản phẩm, nhóm sản phẩm, giỏ hàng, tìm kiếm (và `search.suggest` cho gợi ý), trang nội dung, blog, tài khoản |
| `theme/snippets/` | Thẻ sản phẩm, giỏ trượt, xem nhanh, tìm kiếm, thanh miễn phí giao, gợi ý mua kèm, mã giảm giá, nút liên hệ, mã đo lường, biểu tượng, phần kể chuyện B-02 PRO |
| `theme/assets/` | `theme.css`, `theme.js` (không cần jQuery) |
| `theme/config/` | `settings.html` (ô chỉnh trong Thiết lập theme), `settings_data.json` (giá trị mặc định) |
| `preview/` | Máy xem thử tại máy |

## Chưa kiểm tra được ở máy

Máy xem thử mô phỏng Liquid và API giỏ hàng, không phải Haravan thật. Sau khi tải lên, cần thử trên bản Xem trước của Haravan:

- Ô tìm kiếm gợi ý (`/search?view=suggest`): nếu Haravan không nhận mẫu riêng, ô vẫn chạy và hiện dòng "Nhấn Enter để xem kết quả".
- Thuộc tính đơn hàng hiện ở chi tiết đơn.
- Nhãn "Chỉ còn" chỉ hiện với sản phẩm bật quản lý tồn kho.
- Trang tài khoản dùng mẫu của Haravan, cần jQuery (tự tải trên các trang này).
