"""Compose App Store frames from simulator captures.

usage: python3 compose.py <repo> <shots-dir> <device: iphone|ipad> <out-dir>
Captures expected in <shots-dir>/<device>/: 1_profiles 2_smartpractice 3_practice
4_mastery 5_parentzone 6_achievements (.png) and pz_top.png (clean status strip).
"""
import subprocess, sys, os
from PIL import Image

repo, shots, device, out = sys.argv[1:5]
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
os.makedirs(out, exist_ok=True)
work = os.path.join(shots, "work-" + device)
os.makedirs(work, exist_ok=True)

FRAMES = [
    ("01_profiles", "1_profiles", "#FFD43B", "One app. Every child’s level.",
     "Each child gets their own profile, avatar and progress.", False),
    ("02_smart_practice", "2_smartpractice", "#06D6A0", "Smart Practice adapts to your child",
     "Every problem picked for what they’re ready for next.", True),
    ("03_see_get_keep", "3_practice", "#4CC9F0", "See it. Get it.<br>Keep it.",
     "Kids build the math with their hands, then know it by heart.", False),
    ("04_mastery", "4_mastery", "#FF6B9D", "Mastered means from memory",
     "Then each fact comes back: next day, 3 days, 7, 14, 30.", False),
    ("05_parents", "5_parentzone", "#B388FF", "Parents see what matters",
     "Per-child reports and the exact facts to practice next.", True),
    ("06_progress", "6_achievements", "#FF9F1C", "Progress you can see",
     "No clock, no race. Badges celebrate showing up and steady work.", False),
]
RIBBON = {"05_parents": "No account · Your child’s data stays on the device"}

def clean_status(src, dst):
    """Replace the status-bar band of a scrolled capture with the clean band from
    the top of the same screen (content had scrolled under the clock), keeping
    the card borders at the edges continuous."""
    img = Image.open(src).convert("RGB")
    strip = Image.open(os.path.join(shots, device, "pz_top.png")).convert("RGB")
    W, H = img.size
    band = int(H * 0.068)  # status bar + island
    patched = img.copy()
    patched.paste(strip.crop((0, 0, W, band)), (0, 0))
    edge = int(W * 0.07)
    for x0, x1 in ((0, edge), (W - edge, W)):
        patched.paste(img.crop((x0, 0, x1, band)), (x0, 0))
    patched.save(dst)

def font(name):
    return "file://" + os.path.join(repo, "public/fonts", name)

if device == "iphone":
    W, H = 1320, 2868
    cap_top, side, head_px, sub_px = 150, 110, 108, 46
    screen_w, bezel, radius, dev_top, shadow = 960, 26, 120, 760, 18
else:
    W, H = 2064, 2752
    cap_top, side, head_px, sub_px = 160, 150, 128, 56
    screen_w, bezel, radius, dev_top, shadow = 1500, 34, 70, 720, 22

logo = "file://" + os.path.join(repo, "GraphicAssets/JF_LogoMark_01.svg")
for fid, cap, bg, head, sub, patch in FRAMES:
    src = os.path.join(shots, device, cap + ".png")
    if patch and device == "iphone":
        p = os.path.join(work, cap + "_clean.png"); clean_status(src, p); src = p
    sw, sh = Image.open(src).size
    screen_h = round(screen_w * sh / sw)
    ribbon = RIBBON.get(fid)
    ribbon_html = f'<div class="ribbon">{ribbon}</div>' if ribbon else ""
    html = f"""<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{{font-family:SG;font-weight:700;src:url("{font('space-grotesk-700.woff2')}")}}
@font-face{{font-family:SG;font-weight:400;src:url("{font('space-grotesk-400.woff2')}")}}
@font-face{{font-family:SM;font-weight:700;src:url("{font('space-mono-700.woff2')}")}}
html,body{{margin:0;width:{W}px;height:{H}px;overflow:hidden;background:{bg}}}
.cap{{position:absolute;left:{side}px;right:{side + (120 if device == 'iphone' else 260)}px;top:{cap_top}px;color:#1A1A1A}}
h1{{font:700 {head_px}px/1.04 SG,Helvetica,sans-serif;letter-spacing:-0.02em;margin:0;text-wrap:balance}}
p{{font:400 {sub_px}px/1.3 SG,Helvetica,sans-serif;margin:{int(sub_px*0.7)}px 0 0;max-width:{int(W*(0.72 if device == 'iphone' else 0.62))}px;text-wrap:balance;opacity:.82}}
.logo{{position:absolute;top:{cap_top - 10}px;right:{side - 20}px;width:{int(head_px*0.9)}px}}
.dev{{position:absolute;left:{(W - screen_w - 2*bezel)//2}px;top:{dev_top}px;width:{screen_w}px;height:{screen_h}px;
  background:#1A1A1A;padding:{bezel}px;border-radius:{radius}px;box-shadow:{shadow}px {shadow}px 0 #1A1A1A}}
.dev img{{display:block;width:{screen_w}px;height:{screen_h}px;border-radius:{radius - bezel}px}}
.ribbon{{position:absolute;right:{side - 40}px;top:{dev_top - 70}px;transform:rotate(-3deg);background:#FFFBEB;
  border:5px solid #1A1A1A;box-shadow:12px 12px 0 #1A1A1A;padding:22px 34px;font:700 {int(sub_px*0.82)}px SM,monospace;color:#1A1A1A;z-index:2}}
</style></head><body>
<div class="cap"><h1>{head}</h1><p>{sub}</p></div>
<img class="logo" src="{logo}">
{ribbon_html}
<div class="dev"><img src="file://{src}"></div>
</body></html>"""
    hp = os.path.join(work, fid + ".html")
    open(hp, "w").write(html)
    png = os.path.join(out, fid + ".png")
    subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars",
                    "--force-device-scale-factor=1", f"--window-size={W},{H}",
                    "--virtual-time-budget=3000", "--allow-file-access-from-files",
                    f"--user-data-dir={os.path.join(work, 'profile')}",
                    f"--screenshot={png}", "file://" + hp],
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
    # App Store wants flattened RGB, no alpha.
    Image.open(png).convert("RGB").save(png)
    print(fid, Image.open(png).size)
