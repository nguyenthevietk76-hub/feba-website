"""Dữ liệu giả lập cho máy xem thử: 10 sản phẩm lấy từ noi-dung-san-pham.html (cùng nguồn với dữ liệu nhập lên Haravan).

Giá trong Liquid và JSON của Haravan tính theo đơn vị x100 (369.000 đ -> 36900000), giữ nguyên quy ước đó ở đây.
Tồn kho chỉ là số giả để xem thử nhãn "Chỉ còn" và màu hết hàng, không phải tồn kho thật.
"""
import html, os, re, unicodedata

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
CONTENT = os.path.join(os.path.dirname(HERE), "noi-dung-san-pham.html")
IMG_DIR = os.path.join(ROOT, "tu-lieu", "anh-san-pham", "haravan")

GROUPS = {
    "Sản phẩm chủ lực": ("san-pham-chu-luc", "Sản phẩm chủ lực"),
    "Chăm sóc răng miệng": ("cham-soc-rang-mieng", "Chăm sóc răng miệng"),
    "Quạt sạc": ("quat-sac", "Quạt sạc"),
    "Bình giữ nhiệt": ("binh-giu-nhiet", "Bình giữ nhiệt"),
}
TYPES = {"B-02PRO": "Tăm nước", "B-26": "Bàn chải điện", "A-028": "Quạt sạc", "A-014": "Quạt sạc"}
# tồn kho giả: (mã, màu) -> số lượng; còn lại để 40
STOCK = {("MC500", "Hồng"): 0, ("MC650", "Đen"): 3, ("A-014", None): 4, ("MC1200", "Xanh"): 0}


def slug(s):
    s = s.replace("đ", "d").replace("Đ", "D")
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def price(s):
    return int(re.sub(r"\D", "", s.split("đ")[0])) * 100


def images_for(code):
    key = code.lower().replace("-", "").replace("pro", "")
    out = []
    if os.path.isdir(IMG_DIR):
        for n in range(1, 6):
            f = "%s-%d.jpg" % (key, n)
            if os.path.exists(os.path.join(IMG_DIR, f)):
                out.append(f)
    return out


def load():
    text = open(CONTENT, encoding="utf-8").read()
    products, vid = [], 1000
    for pid, sec in enumerate(re.findall(r'<section class="p">(.*?)</section>', text, re.S), start=1):
        rows = {html.unescape(a): html.unescape(b) for a, b in re.findall(r"<tr><th>(.*?)</th><td>(.*?)</td></tr>", sec)}
        desc = html.unescape(re.search(r"<textarea[^>]*>(.*?)</textarea>", sec, re.S).group(1))
        code, title = rows["Mã SKU"], rows["Tên sản phẩm"]
        handle = slug(title)
        colors = [c.strip() for c in rows["Phân loại (Màu sắc)"].split(",")] if "Không có" not in rows["Phân loại (Màu sắc)"] else []
        p, cmp = price(rows["Giá bán"]), price(rows["Giá so sánh"])
        imgs = [{"src": "/img/" + f, "alt": title, "id": pid * 10 + i} for i, f in enumerate(images_for(code))]
        variants = []
        for c in (colors or [None]):
            vid += 1
            qty = STOCK.get((code, c), 40)
            variants.append({
                "id": vid, "title": c or "Default Title", "option1": c or "Default Title", "option2": None, "option3": None,
                "sku": code + ("-" + slug(c).upper() if c else ""), "price": p, "compare_at_price": cmp,
                "available": qty > 0, "inventory_quantity": qty, "inventory_management": "haravan",
                "featured_image": None, "barcode": None, "weight": 500,
            })
        groups = [g.strip() for g in rows["Nhóm sản phẩm"].split(",")]
        tags = [t for t in [rows["Tag"]] if t and not t.startswith("(")]
        products.append({
            "id": pid, "title": title, "handle": handle, "url": "/products/" + handle, "vendor": "Magic",
            "type": TYPES.get(code, "Bình giữ nhiệt"), "product_type": TYPES.get(code, "Bình giữ nhiệt"),
            "tags": tags, "description": desc, "content": desc,
            "price": p, "price_min": p, "price_max": p, "compare_at_price": cmp, "compare_at_price_min": cmp, "compare_at_price_max": cmp,
            "price_varies": False, "available": any(v["available"] for v in variants),
            "images": imgs, "featured_image": imgs[0] if imgs else None,
            "options": ["Màu sắc"] if colors else ["Title"], "variants": variants,
            "_groups": groups, "created_at": "2026-11-%02d" % (24 - pid),
        })
    cols = {}
    for name, (h, t) in GROUPS.items():
        items = [p for p in products if name in p["_groups"]]
        cols[h] = {"title": t, "handle": h, "url": "/collections/" + h, "products": items, "products_count": len(items), "description": ""}
    cols["all"] = {"title": "Tất cả sản phẩm", "handle": "all", "url": "/collections/all", "products": products, "products_count": len(products), "description": ""}
    for p in products:
        p["collections"] = [c for h, c in cols.items() if h != "all" and p in c["products"]]
    return products, cols


LINKLISTS = {
    "main-menu": {"title": "Menu chính", "handle": "main-menu", "links": [
        {"title": "Tăm nước B-02 PRO", "url": "/products/tam-nuoc-magic", "links": []},
        {"title": "Danh mục", "url": "/collections", "links": [
            {"title": "Chăm sóc răng miệng", "url": "/collections/cham-soc-rang-mieng", "links": []},
            {"title": "Quạt sạc", "url": "/collections/quat-sac", "links": []},
            {"title": "Bình giữ nhiệt", "url": "/collections/binh-giu-nhiet", "links": []},
        ]},
        {"title": "Tất cả sản phẩm", "url": "/collections/all", "links": []},
        {"title": "Liên hệ", "url": "/pages/lien-he", "links": []},
    ]},
    "footer": {"title": "Hỗ trợ", "handle": "footer", "links": [
        {"title": "Hướng dẫn mua hàng", "url": "/pages/huong-dan-mua-hang", "links": []},
        {"title": "Chính sách đổi trả", "url": "/pages/chinh-sach-doi-tra", "links": []},
        {"title": "Liên hệ", "url": "/pages/lien-he", "links": []},
    ]},
}

PAGES = {
    "lien-he": {"title": "Liên hệ", "handle": "lien-he", "template_suffix": "contact",
                "content": "<p>Hỏi gì về sản phẩm cứ nhắn, đội TIỆN LAB trả lời trong giờ học và buổi tối.</p>"},
    "huong-dan-mua-hang": {"title": "Hướng dẫn mua hàng", "handle": "huong-dan-mua-hang", "template_suffix": "",
                           "content": "<p>(Trang mẫu trong máy xem thử. Nội dung thật soạn trong Haravan &gt; Trang nội dung.)</p>"},
    "chinh-sach-doi-tra": {"title": "Chính sách đổi trả", "handle": "chinh-sach-doi-tra", "template_suffix": "",
                           "content": "<p>(Trang mẫu trong máy xem thử. Nội dung thật soạn trong Haravan &gt; Trang nội dung.)</p>"},
}
