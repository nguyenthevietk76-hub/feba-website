"""Máy xem thử giao diện Haravan tại máy, không cần tải lên Haravan.

Chạy:  python haravan/preview/serve.py      rồi mở http://127.0.0.1:5180
Đọc thẳng file trong haravan/theme/ ở mỗi lần tải trang: sửa .liquid, .css, .js rồi bấm F5 là thấy.

Giả lập: 10 sản phẩm (mock.py), nhóm sản phẩm, menu, giỏ hàng và các API /cart/*.js, /products/<handle>.js,
tìm kiếm (?view=...), phân trang, form liên hệ. Trang /checkout là trang giả để xem giỏ hàng và thuộc tính đơn
(nguồn đơn) mà giao diện gửi lên. Thanh toán, tài khoản, ứng dụng của Haravan không chạy ở đây.
"""
import json, os, re, sys, traceback, unicodedata
from collections import abc
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, quote, unquote, urlparse

from liquid import Environment
from liquid.loaders import FileExtensionLoader

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import mock  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
THEME = os.path.join(os.path.dirname(HERE), "theme")
SITE_IMG = os.path.join(mock.ROOT, "_src", "img")
PORT = int(os.environ.get("PORT", "5180"))
MONEY_FORMAT = "{{amount_no_decimals_with_comma_separator}}₫"

PAGINATE = re.compile(r"\{%-?\s*paginate\s+([\w.]+)\s+by\s+(\d+)\s*-?%\}")
FORM = re.compile(r"\{%-?\s*form\s+'([\w-]+)'[^%]*%\}")


def preprocess(src):
    """Các thẻ riêng của Haravan (paginate, form, layout) đổi sang Liquid chuẩn trước khi dựng."""
    src = PAGINATE.sub("", src)
    src = re.sub(r"\{%-?\s*endpaginate\s*-?%\}", "", src)
    src = FORM.sub(lambda m: '<form method="post" action="/__form/%s" accept-charset="UTF-8">{%% assign form = __form %%}' % m.group(1), src)
    src = re.sub(r"\{%-?\s*endform\s*-?%\}", "</form>", src)
    src = re.sub(r"\{%-?\s*layout\s+[^%]*%\}", "", src)
    return src


class HaravanLoader(FileExtensionLoader):
    def get_source(self, env, template_name):
        s = super().get_source(env, template_name)
        return s._replace(source=preprocess(s.source))


class Cols(abc.Sequence):
    """collections: vừa lặp được (for c in collections), vừa lấy theo handle (collections['quat-sac'])."""
    def __init__(self, d): self.d = d
    def __getitem__(self, k):
        if isinstance(k, (int, slice)): return list(self.d.values())[k]
        return self.d.get(k, {"products": [], "products_count": 0})
    def __iter__(self): return iter(self.d.values())
    def __len__(self): return len(self.d)


def money_fmt(v, with_currency=True):
    try: n = round(float(v or 0) / 100)
    except (TypeError, ValueError): return v
    s = "{:,}".format(int(n))
    return s + "₫" if with_currency else s


def strip_private(o):
    if isinstance(o, dict):
        return {k: strip_private(v) for k, v in o.items() if not k.startswith("_") and k != "collections"}
    if isinstance(o, list):
        return [strip_private(x) for x in o]
    return o


def img_url(obj, size="small"):
    if isinstance(obj, dict):
        if "image" in obj and obj["image"]: return obj["image"]
        return obj.get("src") or ""
    return obj or ""


def make_env():
    env = Environment(loader=HaravanLoader(search_path=os.path.join(THEME, "snippets"), ext=".liquid"))
    env.add_filter("money", lambda v: money_fmt(v))
    env.add_filter("money_with_currency", lambda v: money_fmt(v) + " VND")
    env.add_filter("money_without_currency", lambda v: money_fmt(v, False))
    env.add_filter("asset_url", lambda n: "/assets/" + str(n))
    env.add_filter("haravan_asset_url", lambda n: "/__hrv/" + str(n))
    env.add_filter("stylesheet_tag", lambda u: '<link href="%s" rel="stylesheet" type="text/css" media="all" />' % u)
    env.add_filter("script_tag", lambda u: '<script src="%s" type="text/javascript"></script>' % u)
    env.add_filter("product_img_url", lambda src, size="small": src or "")
    env.add_filter("img_url", img_url)
    env.add_filter("within", lambda url, col=None: (col["url"] + url) if isinstance(col, dict) and col.get("url") else url)
    env.add_filter("json", lambda o: json.dumps(strip_private(o), ensure_ascii=False))
    env.add_filter("default_errors", lambda e: "")
    env.add_filter("link_to", lambda text, url="": '<a href="%s">%s</a>' % (url, text))
    env.add_filter("handleize", lambda s: mock.slug(str(s)))
    env.add_filter("handle", lambda s: mock.slug(str(s)))
    env.add_filter("url_param_escape", lambda s: quote(str(s)))
    return env


PRODUCTS, COLS = mock.load()
BY_HANDLE = {p["handle"]: p for p in PRODUCTS}
BY_VARIANT = {v["id"]: (p, v) for p in PRODUCTS for v in p["variants"]}
SETTINGS = json.load(open(os.path.join(THEME, "config", "settings_data.json"), encoding="utf-8"))["current"]
_over = os.path.join(HERE, "settings_preview.json")
if os.path.exists(_over):
    SETTINGS.update({k: v for k, v in json.load(open(_over, encoding="utf-8")).items() if not k.startswith("_")})
CART = {"lines": [], "note": "", "attributes": {}}


# ---------------- cart ----------------
def cart_line(i, ln):
    p, v = BY_VARIANT[ln["variant_id"]]
    vt = "" if v["title"] == "Default Title" else v["title"]
    img = (p["featured_image"] or {}).get("src", "")
    return {
        "id": v["id"], "variant_id": v["id"], "product_id": p["id"], "key": "%d:%d" % (v["id"], i),
        "title": p["title"] + (" - " + vt if vt else ""), "product_title": p["title"], "variant_title": vt or None,
        "variant_options": [v["title"]], "quantity": ln["quantity"], "price": v["price"], "original_price": v["price"],
        "line_price": v["price"] * ln["quantity"], "url": p["url"] + "?variant=%d" % v["id"], "image": img,
        "handle": p["handle"], "sku": v["sku"], "vendor": p["vendor"], "properties": ln.get("properties") or {},
        "product": p, "variant": v,
    }


def cart_obj():
    items = [cart_line(i, ln) for i, ln in enumerate(CART["lines"])]
    return {"items": items, "item_count": sum(i["quantity"] for i in items), "total_price": sum(i["line_price"] for i in items),
            "note": CART["note"], "attributes": CART["attributes"], "requires_shipping": True, "token": "preview"}


def cart_json():
    c = cart_obj()
    c["items"] = [{k: v for k, v in it.items() if k not in ("product", "variant")} for it in c["items"]]
    return c


def cart_error(msg):
    return 422, {"status": 422, "message": "Cart Error", "description": msg}


def cart_add(form):
    vid = int((form.get("id") or ["0"])[0] or 0)
    qty = max(1, int((form.get("quantity") or ["1"])[0] or 1))
    if vid not in BY_VARIANT: return cart_error("Không tìm thấy sản phẩm.")
    p, v = BY_VARIANT[vid]
    if not v["available"]: return cart_error("Sản phẩm %s đã hết hàng." % p["title"])
    have = sum(l["quantity"] for l in CART["lines"] if l["variant_id"] == vid)
    if have + qty > v["inventory_quantity"]:
        return cart_error("Chỉ còn %d sản phẩm %s trong kho." % (v["inventory_quantity"], p["title"]))
    for l in CART["lines"]:
        if l["variant_id"] == vid: l["quantity"] += qty; break
    else:
        CART["lines"].append({"variant_id": vid, "quantity": qty})
    i = next(i for i, l in enumerate(CART["lines"]) if l["variant_id"] == vid)
    out = cart_line(i, CART["lines"][i]); out.pop("product"); out.pop("variant")
    return 200, out


def cart_change(form):
    qty = max(0, int((form.get("quantity") or ["0"])[0] or 0))
    if form.get("line"):
        idx = int(form["line"][0]) - 1
    else:
        vid = int((form.get("id") or ["0"])[0]); idx = next((i for i, l in enumerate(CART["lines"]) if l["variant_id"] == vid), -1)
    if 0 <= idx < len(CART["lines"]):
        v = BY_VARIANT[CART["lines"][idx]["variant_id"]][1]
        if qty > v["inventory_quantity"]: return cart_error("Chỉ còn %d sản phẩm trong kho." % v["inventory_quantity"])
        if qty == 0: CART["lines"].pop(idx)
        else: CART["lines"][idx]["quantity"] = qty
    return 200, cart_json()


def cart_update(form):
    ups = form.get("updates[]")
    if ups:
        for i, q in enumerate(ups):
            if i < len(CART["lines"]): CART["lines"][i]["quantity"] = max(0, int(q or 0))
        CART["lines"] = [l for l in CART["lines"] if l["quantity"] > 0]
    if "note" in form: CART["note"] = form["note"][0]
    for k, v in form.items():
        m = re.match(r"attributes\[(.+)\]$", k)
        if m:
            if v[0] == "": CART["attributes"].pop(m.group(1), None)
            else: CART["attributes"][m.group(1)] = v[0]
    return 200, cart_json()


# ---------------- rendering ----------------
def fold(s):
    s = str(s).replace("đ", "d").replace("Đ", "D")
    return unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower()


def paginate(ctx, src, page, base_url):
    m = PAGINATE.search(src)
    if not m: return
    path, per = m.group(1).split("."), int(m.group(2))
    obj = ctx
    for k in path[:-1]: obj = obj[k]
    items = obj[path[-1]]
    pages = max(1, -(-len(items) // per))
    page = min(max(1, page), pages)
    sep = "&" if "?" in base_url else "?"
    url = lambda n: base_url + sep + "page=%d" % n
    sliced = items[(page - 1) * per: page * per]
    # chép từng tầng để không sửa dữ liệu gốc
    holder = ctx
    for k in path[:-1]:
        holder[k] = dict(holder[k]); holder = holder[k]
    holder[path[-1]] = sliced
    ctx["paginate"] = {"pages": pages, "current_page": page, "items": len(items), "page_size": per,
                       "previous": {"url": url(page - 1)} if page > 1 else None,
                       "next": {"url": url(page + 1)} if page < pages else None,
                       "parts": [{"title": n, "url": url(n), "is_link": n != page} for n in range(1, pages + 1)]}
    ctx["current_page"] = page


def render(env, tpl, ctx, query, path):
    fname = tpl.replace("customers/", "customers[") + ("]" if tpl.startswith("customers/") else "")
    view = (query.get("view") or [""])[0]
    if view and os.path.exists(os.path.join(THEME, "templates", "%s.%s.liquid" % (tpl, view))):
        fname = "%s.%s" % (tpl, view)
    raw = open(os.path.join(THEME, "templates", fname + ".liquid"), encoding="utf-8").read()
    no_layout = bool(re.search(r"\{%-?\s*layout\s+none", raw))
    page = int((query.get("page") or ["1"])[0] or 1)
    base = path + ("?" + "&".join("%s=%s" % (k, quote(v[0])) for k, v in query.items() if k != "page") if any(k != "page" for k in query) else "")
    paginate(ctx, raw, page, base)
    body = env.from_string(preprocess(raw)).render(**ctx)
    if no_layout: return body
    layout = open(os.path.join(THEME, "layout", "theme.liquid"), encoding="utf-8").read()
    return env.from_string(preprocess(layout)).render(**dict(ctx, content_for_layout=body))


def base_ctx(template, path):
    return {
        "settings": SETTINGS, "shop": {"name": "TIỆN LAB", "money_format": MONEY_FORMAT, "url": "http://127.0.0.1:%d" % PORT, "domain": "127.0.0.1"},
        "linklists": mock.LINKLISTS, "collections": Cols(COLS), "cart": cart_obj(), "template": template,
        "canonical_url": "http://127.0.0.1:%d%s" % (PORT, path), "content_for_header": "<!-- content_for_header (Haravan) -->",
        "powered_by_link": '<a href="https://www.haravan.com" rel="nofollow">Cung cấp bởi Haravan</a>', "current_page": 1,
        "page_title": "TIỆN LAB", "page_description": SETTINGS.get("footer_about", ""), "customer": None,
        "__form": {"posted_successfully?": False, "errors": None},
        "request": {"path": path},
    }


def route(path, query):
    """Trả về (template, ctx bổ sung) hoặc None nếu không có trang."""
    parts = [unquote(p) for p in path.strip("/").split("/") if p]
    if not parts: return "index", {}
    if parts[0] == "collections":
        if len(parts) == 1: return "list-collections", {"page_title": "Nhóm sản phẩm"}
        col = COLS.get(parts[1])
        if not col: return None
        if len(parts) >= 4 and parts[2] == "products":
            p = BY_HANDLE.get(parts[3])
            return ("product", {"product": p, "collection": col, "page_title": p["title"]}) if p else None
        sort = (query.get("sort_by") or ["manual"])[0]
        items = list(col["products"])
        if sort == "price-ascending": items.sort(key=lambda p: p["price"])
        elif sort == "price-descending": items.sort(key=lambda p: -p["price"])
        elif sort == "created-descending": items.sort(key=lambda p: p["created_at"], reverse=True)
        elif sort == "title-ascending": items.sort(key=lambda p: fold(p["title"]))
        col = dict(col, products=items, sort_by=sort)
        return "collection", {"collection": col, "page_title": col["title"]}
    if parts[0] == "products" and len(parts) > 1:
        p = BY_HANDLE.get(parts[1])
        return ("product", {"product": p, "page_title": p["title"], "page_description": re.sub("<[^>]+>", " ", p["description"])[:160]}) if p else None
    if parts[0] == "search":
        q = (query.get("q") or [""])[0].strip()
        res = [p for p in PRODUCTS if q and all(w in fold(p["title"] + " " + p["type"] + " " + p["vendor"]) for w in fold(q).split())]
        return "search", {"search": {"performed": bool(q), "terms": q, "results": res, "results_count": len(res)}, "page_title": "Tìm kiếm"}
    if parts == ["cart"]: return "cart", {"page_title": "Giỏ hàng"}
    if parts[0] == "pages" and len(parts) > 1:
        pg = mock.PAGES.get(parts[1])
        if not pg: return None
        return ("page.contact" if pg["template_suffix"] == "contact" else "page"), {"page": pg, "page_title": pg["title"],
                "__form": {"posted_successfully?": "contact_posted" in query, "errors": None}}
    if parts[0] == "blogs":
        return "blog", {"blog": {"title": "Tin tức", "articles": [], "url": "/blogs/news"}, "page_title": "Tin tức"}
    if parts[0] == "account":
        sub = parts[1] if len(parts) > 1 else "login"
        if sub in ("login", "register"): return "customers/" + sub, {"page_title": "Tài khoản"}
    return None


CHECKOUT_PAGE = """<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Thanh toán (giả lập)</title><style>body{font:15px/1.5 'Open Sans',Arial,sans-serif;background:#f4f4f4;margin:0;padding:32px 16px;color:#222}
main{max-width:640px;margin:auto;background:#fff;padding:24px;border:1px solid #ddd}h1{font-size:22px;margin:0 0 6px}table{width:100%%;border-collapse:collapse}
td,th{padding:8px 4px;border-bottom:1px solid #eee;text-align:left}.n{color:#777;font-size:13px}code{background:#f0f0f0;padding:1px 4px}</style></head>
<body><main><h1>Trang thanh toán của Haravan</h1><p class="n">Đây là trang giả của máy xem thử. Trên Haravan thật, khách điền địa chỉ và chọn cách thanh toán ở đây.</p>
<table><tr><th>Sản phẩm</th><th>SL</th><th>Thành tiền</th></tr>%s<tr><th colspan="2">Tạm tính</th><th>%s</th></tr></table>
<h2 style="font-size:16px;margin-top:22px">Thuộc tính đơn hàng (hiện trong Haravan &gt; Đơn hàng)</h2>%s
<h2 style="font-size:16px">Ghi chú</h2><p>%s</p><p><a href="/cart">Quay lại giỏ hàng</a> · <a href="/__reset">Xoá giỏ</a></p></main></body></html>"""


class Handler(BaseHTTPRequestHandler):
    env = make_env()

    def log_message(self, fmt, *a):
        sys.stderr.write("%s %s\n" % (self.command, self.path))

    def send(self, code, body, ctype="text/html; charset=utf-8", headers=None):
        b = body if isinstance(body, bytes) else body.encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(b)))
        self.send_header("Cache-Control", "no-store")
        for k, v in (headers or {}).items(): self.send_header(k, v)
        self.end_headers()
        self.wfile.write(b)

    def redirect(self, to): self.send(302, "", headers={"Location": to})

    def json(self, code, obj): self.send(code, json.dumps(obj, ensure_ascii=False), "application/json; charset=utf-8")

    def form(self):
        n = int(self.headers.get("Content-Length") or 0)
        raw = self.rfile.read(n).decode("utf-8") if n else ""
        if "json" in (self.headers.get("Content-Type") or ""):
            d = json.loads(raw or "{}")
            return {k: [str(v)] for k, v in d.items()}
        return parse_qs(raw, keep_blank_values=True)

    def file(self, path):
        if not os.path.isfile(path): return self.send(404, "not found", "text/plain")
        ext = os.path.splitext(path)[1].lower()
        ctype = {".css": "text/css; charset=utf-8", ".js": "application/javascript; charset=utf-8", ".png": "image/png",
                 ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".json": "application/json"}.get(ext, "application/octet-stream")
        self.send(200, open(path, "rb").read(), ctype)

    def page(self, path, query):
        r = route(path, query)
        if r is None:
            tpl, extra, code = "404", {"page_title": "Không tìm thấy"}, 404
        else:
            (tpl, extra), code = r, 200
        ctx = base_ctx(tpl, path); ctx.update(extra)
        try:
            self.send(code, render(self.env, tpl, ctx, query, path))
        except Exception:
            self.send(500, "<pre style='white-space:pre-wrap'>" + traceback.format_exc().replace("<", "&lt;") + "</pre>")

    def do_GET(self):
        u = urlparse(self.path); path, q = u.path, parse_qs(u.query, keep_blank_values=True)
        if path.startswith("/assets/"):
            name = os.path.basename(unquote(path))
            if name == "favicon.png": return self.file(os.path.join(SITE_IMG, "apple-touch-icon.png"))
            if name == "share.jpg": return self.file(os.path.join(SITE_IMG, "og.jpg"))
            return self.file(os.path.join(THEME, "assets", name))
        if path.startswith("/img/"): return self.file(os.path.join(mock.IMG_DIR, os.path.basename(unquote(path))))
        if path.startswith("/__hrv/"): return self.send(200, "/* Haravan */", "application/javascript")
        if path == "/__reset": CART.update(lines=[], note="", attributes={}); return self.redirect("/cart")
        if path == "/cart.js": return self.json(200, cart_json())
        if path == "/cart/change":
            cart_change(q); return self.redirect("/cart")
        m = re.match(r"^/products/([\w-]+)\.js$", path)
        if m:
            p = BY_HANDLE.get(m.group(1))
            return self.json(200, strip_private(p)) if p else self.json(404, {"status": 404})
        if path == "/checkout":
            c = cart_obj()
            rows = "".join("<tr><td>%s</td><td>%d</td><td>%s</td></tr>" % (i["title"], i["quantity"], money_fmt(i["line_price"])) for i in c["items"])
            attrs = "".join("<li><code>%s</code>: %s</li>" % kv for kv in c["attributes"].items()) or "<li class='n'>(không có)</li>"
            return self.send(200, CHECKOUT_PAGE % (rows or "<tr><td colspan=3>Giỏ trống</td></tr>", money_fmt(c["total_price"]), "<ul>%s</ul>" % attrs, c["note"] or "(trống)"))
        return self.page(path, q)

    def do_POST(self):
        path = urlparse(self.path).path
        f = self.form()
        api = {"/cart/add.js": cart_add, "/cart/add": cart_add, "/cart/change.js": cart_change, "/cart/update.js": cart_update}
        if path in api:
            code, obj = api[path](f)
            if path == "/cart/add": return self.redirect("/cart")
            return self.json(code, obj)
        if path == "/cart/clear.js":
            CART.update(lines=[], note="", attributes={}); return self.json(200, cart_json())
        if path == "/cart":
            cart_update(f)
            return self.redirect("/checkout" if "checkout" in f else "/cart")
        if path.startswith("/__form/"):
            ref = self.headers.get("Referer") or "/"
            return self.redirect(urlparse(ref).path + "?contact_posted=1")
        self.send(404, "not found", "text/plain")


if __name__ == "__main__":
    for s in (sys.stdout, sys.stderr):
        try: s.reconfigure(encoding="utf-8", errors="replace")
        except AttributeError: pass
    print("Máy xem thử giao diện: http://127.0.0.1:%d  (Ctrl+C để dừng)" % PORT)
    if not os.path.isdir(mock.IMG_DIR): print("Chưa có thư mục ảnh %s, sản phẩm sẽ hiện không ảnh." % mock.IMG_DIR)
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
