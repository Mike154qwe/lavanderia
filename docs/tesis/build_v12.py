#!/usr/bin/env python3
"""Build Trabajo_de_Grado_La_Manuelita_v12.odt from v11 + v9 captures + corrected diagrams."""
from __future__ import annotations

import shutil
import zipfile
from io import BytesIO
from pathlib import Path
from PIL import Image

ROOT = Path("/workspace")
SRC_ODT = Path("/home/ubuntu/.cursor/projects/workspace/uploads/Trabajo_de_Grado_La_Manuelita_v11_5451.odt")
WORK = Path("/tmp/odt-v12")
OUT_DIR = ROOT / "docs/tesis"
FIG = Path("/tmp/diagrams")
V9 = Path("/tmp/v9-imgs")
ANX = Path("/tmp/anexos-v12")

ANX.mkdir(exist_ok=True)


def copy_png(src: Path, dest: Path) -> None:
    im = Image.open(src).convert("RGB")
    dest.parent.mkdir(parents=True, exist_ok=True)
    im.save(dest, "PNG", optimize=True)


def frame_xml(name: str, href: str, width_in: float, height_in: float) -> str:
    return (
        f'<text:p text:style-name="Normal"><draw:frame draw:style-name="a0" '
        f'draw:name="{name}" text:anchor-type="as-char" svg:x="0in" svg:y="0in" '
        f'svg:width="{width_in:.4f}in" svg:height="{height_in:.4f}in" '
        f'style:rel-width="scale" style:rel-height="scale">'
        f'<draw:image xlink:href="{href}" xlink:type="simple" xlink:show="embed" '
        f'xlink:actuate="onLoad"/><svg:title/><svg:desc/></draw:frame></text:p>'
    )


def size_in(path: Path, max_w: float = 6.5, max_h: float = 8.5) -> tuple[float, float]:
    im = Image.open(path)
    w, h = im.size
    dpi = 144.0
    wi, hi = w / dpi, h / dpi
    scale = min(max_w / wi, max_h / hi, 1.0)
    return wi * scale, hi * scale


def main() -> None:
    if WORK.exists():
        shutil.rmtree(WORK)
    WORK.mkdir()
    with zipfile.ZipFile(SRC_ODT) as z:
        z.extractall(WORK)

    media = WORK / "media"
    # diagrams
    copy_png(FIG / "fig2c.png", media / "image2.png")
    copy_png(FIG / "fig5c.png", media / "image5.png")
    copy_png(FIG / "fig6c.png", media / "image6.png")
    copy_png(FIG / "fig7c.png", media / "image7.png")
    # screenshots from v9 (sistema actualizado)
    copy_png(V9 / "p001_06_1831x551.png", media / "image9.png")
    copy_png(V9 / "p001_07_1830x1113.png", media / "image10.png")
    copy_png(V9 / "p001_08_1830x1113.png", media / "image11.png")
    copy_png(V9 / "p001_09_1688x1025.png", media / "image12.png")
    copy_png(V9 / "p001_10_1830x1113.png", media / "image13.png")
    copy_png(V9 / "p001_11_1352x822.png", media / "image14.png")
    copy_png(V9 / "p001_12_1232x1113.png", media / "image15.png")
    # annex photos
    mapping = {
        20: V9 / "p001_17_813x1100.png",
        21: V9 / "p001_18_899x1599.png",
        22: V9 / "p001_19_899x1599.png",
        23: V9 / "p001_20_938x1140.png",
        24: V9 / "p001_21_850x1100.png",
    }
    for n, src in mapping.items():
        copy_png(src, media / f"image{n}.png")
        shutil.copy2(src, ANX / src.name)

    xml_path = WORK / "content.xml"
    xml = xml_path.read_text(encoding="utf-8")

    # --- TOC body ---
    old_toc_body = (
        "<text:p text:style-name=\"Normal\">INTRODUCCIÓN<text:line-break/>1. GENERALIDADES"
        "<text:line-break/>2. CARACTERIZACIÓN DEL PROCESO OPERATIVO DE LAVASECO LA MANUELITA"
        "<text:line-break/>3. DESARROLLO DEL SEGUNDO OBJETIVO<text:line-break/>4. DESARROLLO DEL TERCER OBJETIVO"
        "<text:line-break/>5. CONCLUSIONES<text:line-break/>6. RECOMENDACIONES"
        "<text:line-break/>BIBLIOGRAFÍA<text:line-break/>ANEXOS</text:p>"
    )
    new_toc_body = (
        "<text:p text:style-name=\"Normal\">INTRODUCCIÓN"
        "<text:line-break/>1. GENERALIDADES"
        "<text:line-break/>1.1 Antecedentes del problema"
        "<text:line-break/>1.2 Planteamiento del problema"
        "<text:line-break/>1.3 Justificación"
        "<text:line-break/>1.4 Objetivos"
        "<text:line-break/>1.5 Marcos de referencia"
        "<text:line-break/>1.6 Diseño metodológico"
        "<text:line-break/>2. CARACTERIZACIÓN DEL PROCESO OPERATIVO DE LAVASECO LA MANUELITA"
        "<text:line-break/>2.1 Instrumentos aplicados"
        "<text:line-break/>2.2 Caracterización general del negocio"
        "<text:line-break/>2.3 Flujo del proceso operativo actual"
        "<text:line-break/>2.4 Puntos críticos identificados"
        "<text:line-break/>2.5 Matriz de requerimientos"
        "<text:line-break/>2.6 Línea base de indicadores"
        "<text:line-break/>2.7 Evidencia"
        "<text:line-break/>2.8 Análisis de resultados y cumplimiento del objetivo"
        "<text:line-break/>3. DESARROLLO DEL SEGUNDO OBJETIVO"
        "<text:line-break/>3.1 Decisión y ajuste de la arquitectura offline-first"
        "<text:line-break/>3.2 Modelo de datos e infraestructura tecnológica"
        "<text:line-break/>3.3 Construcción de módulos"
        "<text:line-break/>3.4 Persistencia local y mecanismo de sincronización"
        "<text:line-break/>3.5 Protección de datos personales"
        "<text:line-break/>3.6 Preparación para una eventual operación multi-sede"
        "<text:line-break/>3.7 Análisis de resultados y cumplimiento del objetivo"
        "<text:line-break/>4. DESARROLLO DEL TERCER OBJETIVO"
        "<text:line-break/>4.1 Diseño de la validación"
        "<text:line-break/>4.2 Pruebas funcionales"
        "<text:line-break/>4.3 Tiempo de registro de pedidos"
        "<text:line-break/>4.4 Tiempo de cierre de caja"
        "<text:line-break/>4.5 Trazabilidad de los pedidos"
        "<text:line-break/>4.6 Satisfacción del usuario"
        "<text:line-break/>4.7 Análisis de resultados y cumplimiento del objetivo"
        "<text:line-break/>5. CONCLUSIONES"
        "<text:line-break/>6. RECOMENDACIONES"
        "<text:line-break/>BIBLIOGRAFÍA"
        "<text:line-break/>ANEXOS</text:p>"
    )
    if old_toc_body not in xml:
        raise SystemExit("TOC body not found")
    xml = xml.replace(old_toc_body, new_toc_body, 1)

    old_tabs = (
        "<text:p text:style-name=\"Normal\">Tabla 1. Matriz comparativa del estado del arte"
        "<text:line-break/>Tabla 2. Indicadores clave de desempeño (KPI)"
        "<text:line-break/>Tabla 3. Matriz de requerimientos funcionales y no funcionales"
        "<text:line-break/>Tabla 4. Tarifario de servicios — Lavaseco La Manuelita"
        "<text:line-break/>Tabla 5. Línea base medida — reemplaza la línea base declarada"
        "<text:line-break/>Tabla 6. Modelo de datos del prototipo"
        "<text:line-break/>Tabla 7. Estado de los módulos del prototipo</text:p>"
    )
    new_tabs = (
        "<text:p text:style-name=\"Normal\">Tabla 1. Matriz comparativa del estado del arte"
        "<text:line-break/>Tabla 2. Indicadores clave de desempeño (KPI)"
        "<text:line-break/>Tabla 3. Matriz de requerimientos funcionales y no funcionales"
        "<text:line-break/>Tabla 4. Tarifario de servicios — Lavaseco La Manuelita"
        "<text:line-break/>Tabla 5. Línea base medida — reemplaza la línea base declarada"
        "<text:line-break/>Tabla 6. Modelo de datos del prototipo"
        "<text:line-break/>Tabla 7. Estado de los módulos del prototipo"
        "<text:line-break/>Tabla 8. Controles de seguridad y protección de datos del prototipo"
        "<text:line-break/>Tabla 9. Instrumentos aplicados en la validación del prototipo"
        "<text:line-break/>Tabla 10. Resultados de los casos de prueba funcional"
        "<text:line-break/>Tabla 11. Tiempo de registro de un pedido: línea base vs. prototipo"
        "<text:line-break/>Tabla 12. Medio de entrega del soporte al cliente y su efecto en el tiempo de registro"
        "<text:line-break/>Tabla 13. Cierres de caja cronometrados con el prototipo"
        "<text:line-break/>Tabla 14. Causas de las confusiones de pedidos: línea base vs. prototipo"
        "<text:line-break/>Tabla 15. Resultados del cuestionario SUS por participante"
        "<text:line-break/>Tabla 16. Cumplimiento de los indicadores del tercer objetivo</text:p>"
    )
    if old_tabs not in xml:
        raise SystemExit("lista tablas not found")
    xml = xml.replace(old_tabs, new_tabs, 1)

    # lista de figuras: from Figura 1 ... to before LISTA DE ANEXOS heading is a single Normal p
    i = xml.find("Figura 1. Flujo del proceso operativo actual — Lavaseco La Manuelita")
    j = xml.find("</text:p>", i)
    old_figs = xml[xml.rfind("<text:p", 0, i): j + 9]
    new_figs = (
        "<text:p text:style-name=\"Normal\">"
        "Figura 1. Flujo del proceso operativo actual — Lavaseco La Manuelita"
        "<text:line-break/>Figura 2. Diagrama de casos de uso — Lavaseco La Manuelita"
        "<text:line-break/>Figura 3. Causas de confusión de pedidos — Lavaseco La Manuelita"
        "<text:line-break/>Figura 4. Línea base declarada vs. medida — Lavaseco La Manuelita"
        "<text:line-break/>Figura 5. Arquitectura de despliegue local-first — Lavaseco La Manuelita"
        "<text:line-break/>Figura 6. Diagrama entidad-relación del prototipo — Lavaseco La Manuelita"
        "<text:line-break/>Figura 7. Proceso operativo con el prototipo — Lavaseco La Manuelita"
        "<text:line-break/>Figura 8. Diagrama de estados del pedido — Lavaseco La Manuelita"
        "<text:line-break/>Figura 9. Acceso al sistema — portal de empleado y panel de gerente (RNF04)"
        "<text:line-break/>Figura 10. Pedido rápido — paso 1: datos del cliente (RF01)"
        "<text:line-break/>Figura 11. Panel financiero — indicadores del día y calendario de movimientos (RF09)"
        "<text:line-break/>Figura 12. Historial de cierres de caja, con ganancia neta y efectivo en caja (RF09)"
        "<text:line-break/>Figura 13. Pedidos con más de tres meses en piso (RF11)"
        "<text:line-break/>Figura 14. Inventario en piso, con filtros y acceso a escaneo de código de barras (RF06, RF03)"
        "<text:line-break/>Figura 15. Detalle de pedido — prendas, abono y cambio de estado (RF03, RF04)"
        "<text:line-break/>Figura 16. Recibo con código de barras generado por el sistema (vista imprimible)"
        "<text:line-break/>Figura 17. Panel remoto de la gerente, con conexión disponible"
        "<text:line-break/>Figura 18. Panel remoto de la gerente, sin conexión (modo avión)"
        "<text:line-break/>Figura 19. Tiempo de registro y de cierre de caja: línea base vs. prototipo, frente a la meta de reducción del 40 %"
        "</text:p>"
    )
    xml = xml.replace(old_figs, new_figs, 1)

    i = xml.find("Anexo A. Formato de recibo físico utilizado actualmente por Lavaseco La Manuelita")
    j = xml.find("</text:p>", i)
    old_anx = xml[xml.rfind("<text:p", 0, i): j + 9]
    new_anx = (
        "<text:p text:style-name=\"Normal\">"
        "Anexo A. Formato de recibo físico utilizado actualmente por Lavaseco La Manuelita (nombre y teléfono anonimizados)."
        "<text:line-break/>Anexo B. Página del cuaderno de salidas — registro de recibos tachados al retirarse el pedido del piso (sin datos personales)."
        "<text:line-break/>Anexo C. Página del cuaderno de entradas — registro consolidado de pedidos recibidos (recibos No. 33791–33819), con nombres de clientes anonimizados."
        "<text:line-break/>Anexo D. Página del cuaderno de entradas — registro consolidado de pedidos recibidos (recibos No. 33767–33790), con nombres de clientes anonimizados."
        "<text:line-break/>Anexo E. Guion de la entrevista semiestructurada aplicada a la gerente. Documento completo adjunto por separado (Anexo_E_Guion_Entrevista_Semiestructurada.docx)."
        "<text:line-break/>Anexo F. Carta de autorización del negocio para el uso de su información en el trabajo de grado, firmada por la gerente Helena del Carmen Contreras el 10 de septiembre de 2026."
        "<text:line-break/>Anexo G. Registro técnico de verificaciones y correcciones durante la construcción del prototipo."
        "<text:line-break/>Anexo H. Cuestionario SUS y preguntas abiertas aplicados a los usuarios del prototipo."
        "<text:line-break/>Anexo I. Bitácora de confusiones de pedidos registradas durante la validación (8 al 30 de septiembre de 2026)."
        "<text:line-break/>Anexo J. Reporte de ejecución de las pruebas funcionales (13 y 14 de octubre de 2026), adjunto por separado."
        "<text:line-break/>Anexo K. Registros de cronometraje de la validación, adjuntos por separado (Anexo_K_Datos_validacion.xlsx)."
        "</text:p>"
    )
    xml = xml.replace(old_anx, new_anx, 1)

    # ética
    a = "Uno de los autores pertenece a la familia propietaria del negocio<text:s/></text:span><text:span text:style-name=\"T754\">[confirmar]</text:span><text:span text:style-name=\"T755\">, y dos de los participantes de la validación —la gerente y el encargado del cierre de caja— son familiares directos suyos."
    if a not in xml:
        raise SystemExit("ethics fragment not found")
    xml = xml.replace(
        a,
        "Uno de los autores, Mike Anderson Villarreal Agudelo, tiene parentesco con la familia propietaria del negocio: la gerente, Helena del Carmen Contreras, es su abuela. El otro autor, Joel David Marín Galindo, no tiene parentesco con el negocio ni con su personal. Dos de los participantes de la validación —la gerente y el encargado del cierre de caja— son familiares de aquel autor.",
        1,
    )
    xml = xml.replace(
        "Los participantes fueron informados del propósito del trabajo y aceptaron participar<text:s/></text:span><text:span text:style-name=\"T757\">[confirmar el consentimiento de los empleados]</text:span><text:span text:style-name=\"T758\">, y los datos personales de los clientes se protegieron conforme a la Ley 1581 de 2012.",
        "Los participantes fueron informados del propósito del trabajo y aceptaron participar en la reunión del 30 de junio de 2026, en la que estuvieron la gerente y el personal del local; el consentimiento fue verbal. Los datos personales de los clientes se protegieron conforme a la Ley 1581 de 2012.",
        1,
    )
    # delete AI paragraph: from its heading to the following table 2 heading... find unique block
    ai_start = xml.find("Uso de herramientas de inteligencia artificial.")
    if ai_start < 0:
        raise SystemExit("AI para not found")
    p_start = xml.rfind("<text:p", 0, ai_start)
    p_end = xml.find("</text:p>", ai_start) + len("</text:p>")
    xml = xml[:p_start] + xml[p_end:]

    xml = xml.replace(
        "El uso de la información del negocio para este trabajo se realizó con la autorización escrita de la gerente (Anexo F), y los soportes físicos incluidos como anexos se presentan anonimizados.",
        "El uso de la información del negocio se autorizó de palabra en la entrevista del 30 de junio de 2026 y se formalizó por escrito el 10 de septiembre de 2026 (Anexo F), dos días después de iniciado el periodo de validación. Los soportes físicos incluidos como anexos se presentan anonimizados.",
        1,
    )

    xml = xml.replace(
        "y queda pendiente de confirmación explícita en una futura sesión de validación con la gerente.",
        ". La gerente confirmó que este requerimiento corresponde a lo que pidió.",
        1,
    )
    xml = xml.replace(
        "Solicitud explícita de la gerente (entrevista del 30 de junio de 2026); pendiente de confirmación formal",
        "Solicitud explícita de la gerente (entrevista del 30 de junio de 2026); confirmada posteriormente por ella",
        1,
    )
    xml = xml.replace(
        "El requerimiento RF11, surgido de una profundización posterior de la misma entrevista, queda pendiente de esa misma confirmación formal y se reporta explícitamente como tal, en lugar de darlo por validado sin evidencia. Con ello, los tres indicadores de la Tabla 2 alcanzan o superan la meta establecida",
        "El requerimiento RF11, surgido de una profundización posterior de la misma entrevista, fue confirmado por la gerente como correspondiente a su solicitud. Con ello, los tres indicadores de la Tabla 2 alcanzan o superan la meta establecida",
        1,
    )

    xml = xml.replace(
        "a la fecha de este avance.",
        "a la fecha de este documento.",
        1,
    )
    xml = xml.replace(
        "con el reportes de ejecución",
        "con el reporte de ejecución",
        1,
    )
    xml = xml.replace(
        "fotografías de páginas del cuaderno de entradas correspondientes a distintas fechas de operación (Anexos B, C y D).",
        "fotografías de páginas del cuaderno de salidas (Anexo B) y del cuaderno de entradas (Anexos C y D).",
        1,
    )
    xml = xml.replace(
        "la cercanía entre los participantes y uno de los autores",
        "la cercanía familiar entre los participantes y uno de los autores",
        1,
    )

    # fig 11 / 12 captions
    xml = xml.replace(
        "Figura 11. Panel financiero — ingresos diarios y pagos por método (RF09 y reportería adicional). Captura del prototipo.",
        "Figura 11. Panel financiero — indicadores del día y calendario de movimientos (RF09 y reportería adicional). Captura del prototipo.",
        1,
    )
    xml = xml.replace(
        "Figura 12. Historial de cierres de caja, con entradas y salidas del día (RF09). Captura del prototipo.",
        "Figura 12. Cierre de caja en el panel financiero, con ganancia neta y efectivo en caja separados (RF09). Captura del prototipo.",
        1,
    )
    old_note = (
        'Nota: el "Cierre #00001" de la Figura 12 mostraba, sobre datos de prueba, un total de caja negativo ($35.000) bajo la fórmula original (efectivo + Nequi + Daviplata + transferencia + tarjeta − gastos). El diagnóstico y la corrección de este comportamiento se completaron durante la construcción, y se documentan en detalle en el numeral 3.3: la causa no era un error de cálculo sino que un solo número intentaba responder dos preguntas distintas (ganancia neta y efectivo físico en caja); la imagen se conserva c</text:span><text:span text:style-name="T2487">omo evidencia del hallazgo original que dio origen a esa corrección.'
    )
    new_note = (
        "Nota: la Figura 12 muestra el cierre #00014, sobre datos de prueba, ya con los dos indicadores separados (ganancia neta $36.420 y efectivo en caja $38.580). El hallazgo original —un único total de caja negativo— se documenta en el numeral 3.3 y en el Anexo G; no se conserva aquí la captura de la interfaz anterior."
    )
    if old_note not in xml:
        raise SystemExit("fig12 note not found")
    xml = xml.replace(old_note, new_note, 1)

    xml = xml.replace(
        ". Historial de cierres de caja, con entradas y salidas del día (RF09). Captura del prototipo.",
        ". Cierre de caja en el panel financiero, con ganancia neta y efectivo en caja separados (RF09). Captura del prototipo.",
        1,
    )
    xml = xml.replace(
        ". Panel financiero — ingresos diarios y pagos por método (RF09 y reportería adicional). Captura del prototipo.",
        ". Panel financiero — indicadores del día y calendario de movimientos (RF09 y reportería adicional). Captura del prototipo.",
        1,
    )

    # remove RF11 pending recommendation paragraph
    rec = "Confirmar formalmente con la gerente el requisito RF11 (pedidos con más de tres meses en piso) mediante una sesión de validación explícita, una vez verificada la corrección del caso CF11."
    rs = xml.find(rec)
    if rs < 0:
        raise SystemExit("RF11 rec not found")
    rp = xml.rfind("<text:p", 0, rs)
    re_ = xml.find("</text:p>", rs) + len("</text:p>")
    xml = xml[:rp] + xml[re_:]

    xml = xml.replace(
        "Incorporar en el código la corrección de zona horaria del cierre de caja, pospuesta hasta después del periodo de medición (numeral 3.3).",
        "La zona horaria de Bogotá ya está fijada en la configuración del proceso del servidor (numeral 3.3 y Anexo G.3); falta incorporar la misma corrección en el código de cálculo para no depender de esa variable de entorno.",
        1,
    )

    # insert annex images after headings A-D and F in ANEXOS chapter
    inserts = [
        (". Formato de recibo físico utilizado actualmente por Lavaseco La Manuelita (dos ejemplos, con nombre y teléfono anonimizados).", 20, "Picture A"),
        (". Página del cuaderno de salidas — registro de recibos tachados al retirarse el pedido del piso (sin datos personales).", 21, "Picture B"),
        (". Página del cuaderno de entradas — registro consolidado de pedidos recibidos (recibos No. 33791–33819), con nombres de clientes anonimizados.", 22, "Picture C"),
        (". Página del cuaderno de entradas — registro consolidado de pedidos recibidos (recibos No. 33767–33790), con nombres de clientes anonimizados.", 23, "Picture D"),
        (". Carta de autorización del negocio para el uso de su información en el trabajo de grado, firmada por la gerente Helena del Carmen Contreras el 10 de septiembre de 2026.", 24, "Picture F"),
    ]
    # only the ANEXOS chapter occurrences — search from the last "Los Anexos A, C y D se presentan"
    marker = "Los Anexos A, C y D se presentan anonimizados"
    base = xml.find(marker)
    if base < 0:
        raise SystemExit("anexos chapter marker not found")
    xml = xml.replace(
        marker,
        "Los Anexos A, C y D se presentan anonimizados",
        1,
    )  # no-op keep
    for needle, img_n, name in inserts:
        pos = xml.find(needle, base)
        if pos < 0:
            raise SystemExit(f"annex heading not found: {needle[:40]}")
        end = xml.find("</text:p>", pos) + len("</text:p>")
        png = media / f"image{img_n}.png"
        w, h = size_in(png)
        xml = xml[:end] + frame_xml(name, f"media/image{img_n}.png", w, h) + xml[end:]
        # next searches after this insert
        base = end + 10

    xml_path.write_text(xml, encoding="utf-8")

    # manifest
    man_path = WORK / "META-INF/manifest.xml"
    man = man_path.read_text(encoding="utf-8")
    extra = "".join(
        f'<manifest:file-entry manifest:full-path="media/image{n}.png" manifest:media-type="image/png"/>'
        for n in range(20, 25)
    )
    man = man.replace("</manifest:manifest>", extra + "</manifest:manifest>")
    man_path.write_text(man, encoding="utf-8")

    # also copy figures into repo
    fig_out = OUT_DIR / "figuras"
    fig_out.mkdir(parents=True, exist_ok=True)
    for n in range(1, 20):
        shutil.copy2(media / f"image{n}.png", fig_out / f"figura{n:02d}.png")
    anx_out = OUT_DIR / "anexos"
    anx_out.mkdir(exist_ok=True)
    for n, label in [(20, "A_recibo_fisico"), (21, "B_cuaderno_salidas"), (22, "C_cuaderno_entradas_33791"), (23, "D_cuaderno_entradas_33767"), (24, "F_carta_autorizacion")]:
        shutil.copy2(media / f"image{n}.png", anx_out / f"{label}.png")

    out_odt = OUT_DIR / "Trabajo_de_Grado_La_Manuelita_v12.odt"
    if out_odt.exists():
        out_odt.unlink()
    with zipfile.ZipFile(out_odt, "w", zipfile.ZIP_DEFLATED) as z:
        # mimetype uncompressed
        z.writestr("mimetype", (WORK / "mimetype").read_bytes(), compress_type=zipfile.ZIP_STORED)
        for p in WORK.rglob("*"):
            if p.is_file() and p.name != "mimetype":
                z.write(p, p.relative_to(WORK).as_posix())
    import xml.etree.ElementTree as ET
    ET.fromstring(xml)
    print("wrote", out_odt, "size", out_odt.stat().st_size)

    # sanity
    t = xml
    for s in ["[confirmar]", "[completar]", "a la fecha de este avance", "el reportes", "pendiente de confirmación formal", "Uso de herramientas de inteligencia artificial"]:
        print("remain", s, t.count(s))


if __name__ == "__main__":
    main()
