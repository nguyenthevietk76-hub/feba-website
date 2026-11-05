# FEBA — Website đội thi

Website của đội **FEBA**, Cuộc thi Sinh viên Kinh doanh số 2026 (Học viện Chính sách và Phát triển), dự án **TIỆN LAB** · TikTok Shop Affiliate.

**Xem trực tuyến:** https://nguyenthevietk76-hub.github.io/feba-website/

## Các trang

| Trang | File | Nội dung |
|---|---|---|
| Trang chủ | `website/index.html` | Mô hình 3D xoay, giới thiệu, lối vào các trang, TIỆN LAB |
| Sản phẩm | `website/san-pham.html` | Tăm nước B-02 PRO: 3D cuộn tới đâu hiện tới đó, tách lớp, cận cảnh cụm bơm & bo mạch, thông số |
| Đội thi | `website/doi-thi.html` | Bốn thành viên, vai trò, nguyên tắc làm việc |
| Thành tích | `website/thanh-tich.html` | Mục tiêu đến 05/12/2026, giải thưởng |

Mỗi trang là một file HTML tự chứa (đã nhúng phông chữ, ảnh, three.js), mở trực tiếp bằng trình duyệt là chạy, không cần mạng.

## Sửa nội dung

Mã nguồn nằm trong `_src/`:

- `_src/pages/*.html` — chữ và bố cục từng trang
- `_src/site.css` — giao diện chung (phông Open Sans, màu, khoảng cách)
- `_src/site.js` — cuộn mượt, hiệu ứng hiện dần, chuyển trang
- `_src/app.js` — mô hình 3D và kịch bản cuộn; `_src/parts.js` — linh kiện bên trong

Sửa xong thì dựng lại website:

```bash
python _src/build.py
```

## Cần bổ sung

- Ảnh chân dung và họ tên các thành viên còn ghi `[Họ và tên]` (trang Đội thi)
- Ảnh và thông tin giải thưởng còn ghi `[Tên giải thưởng]`, `[Năm]` (trang Thành tích)

## Giấy phép bên thứ ba

- [three.js](https://threejs.org) r149 — MIT
- Phông [Open Sans](https://fonts.google.com/specimen/Open+Sans) — SIL Open Font License 1.1

Cấu tạo bên trong máy trên trang Sản phẩm là hình minh hoạ.
