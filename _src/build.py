"""Dựng website FEBA nhiều trang từ mã nguồn trong _src.

Chạy:  python _src/build.py
Kết quả: thư mục "website/" ở cạnh _src — mở website/index.html bằng trình duyệt.
Mỗi trang là một file HTML tự chứa (đã nhúng sẵn CSS, phông chữ, ảnh, three.js).

  _src/pages/*.html  nội dung từng trang (phần <main>)
  _src/site.css      giao diện chung        _src/site.js   hiệu ứng cuộn chung
  _src/app.js        mô hình 3D + kịch bản cuộn (trang chủ & trang sản phẩm)
"""
import base64, os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, "website")

PAGES = [
    # file, title, description, nav key, uses 3D, body class
    ("index.html", "FEBA – Trang chủ", "FEBA – Đội thi Cuộc thi Sinh viên Kinh doanh số 2026. Bán bằng nội dung. Quyết bằng dữ liệu.", "home", True, ""),
    ("san-pham.html", "Tăm nước B-02 PRO – FEBA", "Tăm nước không dây B-02 PRO: bình 200 ml, 30–120 psi, IPX7, pin 1.500 mAh, 4 đầu tăm xoay 360°.", "product", True, "has-subnav"),
    ("doi-thi.html", "Đội thi – FEBA", "Bốn sinh viên Học viện Chính sách và Phát triển. Bốn vai trò trong dự án TIỆN LAB.", "team", False, ""),
    ("thanh-tich.html", "Thành tích – FEBA", "Giải thưởng và mục tiêu của đội FEBA trong Cuộc thi Sinh viên Kinh doanh số 2026.", "awards", False, ""),
]
NAV = [("home", "index.html", "Trang chủ"), ("product", "san-pham.html", "Sản phẩm"), ("team", "doi-thi.html", "Đội thi"), ("awards", "thanh-tich.html", "Thành tích")]
IMAGES = {
    "detail.jpg": os.path.join(HERE, "img-detail.jpg"),
    "scene.jpg": os.path.join(HERE, "img-scene.jpg"),
    "product-trio.jpg": os.path.join(HERE, "img-trio.jpg"),
    "product-white.jpg": os.path.join(HERE, "img-white.jpg"),
}


def read(name):
    with open(os.path.join(HERE, name), encoding="utf-8") as f:
        return f.read()


def write(path, text):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(text)


def header(active):
    links = "\n".join(
        '      <a href="%s"%s>%s</a>' % (href, ' aria-current="page"' if key == active else "", label)
        for key, href, label in NAV)
    return f'''<header class="hdr" id="hdr">
  <nav aria-label="Điều hướng chính">
    <a class="logo" href="index.html">FEBA</a>
    <button class="menu-btn" aria-label="Mở menu" aria-expanded="false"><i></i></button>
    <div class="navlinks">
{links}
    </div>
    <a class="btn btn-dark" href="index.html#du-an">Xem TIỆN LAB</a>
  </nav>
  <div class="hdr-progress" id="prog"></div>
</header>'''


def footer():
    pages = "".join('<li><a href="%s">%s</a></li>' % (href, label) for _, href, label in NAV)
    return f'''<footer>
  <div class="wrap top">
    <div><span class="logo">FEBA</span><p class="lead" style="font-size:15px;margin-top:14px;max-width:28ch">Bán bằng nội dung. Quyết bằng dữ liệu.</p></div>
    <div class="cols">
      <div><h4>Trang</h4><ul>{pages}</ul></div>
      <div><h4>Dự án</h4><ul><li><a href="index.html#du-an">TIỆN LAB</a></li><li><a href="san-pham.html">Tăm nước B-02 PRO</a></li></ul></div>
    </div>
  </div>
  <div class="bot"><span>Học viện Chính sách và Phát triển · Cuộc thi Sinh viên Kinh doanh số 2026</span><span>© 2026 FEBA</span></div>
</footer>'''


def build():
    # assets
    css = read(os.path.join("fonts", "fonts.css"))
    for fn in os.listdir(os.path.join(HERE, "fonts")):
        if fn.endswith(".woff2"):
            with open(os.path.join(HERE, "fonts", fn), "rb") as f:
                css = css.replace("url(%s)" % fn, 'url("data:font/woff2;base64,%s")' % base64.b64encode(f.read()).decode())
    # Every page is fully self-contained (CSS, fonts, scripts, three.js and images inlined),
    # so it renders even when opened on its own, previewed, or sent as a single file.
    site_css = read("site.css").replace("/*@@FONTS@@*/", css)
    inline_js = lambda code: "<script>" + code.replace("</script", "<\\/script") + "</script>"
    images = {}
    for name, src in IMAGES.items():
        with open(src, "rb") as f:
            images["assets/img/" + name] = "data:image/jpeg;base64," + base64.b64encode(f.read()).decode()

    for fname, title, desc, nav, is3d, body_cls in PAGES:
        scripts = inline_js(read("site.js"))
        if is3d:
            scripts = inline_js(read("three.min.js")) + "\n" + scripts + "\n" + inline_js(read("app.js").replace("/*@@PARTS@@*/", read("parts.js")))
        body = read(os.path.join("pages", fname))
        for path, uri in images.items():
            body = body.replace(path, uri)
        html = f'''<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{title}</title>
<meta name="description" content="{desc}">
<meta name="theme-color" content="#eef0f2">
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
    print("OK", OUT)


if __name__ == "__main__":
    build()
