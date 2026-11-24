"""Dựng website FEBA từ mã nguồn trong _src.

Chạy:  python _src/build.py
Kết quả: thư mục "docs/" ở cạnh _src. GitHub Pages phục vụ thư mục này tại https://feba.id.vn
  feba.id.vn/            trang Đội thi       (docs/index.html)
  feba.id.vn/san-pham    trang Sản phẩm      (docs/san-pham.html, GitHub tự bỏ đuôi .html)
  feba.id.vn/chien-dich  trang Chiến dịch    (docs/chien-dich.html)
Ảnh, phông chữ, CSS, JS nằm riêng trong docs/assets/ để trình duyệt lưu đệm, trang tải nhanh hơn.
Xem thử trên máy: chạy một máy chủ tĩnh ở thư mục docs/ (đường dẫn dùng dạng /assets/...).

  _src/pages/*.html  nội dung từng trang (phần <main>); ảnh viết dạng  @img:ten-anh.jpg
  _src/img/          ảnh dùng trên web (og.jpg: ảnh xem trước khi chia sẻ link)
  _src/site.css      giao diện chung        _src/site.js   hiệu ứng cuộn chung
  _src/app.js        mô hình 3D + kịch bản cuộn (trang sản phẩm), _src/parts.js linh kiện
  _src/video/        dự án Remotion dựng phim giới thiệu
"""
import hashlib, json, os, re, shutil
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, "docs")
SITE = "https://feba.id.vn"
DOMAIN = "feba.id.vn"
OG = "/assets/img/og.jpg"   # được gắn mã phiên bản khi dựng, để mạng xã hội lấy ảnh mới

PAGES = [
    # file, url path, title, description, nav key, uses 3D, images loaded eagerly (above the fold)
    ("index.html", "/", "FEBA · Đội thi Kinh doanh số 2026", "FEBA: bốn sinh viên Học viện Chính sách và Phát triển vận hành TIỆN LAB, kênh TikTok @feba.shop và website bán hàng trên Haravan, bán đồ dùng Magic cho sinh viên và người đi làm trẻ.", "team", False, 4),
    ("san-pham.html", "/san-pham", "Tăm nước B-02 PRO · FEBA", "Tăm nước Magic B-02 PRO, sản phẩm chủ lực của TIỆN LAB: vì sao đội chọn, người mua đội nhắm tới, mô hình 3D tách lớp, thông số 20-120 psi, IPX7, pin 1.500 mAh, 4 đầu tăm.", "product", True, 1),
    ("chien-dich.html", "/chien-dich", "Chiến lược TIỆN LAB · FEBA", "Chiến lược TIỆN LAB: mục tiêu và kế hoạch tài chính, phễu chuyển đổi, khách hàng, nội dung, lịch đăng, kênh bán và đơn hàng, rủi ro, lộ trình.", "campaign", False, 1),
]
NAV = [("team", "/", "Đội thi"), ("product", "/san-pham", "Sản phẩm"), ("campaign", "/chien-dich", "Chiến lược")]
STORE = "https://feba.myharavan.com"
TIKTOK = "https://www.tiktok.com/@feba.shop"
# nút nổi bật trên đầu trang: mọi trang đều dẫn về cửa hàng (kênh ra đơn chính)
CTA = {"team": (STORE, "Vào cửa hàng", "btn-blue"), "product": (STORE + "/products/tam-nuoc-magic-b-02-pro", "Đặt B-02 PRO", "btn-blue"), "campaign": (STORE, "Vào cửa hàng", "btn-blue")}
# old addresses (site used to live under /website/) keep working through small redirect pages
OLD = {"website/index.html": "/", "website/san-pham.html": "/san-pham", "website/chien-dich.html": "/chien-dich"}
FAVICON = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="#1f3bff"/><path d="M20 14h26v9H30v7h14v9H30v11H20z" fill="#fff"/><circle cx="48" cy="46" r="5" fill="#fff"/></svg>'


def read(name, mode="r"):
    path = os.path.join(HERE, name)
    if mode == "rb":
        with open(path, "rb") as f:
            return f.read()
    with open(path, encoding="utf-8-sig") as f:   # tolerate a BOM
        return f.read()


def write(rel, data):
    path = os.path.join(OUT, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "wb" if isinstance(data, bytes) else "w", **({} if isinstance(data, bytes) else {"encoding": "utf-8"})) as f:
        f.write(data)


def ver(data):
    return hashlib.sha1(data if isinstance(data, bytes) else data.encode()).hexdigest()[:8]


def asset(rel, data):
    """write docs/assets/<rel> and return its cache-busted URL"""
    write(os.path.join("assets", rel), data)
    return "/assets/%s?v=%s" % (rel, ver(data))


def clean_links(html):
    """index.html -> /, san-pham.html#x -> /san-pham#x (GitHub Pages serves /san-pham from san-pham.html)"""
    html = re.sub(r'="media/', '="/media/', html)
    html = re.sub(r'href="index\.html(#[^"]*)?"', lambda m: 'href="/%s"' % (m.group(1) or ""), html)
    return re.sub(r'href="(san-pham|chien-dich)\.html(#[^"]*)?"', lambda m: 'href="/%s%s"' % (m.group(1), m.group(2) or ""), html)


def header(active):
    links = "\n".join('      <a href="%s"%s>%s</a>' % (href, ' aria-current="page"' if key == active else "", label) for key, href, label in NAV)
    href, label, cls = CTA[active] if active in CTA else (STORE, "Vào cửa hàng", "btn-blue")
    ext = ' target="_blank" rel="noopener"' if href.startswith("http") else ""
    return f'''<a class="skip" href="#noi-dung">Bỏ qua tới nội dung</a>
<header class="hdr" id="hdr">
  <nav aria-label="Điều hướng chính">
    <a class="brand" href="/" aria-label="FEBA, trang chủ">FEBA<span>.</span></a>
    <div class="navlinks" id="navlinks">
{links}
    </div>
    <a class="btn {cls}" href="{href}"{ext}>{label}</a>
    <button class="menu-btn" aria-label="Mở menu" aria-expanded="false" aria-controls="navlinks"><i></i></button>
  </nav>
  <div class="prog" id="prog"></div>
</header>'''


def footer():
    links = "".join('<a href="%s">%s</a>' % (href, label) for _, href, label in NAV)
    links += '<a href="%s" target="_blank" rel="noopener">Cửa hàng</a><a href="%s" target="_blank" rel="noopener">TikTok</a>' % (STORE, TIKTOK)
    return f'''<footer>
  <div class="wrap">
    <span><b>FEBA</b> · Cuộc thi Sinh viên Kinh doanh số 2026 · Học viện Chính sách và Phát triển</span>
    <nav aria-label="Trang">{links}</nav>
    <span>Cấu tạo bên trong sản phẩm là hình minh hoạ.</span>
  </div>
</footer>'''


def num(v, dec=None):
    """số kiểu Việt Nam: 1.856 · 27,9"""
    if isinstance(v, float) and dec is None:
        dec = 1 if abs(v - round(v)) > 1e-9 else 0
    s = ("{:,.%df}" % (dec or 0)).format(v)
    return s.replace(",", "\x00").replace(".", ",").replace("\x00", ".")


def load_data():
    """_src/data.json (kế hoạch của đội) + vài số tính sẵn. Không chứa số liệu tiến độ thật của kênh."""
    d = json.loads(read("data.json"))
    d.pop("_huong_dan", None)
    kh = d["ke_hoach"]
    b02 = kh["gmv_san_pham"][0]
    d["tinh"] = {
        "tong_chi_phi": sum(c[1] for c in kh["chi_phi"]),
        "ty_trong_b02": round(b02[2] / kh["muc_tieu"]["gmv"] * 100),
        "gia_tri_tb_don": round(kh["muc_tieu"]["gmv"] * 1e6 / kh["muc_tieu"]["sp"] / 1000),
    }
    return d


def fill_data(html, d):
    """{{d:ke_hoach.muc_tieu.sp}} -> 200 ; {{p:...}} -> số thô (cho CSS)"""
    def get(path):
        v = d
        for part in path.split("."):
            v = v[int(part)] if isinstance(v, list) else v[part]
        return v
    html = re.sub(r"\{\{p:([\w.]+)\}\}", lambda m: str(get(m.group(1))), html)
    return re.sub(r"\{\{d:([\w.]+)\}\}", lambda m: num(get(m.group(1))) if isinstance(get(m.group(1)), (int, float)) else str(get(m.group(1))), html)


def head(title, desc, path, css_url, preload, extra=""):
    url = SITE + path
    return f'''<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{title}</title>
<meta name="description" content="{desc}">
<link rel="canonical" href="{url}">
<meta name="theme-color" content="#f3f1ec">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<meta property="og:type" content="website">
<meta property="og:locale" content="vi_VN">
<meta property="og:site_name" content="FEBA">
<meta property="og:url" content="{url}">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:image" content="{SITE}{OG}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
{preload}
<link rel="stylesheet" href="{css_url}">{extra}
</head>'''


def build():
    if os.path.isdir(OUT):
        shutil.rmtree(OUT)   # docs/ is generated output only
    write("CNAME", DOMAIN + "\n")
    write(".nojekyll", "")
    write("favicon.svg", FAVICON)
    shutil.copyfile(os.path.join(HERE, "img", "apple-touch-icon.png"), os.path.join(OUT, "apple-touch-icon.png"))

    # fonts + css
    fonts_css, preload = read(os.path.join("fonts", "fonts.css")), []
    for fn in sorted(os.listdir(os.path.join(HERE, "fonts"))):
        if fn.endswith(".woff2"):
            u = asset("fonts/" + fn, read(os.path.join("fonts", fn), "rb"))
            fonts_css = fonts_css.replace("url(%s)" % fn, "url(%s)" % u)
            if "latin-ext" not in fn:
                preload.append('<link rel="preload" href="%s" as="font" type="font/woff2" crossorigin>' % u)
    css_url = asset("site.css", read("site.css").replace("/*@@FONTS@@*/", fonts_css))
    site_js = asset("site.js", read("site.js"))
    three_js = asset("three.min.js", read("three.min.js"))
    app_js = asset("app.js", read("app.js").replace("/*@@PARTS@@*/", read("parts.js")))
    global OG
    OG = asset("img/og.jpg", read(os.path.join("img", "og.jpg"), "rb"))

    images = {}

    def img_tag(m, state):
        attrs, name = m.group(1), m.group(2)
        if name not in images:
            data = read(os.path.join("img", name), "rb")
            with Image.open(os.path.join(HERE, "img", name)) as im:
                images[name] = (asset("img/" + name, data), im.size)
        url, (w, h) = images[name]
        rest = m.group(3)
        state["n"] += 1
        extra = ' width="%d" height="%d"' % (w, h) if "width=" not in attrs + rest else ""
        if "loading=" not in attrs + rest:
            extra += ' loading="lazy"' if state["n"] > state["eager"] else ' fetchpriority="high"'
        return '<img%s src="%s"%s%s decoding="async">' % (attrs, url, rest, extra)

    data = load_data()
    data_tag = '<script id="feba-data" type="application/json">%s</script>' % json.dumps(data, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")

    for fname, path, title, desc, nav, is3d, eager in PAGES:
        state = {"n": 0, "eager": eager}
        body = read(os.path.join("pages", fname))
        body = re.sub(r'<img([^>]*?) src="@img:([\w.-]+)"([^>]*?)>', lambda m: img_tag(m, state), body)
        body = fill_data(body, data)
        body = body.replace("<main>", '<main id="noi-dung">', 1)
        scripts = data_tag + '\n<script src="%s" defer></script>' % site_js
        if is3d:
            scripts = '<script src="%s" defer></script>\n%s\n<script src="%s" defer></script>' % (three_js, scripts, app_js)
        html = head(title, desc, path, css_url, "\n".join(preload)) + f'''
<body>
{header(nav)}
{body}
{footer()}
{scripts}
</body>
</html>
'''
        write(fname, clean_links(html))
        print("  %-16s %5d KB" % (fname, round(os.path.getsize(os.path.join(OUT, fname)) / 1024)))

    # 404 page (served by GitHub Pages for any unknown address)
    nf = head("Không tìm thấy trang · FEBA", "Trang này không tồn tại.", "/404", css_url, "\n".join(preload), '\n<meta name="robots" content="noindex">') + f'''
<body>
{header("none")}
<main id="noi-dung" class="sec notfound"><div class="wrap">
  <span class="kicker">Lỗi 404</span>
  <h1 class="h2">Trang này không có ở đây.</h1>
  <p class="mute">Có thể đường dẫn đã cũ hoặc gõ nhầm. Chọn một trang bên dưới.</p>
  <div class="ctas"><a class="btn btn-blue" href="/">Đội thi</a><a class="btn btn-line" href="/san-pham">Sản phẩm</a><a class="btn btn-line" href="/chien-dich">Chiến lược</a></div>
</div></main>
{footer()}
<script src="{site_js}" defer></script>
</body>
</html>
'''
    write("404.html", nf)

    # redirects from the old /website/... addresses
    for old, new in OLD.items():
        write(old, f'<!DOCTYPE html><html lang="vi"><head><meta charset="utf-8"><title>FEBA</title><link rel="canonical" href="{SITE}{new}"><meta http-equiv="refresh" content="0; url={new}"><script>location.replace("{new}"+location.hash)</script></head><body><a href="{new}">Mở trang FEBA</a></body></html>\n')

    media = os.path.join(HERE, "media")
    if os.path.isdir(media):
        for fn in os.listdir(media):
            dst = os.path.join(OUT, "media", fn)
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            shutil.copyfile(os.path.join(media, fn), dst)
    total = sum(os.path.getsize(os.path.join(dp, f)) for dp, _, fs in os.walk(OUT) for f in fs)
    print("  assets: %d images, docs/ total %.1f MB" % (len(images), total / 1048576))
    print("OK", OUT)


if __name__ == "__main__":
    build()
