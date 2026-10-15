#!/usr/bin/env python3
"""Diagramas de tesis: SVG con coordenadas fijas + PNG (Playwright) + PDF."""
from __future__ import annotations

import html
from pathlib import Path

from PIL import Image, ImageFont
from playwright.sync_api import sync_playwright

OUT = Path("/workspace/docs/diagramas-tesis")
FONT_R = "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"
FONT_B = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"

# Paleta (borde / relleno) — misma de la Figura 5
GREEN, GREEN_BG = "#0f7b55", "#eaf7f0"
PURPLE, PURPLE_BG = "#6d28d9", "#f3efff"
ORANGE, ORANGE_BG = "#c2410c", "#fff4ec"
RED, RED_BG = "#be123c", "#fff1f2"
GRAY, GRAY_BG = "#334155", "#f1f5f9"
DARK = "#1f2937"
MUTED = "#64748b"
ZONE_STROKE = "#94a3b8"

W = 1800


def tw(text: str, size: int, bold: bool = False) -> float:
    font = ImageFont.truetype(FONT_B if bold else FONT_R, size)
    return float(font.getlength(text))


def wrap(text: str, size: int, bold: bool, max_w: float) -> list[str]:
    words = text.split()
    if not words:
        return [""]
    lines, cur = [], words[0]
    for word in words[1:]:
        trial = f"{cur} {word}"
        if tw(trial, size, bold) <= max_w:
            cur = trial
        else:
            lines.append(cur)
            cur = word
    lines.append(cur)
    return lines


def esc(text: str) -> str:
    return html.escape(text, quote=True)


class SVG:
    def __init__(self, w: int, h: int):
        self.w, self.h = w, h
        self.parts: list[str] = []
        self._markers()

    def _markers(self) -> None:
        def marker(name: str, color: str) -> str:
            return f'''
  <marker id="{name}" markerWidth="14" markerHeight="14" refX="12" refY="7"
          orient="auto" markerUnits="userSpaceOnUse">
    <path d="M1,1 L13,7 L1,13 Z" fill="{color}"/>
  </marker>'''

        def hollow() -> str:
            return '''
  <marker id="m-gen" markerWidth="18" markerHeight="14" refX="17" refY="7"
          orient="auto" markerUnits="userSpaceOnUse">
    <path d="M1,1 L17,7 L1,13 Z" fill="#ffffff" stroke="#1f2937" stroke-width="1.8"/>
  </marker>'''

        self.defs = (
            "<defs>"
            + marker("m-dark", DARK)
            + marker("m-orange", ORANGE)
            + marker("m-red", RED)
            + marker("m-green", GREEN)
            + marker("m-purple", PURPLE)
            + marker("m-gray", GRAY)
            + hollow()
            + "</defs>"
        )

    def add(self, s: str) -> None:
        self.parts.append(s)

    def rect(self, x, y, w, h, fill, stroke, sw=3, rx=12, dash=None, opacity=1) -> None:
        d = f' stroke-dasharray="{dash}"' if dash else ""
        op = f' fill-opacity="{opacity}"' if opacity != 1 else ""
        self.add(
            f'<rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" '
            f'rx="{rx}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"{d}{op}/>'
        )

    def text(self, x, y, s, size, bold=False, fill=DARK, anchor="start", halo=False) -> None:
        weight = 700 if bold else 400
        extra = ""
        if halo:
            extra = (
                ' stroke="#ffffff" stroke-width="7" paint-order="stroke" '
                'stroke-linejoin="round" stroke-linecap="round"'
            )
        self.add(
            f'<text x="{x:.1f}" y="{y:.1f}" font-family="Arial, Helvetica, sans-serif" '
            f'font-size="{size}" font-weight="{weight}" fill="{fill}" '
            f'text-anchor="{anchor}"{extra}>{esc(s)}</text>'
        )

    def multiline(self, x, y, lines, size, bold, fill, anchor, leading) -> None:
        for i, line in enumerate(lines):
            self.text(x, y + i * leading, line, size, bold, fill, anchor)

    def zone(self, x, y, w, h, title: str, desc: str, fill: str, stroke: str) -> None:
        self.rect(x, y, w, h, fill, stroke, sw=2.4, rx=16, dash="9 7", opacity=0.45)
        self.text(x + 18, y + 32, title.upper(), 26, True, stroke)
        dx = tw(title.upper(), 26, True) + 26
        self.text(x + 18 + dx, y + 32, f"· {desc}", 23, False, MUTED)

    def box(self, x, y, w, h, title: str, sub: str, stroke: str, fill: str,
            title_size=32, sub_size=27) -> dict:
        self.rect(x, y, w, h, fill, stroke, sw=3, rx=12)
        inner = w - 28
        t_lines = wrap(title, title_size, True, inner)
        s_lines = wrap(sub, sub_size, False, inner) if sub else []
        t_h, s_h = title_size + 4, sub_size + 4
        block = len(t_lines) * t_h + (len(s_lines) * s_h if s_lines else 0)
        ty = y + (h - block) / 2 + title_size - 4
        self.multiline(x + w / 2, ty, t_lines, title_size, True, DARK, "middle", t_h)
        if s_lines:
            sy = ty + len(t_lines) * t_h
            self.multiline(x + w / 2, sy, s_lines, sub_size, False, MUTED, "middle", s_h)
        return {"x": x, "y": y, "w": w, "h": h,
                "n": (x + w / 2, y), "s": (x + w / 2, y + h),
                "e": (x + w, y + h / 2), "we": (x, y + h / 2),
                "cx": x + w / 2, "cy": y + h / 2}

    def diamond(self, cx, cy, w, h, title, sub, stroke, fill) -> dict:
        pts = f"{cx},{cy - h / 2} {cx + w / 2},{cy} {cx},{cy + h / 2} {cx - w / 2},{cy}"
        self.add(
            f'<polygon points="{pts}" fill="{fill}" stroke="{stroke}" stroke-width="3"/>'
        )
        self.text(cx, cy - 6, title, 32, True, DARK, "middle")
        if sub:
            self.text(cx, cy + 26, sub, 23, False, MUTED, "middle")
        return {"x": cx - w / 2, "y": cy - h / 2, "w": w, "h": h,
                "n": (cx, cy - h / 2), "s": (cx, cy + h / 2),
                "e": (cx + w / 2, cy), "we": (cx - w / 2, cy),
                "cx": cx, "cy": cy}

    def arrow(self, pts, color=DARK, dashed=False, marker="m-dark", width=3.2) -> None:
        d = " ".join(f"{'M' if i == 0 else 'L'}{x:.1f},{y:.1f}" for i, (x, y) in enumerate(pts))
        dash = ' stroke-dasharray="10 7"' if dashed else ""
        self.add(
            f'<path d="{d}" fill="none" stroke="{color}" stroke-width="{width}" '
            f'stroke-linejoin="round" stroke-linecap="round"{dash} marker-end="url(#{marker})"/>'
        )

    def line(self, pts, color=DARK, dashed=False, width=3.2, marker=None) -> None:
        d = " ".join(f"{'M' if i == 0 else 'L'}{x:.1f},{y:.1f}" for i, (x, y) in enumerate(pts))
        dash = ' stroke-dasharray="10 7"' if dashed else ""
        mk = f' marker-end="url(#{marker})"' if marker else ""
        self.add(
            f'<path d="{d}" fill="none" stroke="{color}" stroke-width="{width}" '
            f'stroke-linejoin="round" stroke-linecap="round"{dash}{mk}/>'
        )

    def label(self, x, y, s, size=26, fill=DARK, anchor="middle") -> None:
        self.text(x, y, s, size, True, fill, anchor, halo=True)

    def note(self, x, y, w, h, title, body_lines, stroke, fill) -> None:
        self.rect(x, y, w, h, fill, stroke, sw=2.5, rx=12)
        self.text(x + 18, y + 36, title, 26, True, stroke)
        yy = y + 68
        for line in body_lines:
            self.text(x + 18, yy, line, 23, False, DARK)
            yy += 30

    def legend(self, x, y, w, h, rows: list[tuple[str, str, str]]) -> None:
        self.rect(x, y, w, h, "#ffffff", "#94a3b8", sw=2, rx=12)
        self.text(x + 16, y + 32, "Convenciones", 26, True, DARK)
        yy = y + 62
        for kind, color, caption in rows:
            if kind == "box":
                self.rect(x + 16, yy - 16, 28, 20, color[1], color[0], sw=2, rx=4)
            elif kind == "solid":
                self.add(
                    f'<line x1="{x + 16}" y1="{yy - 6}" x2="{x + 52}" y2="{yy - 6}" '
                    f'stroke="{color}" stroke-width="3.2" marker-end="url(#m-dark)"/>'
                )
            elif kind == "dash":
                self.add(
                    f'<line x1="{x + 16}" y1="{yy - 6}" x2="{x + 52}" y2="{yy - 6}" '
                    f'stroke="{color}" stroke-width="3.2" stroke-dasharray="8 6"/>'
                )
            self.text(x + 58, yy, caption, 23, False, DARK)
            yy += 32

    def save(self, path: Path) -> None:
        svg = (
            f'<svg xmlns="http://www.w3.org/2000/svg" width="{self.w}" height="{self.h}" '
            f'viewBox="0 0 {self.w} {self.h}">\n'
            f'<rect width="{self.w}" height="{self.h}" fill="#ffffff"/>\n'
            f"{self.defs}\n"
            + "\n".join(self.parts)
            + "\n</svg>\n"
        )
        path.write_text(svg, encoding="utf-8")


# ──────────────────────────────────────────────────────────────────────────
# FIGURA 1 — Proceso actual en papel
# ──────────────────────────────────────────────────────────────────────────
def fig01() -> tuple[SVG, int, int]:
    H = 1540
    g = SVG(W, H)

    # Carriles horizontales
    g.zone(30, 36, 1740, 168, "Cliente", "deja y recoge prendas", GRAY_BG, GRAY)
    g.zone(30, 214, 1740, 430, "Esperanza", "Mostrador", GREEN_BG, GREEN)
    g.zone(30, 654, 1740, 560, "Diego", "Producción y caja", GREEN_BG, GREEN)

    # Cliente
    c_deja = g.box(310, 78, 270, 100, "Deja las prendas", "en el mostrador", GRAY, GRAY_BG)
    c_recoge = g.box(1455, 78, 290, 100, "Regresa a recoger", "paga al llevarse", GRAY, GRAY_BG)

    # Esperanza fila 1: pasos 1–4
    b1 = g.box(310, 268, 248, 128, "1. Recepción y clasificación", "marca la prenda", GREEN, GREEN_BG)
    b2 = g.box(565, 268, 245, 128, "2. Cálculo del valor", "de memoria", RED, RED_BG)
    b3 = g.box(830, 268, 245, 128, "3. Recibo físico", "escribe a mano", RED, RED_BG)
    b4 = g.box(1095, 268, 270, 128, "4. Cuaderno de entradas", "copia el pedido", RED, RED_BG)

    # Esperanza fila 2: pasos 7–8 (a la derecha, para no tapar 4→5)
    b7 = g.box(1240, 488, 255, 128, "7. Cuaderno de salidas", "tacha al entregar", RED, RED_BG)
    b8 = g.box(1515, 488, 240, 128, "8. Entrega y cobro", "recibe el pago", GREEN, GREEN_BG)

    # Diego fila 1: pasos 5–6
    b5 = g.box(830, 722, 245, 128, "5. Lavado y secado", "por tandas", GREEN, GREEN_BG)
    b6 = g.box(1095, 722, 270, 128, "6. Acoplado", "con el recibo", RED, RED_BG)

    # Diego fila 2: 9, ¿Cuadra?, Archiva
    b9 = g.box(1240, 930, 255, 128, "9. Cierre de caja", "suma a mano", RED, RED_BG)
    d10 = g.diamond(1635, 994, 210, 128, "¿Cuadra?", "paso 10", RED, RED_BG)
    arch = g.box(1510, 1128, 250, 70, "Archiva el cierre", "", GREEN, GREEN_BG, title_size=27, sub_size=23)

    # Etiqueta de confusión (bajo el paso 6, lejos de 8→9)
    g.label(830, 878, "la confusión se detecta aquí", 26, RED, "start")

    # Flechas — flujo principal, sin cruces
    g.arrow([c_deja["s"], b1["n"]])                                          # deja → 1
    g.arrow([b1["e"], (b2["we"][0], b1["cy"])])                              # 1 → 2
    g.arrow([b2["e"], (b3["we"][0], b2["cy"])])                              # 2 → 3
    g.arrow([b3["e"], (b4["we"][0], b3["cy"])])                              # 3 → 4

    # 4 → 5: baja al canal entre filas de Esperanza, izquierda, baja a Diego
    g.arrow([
        b4["s"],
        (b4["cx"], 430),
        (b5["cx"], 430),
        b5["n"],
    ])
    g.arrow([b5["e"], (b6["we"][0], b5["cy"])])                              # 5 → 6

    # 6 → 7: sube al canal entre carriles, derecha, sube a 7
    g.arrow([
        b6["n"],
        (b6["cx"], 678),
        (b7["cx"], 678),
        b7["s"],
    ])
    g.arrow([b7["e"], (b8["we"][0], b7["cy"])])                              # 7 → 8

    # cliente recoge ← 8 (el cliente llega; 8 atiende)
    g.arrow([
        c_recoge["s"],
        (c_recoge["cx"], 190),
        (b8["cx"], 190),
        b8["n"],
    ])

    # 8 → 9 por el canal derecho, horizontal a y=915 (bajo la etiqueta del 6)
    g.arrow([
        b8["e"],
        (1768, b8["cy"]),
        (1768, 915),
        (b9["cx"], 915),
        b9["n"],
    ])
    g.arrow([b9["e"], d10["we"]])                                            # 9 → 10

    # 10 sí → Archiva
    g.arrow([d10["s"], arch["n"]])
    g.label(1635, 1112, "sí", 26, GREEN)

    # 10 no → 9, U por debajo, punteada roja
    g.arrow(
        [
            (d10["we"][0], d10["cy"] + 28),
            (d10["we"][0] - 10, 1108),
            (b9["cx"], 1108),
            b9["s"],
        ],
        color=RED, dashed=True, marker="m-red",
    )
    g.label(1410, 1096, "no", 26, RED)

    # Notas
    g.note(
        30, 1234, 860, 276,
        "Puntos críticos",
        [
            "En rojo: el valor se calcula de memoria; el mismo pedido se copia",
            "en recibo y en dos cuadernos; la confusión se ve tarde, en el",
            "acoplado (paso 6); el cierre se suma a mano y, si no cuadra,",
            "se vuelve a contar (paso 9). No hay sistema ni WhatsApp.",
        ],
        RED, RED_BG,
    )
    g.note(
        910, 1234, 860, 276,
        "Nota sobre roles",
        [
            "El marcado lo hace casi siempre Esperanza; en tandas grandes",
            "lo hace ocasionalmente Diego. Harrison apoya el planchado",
            "antes del acoplado (paso 6). El cierre de caja es de Diego.",
        ],
        GRAY, GRAY_BG,
    )
    return g, W, H


# ──────────────────────────────────────────────────────────────────────────
# FIGURA 2 — Casos de uso
# ──────────────────────────────────────────────────────────────────────────
def stick(g: SVG, cx: float, y: float, name: str, sub: str, stroke: str, fill: str) -> dict:
    r = 22
    g.add(f'<circle cx="{cx}" cy="{y + r}" r="{r}" fill="{fill}" stroke="{stroke}" stroke-width="3"/>')
    g.add(f'<line x1="{cx}" y1="{y + 2 * r}" x2="{cx}" y2="{y + 108}" stroke="{stroke}" stroke-width="3"/>')
    g.add(f'<line x1="{cx - 34}" y1="{y + 62}" x2="{cx + 34}" y2="{y + 62}" stroke="{stroke}" stroke-width="3"/>')
    g.add(f'<line x1="{cx}" y1="{y + 108}" x2="{cx - 28}" y2="{y + 150}" stroke="{stroke}" stroke-width="3"/>')
    g.add(f'<line x1="{cx}" y1="{y + 108}" x2="{cx + 28}" y2="{y + 150}" stroke="{stroke}" stroke-width="3"/>')
    g.text(cx, y + 178, name, 27, True, stroke, "middle")
    g.text(cx, y + 206, sub, 23, False, MUTED, "middle")
    return {"cx": cx, "y": y, "bus_x": cx + (48 if cx < 900 else -48)}


def oval(g: SVG, cx, cy, rx, ry, title, code, stroke, fill) -> dict:
    g.add(
        f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="{fill}" '
        f'stroke="{stroke}" stroke-width="3"/>'
    )
    inner = rx * 1.7
    t_lines = wrap(title, 27, True, inner)
    ty = cy - 8 if len(t_lines) == 1 else cy - 22
    g.multiline(cx, ty, t_lines, 27, True, DARK, "middle", 30)
    g.text(cx, cy + (26 if len(t_lines) == 1 else 36), code, 23, False, MUTED, "middle")
    return {"cx": cx, "cy": cy, "rx": rx, "ry": ry,
            "we": (cx - rx, cy), "e": (cx + rx, cy),
            "n": (cx, cy - ry), "s": (cx, cy + ry)}


def callout(g: SVG, x, y, lines, stroke, fill) -> tuple[float, float]:
    maxw = max(tw(line, 23, False) for line in lines) + 32
    h = 18 + len(lines) * 28
    g.rect(x, y, maxw, h, fill, stroke, sw=2.4, rx=10)
    yy = y + 26
    for line in lines:
        g.text(x + 14, yy, line, 23, False, stroke)
        yy += 28
    return maxw, h


def fig02() -> tuple[SVG, int, int]:
    H = 1680
    g = SVG(W, H)

    g.rect(250, 36, 1280, 1396, "#ffffff", GRAY, sw=3, rx=18)
    g.text(890, 74, "LÍMITE DEL SISTEMA", 26, True, GREEN, "middle")
    g.text(890, 104, "· prototipo local-first", 23, False, MUTED, "middle")

    emp = stick(g, 118, 520, "Empleado", "mostrador", GRAY, GRAY_BG)
    ger = stick(g, 1682, 760, "Gerente", "también opera", GRAY, GRAY_BG)
    cli = stick(g, 1682, 1188, "Cliente", "dueño de las prendas", GRAY, GRAY_BG)

    left_x, right_x = 520, 1330
    rx, ry = 180, 50
    y0, gap = 168, 126
    left_items = [
        (0, "Registrar pedido", "RF01"),
        (1, "Calcular valor con tarifario", "RF02"),
        (2, "Actualizar estado del pedido", "RF03"),
        (3, "Registrar abono", "RF04"),
        (4, "Registrar observaciones", "RF05"),
        (5, "Buscar pedido", "RF06"),
        (6, "Consultar historial del cliente", "RF07"),
        (7, "Registrar gasto", "RF08"),
    ]
    # Columna derecha más abajo: deja hueco a la derecha de RF02, RF03 y RF05
    right_items = [
        (5, "Generar cierre de caja", "RF09"),
        (6, "Notificar pedido listo", "RF10"),
        (7, "Pedidos antiguos y aviso", "RF11"),
        (8, "Consultar panel remoto", "RF12"),
    ]
    L, R = {}, {}
    for i, title, code in left_items:
        L[code] = oval(g, left_x, y0 + i * gap, rx, ry, title, code, GREEN, GREEN_BG)
    for i, title, code in right_items:
        R[code] = oval(g, right_x, y0 + i * gap, rx, ry, title, code, PURPLE, PURPLE_BG)

    bus_e = 250
    g.line([(emp["cx"] + 40, emp["y"] + 62), (bus_e, emp["y"] + 62)], GRAY, width=2.6)
    g.line([(bus_e, L["RF01"]["cy"]), (bus_e, L["RF08"]["cy"])], GRAY, width=2.6)
    for code in ["RF01", "RF02", "RF03", "RF04", "RF05", "RF06", "RF07", "RF08"]:
        g.line([(bus_e, L[code]["cy"]), L[code]["we"]], GRAY, width=2.6)

    bus_g = 1530
    g.line([(ger["cx"] - 40, ger["y"] + 62), (bus_g, ger["y"] + 62)], GRAY, width=2.6)
    g.line([(bus_g, R["RF09"]["cy"]), (bus_g, R["RF12"]["cy"])], GRAY, width=2.6)
    for code in ["RF09", "RF10", "RF11", "RF12"]:
        g.line([(bus_g, R[code]["cy"]), R[code]["e"]], GRAY, width=2.6)

    # Cliente ⋯ RF10: entra por abajo y sube por la izquierda de la columna derecha
    inner = 1108
    g.line(
        [
            (cli["cx"] - 40, cli["y"] + 62),
            (inner, cli["y"] + 62),
            (inner, R["RF10"]["cy"]),
            R["RF10"]["we"],
        ],
        GRAY, dashed=True, width=2.6,
    )

    g.arrow([L["RF01"]["s"], L["RF02"]["n"]], color=DARK, dashed=True, marker="m-dark")
    g.label(L["RF01"]["e"][0] + 14, (L["RF01"]["s"][1] + L["RF02"]["n"][1]) / 2 + 8, "«include»", 26, DARK, "start")

    nx = 720
    callout(g, nx, L["RF02"]["cy"] - 20, [
        "Tarifario por script, sin",
        "pantalla de administración.",
    ], RED, RED_BG)
    callout(g, nx, L["RF03"]["cy"] - 34, [
        "Empleado hasta ENTREGADO;",
        "CANCELADO solo del Gerente.",
    ], RED, RED_BG)
    callout(g, nx, L["RF05"]["cy"] - 48, [
        "Se anota al crear el pedido;",
        "editarla después: solo Gerente.",
    ], RED, RED_BG)

    # Generalización Gerente → Empleado (triángulo hueco a la izquierda)
    gy = 1460
    g.line([(ger["cx"], gy), (158, gy)], DARK, width=3.2)
    g.add(
        f'<polygon points="112,{gy} 160,{gy - 18} 160,{gy + 18}" fill="#ffffff" '
        f'stroke="{DARK}" stroke-width="2.6"/>'
    )
    g.label(890, 1444, "generalización", 26, MUTED)

    g.rect(30, 1514, 1740, 136, "#ffffff", "#94a3b8", sw=2, rx=12)
    g.text(48, 1550, "Convenciones", 26, True, DARK)
    g.rect(48, 1576, 28, 20, GREEN_BG, GREEN, sw=2, rx=4)
    g.text(88, 1594, "RF01–RF08 · Empleado (el Gerente los hereda)", 23)
    g.rect(720, 1576, 28, 20, PURPLE_BG, PURPLE, sw=2, rx=4)
    g.text(760, 1594, "RF09–RF12 · solo Gerente", 23)
    g.rect(1150, 1576, 28, 20, GRAY_BG, GRAY, sw=2, rx=4)
    g.text(1190, 1594, "Cliente · punteada solo a RF10", 23)
    g.text(48, 1632, "«include»  RF01 incluye RF02.   Triángulo hueco: el Gerente es un Empleado (bajo el límite).", 23, False, MUTED)
    return g, W, H


# ──────────────────────────────────────────────────────────────────────────
# FIGURA 6 — Entidad-relación
# ──────────────────────────────────────────────────────────────────────────
def table(g: SVG, x, y, w, header, rows, head_stroke, head_fill) -> dict:
    row_h = 32
    head_h = 44
    h = head_h + row_h * len(rows)
    g.rect(x, y, w, h, "#ffffff", head_stroke, sw=3, rx=12)
    g.add(
        f'<path d="M{x},{y + 12} Q{x},{y} {x + 12},{y} H{x + w - 12} '
        f'Q{x + w},{y} {x + w},{y + 12} V{y + head_h} H{x} Z" fill="{head_fill}"/>'
    )
    g.text(x + w / 2, y + 30, header, 27, True, head_stroke, "middle")
    yy = y + head_h
    for i, (field, typ, kind) in enumerate(rows):
        if i % 2 == 1:
            g.add(f'<rect x="{x + 1.5}" y="{yy}" width="{w - 3}" height="{row_h}" fill="#f8fafc"/>')
        color = ORANGE if kind == "PK" else ("#1d4ed8" if kind == "FK" else DARK)
        tag = f"  {kind}" if kind else ""
        g.text(x + 12, yy + 22, field + tag, 23, kind in ("PK", "FK"), color)
        g.text(x + w - 12, yy + 22, typ, 23, False, MUTED, "end")
        yy += row_h
    # clip bottom corners already from outer stroke
    return {"x": x, "y": y, "w": w, "h": h,
            "n": (x + w / 2, y), "s": (x + w / 2, y + h),
            "e": (x + w, y + h / 2), "we": (x, y + h / 2),
            "cx": x + w / 2, "cy": y + h / 2,
            "left": x, "right": x + w, "top": y, "bot": y + h}


def crow(g: SVG, x, y, dx, dy, many: bool) -> None:
    """Decoración en el extremo: pata de gallo (muchos) o doble barra (uno y solo uno).
    (dx, dy) es la dirección hacia la caja (último tramo)."""
    import math
    length = math.hypot(dx, dy) or 1
    ux, uy = dx / length, dy / length
    px, py = -uy, ux  # perpendicular
    if many:
        bx, by = x - ux * 16, y - uy * 16
        for k in (-1, 0, 1):
            g.add(
                f'<line x1="{bx:.1f}" y1="{by:.1f}" '
                f'x2="{x + px * 9 * k:.1f}" y2="{y + py * 9 * k:.1f}" '
                f'stroke="{DARK}" stroke-width="2.6" stroke-linecap="round"/>'
            )
    else:
        for dist in (6, 12):
            cx, cy = x - ux * dist, y - uy * dist
            g.add(
                f'<line x1="{cx + px * 8:.1f}" y1="{cy + py * 8:.1f}" '
                f'x2="{cx - px * 8:.1f}" y2="{cy - py * 8:.1f}" '
                f'stroke="{DARK}" stroke-width="2.6" stroke-linecap="round"/>'
            )


def rel(g: SVG, pts, many_end=True, many_start=False, start_deco=True, end_deco=True) -> None:
    g.line(pts, DARK, width=2.6)
    x0, y0 = pts[0]
    x1, y1 = pts[1]
    xn, yn = pts[-1]
    xp, yp = pts[-2]
    if start_deco:
        crow(g, x0, y0, x0 - x1, y0 - y1, many_start)
    if end_deco:
        crow(g, xn, yn, xn - xp, yn - yp, many_end)


def fig06() -> tuple[SVG, int, int]:
    H = 1760
    g = SVG(W, H)

    # Columnas
    c1, c2, c3 = 50, 650, 1250
    twid = 500

    cli = table(g, c1, 48, twid, "Cliente", [
        ("id", "Int", "PK"),
        ("nombre", "String", ""),
        ("telefono", "String?", ""),
        ("direccion", "String?", ""),
        ("sedeId", "Int", "FK"),
    ], GREEN, GREEN_BG)

    ped = table(g, c2, 48, twid, "Pedido", [
        ("id", "Int", "PK"),
        ("clienteId", "Int", "FK"),
        ("sedeId", "Int", "FK"),
        ("servicio", "String", ""),
        ("total", "Int", ""),
        ("estado", "String", ""),
        ("observacion", "String?", ""),
        ("createdAt", "DateTime", ""),
    ], GREEN, GREEN_BG)

    pre = table(g, c3, 48, twid, "Prenda", [
        ("id", "Int", "PK"),
        ("pedidoId", "Int", "FK"),
        ("tipo", "String", ""),
        ("servicio", "String", ""),
        ("cantidad", "Int", ""),
        ("valor", "Int", ""),
        ("descripcion", "String?", ""),
    ], GREEN, GREEN_BG)

    sede = table(g, c1, 340, twid, "Sede", [
        ("id", "Int", "PK"),
        ("nombre", "String", ""),
        ("direccion", "String?", ""),
    ], GREEN, GREEN_BG)

    pago = table(g, c2 - 10, 455, 240, "Pago", [
        ("id", "Int", "PK"),
        ("pedidoId", "Int", "FK"),
        ("valor", "Int", ""),
        ("metodo", "String", ""),
        ("createdAt", "DateTime", ""),
    ], GREEN, GREEN_BG)

    hist = table(g, c2 + 270, 455, 250, "HistorialEstado", [
        ("id", "Int", "PK"),
        ("pedidoId", "Int", "FK"),
        ("estado", "String", ""),
        ("createdAt", "DateTime", ""),
    ], GREEN, GREEN_BG)

    ent = table(g, c3, 420, twid, "EntregaParcial", [
        ("id", "Int", "PK"),
        ("pedidoId", "Int", "FK"),
        ("prendaId", "Int", "FK"),
        ("cantidad", "Int", ""),
        ("observacion", "String?", ""),
    ], GREEN, GREEN_BG)

    g.zone(30, 800, 1740, 600, "Entidades de apoyo", "no forman el núcleo transaccional", PURPLE_BG, PURPLE)

    gas = table(g, 60, 892, 520, "GastoCaja", [
        ("id", "Int", "PK"),
        ("sedeId", "Int", "FK"),
        ("tipo", "String", ""),
        ("valor", "Int", ""),
        ("metodo", "String", ""),
        ("responsable", "String?", ""),
        ("createdAt", "DateTime", ""),
    ], PURPLE, PURPLE_BG)

    cie = table(g, 640, 892, 520, "CierreCaja", [
        ("id", "Int", "PK"),
        ("sedeId", "Int", "FK"),
        ("efectivo", "Int", ""),
        ("nequi", "Int", ""),
        ("daviplata", "Int", ""),
        ("transferencia", "Int", ""),
        ("tarjeta", "Int", ""),
        ("gastos / totalCaja", "Int", ""),
        ("createdAt", "DateTime", ""),
    ], PURPLE, PURPLE_BG)

    tar = table(g, 1220, 892, 520, "Tarifario", [
        ("id", "Int", "PK"),
        ("categoria", "String", ""),
        ("item", "String", ""),
        ("precioMin", "Int", ""),
        ("precioMax", "Int?", ""),
    ], PURPLE, PURPLE_BG)

    g.note(
        1220, 1170, 520, 200,
        "Nota del Tarifario",
        [
            "Sin relación formal con Prenda: el valor",
            "se asigna por coincidencia de texto (RF02).",
            "Único junto (categoría + ítem).",
        ],
        ORANGE, ORANGE_BG,
    )

    # Cliente 1 —— * Pedido  (horizontal a la altura de Cliente)
    y_cp = cli["cy"]
    rel(g, [(cli["right"], y_cp), (ped["left"], y_cp)], many_end=True, many_start=False)
    # Pedido 1 —— * Prenda
    y_pp = pre["cy"]
    rel(g, [(ped["right"], y_pp), (pre["left"], y_pp)], many_end=True, many_start=False)
    # Pedido 1 —— * Pago
    rel(g, [(pago["cx"], ped["bot"]), (pago["cx"], pago["top"])], many_end=True, many_start=False)
    # Pedido 1 —— * HistorialEstado
    rel(g, [(hist["cx"], ped["bot"]), (hist["cx"], hist["top"])], many_end=True, many_start=False)
    # Prenda 1 —— * EntregaParcial
    rel(g, [(pre["cx"], pre["bot"]), (pre["cx"], ent["top"])], many_end=True, many_start=False)
    # Pedido 1 —— * EntregaParcial (canal entre columnas, sin cruzar Prenda)
    rel(g, [
        (ped["right"], ped["bot"] - 24),
        (c3 - 36, ped["bot"] - 24),
        (c3 - 36, ent["cy"]),
        (ent["left"], ent["cy"]),
    ], many_end=True, many_start=False)

    # Sede 1 —— * Cliente (vertical, misma columna; uno en Sede, muchos en Cliente)
    rel(g, [(sede["cx"] - 140, sede["top"]), (sede["cx"] - 140, cli["bot"])], many_end=True, many_start=False)
    # Sede 1 —— * Pedido (sale a la derecha de Sede, entra por la izquierda baja de Pedido)
    rel(g, [
        (sede["right"], sede["cy"]),
        (ped["left"] - 28, sede["cy"]),
        (ped["left"] - 28, ped["bot"] - 30),
        (ped["left"], ped["bot"] - 30),
    ], many_end=True, many_start=False)

    # Bus Sede → GastoCaja y CierreCaja (debajo del título de la franja)
    bus_y = 862
    rel(g, [
        (sede["cx"], sede["bot"]),
        (sede["cx"], bus_y),
        (gas["cx"], bus_y),
        (gas["cx"], gas["top"]),
    ], many_end=True, many_start=False)
    rel(g, [
        (gas["cx"], bus_y),
        (cie["cx"], bus_y),
        (cie["cx"], cie["top"]),
    ], many_end=True, many_start=False, start_deco=False)

    g.rect(50, 1430, 1120, 290, "#ffffff", "#94a3b8", sw=2, rx=12)
    g.text(68, 1468, "Convenciones", 26, True, DARK)
    g.rect(68, 1494, 28, 20, GREEN_BG, GREEN, sw=2, rx=4)
    g.text(108, 1512, "Núcleo transaccional", 23)
    g.rect(420, 1494, 28, 20, PURPLE_BG, PURPLE, sw=2, rx=4)
    g.text(460, 1512, "Entidades de apoyo", 23)
    g.text(68, 1560, "PK  en naranja     FK  en azul", 23)
    g.text(68, 1600, "Pata de gallo:  ||  uno y solo uno          >  muchos", 23)
    g.text(68, 1644, "Sede se relaciona con Cliente, Pedido, GastoCaja y CierreCaja (bus inferior).", 23, False, MUTED)
    return g, W, H


# ──────────────────────────────────────────────────────────────────────────
# FIGURA 7 — Proceso con el prototipo
# ──────────────────────────────────────────────────────────────────────────
def fig07() -> tuple[SVG, int, int]:
    H = 1680
    g = SVG(W, H)

    g.zone(30, 30, 1740, 150, "Cliente", "deja, recibe aviso y recoge", GRAY_BG, GRAY)
    g.zone(30, 190, 1740, 200, "Esperanza", "Mostrador", GREEN_BG, GREEN)
    g.zone(30, 400, 1740, 180, "Diego", "Producción y caja", GREEN_BG, GREEN)
    g.zone(30, 590, 1740, 430, "Sistema", "prototipo local", PURPLE_BG, PURPLE)
    g.zone(30, 1030, 1740, 160, "Gerente", "consulta remota", GRAY_BG, GRAY)

    # Columnas alineadas para flechas verticales
    x1, x2, x3, x4 = 320, 680, 1020, 1420
    w1 = 280

    cl1 = g.box(x1, 72, w1, 88, "Deja las prendas", "", GRAY, GRAY_BG, 27, 23)
    cl2 = g.box(x3, 72, w1, 88, "Recibe el aviso", "WhatsApp", GRAY, GRAY_BG, 27, 23)
    cl3 = g.box(x4, 72, w1, 88, "Recoge y paga", "", GRAY, GRAY_BG, 27, 23)

    es1 = g.box(x1, 238, w1, 120, "Pedido rápido", "valor del tarifario", GREEN, GREEN_BG)
    es2 = g.box(x3, 238, w1, 120, "Notificación", "por WhatsApp", GREEN, GREEN_BG)
    es3 = g.box(x4, 238, w1, 120, "Entrega y cobro", "", GREEN, GREEN_BG)

    di1 = g.box(x2, 448, w1, 110, "Lavado y acoplado", "", GREEN, GREEN_BG)
    di2 = g.box(x4, 448, w1, 110, "Cierre de caja", "", GREEN, GREEN_BG)

    sy1 = g.box(x1, 650, w1, 110, "Guarda RECIBIDO", "", PURPLE, PURPLE_BG, 27, 23)
    sy2 = g.box(x2, 650, w1, 110, "EN_PROCESO", "mientras se lava", PURPLE, PURPLE_BG, 27, 23)
    sy3 = g.box(x3, 650, w1, 110, "LISTO", "", PURPLE, PURPLE_BG, 27, 23)
    sy4 = g.box(x4, 650, w1, 110, "Pago y ENTREGADO", "", PURPLE, PURPLE_BG, 27, 23)
    sy5 = g.box(x4, 830, w1, 110, "Calcula los totales", "", PURPLE, PURPLE_BG, 27, 23)
    sy6 = g.box(x3, 830, w1, 110, "Envía el resumen", "a Firestore", ORANGE, ORANGE_BG, 27, 23)

    ge1 = g.box(x3, 1078, w1, 90, "Panel remoto", "últimos cierres", GRAY, GRAY_BG, 27, 23)

    g.arrow([cl1["s"], es1["n"]])
    g.arrow([es1["s"], sy1["n"]])

    # lavado ↔ EN_PROCESO (dos verticales paralelas, no atraviesan cajas)
    g.arrow([(di1["cx"] - 18, di1["s"][1]), (sy2["cx"] - 18, sy2["n"][1])])
    g.arrow([(sy2["cx"] + 18, sy2["n"][1]), (di1["cx"] + 18, di1["s"][1])])
    g.arrow([sy2["e"], sy3["we"]])

    g.arrow([sy3["n"], es2["s"]])
    g.arrow([es2["n"], cl2["s"]])

    g.arrow([cl3["s"], es3["n"]])
    g.arrow([es3["s"], sy4["n"]])
    g.label(1754, 615, "registra el pago", 26, DARK, "end")

    # Cierre → totales por el canal derecho (no atraviesa Pago y ENTREGADO)
    g.arrow([
        di2["e"],
        (1756, di2["cy"]),
        (1756, sy5["cy"]),
        sy5["e"],
    ])
    g.arrow([sy5["we"], sy6["e"]], color=ORANGE, dashed=True, marker="m-orange")
    g.label(1398, 816, "usa internet", 26, ORANGE, "end")
    g.arrow([sy6["s"], ge1["n"]], color=ORANGE, dashed=True, marker="m-orange")

    # Notas
    g.note(
        30, 1220, 860, 200,
        "Funciona sin internet",
        [
            "Registro, estados, cobro y cierre local corren",
            "en el equipo del negocio. Solo el envío del",
            "resumen a Firestore (y el panel) usa internet.",
        ],
        GREEN, GREEN_BG,
    )
    g.note(
        910, 1220, 860, 200,
        "Comparado con el proceso en papel",
        [
            "Un solo registro sustituye recibo y cuadernos.",
            "El aviso por WhatsApp evita que el cliente",
            "pregunte; el cierre ya no se suma a mano.",
        ],
        GRAY, GRAY_BG,
    )

    g.rect(30, 1440, 1740, 210, "#ffffff", "#94a3b8", sw=2, rx=12)
    g.text(48, 1476, "Convenciones", 26, True, DARK)
    g.rect(48, 1500, 28, 20, GREEN_BG, GREEN, sw=2, rx=4)
    g.text(88, 1518, "Operación en el local", 23, False, DARK)
    g.rect(430, 1500, 28, 20, PURPLE_BG, PURPLE, sw=2, rx=4)
    g.text(470, 1518, "Sistema (prototipo)", 23, False, DARK)
    g.rect(820, 1500, 28, 20, ORANGE_BG, ORANGE, sw=2, rx=4)
    g.text(860, 1518, "Usa internet", 23, False, DARK)
    g.rect(1120, 1500, 28, 20, GRAY_BG, GRAY, sw=2, rx=4)
    g.text(1160, 1518, "Personas", 23, False, DARK)
    g.add(f'<line x1="48" y1="1570" x2="110" y2="1570" stroke="{DARK}" stroke-width="3.2" marker-end="url(#m-dark)"/>')
    g.text(120, 1576, "flujo local", 23, False, DARK)
    g.add(f'<line x1="430" y1="1570" x2="492" y2="1570" stroke="{ORANGE}" stroke-width="3.2" stroke-dasharray="8 6" marker-end="url(#m-orange)"/>')
    g.text(504, 1576, "excepción / internet", 23, False, DARK)
    g.text(48, 1624, "Ruta de mostrador: /pedidos/rapido  ·  El cierre local sigue si Firestore no responde.", 23, False, MUTED)
    return g, W, H


# ──────────────────────────────────────────────────────────────────────────
# FIGURA 8 — Estados del pedido
# ──────────────────────────────────────────────────────────────────────────
def fig08() -> tuple[SVG, int, int]:
    H = 1500
    g = SVG(W, H)

    g.zone(250, 40, 990, 1088, "Estados", "camino principal", GREEN_BG, GREEN)

    st_w, st_h = 360, 130
    sx = 510
    rec = g.box(sx, 90, st_w, st_h, "RECIBIDO", "pedido registrado", GREEN, GREEN_BG)
    enp = g.box(sx, 320, st_w, st_h, "EN_PROCESO", "lavado / planchado", GREEN, GREEN_BG)
    lis = g.box(sx, 550, st_w, st_h, "LISTO", "espera al cliente", GREEN, GREEN_BG)
    entg = g.box(sx, 980, st_w, st_h, "ENTREGADO", "salida", GREEN, GREEN_BG)
    can = g.box(1320, 320, st_w, st_h, "CANCELADO", "solo el Gerente", RED, RED_BG)

    # Camino principal
    g.arrow([rec["s"], enp["n"]])
    g.label(700, 268, "Marcar en proceso", 26)
    g.arrow([enp["s"], lis["n"]])
    g.label(700, 498, "Marcar listo", 26)

    # Atajo RECIBIDO → LISTO por la izquierda, etiqueta HORIZONTAL
    g.arrow([
        rec["we"],
        (360, rec["cy"]),
        (360, lis["cy"]),
        lis["we"],
    ])
    g.label(360, 400, "Marcar listo", 26, DARK, "middle")
    g.label(360, 428, "directo", 23, MUTED, "middle")

    # Bus de cancelación a la derecha (tres entradas distintas a CANCELADO)
    bus_x = 1180
    g.arrow([
        rec["e"],
        (bus_x, rec["cy"]),
        (bus_x, can["cy"] - 40),
        (can["we"][0], can["cy"] - 40),
    ], color=RED, dashed=True, marker="m-red")
    g.arrow([enp["e"], can["we"]], color=RED, dashed=True, marker="m-red")
    g.arrow([
        lis["e"],
        (bus_x, lis["cy"]),
        (bus_x, can["cy"] + 40),
        (can["we"][0], can["cy"] + 40),
    ], color=RED, dashed=True, marker="m-red")
    g.label(1000, 168, "Cancelar pedido", 26, RED)
    g.label(1008, 304, "Cancelar pedido", 26, RED)
    g.label(1000, 598, "Cancelar pedido", 26, RED)

    # LISTO → ENTREGADO, tres caminos
    # 1 sólida centro
    g.arrow([lis["s"], entg["n"]])
    g.label(700, 800, "Entregar  [saldo = 0]", 26, DARK)
    # 2 punteada naranja, izquierda
    g.arrow([
        (lis["x"] + 50, lis["s"][1]),
        (lis["x"] + 50, 780),
        (440, 780),
        (440, entg["cy"]),
        entg["we"],
    ], color=ORANGE, dashed=True, marker="m-orange")
    g.label(268, 770, "Cambio manual", 26, ORANGE, "start")
    g.label(268, 798, "de estado", 26, ORANGE, "start")
    # 3 punteada naranja, derecha — confirmado en código: sí pasa a ENTREGADO
    g.arrow([
        (lis["x"] + lis["w"] - 50, lis["s"][1]),
        (lis["x"] + lis["w"] - 50, 820),
        (980, 820),
        (980, entg["cy"]),
        entg["e"],
    ], color=ORANGE, dashed=True, marker="m-orange")
    g.label(1000, 808, "Entrega parcial que", 26, ORANGE, "start")
    g.label(1000, 836, "completa todas las prendas", 26, ORANGE, "start")

    g.note(
        430, 1140, 1330, 140,
        "Nota",
        [
            "Los caminos punteados no validan el saldo pendiente (confirmado en el código del prototipo).",
            "La entrega parcial sí exige un abono si hay saldo, pero no exige que ese abono deje el saldo en cero.",
        ],
        ORANGE, ORANGE_BG,
    )

    g.rect(30, 1310, 1740, 160, "#ffffff", "#94a3b8", sw=2, rx=12)
    g.text(48, 1348, "Convenciones", 26, True, DARK)
    g.rect(48, 1370, 28, 20, GREEN_BG, GREEN, sw=2, rx=4)
    g.text(88, 1388, "Estado del pedido", 23)
    g.rect(380, 1370, 28, 20, RED_BG, RED, sw=2, rx=4)
    g.text(420, 1388, "Cancelación (solo Gerente)", 23)
    g.add(f'<line x1="820" y1="1380" x2="890" y2="1380" stroke="{DARK}" stroke-width="3.2" marker-end="url(#m-dark)"/>')
    g.text(900, 1388, "valida saldo = 0", 23)
    g.add(f'<line x1="1200" y1="1380" x2="1270" y2="1380" stroke="{ORANGE}" stroke-width="3.2" stroke-dasharray="8 6" marker-end="url(#m-orange)"/>')
    g.text(1280, 1388, "no valida el saldo", 23)
    g.add(f'<line x1="48" y1="1434" x2="118" y2="1434" stroke="{RED}" stroke-width="3.2" stroke-dasharray="8 6" marker-end="url(#m-red)"/>')
    g.text(128, 1440, "cancelar desde RECIBIDO, EN_PROCESO o LISTO", 23)
    return g, W, H


# ──────────────────────────────────────────────────────────────────────────
def export_png(svg_path: Path, png_path: Path, w: int, h: int) -> None:
    html_path = svg_path.with_suffix(".html")
    svg = svg_path.read_text(encoding="utf-8")
    html_path.write_text(
        "<!DOCTYPE html><html><head><meta charset='utf-8'>"
        "<style>html,body{margin:0;background:#fff;}</style></head>"
        f"<body>{svg}</body></html>",
        encoding="utf-8",
    )
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome", args=["--no-sandbox", "--disable-gpu"])
        page = browser.new_page(viewport={"width": w, "height": h}, device_scale_factor=1.6)
        page.goto(html_path.as_uri(), wait_until="load")
        page.screenshot(path=str(png_path), type="png")
        browser.close()
    html_path.unlink(missing_ok=True)


def make_pdf(pngs: list[Path], pdf_path: Path) -> None:
    images = [Image.open(p).convert("RGB") for p in pngs]
    images[0].save(pdf_path, save_all=True, append_images=images[1:], resolution=150)


def main() -> None:
    specs = [
        ("fig01", fig01),
        ("fig02", fig02),
        ("fig06", fig06),
        ("fig07", fig07),
        ("fig08", fig08),
    ]
    pngs = []
    for name, fn in specs:
        g, w, h = fn()
        assert w == 1800
        ratio = h / w
        limit = 1.25 if name == "fig06" else 1.0
        print(f"{name}: {w}x{h}  ratio={ratio:.3f}  limit={limit}")
        if ratio > limit + 1e-6:
            raise SystemExit(f"{name} exceeds aspect ratio {limit}")
        svg_path = OUT / f"{name}.svg"
        png_path = OUT / f"{name}.png"
        g.save(svg_path)
        export_png(svg_path, png_path, w, h)
        pngs.append(png_path)
        print(f"  wrote {svg_path.name} {png_path.name}")
    pdf_path = OUT / "figuras-revision.pdf"
    make_pdf(pngs, pdf_path)
    print("PDF", pdf_path)


if __name__ == "__main__":
    main()
