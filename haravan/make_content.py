"""Tạo trang hướng dẫn nhập 10 sản phẩm lên Haravan từ file danh sách sản phẩm của Ban tổ chức.

Chạy:  python haravan/make_content.py "<đường dẫn file Danh Sách Sản Phẩm DBC-MAGIC.xlsx>"
Kết quả: haravan/noi-dung-san-pham.html  (mở bằng trình duyệt, bấm "Chép" để chép mô tả dán vào Haravan)
"""
import html, os, re, sys
import openpyxl

HERE = os.path.dirname(os.path.abspath(__file__))
INTRO = {
    "B-02PRO": "Tăm nước không dây gọn trong một tay, ba chế độ cho từng nhu cầu, mang theo được khi đi học hay đi xa.",
    "B-26": "Bàn chải điện năm chế độ, tự nhắc đủ hai phút và nhắc chuyển vùng chải, hợp với buổi sáng vội vàng.",
    "A-028": "Quạt tích điện để bàn hoặc kẹp bàn, xoay 360°, vẫn chạy khi mất điện, hợp với góc học tập.",
    "A-014": "Quạt cầm tay có mặt sò lạnh, vừa thổi gió vừa làm mát trực tiếp, gọn trong túi khi di chuyển.",
}
GROUP = {"B-02PRO": "Chăm sóc răng miệng", "B-26": "Chăm sóc răng miệng", "A-028": "Quạt sạc", "A-014": "Quạt sạc"}
COLLECTION_NOTE = {"B-02PRO": "Chăm sóc răng miệng, Sản phẩm chủ lực"}


def main(xlsx):
    ws = openpyxl.load_workbook(xlsx, data_only=True)["Đề thi ND1"]
    cards = []
    for r in ws.iter_rows(min_row=3, values_only=True):
        if not r[1] or not isinstance(r[3], (int, float)):
            continue
        title, code, list_p, day_p, camp_p = r[1], r[2], int(r[3]), int(r[4]), int(r[5])
        info = next((c for c in reversed(r) if isinstance(c, str) and c.strip().startswith("-")), "")
        lines = [l.strip().lstrip("-").strip() for l in info.splitlines() if l.strip()]
        colors = []
        for l in lines:
            m = re.match(r"Có \d+ màu:\s*(.+)", l)
            if m:
                colors = [c.strip() for c in m.group(1).split("-")]
        intro = INTRO.get(code, "Bình giữ nhiệt Magic vỏ inox, gọn để mang theo khi đi học, đi làm hay tập thể thao.")
        desc = "<p>%s</p>\n<h3>Điểm nổi bật</h3>\n<ul>\n%s\n</ul>\n<h3>TIỆN LAB đã test</h3>\n<p>[Đội viết 1 đến 2 câu từ trải nghiệm dùng thật, ví dụ dùng ở đâu, cảm nhận gì.]</p>\n<p><em>Thông số theo tài liệu chính hãng Magic.</em></p>" % (
            html.escape(intro), "\n".join("<li>%s</li>" % html.escape(l) for l in lines if not l.lower().startswith(("bình giữ nhiệt magic mc", "bình giữ nhiệt magic mpi"))))
        group = GROUP.get(code, "Bình giữ nhiệt")
        tags = "feba-story" if code == "B-02PRO" else ""
        rows = [("Tên sản phẩm", title), ("Mã SKU", code), ("Nhà cung cấp (vendor)", "Magic"),
                ("Giá bán", "{:,}".format(day_p).replace(",", ".") + " đ (giá bán thường ngày)"),
                ("Giá so sánh", "{:,}".format(list_p).replace(",", ".") + " đ (giá niêm yết)"),
                ("Giá đợt khuyến mãi", "{:,}".format(camp_p).replace(",", ".") + " đ (chỉ đổi khi chạy chương trình)"),
                ("Nhóm sản phẩm", COLLECTION_NOTE.get(code, group)),
                ("Phân loại (Màu sắc)", ", ".join(colors) if colors else "Không có, để một phiên bản"),
                ("Tag", tags or "(để trống)")]
        cards.append("""<section class="p"><h2>%s <small>%s</small></h2><table>%s</table>
<label>Mô tả (dán vào ô Mô tả, chế độ HTML)</label><textarea readonly rows="9">%s</textarea><button type="button" onclick="c(this)">Chép mô tả</button></section>""" % (
            html.escape(title), code, "".join("<tr><th>%s</th><td>%s</td></tr>" % (html.escape(k), html.escape(v)) for k, v in rows), html.escape(desc)))
    page = """<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Nội dung 10 sản phẩm · Haravan · FEBA</title><style>
body{font-family:'Open Sans',Arial,sans-serif;background:#f3f1ec;color:#111;margin:0;padding:32px 16px;line-height:1.5}
main{max-width:860px;margin:0 auto}h1{font-size:30px;letter-spacing:-.03em}
.p{background:#fff;border:1px solid #dedad1;padding:20px;margin:18px 0}.p h2{margin:0 0 10px;font-size:20px}.p h2 small{color:#1f3bff;font-size:13px}
table{border-collapse:collapse;width:100%;font-size:14px}th{text-align:left;width:34%;color:#4a4844;font-weight:600}th,td{border-bottom:1px solid #ece9e2;padding:6px 4px}
label{display:block;font-size:13px;font-weight:700;margin:14px 0 6px}textarea{width:100%;box-sizing:border-box;font:12.5px/1.45 Consolas,monospace;border:1px solid #dedad1;padding:10px;background:#faf9f6}
button{margin-top:8px;background:#1f3bff;color:#fff;border:0;padding:10px 16px;font-weight:700;cursor:pointer}
ol li{margin-bottom:6px}.warn{background:#f9eeda;padding:12px 14px}</style></head><body><main>
<h1>Nội dung 10 sản phẩm cho Haravan</h1>
<p>Giá và thông số lấy từ file Danh sách sản phẩm DBC-MAGIC của Ban tổ chức. Ảnh sản phẩm tải từ thư mục ảnh trong file đó.</p>
<ol>
<li>Haravan &gt; Sản phẩm &gt; Thêm sản phẩm: điền theo từng thẻ bên dưới.</li>
<li>Bình giữ nhiệt: thêm thuộc tính <b>Màu sắc</b> với đủ các màu ghi trong thẻ.</li>
<li>Tạo 4 nhóm sản phẩm (Sản phẩm &gt; Nhóm sản phẩm): <b>Sản phẩm chủ lực</b>, <b>Chăm sóc răng miệng</b>, <b>Quạt sạc</b>, <b>Bình giữ nhiệt</b>.</li>
<li>Tăm nước B-02 PRO: gắn tag <b>feba-story</b> để trang sản phẩm hiện phần kể chuyện bằng hình.</li>
<li>Thay đoạn "[Đội viết ...]" bằng trải nghiệm thật của đội trước khi mở bán.</li>
</ol>
<p class="warn">Bàn chải B-26 ghi "Pin 1.200mAh, dùng được 30 ngày" và tăm nước B-02 PRO ghi "khoảng 20 ngày/lần sạc": đây là số của hãng, giữ nguyên, không tự làm tròn hay thêm số khác.</p>
@@CARDS@@
<script>function c(b){var t=b.previousElementSibling;t.select();navigator.clipboard?navigator.clipboard.writeText(t.value):document.execCommand('copy');b.textContent='Đã chép';setTimeout(function(){b.textContent='Chép mô tả'},1500)}</script>
</main></body></html>""".replace("@@CARDS@@", "\n".join(cards))
    out = os.path.join(HERE, "noi-dung-san-pham.html")
    open(out, "w", encoding="utf-8").write(page)
    print("OK", out, len(cards), "sản phẩm")


if __name__ == "__main__":
    main(sys.argv[1])
