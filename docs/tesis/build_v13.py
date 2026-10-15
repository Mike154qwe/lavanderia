#!/usr/bin/env python3
"""Build v13: figuras 1, 2, 5, 6, 7 y 8 nuevas + bind 127.0.0.1 + pulido NTC 1486."""
from __future__ import annotations

import re
import shutil
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path
from xml.sax.saxutils import escape

from PIL import Image

ROOT = Path("/workspace")
SRC = ROOT / "docs/tesis/Trabajo_de_Grado_La_Manuelita_v12.odt"
WORK = Path("/tmp/odt-v13")
OUT = ROOT / "docs/tesis"
DIAG = ROOT / "docs/diagramas-tesis"

LISTA_NTC_STYLES = """
<style:style style:name="ListaNTC1" style:family="paragraph" style:parent-style-name="Normal">
  <style:paragraph-properties fo:text-align="start" fo:margin-left="0in" fo:margin-right="0in" fo:margin-top="0.02in" fo:margin-bottom="0in" fo:text-indent="0in" fo:line-height="108%" fo:keep-together="always">
    <style:tab-stops>
      <style:tab-stop style:type="right" style:leader-style="dotted" style:leader-text="." style:position="6.70in"/>
    </style:tab-stops>
  </style:paragraph-properties>
  <style:text-properties style:font-name="Arial" fo:font-size="12pt" fo:font-weight="bold" fo:hyphenate="false"/>
</style:style>
<style:style style:name="ListaNTC2" style:family="paragraph" style:parent-style-name="Normal">
  <style:paragraph-properties fo:text-align="start" fo:margin-left="0.28in" fo:margin-right="0in" fo:margin-top="0in" fo:margin-bottom="0in" fo:text-indent="0in" fo:line-height="105%" fo:keep-together="always">
    <style:tab-stops>
      <style:tab-stop style:type="right" style:leader-style="dotted" style:leader-text="." style:position="6.70in"/>
    </style:tab-stops>
  </style:paragraph-properties>
  <style:text-properties style:font-name="Arial" fo:font-size="12pt" fo:font-weight="normal" fo:hyphenate="false"/>
</style:style>
<style:style style:name="ListaIlust" style:family="paragraph" style:parent-style-name="Normal">
  <style:paragraph-properties fo:text-align="start" fo:margin-left="0.30in" fo:margin-right="0in" fo:margin-top="0.02in" fo:margin-bottom="0.02in" fo:text-indent="-0.30in" fo:line-height="115%" fo:keep-together="always">
    <style:tab-stops>
      <style:tab-stop style:type="right" style:leader-style="dotted" style:leader-text="." style:position="6.70in"/>
    </style:tab-stops>
  </style:paragraph-properties>
  <style:text-properties style:font-name="Arial" fo:font-size="12pt" fo:font-weight="normal" fo:hyphenate="false"/>
</style:style>
"""

# Páginas del PDF v13 (92 pp.). Si el pulido NTC no desplaza el cuerpo, se conservan.
TOC = [
    (1, "GLOSARIO", 8),
    (1, "RESUMEN", 10),
    (1, "ABSTRACT", 11),
    (1, "INTRODUCCIÓN", 12),
    (1, "1. GENERALIDADES", 13),
    (2, "1.1 Antecedentes del problema", 13),
    (2, "1.2 Planteamiento del problema", 14),
    (2, "1.3 Justificación", 15),
    (2, "1.4 Objetivos", 16),
    (2, "1.5 Marcos de referencia", 17),
    (2, "1.6 Diseño metodológico", 21),
    (1, "2. CARACTERIZACIÓN DEL PROCESO OPERATIVO", 24),
    (2, "2.1 Instrumentos aplicados", 24),
    (2, "2.2 Caracterización general del negocio", 24),
    (2, "2.3 Flujo del proceso operativo actual", 25),
    (2, "2.4 Puntos críticos identificados", 26),
    (2, "2.5 Matriz de requerimientos", 27),
    (2, "2.6 Línea base de indicadores", 33),
    (2, "2.7 Evidencia", 35),
    (2, "2.8 Análisis de resultados y cumplimiento del objetivo", 35),
    (1, "3. DESARROLLO DEL SEGUNDO OBJETIVO", 37),
    (2, "3.1 Decisión y ajuste de la arquitectura offline-first", 37),
    (2, "3.2 Modelo de datos e infraestructura tecnológica", 39),
    (2, "3.3 Construcción de módulos", 41),
    (2, "3.4 Persistencia local y mecanismo de sincronización", 51),
    (2, "3.5 Protección de datos personales", 52),
    (2, "3.6 Preparación para una eventual operación multi-sede", 53),
    (2, "3.7 Análisis de resultados y cumplimiento del objetivo", 53),
    (1, "4. DESARROLLO DEL TERCER OBJETIVO", 55),
    (2, "4.1 Diseño de la validación", 55),
    (2, "4.2 Pruebas funcionales", 57),
    (2, "4.3 Tiempo de registro de pedidos", 59),
    (2, "4.4 Tiempo de cierre de caja", 62),
    (2, "4.5 Trazabilidad de los pedidos", 63),
    (2, "4.6 Satisfacción del usuario", 65),
    (2, "4.7 Análisis de resultados y cumplimiento del objetivo", 66),
    (1, "5. CONCLUSIONES", 68),
    (1, "6. RECOMENDACIONES", 70),
    (1, "BIBLIOGRAFÍA", 72),
    (1, "ANEXOS", 76),
]

TABLAS = [
    (1, "Tabla 1. Matriz comparativa del estado del arte", 19),
    (2, "Tabla 2. Indicadores clave de desempeño (KPI)", 23),
    (3, "Tabla 3. Matriz de requerimientos funcionales y no funcionales", 28),
    (4, "Tabla 4. Tarifario de servicios — Lavaseco La Manuelita", 31),
    (5, "Tabla 5. Línea base medida — reemplaza la línea base declarada", 33),
    (6, "Tabla 6. Modelo de datos del prototipo", 39),
    (7, "Tabla 7. Estado de los módulos del prototipo", 42),
    (8, "Tabla 8. Controles de seguridad y protección de datos del prototipo", 52),
    (9, "Tabla 9. Instrumentos aplicados en la validación del prototipo", 56),
    (10, "Tabla 10. Resultados de los casos de prueba funcional", 57),
    (11, "Tabla 11. Tiempo de registro de un pedido: línea base vs. prototipo", 60),
    (12, "Tabla 12. Medio de entrega del soporte al cliente y su efecto en el tiempo de registro", 61),
    (13, "Tabla 13. Cierres de caja cronometrados con el prototipo", 62),
    (14, "Tabla 14. Causas de las confusiones de pedidos: línea base vs. prototipo", 63),
    (15, "Tabla 15. Resultados del cuestionario SUS por participante", 65),
    (16, "Tabla 16. Cumplimiento de los indicadores del tercer objetivo", 66),
]

FIGURAS = [
    (1, "Figura 1. Flujo del proceso operativo actual — Lavaseco La Manuelita", 25),
    (2, "Figura 2. Diagrama de casos de uso — Lavaseco La Manuelita", 28),
    (3, "Figura 3. Causas de confusión de pedidos — Lavaseco La Manuelita", 34),
    (4, "Figura 4. Línea base declarada vs. medida — Lavaseco La Manuelita", 35),
    (5, "Figura 5. Arquitectura de despliegue local-first — Lavaseco La Manuelita", 39),
    (6, "Figura 6. Diagrama entidad-relación del prototipo — Lavaseco La Manuelita", 41),
    (7, "Figura 7. Proceso operativo con el prototipo — Lavaseco La Manuelita", 43),
    (8, "Figura 8. Diagrama de estados del pedido — Lavaseco La Manuelita", 44),
    (9, "Figura 9. Acceso al sistema — portal de empleado y panel de gerente (RNF04)", 44),
    (10, "Figura 10. Pedido rápido — paso 1: datos del cliente (RF01)", 45),
    (11, "Figura 11. Panel financiero — indicadores del día y calendario de movimientos (RF09)", 45),
    (12, "Figura 12. Cierre de caja en el panel financiero, con ganancia neta y efectivo en caja separados (RF09)", 46),
    (13, "Figura 13. Pedidos con más de tres meses en piso (RF11)", 46),
    (14, "Figura 14. Inventario en piso, con filtros y acceso a escaneo de código de barras (RF06, RF03)", 47),
    (15, "Figura 15. Detalle de pedido — prendas, abono y cambio de estado (RF03, RF04)", 47),
    (16, "Figura 16. Recibo con código de barras generado por el sistema (vista imprimible)", 48),
    (17, "Figura 17. Panel remoto de la gerente, con conexión disponible", 49),
    (18, "Figura 18. Panel remoto de la gerente, sin conexión (modo avión)", 50),
    (19, "Figura 19. Tiempo de registro y de cierre de caja: línea base vs. prototipo, frente a la meta de reducción del 40 %", 60),
]

ANEXOS = [
    ("A", "Anexo A. Formato de recibo físico actual (nombres y teléfonos anonimizados)", 76),
    ("B", "Anexo B. Página del cuaderno de salidas — recibos tachados al retirarse el pedido", 77),
    ("C", "Anexo C. Página del cuaderno de entradas — recibos No. 33791–33819 (anonimizado)", 78),
    ("D", "Anexo D. Página del cuaderno de entradas — recibos No. 33767–33790 (anonimizado)", 78),
    ("E", "Anexo E. Guion de la entrevista semiestructurada aplicada a la gerente", 79),
    ("F", "Anexo F. Carta de autorización del negocio, firmada el 10 de septiembre de 2026", 79),
    ("G", "Anexo G. Registro técnico de verificaciones y correcciones del prototipo", 81),
    ("H", "Anexo H. Cuestionario SUS y preguntas abiertas aplicados a los usuarios", 89),
    ("I", "Anexo I. Bitácora de confusiones de pedidos (8 al 30 de septiembre de 2026)", 90),
    ("J", "Anexo J. Reporte de ejecución de las pruebas funcionales (13 y 14 de octubre de 2026)", 91),
    ("K", "Anexo K. Registros de cronometraje de la validación", 92),
]


def copy_png(src: Path, dest: Path) -> None:
    im = Image.open(src).convert("RGB")
    dest.parent.mkdir(parents=True, exist_ok=True)
    im.save(dest, "PNG", optimize=True)


def size_in(path: Path, max_w: float = 6.50, max_h: float = 8.20) -> tuple[float, float]:
    im = Image.open(path)
    w, h = im.size
    wi, hi = w / 144.0, h / 144.0
    scale = min(max_w / wi, max_h / hi, 1.0)
    return wi * scale, hi * scale


def update_frame(xml: str, href: str, w: float, h: float) -> str:
    needle = f'xlink:href="{href}"'
    i = xml.find(needle)
    if i < 0:
        raise SystemExit(f"href not found: {href}")
    start = xml.rfind("<draw:frame", 0, i)
    end = xml.find("</draw:frame>", i)
    if start < 0 or end < 0:
        raise SystemExit(f"frame not found for {href}")
    frame = xml[start:end]
    frame = re.sub(r'svg:width="[^"]+"', f'svg:width="{w:.4f}in"', frame, count=1)
    frame = re.sub(r'svg:height="[^"]+"', f'svg:height="{h:.4f}in"', frame, count=1)
    return xml[:start] + frame + xml[end:]


def item_xml(style: str, title: str, page: int) -> str:
    return (
        f'<text:p text:style-name="{style}">'
        f"{escape(title)}<text:tab/>{page}</text:p>"
    )


def polish_ntc(xml: str) -> str:
    if LISTA_NTC_STYLES.strip() not in xml:
        xml = xml.replace(
            "</office:automatic-styles>",
            LISTA_NTC_STYLES + "</office:automatic-styles>",
            1,
        )
    xml = xml.replace(
        'style:name="P82" style:parent-style-name="Normal" style:family="paragraph"><style:paragraph-properties fo:text-align="center" fo:margin-top="0.25in" fo:margin-bottom="0.1666in"/>',
        'style:name="P82" style:parent-style-name="Normal" style:family="paragraph"><style:paragraph-properties fo:text-align="center" fo:margin-top="0.18in" fo:margin-bottom="0.08in"/>',
        1,
    )

    toc_xml = "".join(
        item_xml("ListaNTC1" if level == 1 else "ListaNTC2", title, page)
        for level, title, page in TOC
    )
    toc_pat = re.compile(
        r'<text:table-of-content text:name="_TOC0">.*?</text:table-of-content>',
        re.S,
    )
    if not toc_pat.search(xml):
        raise SystemExit("TOC _TOC0 not found")
    xml = toc_pat.sub(toc_xml, xml, count=1)

    def replace_list(heading_style: str, heading_text: str, items: list[tuple], xml: str) -> str:
        heading = (
            f'<text:p text:style-name="{heading_style}">'
            f'<text:span text:style-name="T{heading_style[1:]}">{heading_text}</text:span></text:p>'
        )
        # heading styles: P84/T85, P86/T87, P88/T89 — keep the original heading paragraph
        start = xml.find(f">{heading_text}</text:span></text:p>")
        if start < 0:
            raise SystemExit(f"heading not found: {heading_text}")
        para_start = xml.find("<text:p text:style-name=\"Normal\">", start)
        para_end = xml.find("</text:p>", para_start)
        if para_start < 0 or para_end < 0:
            raise SystemExit(f"list paragraph not found after {heading_text}")
        body = "".join(item_xml("ListaIlust", title, page) for _, title, page in items)
        return xml[:para_start] + body + xml[para_end + len("</text:p>") :]

    # TABLAS / FIGURAS tuples are (n, title, page); ANEXOS are (letter, title, page)
    xml = replace_list("P84", "LISTA DE TABLAS", [(n, t, p) for n, t, p in TABLAS], xml)
    xml = replace_list("P86", "LISTA DE FIGURAS", [(n, t, p) for n, t, p in FIGURAS], xml)
    xml = replace_list("P88", "LISTA DE ANEXOS", [(n, t, p) for n, t, p in ANEXOS], xml)
    return xml


def main() -> None:
    if WORK.exists():
        shutil.rmtree(WORK)
    WORK.mkdir()
    with zipfile.ZipFile(SRC) as z:
        z.extractall(WORK)

    media = WORK / "media"
    mapping = {
        "image1.png": DIAG / "fig01.png",
        "image2.png": DIAG / "fig02.png",
        "image5.png": DIAG / "referencia-estilo.png",
        "image6.png": DIAG / "fig06.png",
        "image7.png": DIAG / "fig07.png",
        "image8.png": DIAG / "fig08.png",
    }
    for name, src in mapping.items():
        copy_png(src, media / name)

    xml_path = WORK / "content.xml"
    xml = xml_path.read_text(encoding="utf-8")

    for name in mapping:
        w, h = size_in(media / name)
        xml = update_frame(xml, f"media/{name}", w, h)
        print(name, f"{w:.2f}x{h:.2f}in")

    xml = xml.replace(
        "l proceso del servidor se reconfiguró para escuchar únicamente en la interfaz local (127.0.0.1), lo que cierra esa exposición en el equipo de despliegue.",
        "l proceso del servidor se configuró para escuchar únicamente en la interfaz local (127.0.0.1) mediante next start -H 127.0.0.1 en la configuración de PM2, de modo que el puerto 3000 no queda abierto en la red local ni en internet.",
        1,
    )

    xml = xml.replace(
        "Figura 12. Historial de cierres de caja, con ganancia neta y efectivo en caja (RF09)",
        "Figura 12. Cierre de caja en el panel financiero, con ganancia neta y efectivo en caja separados (RF09)",
        1,
    )

    xml = xml.replace(
        ". Diagrama de estados del pedido — Lavaseco La Manuelita. Elaboración propia.",
        ". Diagrama de estados del pedido — Lavaseco La Manuelita. Elaboración propia. Incluye el atajo RECIBIDO a LISTO, la cancelación y los tres caminos a ENTREGADO.",
        1,
    )

    xml = polish_ntc(xml)

    leftovers = [
        "[confirmar]",
        "[completar]",
        "a la fecha de este avance",
        "el reportes",
        "pendiente de confirmación formal",
        "Uso de herramientas de inteligencia artificial",
        "_TOC0",
    ]
    for s in leftovers:
        n = xml.count(s)
        if n:
            print("WARN leftover", s, n)

    if "configuración de PM2" not in xml:
        raise SystemExit("127.0.0.1 annex sentence not replaced")
    if "tres caminos a ENTREGADO" not in xml:
        raise SystemExit("fig 8 caption not replaced")
    if "ListaNTC1" not in xml or "_TOC0" in xml:
        raise SystemExit("NTC TOC not replaced")
    if xml.count("ListaIlust") < 40:
        raise SystemExit(f"illustration list too short: {xml.count('ListaIlust')}")

    xml_path.write_text(xml, encoding="utf-8")
    ET.fromstring(xml)
    print("content.xml valid", len(xml))

    fig_out = OUT / "figuras"
    fig_out.mkdir(parents=True, exist_ok=True)
    for n, src_name in [
        (1, "image1.png"),
        (2, "image2.png"),
        (5, "image5.png"),
        (6, "image6.png"),
        (7, "image7.png"),
        (8, "image8.png"),
    ]:
        shutil.copy2(media / src_name, fig_out / f"figura{n:02d}.png")

    out_odt = OUT / "Trabajo_de_Grado_La_Manuelita_v13.odt"
    if out_odt.exists():
        out_odt.unlink()
    with zipfile.ZipFile(out_odt, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("mimetype", (WORK / "mimetype").read_bytes(), compress_type=zipfile.ZIP_STORED)
        for p in WORK.rglob("*"):
            if p.is_file() and p.name != "mimetype":
                z.write(p, p.relative_to(WORK).as_posix())
    print("wrote", out_odt, out_odt.stat().st_size)


if __name__ == "__main__":
    main()
