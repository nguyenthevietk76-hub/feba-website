"""Dựng website FEBA từ mã nguồn trong _src.

Chạy:  python _src/build.py
Kết quả: thư mục "website/" ở cạnh _src — mở website/index.html bằng trình duyệt.
Mỗi trang là một file HTML tự chứa (đã nhúng sẵn CSS, phông chữ, ảnh, three.js).
Riêng phim giới thiệu nằm ở website/media/ (chép từ _src/media/).

  _src/pages/*.html  nội dung từng trang (phần <main>); ảnh viết dạng  @img:ten-anh.jpg
  _src/img/          ảnh dùng trên web
  _src/site.css      giao diện chung        _src/site.js   hiệu ứng cuộn chung
  _src/app.js        mô hình 3D + kịch bản cuộn (trang sản phẩm), _src/parts.js linh kiện
  _src/video/        dự án Remotion dựng phim giới thiệu
"""
import base64, os, re, shutil

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, "website")

PAGES = [
    # file, title, description, nav key, uses 3D, body class
    ("index.html", "FEBA — Đội thi Kinh doanh số 2026", "FEBA: bốn sinh viên Kinh tế số, Học viện Chính sách và Phát triển, vận hành kênh TIỆN LAB trên TikTok Shop Affiliate. Bán bằng nội dung. Quyết bằng dữ liệu.", "team", False, ""),
    ("san-pham.html", "Tăm nước B-02 PRO — FEBA", "Tăm nước không dây Magic B-02 PRO: bình 200 ml, 30–120 psi, IPX7, pin 1.500 mAh, 4 đầu tăm xoay 360°. Danh mục sản phẩm đội FEBA đang bán.", "product", True, "has-subnav"),
    ("chien-dich.html", "Chiến dịch TIỆN LAB — FEBA", "Chiến dịch TIỆN LAB trên TikTok Shop Affiliate: mô hình, khách hàng, năm trụ cột nội dung, nhịp đăng, lộ trình 01/10–05/12/2026 và KPI.", "campaign", False, ""),
]
NAV = [("team", "index.html", "Đội thi", "01"), ("product", "san-pham.html", "Sản phẩm", "02"), ("campaign", "chien-dich.html", "Chiến dịch", "03")]


def read(name):
    with open(os.path.join(HERE, name), encoding="utf-8-sig") as f:   # tolerate a BOM
        return f.read()


def write(path, text):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(text)


def header(active):
    links = "\n".join(
        '      <a href="%s"%s><sup>%s</sup>%s</a>' % (href, ' aria-current="page"' if key == active else "", no, label)
        for key, href, label, no in NAV)
    return f'''<div class="guides" aria-hidden="true"><div class="wrap">{"<i></i>" * 12}</div></div>
<header class="hdr" id="hdr">
  <nav aria-label="Điều hướng chính">
    <a class="brand" href="index.html"><span class="logo">FEBA</span><span class="issue">Số 01 · 2026</span></a>
    <div class="navlinks">
{links}
    </div>
    <p class="meta">Cuộc thi Sinh viên<br>Kinh doanh số 2026</p>
    <button class="menu-btn" aria-label="Mở menu" aria-expanded="false"><i></i></button>
  </nav>
  <div class="hdr-progress" id="prog"></div>
</header>'''


def footer():
    pages = "".join('<li><a href="%s">%s — %s</a></li>' % (href, no, label) for _, href, label, no in NAV)
    return f'''<footer>
  <div class="wrap top">
    <div><p class="label" style="color:#8fa0ff">FEBA — Số 01 · 2026</p><p style="font-size:clamp(22px,2.2vw,32px);font-weight:800;letter-spacing:-.03em;line-height:1.15;margin-top:18px;max-width:18ch">Bán bằng nội dung.<br>Quyết bằng dữ liệu.</p></div>
    <div class="cols">
      <div><h4>Trang</h4><ul>{pages}</ul></div>
      <div><h4>Dự án</h4><ul><li><a href="chien-dich.html">TIỆN LAB</a></li><li><a href="san-pham.html">Tăm nước B-02 PRO</a></li><li><a href="san-pham.html#danh-muc">Danh mục</a></li></ul></div>
      <div><h4>Đội thi</h4><ul><li>Học viện Chính sách<br>và Phát triển</li><li>Khoa Kinh tế số</li></ul></div>
    </div>
  </div>
  <div class="wrap"><p class="big" aria-hidden="true">FEBA</p></div>
  <div class="wrap"><div class="bot"><span>Cuộc thi Sinh viên Kinh doanh số 2026 · 01/10 – 05/12/2026</span><span>© 2026 FEBA. Cấu tạo bên trong sản phẩm là hình minh hoạ.</span></div></div>
</footer>'''


def build():
    css = read(os.path.join("fonts", "fonts.css"))
    for fn in os.listdir(os.path.join(HERE, "fonts")):
        if fn.endswith(".woff2"):
            with open(os.path.join(HERE, "fonts", fn), "rb") as f:
                css = css.replace("url(%s)" % fn, 'url("data:font/woff2;base64,%s")' % base64.b64encode(f.read()).decode())
    site_css = read("site.css").replace("/*@@FONTS@@*/", css)
    inline_js = lambda code: "<script>" + code.replace("</script", "<\\/script") + "</script>"

    def img_uri(m):
        with open(os.path.join(HERE, "img", m.group(1)), "rb") as f:
            return "data:image/jpeg;base64," + base64.b64encode(f.read()).decode()

    for fname, title, desc, nav, is3d, body_cls in PAGES:
        scripts = inline_js(read("site.js"))
        if is3d:
            scripts = inline_js(read("three.min.js")) + "\n" + scripts + "\n" + inline_js(read("app.js").replace("/*@@PARTS@@*/", read("parts.js")))
        body = re.sub(r"@img:([\w.-]+\.jpg)", img_uri, read(os.path.join("pages", fname)))
        html = f'''<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{title}</title>
<meta name="description" content="{desc}">
<meta name="theme-color" content="#f3f1ec">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<style>{site_css}</style>
</head>
<body class="{body_cls}">
{header(nav)}
{body}
{footer()}
{scripts}
</body>
</html>
'''
        write(os.path.join(OUT, fname), html)
        print("  %-16s %5d KB" % (fname, round(os.path.getsize(os.path.join(OUT, fname)) / 1024)))

    media = os.path.join(HERE, "media")
    if os.path.isdir(media):
        os.makedirs(os.path.join(OUT, "media"), exist_ok=True)
        for fn in os.listdir(media):
            shutil.copyfile(os.path.join(media, fn), os.path.join(OUT, "media", fn))
            print("  media/%-10s %5d KB" % (fn, round(os.path.getsize(os.path.join(media, fn)) / 1024)))
    print("OK", OUT)


if __name__ == "__main__":
    build()
