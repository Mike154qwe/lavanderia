import { prisma } from "@/lib/prisma";
import { PDFDocument, PDFFont, StandardFonts, rgb } from "pdf-lib";
import { money, formatPedido } from "@/lib/format";
import bwipjs from "bwip-js/node";

export const runtime = "nodejs";

const MAGENTA   = rgb(0.75, 0.05, 0.35);
const ROJO      = rgb(0.8, 0, 0);
const NEGRO     = rgb(0, 0, 0);
const BLANCO    = rgb(1, 1, 1);
const MAGENTA_L = rgb(0.98, 0.92, 0.96);
const GRIS_L    = rgb(0.95, 0.95, 0.95);
const WIDTH     = 226; // pts — ancho ticket 80 mm
const BARCODE_H = 34;
const PAD       = 12; // margen lateral izquierdo/derecho
const INNER_W   = WIDTH - PAD * 2; // 202 pts — ancho útil de texto

const TERMINOS =
  "CONTRATO DE SERVICIO ENTREGA EMPRESA Y EL CLIENTE. " +
  "Para entregar el trabajo exigimos este recibo. " +
  "Toda perdida de ropa por caso fortuito como robo, incendio etc, " +
  "esta a riesgo del cliente. " +
  "Pasados 30 dias de la fecha de este recibo cesa la responsabilidad de la Empresa. " +
  "No respondemos por dinero, joyas y demas objetos dejados en vestidos. " +
  "Debido a inconsistencias de las telas, panos y colores, " +
  "no respondemos por encogimiento ni descoloramiento. " +
  "En caso de que una prenda sea perdida o cambiada, " +
  "se respondera por el valor de adquirir veces su lavado. " +
  "Art.2057 C.C. y Resol.1035 S.I.C. " +
  "La aceptacion de este recibo da por aceptadas las condiciones de la Empresa.";

const AVISO_EXTRAVIAR =
  "AL EXTRAVIAR EL RECIBO, PRESENTAR ORIGINAL Y DEJAR FOTOCOPIA DE LA CEDULA.";


/** Elimina tildes y caracteres no-ASCII para que Helvetica los renderice. */
function san(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\x20-\x7E]/g, "?");
}

/** Wrap por ancho real en pts (para justificado preciso). */
function wrapByWidth(text: string, f: PDFFont, size: number, maxW: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (f.widthOfTextAtSize(test, size) <= maxW) {
      current = test;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/** Wrap por conteo de caracteres (para secciones no justificadas). */
function wrapText(text: string, max = 36): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if ((current + " " + word).trim().length <= max) {
      current = (current + " " + word).trim();
    } else {
      if (current) lines.push(current);
      current = word.length > max ? word.slice(0, max) : word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/** Calcula la altura necesaria en pts para una copia del recibo. */
function calcularAltura(
  prendas: any[],
  pagos: any[],
  normalFont: PDFFont,
): number {
  let h = 0;

  // Cabecera fija
  h += 6;                            // franja top
  h += 13 + 22 + 10 + 10 + 10 + 6; // logo + gap
  h += 12 + 18;                      // titulo + recibo No.
  h += BARCODE_H + 4;
  h += 14;                           // sep
  h += 12 * 4;                       // fecha, hora, cliente, tel
  h += 14;                           // sep
  h += 16;                           // sección prendas

  for (const p of prendas) {
    h += 12 + 12 + 12;
    if (p.descripcion) {
      h += 12;
      h += wrapText(san(p.descripcion), 38).length * 11;
    }
    h += 8;
  }

  h += 14;       // sep
  h += 14 * 3;  // TOTAL / ABONADO / SALDO
  h += 8;
  if (pagos.length > 0) {
    h += 12;
    h += pagos.length * 12;
    h += 8;
  }

  // Pie
  h += 14;        // sep
  h += 10;        // gap antes banner
  h += 36 + 8;   // banner + gap
  h += 12;        // gap
  h += 12;        // título "CONDICIONES"
  h += 6;         // gap

  // Términos justificados — estimación con wrap real
  const terminosLines = wrapByWidth(san(TERMINOS), normalFont, 6, INNER_W);
  h += terminosLines.length * 10;

  // Caja extravío
  const avisoLines = wrapByWidth(san(AVISO_EXTRAVIAR), normalFont, 6, INNER_W - 8);
  h += 10 + avisoLines.length * 10 + 8 + 14; // gap + contenido + padding + gap final

  h += 20; // margen inferior

  return Math.max(h, 400);
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const pedidoId = Number(id);

    const pedido = await prisma.pedido.findUnique({
      where: { id: pedidoId },
      include: {
        cliente: true,
        prendas: { orderBy: { createdAt: "asc" } },
        pagos:   { orderBy: { createdAt: "asc" } },
      },
    });

    if (!pedido) {
      return new Response("Pedido no encontrado", { status: 404 });
    }

    const abonado = pedido.pagos.reduce((s, p) => s + p.valor, 0);
    const saldo   = pedido.total - abonado;

    const pdfDoc = await PDFDocument.create();
    const font   = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const bold   = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const pageHeight = calcularAltura(pedido.prendas, pedido.pagos, font);

    const barcodePng = await bwipjs.toBuffer({
      bcid:            "code128",
      text:            formatPedido(pedido.id),
      scale:           3,
      height:          8,
      includetext:     false,
      backgroundcolor: "ffffff",
    });
    const barcodeImage = await pdfDoc.embedPng(barcodePng);
    const barcodeW     = 200;

    function drawReceipt(titulo: string) {
      const page = pdfDoc.addPage([WIDTH, pageHeight]);
      let y = pageHeight - 18;

      // ── Helpers ───────────────────────────────────────────────

      function draw(
        text: string,
        x       = PAD,
        size    = 8,
        isBold  = false,
        center  = false,
        color   = NEGRO,
      ) {
        const f = isBold ? bold : font;
        const w = f.widthOfTextAtSize(text, size);
        page.drawText(san(text), {
          x: center ? (WIDTH - w) / 2 : x,
          y,
          size,
          font: f,
          color,
        });
        y -= size + 4;
      }

      /** Título de sección con líneas decorativas a los lados. */
      function sectionTitle(text: string, size = 7) {
        const f = bold;
        const w = f.widthOfTextAtSize(text, size);
        const tx = (WIDTH - w) / 2;
        const ly = y + size * 0.4;
        const gap = 5;
        page.drawLine({ start: { x: PAD, y: ly }, end: { x: tx - gap, y: ly }, thickness: 0.5, color: MAGENTA });
        page.drawText(san(text), { x: tx, y, size, font: f, color: NEGRO });
        page.drawLine({ start: { x: tx + w + gap, y: ly }, end: { x: WIDTH - PAD, y: ly }, thickness: 0.5, color: MAGENTA });
        y -= size + 6;
      }

      /** Fila label (izquierda) + valor (derecha). */
      function drawRow(label: string, value: string, size = 10, isBold = true, color = NEGRO) {
        const f = isBold ? bold : font;
        const vw = f.widthOfTextAtSize(san(value), size);
        page.drawText(san(label), { x: PAD, y, size, font: f, color });
        page.drawText(san(value), { x: WIDTH - PAD - vw, y, size, font: f, color });
        y -= size + 4;
      }

      function sep() {
        page.drawLine({
          start: { x: PAD, y: y + 4 },
          end:   { x: WIDTH - PAD, y: y + 4 },
          thickness: 0.5,
          color: MAGENTA,
        });
        y -= 10;
      }

      /** Dibuja texto justificado. Último renglón: alineado a la izquierda. */
      function drawJustified(text: string, size: number, isBold: boolean, color: any) {
        const f = isBold ? bold : font;
        const lines = wrapByWidth(text, f, size, INNER_W);
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const isLast = i === lines.length - 1;
          const words = line.split(" ");
          if (isLast || words.length <= 1) {
            page.drawText(san(line), { x: PAD, y, size, font: f, color });
          } else {
            const textW = words.reduce((s, w) => s + f.widthOfTextAtSize(w, size), 0);
            const spaceW = (INNER_W - textW) / (words.length - 1);
            let cx = PAD;
            for (const word of words) {
              page.drawText(san(word), { x: cx, y, size, font: f, color });
              cx += f.widthOfTextAtSize(word, size) + spaceW;
            }
          }
          y -= size + 4;
        }
      }

      // ── Franja superior ───────────────────────────────────────
      page.drawRectangle({ x: 0, y: pageHeight - 6, width: WIDTH, height: 6, color: MAGENTA });

      // ── Cabecera ──────────────────────────────────────────────
      draw("LAVASECO",                    PAD, 11, true,  true, MAGENTA);
      draw("La Manuelita",                PAD, 18, true,  true, MAGENTA);
      draw("Carrera 91 No129B-40",        PAD,  7, false, true, MAGENTA);
      draw("310 761 98 46",               PAD,  9, true,  true, MAGENTA);
      draw("SERVICIO EXTRA EN UNA HORA",  PAD,  7, true,  true, MAGENTA);
      y -= 4;

      sep();

      draw(titulo,                                  PAD,  8, true,  true);
      draw(`RECIBO No. ${formatPedido(pedido.id)}`, PAD, 14, true,  true);
      y -= 4;

      page.drawImage(barcodeImage, {
        x:      (WIDTH - barcodeW) / 2,
        y:      y - BARCODE_H,
        width:  barcodeW,
        height: BARCODE_H,
      });
      y -= BARCODE_H + 4;

      sep();

      // ── Datos del cliente ─────────────────────────────────────
      draw(`Fecha:    ${pedido.createdAt.toLocaleDateString("es-CO")}`);
      draw(`Hora:     ${pedido.createdAt.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}`);
      draw(`Cliente:  ${pedido.cliente.nombre}`);
      draw(`Telefono: ${pedido.cliente.telefono ?? "No registrado"}`);
      sep();

      // ── Prendas ───────────────────────────────────────────────
      sectionTitle("PRENDAS / SERVICIOS");

      pedido.prendas.forEach((p) => {
        draw(`${p.cantidad} x ${p.tipo}`, PAD, 8, true);
        draw(`  Servicio: ${p.servicio}`);
        draw(`  Valor:    ${money(p.valor)}`);
        if (p.descripcion) {
          draw("  NOVEDADES:", PAD, 8, true, false, ROJO);
          const lines = wrapText(p.descripcion, 38);
          for (const l of lines) draw(`  ${l}`, PAD, 7);
        }
        y -= 5;
      });

      sep();

      // ── Totales ───────────────────────────────────────────────
      drawRow("TOTAL",   money(pedido.total));
      drawRow("ABONADO", money(abonado));

      // Fondo sutil para la fila SALDO
      const saldoColor = saldo > 0 ? ROJO : NEGRO;
      if (saldo > 0) {
        page.drawRectangle({ x: PAD - 2, y: y - 2, width: INNER_W + 4, height: 16, color: rgb(1, 0.94, 0.94) });
      } else {
        page.drawRectangle({ x: PAD - 2, y: y - 2, width: INNER_W + 4, height: 16, color: GRIS_L });
      }
      drawRow("SALDO", money(Math.max(saldo, 0)), 10, true, saldoColor);

      if (pedido.pagos.length > 0) {
        y -= 4;
        draw("PAGOS:", PAD, 8, true);
        pedido.pagos.forEach((p) => {
          drawRow(`  ${p.metodo}`, money(p.valor), 8, false);
        });
      }

      sep();

      // ── Pie: banner + términos justificados ───────────────────
      y -= 10;

      // Banner MAGENTA con texto blanco en 2 líneas grandes
      const bannerH = 36;
      page.drawRectangle({ x: 6, y: y - bannerH, width: WIDTH - 12, height: bannerH, color: MAGENTA });

      const bl1 = "ENTREGA DESPUES DE 2 DIAS";
      const bl2 = "DEL DIA MARCADO";
      const bl1w = bold.widthOfTextAtSize(bl1, 10);
      const bl2w = bold.widthOfTextAtSize(bl2, 10);
      page.drawText(bl1, { x: (WIDTH - bl1w) / 2, y: y - 13, size: 10, font: bold, color: BLANCO });
      page.drawText(bl2, { x: (WIDTH - bl2w) / 2, y: y - 27, size: 10, font: bold, color: BLANCO });
      y -= bannerH + 8;

      y -= 10;
      sectionTitle("CONDICIONES DEL SERVICIO");
      y -= 2;

      // Párrafo justificado en MAGENTA
      drawJustified(san(TERMINOS), 6, false, MAGENTA);

      // Caja de aviso extravío
      y -= 6;
      const avisoLines = wrapByWidth(san(AVISO_EXTRAVIAR), bold, 6, INNER_W - 8);
      const boxH = avisoLines.length * 10 + 10;
      page.drawRectangle({
        x: 6, y: y - boxH,
        width: WIDTH - 12, height: boxH,
        color: MAGENTA_L,
        borderColor: MAGENTA,
        borderWidth: 1,
      });
      y -= 7;
      for (const linea of avisoLines) {
        draw(linea, PAD + 2, 6, true, false, MAGENTA);
      }
    }

    drawReceipt("COPIA CLIENTE");
    drawReceipt("COPIA LAVANDERIA");

    const pdf = await pdfDoc.save();

    return new Response(pdf as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="recibo-${formatPedido(pedido.id)}.pdf"`,
      },
    });
  } catch (error) {
    console.error(error);
    return new Response("Error generando PDF", { status: 500 });
  }
}
