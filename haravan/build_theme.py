"""Đóng gói giao diện FEBA cho Haravan.

Chạy:  python haravan/build_theme.py
Kết quả: haravan/feba-theme.zip  ->  Haravan: Website > Giao diện > Tải lên giao diện
Kiểm tra trước khi đóng gói: thẻ Liquid đóng mở đủ cặp, JSON hợp lệ, file bắt buộc có đủ.
"""
import json, os, re, shutil, sys, zipfile
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "theme")
OUT = os.path.join(HERE, "feba-theme.zip")
SITE_IMG = os.path.join(os.path.dirname(HERE), "_src", "img")
REQUIRED = ["layout/theme.liquid", "templates/index.liquid", "templates/product.liquid", "templates/collection.liquid",
            "templates/cart.liquid", "templates/page.liquid", "templates/search.liquid", "templates/404.liquid",
            "templates/blog.liquid", "templates/article.liquid", "templates/list-collections.liquid",
            "templates/search.suggest.liquid", "config/settings.html", "config/settings_data.json"]
PAIRS = ["if", "unless", "for", "case", "capture", "form", "paginate", "comment"]


def check_liquid(path, text):
    errs = []
    # mỗi {{ hoặc {% phải đóng trước khi mở thẻ khác; dấu }} lẻ trong JS/JSON thì Liquid bỏ qua nên không tính
    for m in re.finditer(r"\{\{|\{%", text):
        close = "}}" if m.group() == "{{" else "%}"
        end = text.find(close, m.end())
        nxt = min([i for i in (text.find("{{", m.end()), text.find("{%", m.end())) if i >= 0] or [len(text)])
        if end < 0 or end > nxt:
            errs.append("dòng %d: %s chưa đóng bằng %s" % (text.count("\n", 0, m.start()) + 1, m.group(), close))
    stack = []
    for m in re.finditer(r"\{%-?\s*(\w+)", text):
        tag = m.group(1)
        line = text.count("\n", 0, m.start()) + 1
        if tag in PAIRS:
            stack.append((tag, line))
        elif tag.startswith("end") and tag[3:] in PAIRS:
            if not stack or stack[-1][0] != tag[3:]:
                errs.append("dòng %d: %s không khớp (%s)" % (line, tag, stack[-1] if stack else "trống"))
            else:
                stack.pop()
    for tag, line in stack:
        errs.append("dòng %d: thiếu end%s" % (line, tag))
    return errs


def main():
    problems = []
    for rel in REQUIRED:
        if not os.path.exists(os.path.join(SRC, rel)):
            problems.append("thiếu file " + rel)
    for dp, _, fs in os.walk(SRC):
        for f in fs:
            p = os.path.join(dp, f)
            rel = os.path.relpath(p, SRC).replace("\\", "/")
            if f.endswith(".liquid") or f.endswith(".html"):
                for e in check_liquid(rel, open(p, encoding="utf-8").read()):
                    problems.append(rel + ": " + e)
    data_path = os.path.join(SRC, "config", "settings_data.json")
    try:
        data = json.load(open(data_path, encoding="utf-8"))
    except ValueError as e:
        problems.append("settings_data.json: " + str(e))
        data = None
    # tên cài đặt dùng trong .liquid phải có trong settings_data.json, và mỗi cài đặt phải có ô nhập trong settings.html
    if data:
        known = set(data["current"])
        for dp, _, fs in os.walk(SRC):
            for f in fs:
                if f.endswith(".liquid"):
                    p = os.path.join(dp, f)
                    used = set(re.findall(r"settings\.(\w+)", open(p, encoding="utf-8").read()))
                    for name in sorted(used - known):
                        problems.append("%s: settings.%s chưa có trong settings_data.json" % (os.path.relpath(p, SRC), name))
        inputs = set(re.findall(r'name="(\w+)"', open(os.path.join(SRC, "config", "settings.html"), encoding="utf-8").read()))
        for name in sorted(known - inputs):
            problems.append("settings.html: thiếu ô nhập cho %s" % name)
    if problems:
        print("LỖI:\n  " + "\n  ".join(problems))
        sys.exit(1)

    # presets mirror the defaults so "khôi phục mặc định" in Haravan gives the same page
    data["presets"] = {"FEBA": dict(data["current"])}

    # images shared with feba.id.vn
    assets = {}
    icon = Image.open(os.path.join(SITE_IMG, "apple-touch-icon.png")).convert("RGB").resize((64, 64), Image.LANCZOS)
    tmp_icon = os.path.join(HERE, "_favicon.png"); icon.save(tmp_icon)
    assets["assets/favicon.png"] = tmp_icon
    assets["assets/share.jpg"] = os.path.join(SITE_IMG, "og.jpg")

    with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED) as z:
        for dp, _, fs in os.walk(SRC):
            for f in sorted(fs):
                p = os.path.join(dp, f)
                rel = os.path.relpath(p, SRC).replace("\\", "/")
                if rel == "config/settings_data.json":
                    z.writestr(rel, json.dumps(data, ensure_ascii=False, indent=2))
                else:
                    z.write(p, rel)
        for rel, p in assets.items():
            z.write(p, rel)
    os.remove(tmp_icon)
    with zipfile.ZipFile(OUT) as z:
        names = z.namelist()
    print("OK %s (%d file, %.0f KB)" % (OUT, len(names), os.path.getsize(OUT) / 1024))


if __name__ == "__main__":
    main()
