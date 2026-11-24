# FEBA — Website đội thi

Website của đội **FEBA**, Cuộc thi Sinh viên Kinh doanh số 2026 (Học viện Chính sách và Phát triển), kênh **TIỆN LAB** trên TikTok Shop Affiliate.

**Xem trực tuyến:** https://feba.id.vn

Nền kem `#F3F1EC`, chữ đen mực `#111111`, nhấn xanh Klein `#1F3BFF`, phông Open Sans. Kể chuyện bằng hình, hiệu ứng khi cuộn.

## Các trang

| Trang | Địa chỉ | File dựng ra |
|---|---|---|
| Đội thi | https://feba.id.vn | `docs/index.html` |
| Sản phẩm (mô hình 3D) | https://feba.id.vn/san-pham | `docs/san-pham.html` |
| Chiến dịch TIỆN LAB | https://feba.id.vn/chien-dich | `docs/chien-dich.html` |

GitHub Pages phục vụ thư mục `docs/` (nhánh `main`). Ảnh, phông chữ, CSS, JS nằm riêng trong `docs/assets/` để trình duyệt lưu đệm.
Địa chỉ cũ dạng `/website/...` tự chuyển về địa chỉ mới.

## Mạch kể chuyện

Cả ba trang là sổ tay của "phòng thí nghiệm bán hàng" TIỆN LAB, chia chương (mục lục chương tự hiện bên trái màn hình rộng, nhãn chương ở đáy trên điện thoại):

| Trang | Các chương |
|---|---|
| Đội thi | 01 Câu hỏi (cùng sản phẩm, cùng giá: thắng bằng gì?) · 02 Giả thuyết · 03 Người làm · 04 Thí nghiệm đang chạy · 05 Tiếp theo |
| Sản phẩm | 01 Vấn đề (nhân vật Minh Anh) · 02 Vì sao chọn (chấm điểm có trọng số) · 03 Mở máy ra (3D) · 04 Đo thông số · 05 Kết luận, đặt mua |
| Chiến dịch | 01 Người xem · 02 Một video (kịch bản 60 giây cuộn theo giây) · 03 Nội dung · 04 Phễu tính ngược · 05 Nhịp, lộ trình · 06 Luật |

Thêm chương mới: gắn `data-chap="06" data-chap-name="Tên"` vào thẻ `<section>` đầu chương. Số liệu và câu chữ lấy từ kế hoạch kinh doanh của đội; nhân vật khách hàng có ghi rõ là nhân vật đại diện.

**Cập nhật số liệu hằng tuần** (`_src/pages/index.html`, tìm "Đồng hồ đo" và "Nhật ký thí nghiệm"): sửa số người theo dõi, độ dài thanh (`--p:4.6%`), ngày "Số tại báo cáo", thêm dòng nhật ký `<li class="log-i rv" data-date="dd/mm">`. Mốc đã qua tự sáng lên theo ngày hôm nay.

## Sửa nội dung

- `_src/pages/*.html` — chữ và bố cục từng trang (ảnh viết dạng `@img:ten-anh.jpg`, lấy từ `_src/img/`)
- `_src/site.css` — giao diện chung · `_src/site.js` — cuộn mượt, hiệu ứng, phim
- `_src/app.js`, `_src/parts.js` — mô hình 3D và linh kiện bên trong

Dựng lại website:

```bash
python _src/build.py
```

## Phim giới thiệu (Remotion)

Dự án ở `_src/video/`. Dựng lại phim (cần Node.js):

```bash
cd _src/video
npm install
npm run render
npm run render:vertical
npm run poster
```

Phim xuất ra `_src/media/`, rồi chạy lại `python _src/build.py` để chép sang `docs/media/`.

## Giấy phép bên thứ ba

- [three.js](https://threejs.org) r149 — MIT
- [Remotion](https://www.remotion.dev) — giấy phép Remotion (miễn phí cho cá nhân và nhóm nhỏ)
- Phông [Open Sans](https://fonts.google.com/specimen/Open+Sans) — SIL Open Font License 1.1

Cấu tạo bên trong máy trên trang Sản phẩm và hình vẽ các sản phẩm mở rộng là hình minh hoạ.
