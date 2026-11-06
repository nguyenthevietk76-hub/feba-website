# FEBA — Website đội thi

Website của đội **FEBA**, Cuộc thi Sinh viên Kinh doanh số 2026 (Học viện Chính sách và Phát triển), kênh **TIỆN LAB** trên TikTok Shop Affiliate.

**Xem trực tuyến:** https://nguyenthevietk76-hub.github.io/feba-website/

Phong cách Editorial Swiss: nền kem `#F3F1EC`, chữ đen mực `#111111`, nhấn xanh Klein `#1F3BFF`, phông Open Sans.

## Các trang

| Trang | File | Nội dung |
|---|---|---|
| 01 Đội thi | `website/index.html` | Giới thiệu đội, phim 20 giây, những con số, bản đồ năng lực, 4 thành viên, vòng vận hành |
| 02 Sản phẩm | `website/san-pham.html` | Tăm nước B-02 PRO 3D cuộn tới đâu hiện tới đó (tách lớp, cụm bơm, bo mạch), thông số, danh mục đội bán |
| 03 Chiến dịch | `website/chien-dich.html` | Mô hình Affiliate, nguyên tắc, khách hàng, 5 trụ cột nội dung, nhịp đăng, lộ trình, KPI, phân vai |

Mỗi trang là một file HTML tự chứa (phông chữ, ảnh, three.js đã nhúng). Riêng phim giới thiệu nằm ở `website/media/`.

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

Phim xuất ra `_src/media/`, rồi chạy lại `python _src/build.py` để chép sang `website/media/`.

## Giấy phép bên thứ ba

- [three.js](https://threejs.org) r149 — MIT
- [Remotion](https://www.remotion.dev) — giấy phép Remotion (miễn phí cho cá nhân và nhóm nhỏ)
- Phông [Open Sans](https://fonts.google.com/specimen/Open+Sans) — SIL Open Font License 1.1

Cấu tạo bên trong máy trên trang Sản phẩm và hình vẽ các sản phẩm mở rộng là hình minh hoạ.
