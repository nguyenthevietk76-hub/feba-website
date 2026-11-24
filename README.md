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

## Nội dung các trang

| Trang | Các phần |
|---|---|
| Đội thi | Giới thiệu đội · Hướng đi (sản phẩm, khách hàng, kênh bán) · Đội ngũ, kỹ năng, kinh nghiệm · Một ngày vận hành · Phim |
| Sản phẩm | Vì sao chọn B-02 PRO (chấm điểm, vai trò từng nhóm, doanh số mục tiêu) · Người mua · Mô hình 3D · Thông số · Cách trình bày giá · Video mẫu · Đặt mua |
| Chiến lược | Bảng kế hoạch (giai đoạn, sản phẩm, chi phí, ba kịch bản, hoà vốn) · Phễu · Khách hàng · Nội dung, kịch bản mẫu, lịch đăng, lịch theo mùa · Kênh bán và đơn hàng · Rủi ro · Lộ trình, phân vai |

Viết về việc của đội, không nhắc lại đề bài hay thông tin Ban tổ chức cung cấp. Không đưa số liệu tiến độ thật của kênh (người theo dõi, lượt xem, số đơn) lên website.

**Số liệu kế hoạch** nằm trong `_src/data.json` (mục tiêu, doanh số theo sản phẩm, chi phí, kịch bản, hoà vốn, video mẫu). Sửa tệp này rồi dựng lại; trong trang viết `{{d:ke_hoach.muc_tieu.sp}}` để chèn một số.

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
