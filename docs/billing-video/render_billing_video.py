"""Render the RMS Avisha Billing explainer to MP4 (1920x1080, 30 fps, H.264, yuv420p, AAC sound).

Usage:
  python render_billing_video.py           # render picture + sound -> billing-explainer.mp4, + thumbnail
  python render_billing_video.py audio     # rebuild only the sound and re-mux (fast, reuses the picture)
  python render_billing_video.py check     # save one PNG from the middle of each scene (check-*.png)

Needs Pillow, numpy and ffmpeg on PATH. Uses the Inter font installed on this PC.
"""
import math
import os
import subprocess
import sys
from functools import lru_cache
from multiprocessing import Pool

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

# =====================================================================
# CAPTIONS — all on-screen teaching text lives here. To translate,
# change only these strings and re-run the script. "\n" = line break.
# =====================================================================
CAPTIONS = {
    "hook":     "Some clients pay later.\nBilling keeps track of what they owe.",
    "find":     "Every client with an account is here.\nSee who owes and who’s overdue.",
    "add":      "No account yet?\nClick Add, pick the client, save.",
    "open":     "Click a client to see\nhow much they owe.",
    "charges":  "Client will pay later?\nAdd the job order to their account.",
    "payment":  "Client paid?\nRecord it and attach the receipt.",
    "send1":    "Send the client a statement:\na summary of what they owe.",
    "send2":    "The dates are already filled in.\nJust click Create & send.",
    "history":  "Everything is saved here.",
    "recap1":   "Just remember these three.",
    "recap2":   "That’s billing. Three buttons.\nKaya mo ’yan!",
    # Recap labels and pop-up messages
    "recapTitle":   "BILLING IN RMS AVISHA",
    "stepCharge":   "Add charges",
    "stepPay":      "Record payment",
    "stepSend":     "Send statement",
    "toastCreated": "Account created",
    "toastSent":    "Statement sent",
}

OUT_DIR = os.path.dirname(os.path.abspath(__file__))
OUT_MP4 = os.path.join(OUT_DIR, "billing-explainer.mp4")
OUT_THUMB = os.path.join(OUT_DIR, "billing-explainer-thumbnail.png")
OUT_PICTURE = os.path.join(OUT_DIR, "billing-explainer-picture-only.mp4")  # silent picture, reused by "audio" mode
OUT_WAV = os.path.join(OUT_DIR, "billing-explainer-audio.wav")
FONT_DIR = os.path.expandvars(r"%LOCALAPPDATA%\Microsoft\Windows\Fonts")

W, H, FPS = 1920, 1080, 30
SS = 2  # supersampling for smooth edges

RED = (240, 42, 36)          # brand red (RMS Avisha --brand)
RED_DEEP = (197, 33, 27)
RED_SOFT = (254, 236, 235)
RED_EDGE = (251, 199, 196)
INK = (31, 35, 40)
MUTED = (107, 114, 128)
PLACE = (156, 163, 175)
LINE = (229, 231, 235)
SOFT = (247, 248, 250)
HEAD = (243, 244, 246)
GREEN = (22, 163, 74)
GREEN_INK = (22, 101, 52)
GREEN_SOFT = (220, 252, 231)
GREEN_BG = (240, 253, 244)
GREEN_EDGE = (187, 247, 208)
WHITE = (255, 255, 255)
SCRIM = (17, 24, 39)

# ---------------------------------------------------------------- helpers
WEIGHTS = {"R": "Regular", "M": "Medium", "S": "SemiBold", "B": "Bold", "X": "ExtraBold"}


@lru_cache(None)
def F(w, size):
    return ImageFont.truetype(os.path.join(FONT_DIR, f"Inter_24pt-{WEIGHTS[w]}.ttf"), round(size * SS))


def tw(txt, font):
    return F(*font).getlength(txt) / SS


def peso(n):
    return f"₱{int(round(n)):,}"


def clamp(x, a=0.0, b=1.0):
    return max(a, min(b, x))


def ease(p):
    p = clamp(p)
    return 4 * p ** 3 if p < 0.5 else 1 - (-2 * p + 2) ** 3 / 2


def pr(t, t0, d=0.5):
    """Eased 0..1 progress of an animation starting at t0 lasting d seconds."""
    return ease((t - t0) / d)


def env(t, t0, up=0.3, hold=0.9, down=0.6):
    x = t - t0
    if x < 0:
        return 0.0
    if x < up:
        return ease(x / up)
    if x < up + hold:
        return 1.0
    return 1 - ease((x - up - hold) / down)


def mix(c1, c2, a):
    """c1 at strength a over c2."""
    return tuple(round(c2[i] + (c1[i] - c2[i]) * clamp(a)) for i in range(3))


def lerp(p, q, a):
    return (p[0] + (q[0] - p[0]) * a, p[1] + (q[1] - p[1]) * a)


class Cv:
    """Draws in 1920x1080 design coordinates onto a supersampled image whose origin is (ox, oy)."""

    def __init__(self, img, ox=0, oy=0):
        self.img, self.d, self.ox, self.oy = img, ImageDraw.Draw(img), ox, oy

    def p(self, x, y):
        return ((x - self.ox) * SS, (y - self.oy) * SS)

    def rect(self, x, y, w, h, r=0, fill=None, outline=None, width=1.5):
        x0, y0 = self.p(x, y)
        x1, y1 = self.p(x + w, y + h)
        if x1 - x0 < 2 or y1 - y0 < 2:
            return
        self.d.rounded_rectangle([x0, y0, x1 - 1, y1 - 1], radius=min(r, w / 2, h / 2) * SS,
                                 fill=fill, outline=outline, width=max(1, round(width * SS)))

    def text(self, x, y, txt, font, fill, anchor="lm"):
        self.d.text(self.p(x, y), txt, font=F(*font), fill=fill, anchor=anchor)

    def circle(self, x, y, r, fill=None, outline=None, width=1.5):
        x0, y0 = self.p(x - r, y - r)
        x1, y1 = self.p(x + r, y + r)
        self.d.ellipse([x0, y0, x1, y1], fill=fill, outline=outline, width=max(1, round(width * SS)))

    def line(self, pts, fill, width=2.0):
        self.d.line([self.p(*q) for q in pts], fill=fill, width=max(1, round(width * SS)), joint="curve")

    def poly(self, pts, fill=None, outline=None, width=1.5):
        self.d.polygon([self.p(*q) for q in pts], fill=fill, outline=outline, width=max(1, round(width * SS)))

    def dim(self, x, y, w, h, a, color=WHITE):
        """Fade a region toward `color` (used to quiet whatever isn't being explained)."""
        if a <= 0.003:
            return
        x0, y0 = (int(v) for v in self.p(x, y))
        x1, y1 = (int(v) for v in self.p(x + w, y + h))
        x0, y0, x1, y1 = max(0, x0), max(0, y0), min(self.img.width, x1), min(self.img.height, y1)
        if x1 <= x0 or y1 <= y0:
            return
        reg = self.img.crop((x0, y0, x1, y1))
        solid = Image.new(reg.mode, reg.size, color + ((255,) if reg.mode == "RGBA" else ()))
        self.img.paste(Image.blend(reg, solid, clamp(a)), (x0, y0))


def comp(dst, layer, x, y, op=1.0, scale=1.0):
    """Alpha-composite `layer` (top-left at design x, y) with opacity and scale about its centre."""
    if op <= 0.004:
        return
    if scale != 1.0:
        w, h = layer.size
        nw, nh = max(1, round(w * scale)), max(1, round(h * scale))
        cx, cy = x * SS + w / 2, y * SS + h / 2
        layer = layer.resize((nw, nh), Image.BILINEAR)
        px, py = round(cx - nw / 2), round(cy - nh / 2)
    else:
        px, py = round(x * SS), round(y * SS)
    if op < 0.996:
        layer = layer.copy()
        layer.putalpha(layer.getchannel("A").point(lambda v: round(v * op)))
    sx, sy = max(0, -px), max(0, -py)
    ex, ey = min(layer.width, dst.width - px), min(layer.height, dst.height - py)
    if ex > sx and ey > sy:
        dst.alpha_composite(layer, dest=(px + sx, py + sy), source=(sx, sy, ex, ey))


@lru_cache(None)
def card_base(w, h, r, m=60, blur=22, alpha=55, oy=14):
    """White rounded card with a soft drop shadow, on a transparent layer with margin m."""
    size = ((w + 2 * m) * SS, (h + 2 * m) * SS)
    sh = Image.new("L", size, 0)
    ImageDraw.Draw(sh).rounded_rectangle([m * SS, (m + oy) * SS, (m + w) * SS, (m + h + oy) * SS], r * SS, fill=alpha)
    L = Image.new("RGBA", size, (16, 24, 40, 0))
    L.putalpha(sh.filter(ImageFilter.GaussianBlur(blur * SS)))
    ImageDraw.Draw(L).rounded_rectangle([m * SS, m * SS, (m + w) * SS - 1, (m + h) * SS - 1], r * SS,
                                        fill=WHITE + (255,), outline=LINE + (255,), width=2)
    return L


def card(w, h, gx, gy, draw_fn, r=24):
    m = 60
    L = card_base(w, h, r, m).copy()
    draw_fn(Cv(L, gx - m, gy - m))
    return L, gx - m, gy - m


# ---------------------------------------------------------------- icons
def icon(c, name, cx, cy, k, color, w):
    P = lambda x, y: (cx + (x - 12) * k, cy + (y - 12) * k)
    if name == "plus":
        c.line([P(12, 5), P(12, 19)], color, w); c.line([P(5, 12), P(19, 12)], color, w)
    elif name == "wallet":
        x0, y0 = P(3, 6); x1, y1 = P(21, 19)
        c.rect(x0, y0, x1 - x0, y1 - y0, 2 * k, outline=color, width=w)
        c.line([P(3, 10), P(21, 10)], color, w); c.circle(*P(16.5, 14.5), 1.3 * k, fill=color)
    elif name == "send":
        c.poly([P(22, 2), P(15, 22), P(11, 13), P(2, 9)], outline=color, width=w)
        c.line([P(22, 2), P(11, 13)], color, w)
    elif name == "camera":
        x0, y0 = P(3, 8); x1, y1 = P(21, 20)
        c.rect(x0, y0, x1 - x0, y1 - y0, 2 * k, outline=color, width=w)
        c.line([P(8, 8), P(9.5, 5), P(14.5, 5), P(16, 8)], color, w); c.circle(*P(12, 14), 3.4 * k, outline=color, width=w)
    elif name == "doc":
        c.poly([P(6, 3), P(14, 3), P(18, 7), P(18, 21), P(6, 21)], outline=color, width=w)
        c.line([P(14, 3), P(14, 7), P(18, 7)], color, w)
    elif name == "search":
        c.circle(*P(11, 11), 7 * k, outline=color, width=w); c.line([P(16, 16), P(20.5, 20.5)], color, w)


def check(c, x, ym, color, s=1.0, w=3.0):
    c.line([(x, ym), (x + 6 * s, ym + 6 * s), (x + 17 * s, ym - 6 * s)], color, w)


def chevron(c, x, y, color=MUTED):
    c.line([(x - 6, y - 3), (x, y + 3), (x + 6, y - 3)], color, 2.5)


def pill(c, x, ym, txt, bg, fg, font=("S", 18), h=33):
    w = tw(txt, font) + 30
    c.rect(x, ym - h / 2, w, h, h / 2, fill=bg)
    c.text(x + 15, ym, txt, font, fg)
    return w


def button(c, x, y, w, label, primary=True, h=57, font=("S", 21)):
    if primary:
        c.rect(x, y, w, h, 13, fill=RED)
    else:
        c.rect(x, y, w, h, 13, fill=WHITE, outline=LINE)
    c.text(x + w / 2, y + h / 2, label, font, WHITE if primary else INK, "mm")


def field(c, x, y, w, h, txt, filled, chev=False, bg=WHITE, edge=LINE):
    c.rect(x, y, w, h, 15, fill=bg, outline=edge)
    c.text(x + 18, y + h / 2, txt, ("S", 22) if filled else ("R", 22), INK if filled else PLACE)
    if chev:
        chevron(c, x + w - 26, y + h / 2)


# ---------------------------------------------------------------- app frame + list page
AX, AY, AW, AH = 120, 36, 1680, 780
TOP = AY + 66  # bottom of top bar
TX, TW_, HY, HH, RY, RH = 162, 1596, 284, 52, 336, 74
COLS = [0, 260, 820, 1080, 1340]
ROWS = [("BA-01-001", "Sunshine Electronics Corp.", 8570, 3500),
        ("BA-01-002", "Juan dela Cruz", 1200, 0),
        ("BA-01-003", "Reyes Printing Services", 12400, 6000),
        ("BA-01-004", "Ana Villanueva", 650, 0),
        ("BA-01-005", "Pedro Ramos", 0, 0)]

ADD_BTN = (1628, 203, 130, 57)
COL_OWES = (TX + 820, HY, 260, HH + 4 * RH)
COL_OVER = (TX + 1080, HY, 260, HH + 4 * RH)


def center(r):
    return (r[0] + r[2] / 2, r[1] + r[3] / 2)


def topbar(c):
    c.rect(AX + 26, AY + 17, 32, 32, 9, fill=RED)
    c.text(AX + 72, AY + 33, "RMS Avisha", ("B", 21), INK)
    c.text(AX + 82 + tw("RMS Avisha", ("B", 21)), AY + 33, "/  Billing", ("M", 21), MUTED)
    c.line([(AX, TOP), (AX + AW, TOP)], LINE, 1.5)


def list_page(c, nrows=4, new_t=None, dim_toolbar=0.0, dim_table=0.0, tap_row0=0.0):
    c.text(TX, 157, "Billing Accounts", ("B", 36), INK)
    c.rect(TX, 203, 510, 57, 13, fill=WHITE, outline=LINE)
    icon(c, "search", TX + 30, 231, 1.05, PLACE, 2.5)
    c.text(TX + 56, 231, "Search client or account no.", ("R", 21), PLACE)
    c.rect(687, 203, 190, 57, 13, fill=WHITE, outline=LINE)
    c.text(708, 231, "All Status", ("M", 21), INK)
    chevron(c, 850, 231)
    button(c, *ADD_BTN[:3], "+ Add")
    c.rect(TX, HY, TW_, HH, 10, fill=HEAD)
    for name, x in zip(["Account No.", "Client Name", "Owes", "Overdue", "Status"], COLS):
        c.text(TX + x + 21, HY + HH / 2, name, ("M", 19), MUTED)
    for i in range(nrows):
        y = RY + i * RH
        acc, name, owes, over = ROWS[i]
        if i == 0 and tap_row0 > 0:
            c.rect(TX, y, TW_, RH, 0, fill=mix(RED_SOFT, WHITE, tap_row0))
        if i == 4 and new_t is not None:
            c.rect(TX, y, TW_, RH, 0, fill=mix(GREEN_BG, WHITE, 1 - pr(new_t, 0.9, 0.7)))
        ym = y + RH / 2
        c.text(TX + 21, ym, acc, ("R", 21), MUTED)
        c.text(TX + 281, ym, name, ("B", 22), INK)
        c.text(TX + 841, ym, peso(owes), ("B", 22), INK)
        if over:
            c.text(TX + 1101, ym, peso(over), ("B", 22), RED)
        else:
            c.text(TX + 1101, ym, "—", ("R", 22), MUTED)
        pill(c, TX + 1361, ym, "active", GREEN_SOFT, GREEN_INK)
        c.line([(TX, y + RH), (TX + TW_, y + RH)], LINE, 1.5)
        if i == 4 and new_t is not None:
            c.dim(TX, y, TW_, RH + 2, 1 - pr(new_t, 0, 0.6))
    c.dim(TX - 6, 196, TW_ + 12, 72, dim_toolbar)
    c.dim(TX - 6, HY - 4, TW_ + 12, HH + 5 * RH + 8, dim_table)


# ---------------------------------------------------------------- client panel
PX = 900                     # panel left edge when open
PL = PX + 42                 # panel content left
OWES_BOX = (PL, 228, 816, 180)
OWES_NUM = (PL + 345, 322)
BTN_CHARGE = (PL, 432, 210, 57)
BTN_PAY = (PL + 225, 432, 225, 57)
BTN_SEND = (PL + 465, 432, 225, 57)
TABS = ["History", "Charges", "Payments", "Statements", "More"]
TAB_OFF = []
_x = 0
for _n in TABS:
    TAB_OFF.append(_x)
    _x += tw(_n, ("M", 21)) + 40
TAB_PT = {n.lower(): (PL + o + tw(n, ("M", 21)) / 2, 549) for n, o in zip(TABS, TAB_OFF)}

HIST = {
    "start": [("Sep 25", "Rental · R-0088 Projector rental", "₱5,070", None),
              ("Sep 18", "Job order · JO-0139 Aircon repair", "₱3,500", "OVERDUE")],
    "mid": [("Sep 30", "Payment · GCash", "−₱5,000", "PAID"),
            ("Sep 29", "Charges · JO-0151, JO-0153", "₱3,500", None),
            ("Sep 25", "Rental · R-0088 Projector rental", "₱5,070", None)],
    "history": [("Sep 30", "Statement sent · Sep 1–30", "₱7,070", "SENT"),
                ("Sep 30", "Payment · GCash", "−₱5,000", "PAID"),
                ("Sep 29", "Charges · JO-0151, JO-0153", "₱3,500", None),
                ("Sep 25", "Rental · R-0088 Projector rental", "₱5,070", None)],
    "payments": [("Sep 30", "GCash · receipt attached", "₱5,000", "PAID")],
    "statements": [("Sep 30", "Statement · Sep 1–30, 2026", "₱7,070", "SENT")],
}
TAG_STYLE = {"OVERDUE": (RED_SOFT, RED_DEEP), "PAID": (GREEN_SOFT, GREEN_INK), "SENT": (HEAD, MUTED)}


def panel(c, xo=0.0, owes=8570, owes_color=INK, over="over", over_a=1.0, paid=0.0,
          tab="history", hist="start", tab_a=1.0, focus=None, focus_p=1.0):
    x = PX + xo
    L = x + 42
    for i in range(30):  # soft shadow on the left edge
        c.dim(x - 30 + i, TOP, 1, AY + AH - TOP, 0.10 * ((i + 1) / 30) ** 2, (16, 24, 40))
    c.rect(x, TOP, 900, AY + AH - TOP, 0, fill=WHITE)
    c.line([(x, TOP), (x, AY + AH)], LINE, 1.5)
    c.text(L, 147, "BA-01-001", ("R", 19), MUTED)
    c.text(L, 182, "Sunshine Electronics Corp.", ("B", 33), INK)
    kx = x + 900 - 42 - 51
    c.rect(kx, 135, 51, 51, 12, fill=WHITE, outline=LINE)
    for d in (-11, 0, 11):
        c.circle(kx + 25.5 + d, 160.5, 2.8, fill=MUTED)
    # big balance
    c.rect(L, 228, 816, 180, 21, fill=SOFT)
    c.text(L + 27, 258, "Owes", ("M", 21), MUTED)
    c.text(L + 27, 316, peso(owes), ("X", 66), owes_color)
    if over == "over":
        c.text(L + 27, 377, "₱3,500 overdue", ("S", 23), RED)
    else:
        col = mix(GREEN, SOFT, over_a)
        check(c, L + 29, 377, col, 0.9)
        c.text(L + 55, 377, "Nothing overdue", ("S", 23), col)
    if paid > 0:
        bw, bh = 214, 52
        bx, by = L + 816 - 27 - bw, 228 + 27
        c.rect(bx, by, bw, bh, bh / 2, fill=mix(GREEN_SOFT, SOFT, paid))
        check(c, bx + 22, by + bh / 2, mix(GREEN_INK, SOFT, paid), 0.9)
        c.text(bx + 50, by + bh / 2, "Paid ₱5,000", ("B", 22), mix(GREEN_INK, SOFT, paid))
    # action buttons
    button(c, L, 432, 210, "+ Add charges", True)
    button(c, L + 225, 432, 225, "Record payment", False)
    button(c, L + 465, 432, 225, "Send statement", False)
    # tabs
    for n, o in zip(TABS, TAB_OFF):
        on = n.lower() == tab
        c.text(L + o, 549, n, ("S", 21) if on else ("M", 21), INK if on else MUTED)
        if on:
            c.rect(L + o, 576, tw(n, ("M", 21)), 3, 0, fill=RED)
    c.line([(L, 579), (L + 816, 579)], LINE, 1.5)
    for i, (d, txt, amt, tag) in enumerate(HIST[hist]):
        ym = 590 + i * 56 + 28
        c.text(L, ym, d, ("R", 19), MUTED)
        c.text(L + 82, ym, txt, ("R", 21), INK)
        aw = tw(amt, ("B", 21))
        c.text(L + 816, ym, amt, ("B", 21), GREEN if tag == "PAID" else INK, "rm")
        if tag:
            bg, fg = TAG_STYLE[tag]
            pw = tw(tag, ("B", 15)) + 24
            pill(c, L + 816 - aw - 18 - pw, ym, tag, bg, fg, ("B", 15), 28)
        c.line([(L, ym + 28), (L + 816, ym + 28)], LINE, 1.5)
    c.dim(L - 4, 582, 824, 240, 1 - tab_a)
    # quiet the parts not being explained
    if focus == "quiet":
        c.dim(L - 6, 505, 828, 320, 0.7 * focus_p)
    elif focus == "owes":
        c.dim(L - 6, 422, 828, 400, 0.7 * focus_p)
    elif focus == "tabs":
        c.dim(L - 6, 220, 828, 276, 0.7 * focus_p)


# ---------------------------------------------------------------- dialogs (global coordinates)
# New account
DA_X, DA_Y, DA_W, DA_H = 615, 156, 690, 540
CLIENT_FIELD = (DA_X + 36, DA_Y + 120, 618, 63)
PEDRO_ITEM = (DA_X + 42, DA_Y + 250, 606, 50)
AUTOFILL = (DA_X + 36, DA_Y + 202, 618, 211)
CREATE_BTN = (DA_X + DA_W - 36 - 130, DA_Y + 450, 130, 57)


def dlg_add(c, client_filled, menu, hover, auto_p):
    c.text(DA_X + 36, DA_Y + 50, "New billing account", ("B", 28), INK)
    c.text(DA_X + 36, DA_Y + 100, "Client", ("M", 20), MUTED)
    field(c, *CLIENT_FIELD, "Pedro Ramos" if client_filled else "Select a client…", client_filled, chev=True)
    for lbl, val, y in (("Email", "pedro.ramos@gmail.com", DA_Y + 235), ("Phone", "0917 123 4567", DA_Y + 350)):
        a = 0.45 + 0.55 * auto_p
        c.text(DA_X + 36, y - 20, lbl, ("M", 20), mix(MUTED, WHITE, a))
        bg, edge = mix(GREEN_BG, WHITE, auto_p), mix(GREEN_EDGE, LINE, auto_p)
        c.rect(DA_X + 36, y, 618, 63, 15, fill=bg, outline=edge)
        if auto_p > 0:
            c.text(DA_X + 54, y + 31.5, val, ("S", 22), mix(INK, bg, auto_p))
            check(c, DA_X + 36 + 618 - 44, y + 31.5, mix(GREEN, bg, auto_p))
        else:
            c.text(DA_X + 54, y + 31.5, "—", ("R", 22), PLACE)
    c.text(CREATE_BTN[0] - 22, CREATE_BTN[1] + 28.5, "Cancel", ("S", 21), MUTED, "rm")
    button(c, *CREATE_BTN[:3], "Create")
    if menu:
        mx, my = DA_X + 36, DA_Y + 190
        c.rect(mx, my + 4, 618, 174, 15, fill=(225, 228, 233))
        c.rect(mx, my, 618, 174, 15, fill=WHITE, outline=LINE)
        for i, n in enumerate(["Maria Santos", "Pedro Ramos", "Rosa Lim Trading"]):
            iy = my + 6 + i * 54
            if i == 1 and hover:
                c.rect(mx + 6, iy, 606, 50, 10, fill=HEAD)
            c.text(mx + 22, iy + 25, n, ("S" if i == 1 and hover else "R", 21), INK)


# Add charges
DC_X, DC_Y, DC_W, DC_H = 570, 141, 780, 570
JOBS = [("JO-0151", "Laptop screen replacement", 2300),
        ("JO-0153", "Printer repair", 1200),
        ("JO-0157", "CCTV installation", 4200)]
CB = [(DC_X + 75, DC_Y + 210 + i * 90 + 39) for i in range(3)]
ADDC_BTN = (DC_X + DC_W - 36 - 110, DC_Y + 490, 110, 57)


def dlg_charge(c, checked, total):
    c.text(DC_X + 36, DC_Y + 50, "Add charges", ("B", 28), INK)
    c.rect(DC_X + 36, DC_Y + 92, 330, 54, 14, fill=HEAD)
    c.rect(DC_X + 42, DC_Y + 98, 170, 42, 10, fill=WHITE, outline=LINE)
    c.text(DC_X + 127, DC_Y + 119, "Job Orders", ("S", 21), INK, "mm")
    c.text(DC_X + 289, DC_Y + 119, "Rentals", ("S", 21), MUTED, "mm")
    c.text(DC_X + 36, DC_Y + 180, "Unpaid job orders for Sunshine Electronics Corp.", ("R", 20), MUTED)
    for i, (no, what, amt) in enumerate(JOBS):
        y = DC_Y + 210 + i * 90
        on = checked[i]
        c.rect(DC_X + 36, y, 708, 78, 15, fill=RED_SOFT if on else WHITE, outline=RED_EDGE if on else LINE)
        c.rect(DC_X + 60, y + 24, 30, 30, 8, fill=RED if on else WHITE, outline=RED if on else (203, 213, 225), width=2.5)
        if on:
            check(c, DC_X + 66, y + 40, WHITE, 0.95, 3)
        c.text(DC_X + 110, y + 39, no, ("B", 21), INK)
        c.text(DC_X + 122 + tw(no, ("B", 21)), y + 39, what, ("R", 21), MUTED)
        c.text(DC_X + 720, y + 39, peso(amt), ("B", 22), INK, "rm")
    c.text(DC_X + 36, ADDC_BTN[1] + 28.5, "Selected:", ("R", 21), MUTED)
    c.text(DC_X + 46 + tw("Selected:", ("R", 21)), ADDC_BTN[1] + 28.5, peso(total), ("B", 24), INK)
    c.text(ADDC_BTN[0] - 22, ADDC_BTN[1] + 28.5, "Cancel", ("S", 21), MUTED, "rm")
    button(c, *ADDC_BTN[:3], "Add")


# Record payment
DP_X, DP_Y, DP_W, DP_H = 615, 136, 690, 580
AMT_FIELD = (DP_X + 36, DP_Y + 120, 618, 63)
CHIPS = [(DP_X + 36 + i * 210, DP_Y + 235, 198, 60) for i in range(3)]
DROP = (DP_X + 36, DP_Y + 347, 618, 111)
SAVE_BTN = (DP_X + DP_W - 36 - 110, DP_Y + 490, 110, 57)


def dashed_rect(c, x, y, w, h, color, dash=14, gap=10, width=2.5):
    c.rect(x, y, w, h, 18, outline=color, width=width)
    s = x + 24
    while s < x + w - 24:  # punch gaps into the straight edges
        e = min(s + gap, x + w - 24)
        c.rect(s, y - 2, e - s, width + 4, 0, fill=WHITE)
        c.rect(s, y + h - width - 2, e - s, width + 4, 0, fill=WHITE)
        s += dash + gap
    s = y + 24
    while s < y + h - 24:
        e = min(s + gap, y + h - 24)
        c.rect(x - 2, s, width + 4, e - s, 0, fill=WHITE)
        c.rect(x + w - width - 2, s, width + 4, e - s, 0, fill=WHITE)
        s += dash + gap


def dlg_pay(c, amount, gcash, receipt):
    c.text(DP_X + 36, DP_Y + 50, "Record payment", ("B", 28), INK)
    c.text(DP_X + 36, DP_Y + 100, "Amount", ("M", 20), MUTED)
    field(c, *AMT_FIELD, peso(amount) if amount is not None else "₱0.00", amount is not None)
    c.text(DP_X + 36, DP_Y + 215, "Payment method", ("M", 20), MUTED)
    for (x, y, w, h), n in zip(CHIPS, ["Cash", "GCash", "Bank"]):
        on = gcash and n == "GCash"
        c.rect(x, y, w, h, 15, fill=RED_SOFT if on else WHITE, outline=RED if on else LINE, width=2.5 if on else 1.5)
        c.text(x + w / 2, y + h / 2, n, ("S", 21), RED_DEEP if on else INK, "mm")
    c.text(DP_X + 36, DP_Y + 327, "Receipt photo", ("M", 20), MUTED)
    x, y, w, h = DROP
    if receipt:
        c.rect(x, y, w, h, 18, fill=GREEN_BG, outline=GREEN_EDGE, width=2)
        c.rect(x + 22, y + 20, 56, 71, 8, fill=WHITE, outline=LINE)
        for k in range(6):
            c.line([(x + 30, y + 32 + k * 10), (x + 70 - (k % 2) * 12, y + 32 + k * 10)], LINE, 3)
        c.text(x + 100, y + 40, "resibo-0930.jpg", ("B", 21), INK)
        check(c, x + 100, y + 74, GREEN, 0.8)
        c.text(x + 124, y + 74, "Attached", ("S", 19), GREEN)
    else:
        dashed_rect(c, x, y, w, h, (209, 213, 219))
        lw = tw("Attach receipt photo", ("M", 21))
        icon(c, "camera", x + w / 2 - lw / 2 - 20, y + h / 2, 1.3, MUTED, 2.5)
        c.text(x + w / 2 + 4, y + h / 2, "Attach receipt photo", ("M", 21), MUTED, "mm")
    c.text(SAVE_BTN[0] - 22, SAVE_BTN[1] + 28.5, "Cancel", ("S", 21), MUTED, "rm")
    button(c, *SAVE_BTN[:3], "Save")


# Send statement
DS_X, DS_Y, DS_W, DS_H = 615, 224, 690, 405
DATES = (DS_X + 36, DS_Y + 84, 618, 99)
CS_BTN = (DS_X + DS_W - 36 - 210, DS_Y + 315, 210, 57)


def dlg_stmt(c):
    c.text(DS_X + 36, DS_Y + 50, "Send statement", ("B", 28), INK)
    for i, (lbl, val) in enumerate((("From", "Sep 1, 2026"), ("To", "Sep 30, 2026"))):
        x = DS_X + 36 + i * 318
        c.text(x, DS_Y + 100, lbl, ("M", 20), MUTED)
        pill(c, x + tw(lbl, ("M", 20)) + 10, DS_Y + 100, "AUTO", GREEN_SOFT, GREEN_INK, ("B", 14), 26)
        field(c, x, DS_Y + 120, 300, 63, val, True, bg=GREEN_BG, edge=GREEN_EDGE)
    c.rect(DS_X + 36, DS_Y + 210, 618, 75, 15, fill=SOFT)
    c.text(DS_X + 60, DS_Y + 247.5, "Amount owed", ("M", 21), MUTED)
    c.text(DS_X + 630, DS_Y + 247.5, "₱7,070", ("B", 24), INK, "rm")
    c.text(CS_BTN[0] - 22, CS_BTN[1] + 28.5, "Cancel", ("S", 21), MUTED, "rm")
    button(c, *CS_BTN[:3], "Create & send")


# Email window
DM_X, DM_Y, DM_W, DM_H = 525, 186, 870, 480
EMAIL = "accounts@sunshine-electronics.ph"
TO_CHIP = (DM_X + 111, DM_Y + 74, tw(EMAIL, ("S", 20)) + 32, 38)
SEND_BTN = (DM_X + DM_W - 27 - 140, DM_Y + 398, 140, 57)


def dlg_mail(c):
    c.rect(DM_X, DM_Y, DM_W, 60, 24, fill=INK)
    c.rect(DM_X, DM_Y + 30, DM_W, 30, 0, fill=INK)
    c.text(DM_X + 27, DM_Y + 30, "New email", ("S", 21), WHITE)
    xx = DM_X + DM_W - 36
    c.line([(xx - 7, DM_Y + 23), (xx + 7, DM_Y + 37)], WHITE, 2.5)
    c.line([(xx - 7, DM_Y + 37), (xx + 7, DM_Y + 23)], WHITE, 2.5)
    c.text(DM_X + 27, DM_Y + 93, "To", ("R", 21), MUTED)
    c.rect(*TO_CHIP, 19, fill=SOFT, outline=LINE)
    c.text(TO_CHIP[0] + 16, DM_Y + 93, EMAIL, ("S", 20), INK)
    c.line([(DM_X, DM_Y + 126), (DM_X + DM_W, DM_Y + 126)], LINE, 1.5)
    c.text(DM_X + 27, DM_Y + 159, "Subject", ("R", 21), MUTED)
    c.text(DM_X + 111, DM_Y + 159, "Statement of Account · September 2026", ("R", 21), INK)
    c.line([(DM_X, DM_Y + 192), (DM_X + DM_W, DM_Y + 192)], LINE, 1.5)
    for i, s in enumerate(["Hi Sunshine Electronics Corp.,",
                           "Here is your statement for Sep 1–30, 2026.",
                           "Amount owed: ₱7,070. Thank you!"]):
        c.text(DM_X + 27, DM_Y + 222 + i * 32, s, ("R", 21), (55, 65, 81))
    aw = tw("SOA-BA-01-001-Sep2026.pdf", ("S", 19)) + 70
    c.rect(DM_X + 27, DM_Y + 318, aw, 50, 13, fill=WHITE, outline=LINE)
    icon(c, "doc", DM_X + 55, DM_Y + 343, 1.1, RED, 2.2)
    c.text(DM_X + 77, DM_Y + 343, "SOA-BA-01-001-Sep2026.pdf", ("S", 19), INK)
    x, y, w, h = SEND_BTN
    c.rect(x, y, w, h, 13, fill=RED)
    icon(c, "send", x + 40, y + h / 2, 0.95, WHITE, 2.4)
    c.text(x + 62, y + h / 2, "Send", ("S", 21), WHITE)


def toast(c, key, a):
    if a <= 0:
        return
    txt = CAPTIONS[key]
    w = tw(txt, ("S", 22)) + 80
    x, y = AX + AW - 26 - w, AY + 5 - 10 * (1 - a)
    c.rect(x, y, w, 56, 28, fill=WHITE, outline=mix(GREEN_EDGE, WHITE, a), width=2)
    check(c, x + 26, y + 28, mix(GREEN, WHITE, a), 0.85)
    c.text(x + 54, y + 28, txt, ("S", 22), mix(GREEN_INK, WHITE, a))


# ---------------------------------------------------------------- overlays: ring, cursor, ripple, caption
def overlay(f, x, y, w, h, fn):
    """Draw translucent shapes on their own small layer, then alpha-composite onto the frame."""
    L = Image.new("RGBA", (round(w * SS), round(h * SS)), (0, 0, 0, 0))
    fn(Cv(L, x, y))
    comp(f, L, x, y)


def ring(f, rect, t0, t, t1=None, pad=12):
    if t < t0 or (t1 is not None and t >= t1):
        return
    x, y, w, h = rect
    x, y, w, h = x - pad, y - pad, w + 2 * pad, h + 2 * pad
    fade = pr(t, t0, 0.4)
    s = math.sin(math.pi * (((t - t0) % 1.6) / 1.6))
    spread = 16 * s

    def draw(c):
        if spread > 1:
            c.rect(x - spread, y - spread, w + 2 * spread, h + 2 * spread, 18 + spread,
                   outline=RED + (round(80 * (1 - s) * fade),), width=spread)
        c.rect(x, y, w, h, 18, outline=RED + (round(255 * fade),), width=4.5)
    overlay(f, x - 20, y - 20, w + 40, h + 40, draw)


START = (1500, 760)
MOVE = 0.6


def cursor_pos(track, t):
    pos = track[0][1]
    prev = pos
    for ts, p in track[1:]:
        if t < ts:
            break
        pos = lerp(prev, p, ease((t - ts) / MOVE))
        prev = p
    return pos


def finish(f, t, track, clicks, beats, rings=()):
    for rect, t0, t1 in rings:
        ring(f, rect, t0, t, t1)
    for tc in clicks:  # click ripple
        p = (t - tc) / 0.6
        if 0 <= p < 1:
            x, y = cursor_pos(track, tc)
            r = 36 * (0.25 + 1.15 * (1 - (1 - p) ** 2))
            overlay(f, x - 50, y - 50, 100, 100,
                    lambda c: c.circle(x, y, r, outline=RED + (round(230 * (1 - p)),), width=4.5))
    if len(track) > 1 and t >= track[1][0]:
        x, y = cursor_pos(track, t)
        a = pr(t, track[1][0], 0.3)
        press = max([math.sin(math.pi * (t - tc) / 0.35) for tc in clicks if 0 <= t - tc < 0.35] + [0])
        k = 1.9 * (1 - 0.18 * press)
        pts = [(4, 2), (20, 11.5), (13, 13), (9.5, 19.5)]
        P = [(x + (px - 4) * k, y + (py - 2) * k) for px, py in pts]

        def draw(c):
            c.poly([(px + 2, py + 3) for px, py in P], fill=(0, 0, 0, round(50 * a)))
            c.poly(P, fill=INK + (round(255 * a),), outline=WHITE + (round(255 * a),), width=2.5)
        overlay(f, x - 10, y - 10, 60, 60, draw)
    caption(f, beats, t)


def caption(f, beats, t):
    cur = [b for b in beats if b[0] <= t][-1]
    a = 1.0 if cur[0] == 0 else pr(t, cur[0], 0.45)
    lines = CAPTIONS[cur[1]].split("\n")
    font, lh = ("S", 56), 74
    w = max(tw(s, font) for s in lines) + 100
    h = len(lines) * lh + 44
    x, y = (W - w) / 2, H - 46 - h + 14 * (1 - a)
    L = Image.new("RGBA", (round(w * SS), round(h * SS)), (0, 0, 0, 0))
    c = Cv(L, x, y)
    c.rect(x, y, w, h, 30, fill=(31, 35, 40, 226))
    for i, s in enumerate(lines):
        c.text(W / 2, y + 22 + lh * i + lh / 2, s, font, WHITE + (255,), "mm")
    comp(f, L, x, y, a)


# ---------------------------------------------------------------- static bases
def _bases():
    blank = Image.new("RGBA", (W * SS, H * SS), WHITE + (255,))
    app = blank.copy()
    comp(app, card_base(AW, AH, 21, 60, 26, 40, 16), AX - 60, AY - 60)
    mask = Image.new("L", (AW * SS, AH * SS), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, AW * SS - 1, AH * SS - 1], 21 * SS, fill=255)
    return blank, app, mask


BLANK, APPBASE, APPMASK = _bases()


def app_frame(list_kw=None, panel_kw=None, page_dim=0.0, scrim=0.0):
    f = APPBASE.copy()
    L = Image.new("RGBA", (AW * SS, AH * SS), WHITE + (255,))
    c = Cv(L, AX, AY)
    topbar(c)
    list_page(c, **(list_kw or {}))
    c.dim(AX, TOP + 1, AW, AH, page_dim)
    if panel_kw is not None:
        panel(c, **panel_kw)
    c.dim(AX, AY, AW, AH, 0.28 * scrim, SCRIM)
    f.paste(L, (AX * SS, AY * SS), APPMASK)
    Cv(f).rect(AX, AY, AW, AH, 21, outline=LINE, width=1.5)
    return f


def show_dialog(f, t, t_in, t_out, layer_fn, sent=False):
    op = pr(t, t_in, 0.4) * (1 - pr(t, t_out, 0.4 if not sent else 0.7))
    if op <= 0.004:
        return
    L, lx, ly = layer_fn()
    if sent:
        q = pr(t, t_out, 0.7)
        comp(f, L, lx + 150 * q, ly - 300 * q, op, 1 - 0.7 * q)
    else:
        comp(f, L, lx, ly + 18 * (1 - pr(t, t_in, 0.5)), op, 1 - 0.04 * pr(t, t_out, 0.4))


# =====================================================================
# SOUND CUES — (local time in seconds, sound) per scene. "click" cues also
# draw the cursor's click ripple, so picture and sound always line up.
# =====================================================================
CUES = {
    "hook":    [(0.15, "slide"), (2.3, "whoosh"), (3.2, "pop")],
    "find":    [(1.5, "ring"), (5.0, "ring")],
    "add":     [(1.0, "click"), (1.0, "open"), (2.7, "click"), (3.9, "click"), (4.3, "sparkle"),
                (6.5, "click"), (6.7, "close"), (6.8, "chime")],
    "open":    [(1.1, "click"), (1.1, "slide"), (2.9, "ring")],
    "charges": [(1.1, "click"), (1.1, "open"), (2.9, "click"), (2.9, "tick"), (4.1, "click"), (4.1, "tick"),
                (5.5, "click"), (5.5, "close"), (6.1, "count_up")],
    "payment": [(1.1, "click"), (1.1, "open"), (2.8, "click"), (2.8, "type"), (4.2, "click"), (5.5, "click"),
                (5.6, "shutter"), (7.0, "click"), (7.0, "close"), (7.4, "count_down"), (8.4, "success")],
    "send":    [(1.1, "click"), (1.1, "open"), (3.2, "ring"), (5.7, "click"), (5.7, "close"), (6.1, "open"),
                (6.9, "ring"), (9.1, "click"), (9.1, "plane"), (10.2, "chime")],
    "history": [(1.0, "click"), (1.0, "tab"), (2.7, "click"), (2.7, "tab"), (4.3, "click"), (4.3, "tab")],
    "recap":   [(0.3, "bell1"), (1.6, "bell2"), (2.9, "bell3"), (4.4, "finale")],
}


def clicks(key):
    return [t for t, s in CUES[key] if s == "click"]


# =====================================================================
# SCENES — each is render(t) for local time t (seconds).
# =====================================================================

# ----- SCENE 1: Hook (5s) — job order + rental slide into the client's folder
@lru_cache(None)
def hook_card(kind, no, what, amt):
    L = card_base(375, 255, 21).copy()
    c = Cv(L, -60, -60)
    c.text(27, 38, kind, ("B", 17), MUTED)
    c.text(27, 68, no, ("R", 19), MUTED)
    c.text(27, 114, what, ("B", 27), INK)
    c.text(27, 158, amt, ("X", 34), INK)
    pill(c, 27, 210, "Not yet paid", RED_SOFT, RED_DEEP, ("S", 18), 36)
    return L


def s_hook(t):
    f = BLANK.copy()
    c = Cv(f)
    FX, FY, FW = 720, 495, 480
    c.rect(FX, FY - 33, 180, 50, 15, fill=(249, 201, 198))
    c.rect(FX, FY, FW, 270, 21, fill=(249, 201, 198))
    pin, pinto = pr(t, 0.15, 1.0), pr(t, 2.3, 1.1)
    for i, (args, x0) in enumerate(((("JOB ORDER", "JO-0139", "Aircon repair", "₱3,500"), 375),
                                    (("RENTAL", "R-0088", "Projector rental", "₱5,070"), 1170))):
        cx = x0 + 187.5 + (-120 if i == 0 else 120) * (1 - pin)
        pos = lerp((cx, 232.5), (960, 650), pinto)
        scale = 1 - 0.65 * pinto
        op = pin * (1 - clamp((pinto - 0.55) / 0.45))
        L = hook_card(*args)
        comp(f, L, pos[0] - 187.5 - 60, pos[1] - 127.5 - 60, op, scale)
    c.rect(FX, FY + 45, FW, 225, 21, fill=RED)
    c.text(FX + 30, FY + 185, "Sunshine Electronics Corp.", ("B", 26), WHITE)
    c.text(FX + 30, FY + 225, "2 items · Owes ₱8,570", ("M", 22), mix(WHITE, RED, pr(t, 3.2, 0.5)))
    finish(f, t, [(0, START)], [], [(0, "hook")])
    return f


# ----- SCENE 2: Find the client (8s) — highlight Owes, then Overdue
def s_find(t):
    f = app_frame(dict(dim_toolbar=0.7 * pr(t, 0.8)))
    track = [(0, START), (0.8, (TX + 860, HY + 26)), (4.3, (TX + 1130, HY + 26))]
    finish(f, t, track, [], [(0, "find")], [(COL_OWES, 1.5, 4.3), (COL_OVER, 5.0, None)])
    return f


# ----- SCENE 3: New client? (8s) — + Add, pick client, auto-filled contact, Create
def s_add(t):
    new_t = t - 6.7 if t >= 6.7 else None
    f = app_frame(dict(nrows=5 if new_t is not None else 4, new_t=new_t,
                       dim_table=0.7 * (pr(t, 0.3) - pr(t, 6.7))),
                  scrim=pr(t, 1.0, 0.4) - pr(t, 6.7, 0.4))
    show_dialog(f, t, 1.0, 6.7, lambda: card(DA_W, DA_H, DA_X, DA_Y, lambda c: dlg_add(
        c, t >= 3.9, 2.7 <= t < 3.9, t >= 3.2, pr(t, 4.3, 0.5))))
    toast(Cv(f), "toastCreated", pr(t, 6.8, 0.4))
    track = [(0, START), (0.3, center(ADD_BTN)), (2.0, (CLIENT_FIELD[0] + 240, CLIENT_FIELD[1] + 32)),
             (3.2, (PEDRO_ITEM[0] + 120, PEDRO_ITEM[1] + 25)), (5.8, center(CREATE_BTN))]
    finish(f, t, track, clicks("add"), [(0, "add")], [(AUTOFILL, 4.3, 5.8)])
    return f


# ----- SCENE 4: Open the account (6s) — click row, panel slides in, highlight balance
def s_open(t):
    slide = pr(t, 1.1, 0.7)
    pk = dict(xo=920 * (1 - slide), focus="owes", focus_p=pr(t, 2.3)) if t >= 1.1 else None
    f = app_frame(dict(nrows=5, tap_row0=env(t, 1.0, 0.15, 0.2, 0.4)), pk, page_dim=0.7 * pr(t, 1.1))
    track = [(0, START), (0.4, (TX + 450, RY + 37)), (2.3, OWES_NUM)]
    finish(f, t, track, clicks("open"), [(0, "open")], [(OWES_BOX, 2.9, None)])
    return f


PANEL_BG = dict(nrows=5)


# ----- SCENE 5: Add charges (10s) — tick two job orders, balance counts up
def s_charge(t):
    owes = 8570 + 3500 * pr(t, 6.1, 1.6)
    pk = dict(owes=owes, owes_color=mix(RED_DEEP, INK, env(t, 6.1, 0.3, 1.2, 0.6)), focus="quiet")
    f = app_frame(PANEL_BG, pk, page_dim=0.7, scrim=pr(t, 1.1, 0.4) - pr(t, 5.5, 0.4))
    checked = [t >= 2.9, t >= 4.1, False]
    total = 2300 * checked[0] + 1200 * checked[1]
    show_dialog(f, t, 1.1, 5.5, lambda: card(DC_W, DC_H, DC_X, DC_Y, lambda c: dlg_charge(c, checked, total)))
    track = [(0, START), (0.4, center(BTN_CHARGE)), (2.2, CB[0]), (3.4, CB[1]), (4.8, center(ADDC_BTN)), (6.1, OWES_NUM)]
    finish(f, t, track, clicks("charges"), [(0, "charges")], [(OWES_BOX, 6.1, None)])
    return f


# ----- SCENE 6: Record a payment (10s) — ₱5,000 via GCash, receipt, balance counts down
def s_pay(t):
    owes = 12070 - 5000 * pr(t, 7.4, 1.5)
    pk = dict(owes=owes, owes_color=mix(GREEN, INK, env(t, 7.4, 0.3, 1.1, 0.6)), focus="quiet",
              over="clear" if t >= 8.4 else "over", over_a=pr(t, 8.4, 0.4), paid=pr(t, 8.4, 0.5), hist="mid" if t >= 8.4 else "start")
    f = app_frame(PANEL_BG, pk, page_dim=0.7, scrim=pr(t, 1.1, 0.4) - pr(t, 7.0, 0.4))
    amount = 5000 * pr(t, 2.8, 0.7) if t >= 2.8 else None
    show_dialog(f, t, 1.1, 7.0, lambda: card(DP_W, DP_H, DP_X, DP_Y, lambda c: dlg_pay(c, amount, t >= 4.2, t >= 5.5)))
    track = [(0, START), (0.4, center(BTN_PAY)), (2.1, (AMT_FIELD[0] + 160, AMT_FIELD[1] + 32)),
             (3.5, center(CHIPS[1])), (4.8, center(DROP)), (6.3, center(SAVE_BTN)), (7.4, OWES_NUM)]
    finish(f, t, track, clicks("payment"), [(0, "payment")], [(OWES_BOX, 7.4, None)])
    return f


# ----- SCENE 7: Send a statement (12s) — dates pre-filled, Create & send, email, paper plane
def s_send(t):
    pk = dict(owes=7070, over="clear", paid=1.0, hist="mid", focus="quiet")
    f = app_frame(PANEL_BG, pk, page_dim=0.7, scrim=pr(t, 1.1, 0.4) - pr(t, 10.2, 0.4))
    show_dialog(f, t, 1.1, 5.7, lambda: card(DS_W, DS_H, DS_X, DS_Y, dlg_stmt))
    show_dialog(f, t, 6.1, 9.1, lambda: card(DM_W, DM_H, DM_X, DM_Y, dlg_mail), sent=True)
    c = Cv(f)
    if 9.1 <= t < 10.7:  # paper plane flies off
        p = (t - 9.1) / 1.5
        sx, sy = center(SEND_BTN)
        q = ease(p)
        x, y = sx + 640 * q, sy - 40 - 560 * q ** 1.4
        size = 1.6 + 1.4 * math.sin(math.pi * min(1, p * 1.3))
        col = mix(RED, WHITE, clamp(p / 0.15) * (1 - clamp((p - 0.7) / 0.3)))
        icon(c, "send", x, y, size, col, 3)
    toast(c, "toastSent", pr(t, 10.2, 0.4))
    track = [(0, START), (0.4, center(BTN_SEND)), (3.2, (DATES[0] + 300, DATES[1] + 70)), (5.0, center(CS_BTN)),
             (6.9, (TO_CHIP[0] + TO_CHIP[2] * 0.6, TO_CHIP[1] + 19)), (8.4, center(SEND_BTN))]
    finish(f, t, track, clicks("send"), [(0, "send1"), (3.2, "send2")],
           [(DATES, 3.2, 5.0), (TO_CHIP, 6.9, 8.4)])
    return f


# ----- SCENE 8: Check history (6s) — History → Payments → Statements
def s_hist(t):
    tab, ts = ("history", 1.0) if t < 2.7 else ("payments", 2.7) if t < 4.3 else ("statements", 4.3)
    tab_a = pr(t, ts, 0.35) if t >= ts else 1.0
    pk = dict(owes=7070, over="clear", paid=1.0, tab=tab, hist=tab, tab_a=tab_a, focus="tabs")
    f = app_frame(PANEL_BG, pk, page_dim=0.7)
    track = [(0, START), (0.3, TAB_PT["history"]), (2.0, TAB_PT["payments"]), (3.6, TAB_PT["statements"])]
    finish(f, t, track, clicks("history"), [(0, "history")])
    return f


# ----- SCENE 9: Recap (8s) — three buttons, closing line
def s_recap(t):
    f = BLANK.copy()
    c = Cv(f)
    c.text(960, 190, CAPTIONS["recapTitle"], ("B", 22), MUTED, "mm")
    for x, t0 in ((735, 1.2), (1185, 2.5)):
        a = pr(t, t0, 0.5)
        col = mix((203, 213, 225), WHITE, a)
        c.line([(x - 32, 390), (x + 30, 390)], col, 4)
        c.line([(x + 16, 376), (x + 31, 390), (x + 16, 404)], col, 4)
    for n, (x, t0, ic, key) in enumerate(((510, 0.3, "plus", "stepCharge"), (960, 1.6, "wallet", "stepPay"),
                                         (1410, 2.9, "send", "stepSend")), 1):
        a = pr(t, t0, 0.6)
        if a <= 0:
            continue
        y = 390 + 26 * (1 - a)
        if t >= 4.4:  # gentle pulse once all three are shown
            s = math.sin(math.pi * (((t - 4.4) % 1.8) / 1.8))
            c.circle(x, y, 102 + 18 * s, fill=mix(RED_SOFT, WHITE, 0.6 * (1 - s)))
        c.circle(x, y, 102, fill=mix(RED_SOFT, WHITE, a))
        icon(c, ic, x, y, 3.6, mix(RED, WHITE, a), 7)
        c.text(x, y + 150, str(n), ("B", 24), mix(MUTED, WHITE, a), "mm")
        c.text(x, y + 196, CAPTIONS[key], ("B", 40), mix(INK, WHITE, a), "mm")
    finish(f, t, [(0, START)], [], [(0, "recap1"), (4.4, "recap2")])
    return f


SCENES = [("Hook", 5, s_hook), ("Find the client", 8, s_find), ("New client", 8, s_add),
          ("Open the account", 6, s_open), ("Add charges", 10, s_charge), ("Record payment", 10, s_pay),
          ("Send statement", 12, s_send), ("History", 6, s_hist), ("Recap", 8, s_recap)]
STARTS = []
_acc = 0
for _s in SCENES:
    STARTS.append(_acc)
    _acc += _s[1]
TOTAL = _acc
NFRAMES = TOTAL * FPS
XF = 0.25  # half of the 0.5s crossfade


def render(T):
    for i in range(len(SCENES) - 1):  # crossfade around each boundary
        B = STARTS[i + 1]
        if abs(T - B) < XF:
            a = ease((T - (B - XF)) / (2 * XF))
            return Image.blend(SCENES[i][2](T - STARTS[i]), SCENES[i + 1][2](max(0.0, T - B)), a)
    i = max(k for k in range(len(SCENES)) if STARTS[k] <= T)
    img = SCENES[i][2](T - STARTS[i])
    if T < 0.4:
        img = Image.blend(BLANK, img, ease(T / 0.4))
    return img


def frame_rgb(T):
    return render(T).reduce(SS).convert("RGB")


def frame_bytes(n):
    return frame_rgb(n / FPS).tobytes()


SCENE_KEYS = ["hook", "find", "add", "open", "charges", "payment", "send", "history", "recap"]


# =====================================================================
# AUDIO — every sound is synthesized here (no stock files to license).
# =====================================================================
SR = 48000
MUSIC_LEVEL = 0.10   # background music volume (0..1)
SFX_LEVEL = 0.55     # sound-effects volume (0..1)


def tarr(d):
    return np.arange(int(d * SR)) / SR


def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def fade_edges(y, a=0.004, r=0.01):
    na, nr = max(1, int(a * SR)), max(1, int(r * SR))
    y[:na] *= np.linspace(0, 1, na)
    y[-nr:] *= np.linspace(1, 0, nr)
    return y


def bell(m, d=1.6, decay=3.0, bright=0.35):
    x = tarr(d)
    f = hz(m)
    y = (np.sin(2 * np.pi * f * x) + bright * np.sin(2 * np.pi * 2.0 * f * x) * np.exp(-x * 4)
         + 0.12 * np.sin(2 * np.pi * 3.01 * f * x) * np.exp(-x * 7)) * np.exp(-x * decay)
    return fade_edges(y)


def pluck(m, d=0.5, decay=7.0):
    x = tarr(d)
    f = hz(m)
    y = (np.sin(2 * np.pi * f * x) + 0.3 * np.sin(4 * np.pi * f * x)
         + 0.08 * np.sin(6 * np.pi * f * x)) * np.exp(-x * decay)
    return fade_edges(y)


def blip(f0, f1, d, decay):
    x = tarr(d)
    f = f0 + (f1 - f0) * (x / d)
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * decay)
    return fade_edges(y, 0.002)


def noise(d, seed):
    return np.random.default_rng(seed).standard_normal(int(d * SR))


def whoosh(d, f0, f1, seed=7, width=0.7):
    """Band-passed noise whose centre frequency sweeps f0 -> f1, with a soft swell."""
    n = noise(d, seed)
    N, hop = 2048, 512
    win = np.hanning(N)
    out = np.zeros(len(n) + N)
    freqs = np.fft.rfftfreq(N, 1 / SR)
    for s in range(0, len(n), hop):
        seg = np.zeros(N)
        chunk = n[s:s + N]
        seg[:len(chunk)] = chunk
        fc = f0 * (f1 / f0) ** (s / max(1, len(n)))
        mask = np.exp(-0.5 * ((np.log(freqs + 1) - np.log(fc)) / width) ** 2)
        out[s:s + N] += np.fft.irfft(np.fft.rfft(seg * win) * mask, N) * win
    y = out[:len(n)] * np.sin(np.pi * np.clip(tarr(d) / d, 0, 1)) ** 1.5
    return y / (np.abs(y).max() + 1e-9)


def click():
    x = tarr(0.06)
    y = noise(0.06, 3) * np.exp(-x * 450) * 0.6 + np.sin(2 * np.pi * 2200 * x) * np.exp(-x * 140) * 0.5
    return fade_edges(y - np.convolve(y, np.ones(8) / 8, "same"), 0.0005)


def place(y, s, at):
    i = int(at * SR)
    if i < len(y):
        y[i:i + len(s)] += s[:len(y) - i]
    return y


def ticks(d, up, n=14):
    y = np.zeros(int((d + 0.1) * SR))
    for k in range(n):
        p = k / (n - 1)
        m = (84 + 7 * p) if up else (91 - 7 * p)
        place(y, blip(hz(m), hz(m), 0.05, 70) * 0.5, d * (0.5 - 0.5 * np.cos(np.pi * p)))  # follows the eased counter
    return y


def chord_hit(ms, gap=0.07, d=1.8):
    y = np.zeros(int((d + gap * len(ms)) * SR))
    for k, m in enumerate(ms):
        place(y, bell(m, d) * 0.5, k * gap)
    return y


SFX = {
    "click":      lambda: click() * 0.85,
    "tick":       lambda: blip(1200, 1600, 0.05, 60) * 0.35,
    "tab":        lambda: whoosh(0.18, 1500, 3500, seed=11) * 0.12,
    "open":       lambda: whoosh(0.35, 500, 2200, seed=5) * 0.22,
    "close":      lambda: whoosh(0.3, 2200, 500, seed=6) * 0.18,
    "slide":      lambda: whoosh(0.7, 300, 1600, seed=8) * 0.28,
    "whoosh":     lambda: whoosh(1.0, 1800, 350, seed=9) * 0.3,
    "plane":      lambda: whoosh(1.5, 400, 4500, seed=10, width=0.5) * 0.4,
    "pop":        lambda: blip(420, 880, 0.14, 26) * 0.45,
    "ring":       lambda: bell(88, 0.9, 6, 0.2) * 0.12,
    "sparkle":    lambda: chord_hit([84, 88, 91, 96], 0.045, 0.6) * 0.35,
    "chime":      lambda: chord_hit([76, 79, 84], 0.09) * 0.5,
    "success":    lambda: chord_hit([72, 76, 79, 84], 0.08, 2.2) * 0.55,
    "shutter":    lambda: place(place(np.zeros(int(0.14 * SR)), click(), 0), click() * 0.8, 0.07) * 0.6,
    "type":       lambda: sum(place(np.zeros(int(0.8 * SR)), click() * (0.25 + 0.1 * (k % 2)), at)
                              for k, at in enumerate([0.0, 0.11, 0.19, 0.31, 0.4, 0.52, 0.6])),
    "count_up":   lambda: ticks(1.6, True),
    "count_down": lambda: ticks(1.5, False),
    "bell1":      lambda: bell(76, 1.4) * 0.35,
    "bell2":      lambda: bell(79, 1.4) * 0.35,
    "bell3":      lambda: bell(84, 1.4) * 0.35,
    "finale":     lambda: chord_hit([60, 64, 67, 72, 76], 0.06, 3.0) * 0.5,
}


def music(total):
    """Soft C-G-Am-F loop at 96 bpm: pad + gentle pluck arpeggio + round bass."""
    n = int(total * SR)
    y = np.zeros(n + SR * 4)
    beat = 60 / 96
    bar = 4 * beat
    prog = [(48, [60, 64, 67]), (43, [59, 62, 67]), (45, [57, 60, 64]), (41, [57, 60, 65])]
    k, t0 = 0, 0.0
    while t0 < total:
        root, tones = prog[k % 4]
        x = tarr(bar + 0.6)
        env = np.minimum(1, x / 0.6) * np.clip((bar + 0.6 - x) / 0.6, 0, 1)
        pad = sum(np.sin(2 * np.pi * hz(m) * x) + 0.12 * np.sin(4 * np.pi * hz(m) * x) for m in tones) / 3
        place(y, pad * env * 0.35, t0)
        for b in (0, 2):  # bass on beats 1 and 3
            place(y, fade_edges(pluck(root, beat * 1.8, 3.5), 0.03) * 0.25, t0 + b * beat)
        for e in range(8):  # eighth-note arpeggio
            m = tones[[0, 1, 2, 1, 0, 2, 1, 2][e]] + 12
            place(y, pluck(m, 0.45, 8) * (0.16 if e % 2 else 0.22), t0 + e * beat / 2)
        k += 1
        t0 += bar
    y = y[:n]
    x = tarr(total)
    y *= np.minimum(1, x / 1.5) * np.clip((total - x) / 3.0, 0, 1)
    return y / (np.abs(y).max() + 1e-9)


def build_audio(path):
    import wave
    mix = music(TOTAL) * MUSIC_LEVEL
    fx = np.zeros_like(mix)
    for key, start in zip(SCENE_KEYS, STARTS):
        for t, name in CUES[key]:
            place(fx, SFX[name](), start + t)
    mix = mix + fx * SFX_LEVEL
    peak = np.abs(mix).max()
    if peak > 0.89:  # keep about 1 dB of headroom
        mix *= 0.89 / peak
    stereo = np.repeat((mix * 32767).astype("<i2")[:, None], 2, axis=1)
    with wave.open(path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(stereo.tobytes())


def mux(video, audio, out):
    cmd = ["ffmpeg", "-y", "-loglevel", "error", "-i", video, "-i", audio, "-map", "0:v:0", "-map", "1:a:0",
           "-c:v", "copy", "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-c:a", "aac", "-b:a", "192k", "-ar", str(SR), "-shortest",
           "-movflags", "+faststart", out]
    if subprocess.call(cmd) != 0:
        sys.exit("ffmpeg mux failed")


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "all"
    if mode == "check":
        times = [float(x) for x in sys.argv[2:]] or [s + d / 2 for (_, d, _), s in zip(SCENES, STARTS)]
        for T in times:
            frame_rgb(T).save(os.path.join(OUT_DIR, f"check-{T:05.1f}.png"))
        return
    if mode != "audio":  # render the picture (slow); "audio" reuses the existing picture
        cmd = ["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
               "-r", str(FPS), "-i", "-", "-an", "-c:v", "libx264", "-preset", "slow", "-crf", "18",
               "-tune", "animation", "-profile:v", "high", "-level", "4.1", "-pix_fmt", "yuv420p",
               "-movflags", "+faststart", OUT_PICTURE]
        ff = subprocess.Popen(cmd, stdin=subprocess.PIPE)
        with Pool(max(1, (os.cpu_count() or 2) - 1)) as pool:
            for n, b in enumerate(pool.imap(frame_bytes, range(NFRAMES), chunksize=4)):
                ff.stdin.write(b)
                if n % 150 == 0:
                    print(f"frame {n}/{NFRAMES}", flush=True)
        ff.stdin.close()
        if ff.wait() != 0:
            sys.exit("ffmpeg failed")
        frame_rgb(STARTS[-1] + 7.0).save(OUT_THUMB)
    build_audio(OUT_WAV)
    mux(OUT_PICTURE, OUT_WAV, OUT_MP4)
    os.remove(OUT_WAV)
    print("done:", OUT_MP4)
    print("timestamps:", " | ".join(f"{i + 1}. {n} {int(s) // 60}:{int(s) % 60:02d}"
                                    for i, ((n, _, _), s) in enumerate(zip(SCENES, STARTS))))


if __name__ == "__main__":
    main()
