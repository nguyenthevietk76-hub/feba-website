"""Dựng website FEBA từ mã nguồn trong _src.

Chạy:  python _src/build.py
Kết quả: thư mục "website/" ở cạnh _src · mở website/index.html bằng trình duyệt.
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
    ("index.html", "FEBA · Đội thi Kinh doanh số 2026", "FEBA: bốn sinh viên Kinh tế số, Học viện Chính sách và Phát triển, vận hành kênh TIỆN LAB trên TikTok Shop Affiliate. Bán bằng nội dung. Quyết bằng dữ liệu.", "team", False, ""),
    ("san-pham.html", "Tăm nước B-02 PRO · FEBA", "Tăm nước không dây Magic B-02 PRO: bình 200 ml, 30-120 psi, IPX7, pin 1.500 mAh, 4 đầu tăm xoay 360°. Cuộn để mở từng lớp bằng mô hình 3D.", "product", True, ""),
    ("chien-dich.html", "Chiến dịch TIỆN LAB · FEBA", "Chiến dịch TIỆN LAB trên TikTok Shop Affiliate: quy trình, khách hàng, năm trụ cột nội dung, nhịp đăng, lộ trình 01/10 đến 05/12/2026 và mục tiêu.", "campaign", False, ""),
]
NAV = [("team", "index.html", "Đội thi"), ("product", "san-pham.html", "Sản phẩm"), ("campaign", "chien-dich.html", "Chiến dịch")]
CTA = {"team": ("san-pham.html", "Mô hình 3D", "btn-ink"), "product": ("chien-dich.html", "Cách đội bán", "btn-blue"), "campaign": ("#lo-trinh", "Lộ trình", "btn-ink")}


def read(name):
    with open(os.path.join(HERE, name), encoding="utf-8-sig") as f:   # tolerate a BOM
        return f.read()


def write(path, text):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(text)


def header(active):
    links = "\n".join('      <a href="%s"%s>%s</a>' % (href, ' aria-current="page"' if key == active else "", label) for key, href, label in NAV)
    href, label, cls = CTA[active]
    return f'''<header class="hdr" id="hdr">
  <nav aria-label="Điều hướng chính">
    <a class="brand" href="index.html">FEBA<span>.</span></a>
    <div class="navlinks">
{links}
    </div>
    <a class="btn {cls}" href="{href}">{label}</a>
    <button class="menu-btn" aria-label="Mở menu" aria-expanded="false"><i></i></button>
  </nav>
  <div class="prog" id="prog"></div>
</header>'''


def footer():
    links = "".join('<a href="%s">%s</a>' % (href, label) for _, href, label in NAV)
    return f'''<footer>
  <div class="wrap">
    <span><b>FEBA</b> · Cuộc thi Sinh viên Kinh doanh số 2026 · Học viện Chính sách và Phát triển</span>
    <nav aria-label="Trang">{links}</nav>
    <span>Cấu tạo bên trong sản phẩm là hình minh hoạ.</span>
  </div>
</footer>'''


def build():
    css = read(os.path.join("fonts", "fonts.css"))
    for fn in os.listdir(os.path.join(HERE, "fonts")):
        if fn.endswith(".woff2"):
            with open(os.path.join(HERE, "fonts", fn), "rb") as f:
                css = css.replace("url(%s)" % fn, 'url("data:font/woff2;base64,%s")' % base64.b64encode(f.read()).decode())
    site_css = read("site.css").replace("/*@@FONTS@@*/", css)
    inline_js = lambda code: "<script>" + code.replace("</script", "<\\/script") + "</script>"

    cache = {}

    def img_uri(m):
        name = m.group(1)
        if name not in cache:
            with open(os.path.join(HERE, "img", name), "rb") as f:
                cache[name] = "data:%s;base64,%s" % ({"jpg": "image/jpeg", "png": "image/png", "webp": "image/webp"}[name.rsplit(".", 1)[1]], base64.b64encode(f.read()).decode())
        return cache[name]

    for fname, title, desc, nav, is3d, body_cls in PAGES:
        scripts = inline_js(read("site.js"))
        if is3d:
            scripts = inline_js(read("three.min.js")) + "\n" + scripts + "\n" + inline_js(read("app.js").replace("/*@@PARTS@@*/", read("parts.js")))
        body = re.sub(r"@img:([\w.-]+\.(?:jpg|png|webp))", img_uri, read(os.path.join("pages", fname)))
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
