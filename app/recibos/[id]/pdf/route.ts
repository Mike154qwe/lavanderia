import { prisma } from "@/lib/prisma";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { money, formatPedido } from "@/lib/format";

export const runtime = "nodejs";

const MAGENTA = rgb(0.75, 0.05, 0.35);
const ROJO    = rgb(0.8, 0, 0);
const NEGRO   = rgb(0, 0, 0);
const WIDTH   = 226; // pts — ancho ticket 80 mm


/** Elimina tildes y caracteres no-ASCII para que Helvetica los renderice bien. */
function san(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\x20-\x7E]/g, "?");
}

/** Parte un texto largo en líneas de máximo `max` caracteres (por palabra). */
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
function calcularAltura(prendas: any[], pagos: any[]): number {
  let h = 0;

  // Cabecera fija
  h += 14 + 30 + 12 + 12 + 12 + 6; // logo 5 líneas + gap
  h += 14 + 20;                      // titulo + recibo No.
  h += 18;                           // separador
  h += 12 * 4;                       // fecha, hora, cliente, teléfono
  h += 18;                           // separador
  h += 14;                           // "PRENDAS / SERVICIOS"

  // Prendas
  for (const p of prendas) {
    h += 12; // tipo × cant
    h += 12; // servicio
    h += 12; // valor
    if (p.descripcion) {
      h += 12; // "NOVEDADES:"
      const lines = wrapText(san(p.descripcion), 38);
      h += lines.length * 11;
    }
    h += 8; // espaciado entre prendas
  }

  h += 18; // separador
  h += 16 * 3; // TOTAL / ABONADO / SALDO
  h += 8;

  // Pagos individuales
  if (pagos.length > 0) {
    h += 12; // "PAGOS:"
    h += pagos.length * 12;
    h += 8;
  }

  h += 18; // separador
  h += 12 * 2; // aviso entrega
  h += 14;
  h += 11 * 5; // contrato
  h += 30;     // margen inferior

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

    const pageHeight = calcularAltura(pedido.prendas, pedido.pagos);

    function drawReceipt(titulo: string) {
      const page = pdfDoc.addPage([WIDTH, pageHeight]);
      let y = pageHeight - 18;

      function draw(
        text: string,
        x       = 12,
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

      function drawLines(lines: string[], x = 12, size = 7, isBold = false) {
        for (const l of lines) draw(l, x, size, isBold);
      }

      function sep() {
        page.drawLine({
          start: { x: 10, y: y + 4 },
          end:   { x: WIDTH - 10, y: y + 4 },
          thickness: 0.5,
          color: rgb(0.7, 0.7, 0.7),
        });
        y -= 10;
      }

      // ── Cabecera ──────────────────────────────────────────────
      draw("LAVASECO",                   12, 11, true,  true, MAGENTA);
      draw("La Manuelita",               12, 20, true,  true, MAGENTA);
      draw("Carrera 91 No129B-40",       12,  8, false, true, MAGENTA);
      draw("310 761 98 46",              12,  8, false, true, MAGENTA);
      draw("SERVICIO EXTRA EN UNA HORA", 12,  8, true,  true, MAGENTA);
      y -= 4;

      draw(titulo,                              12, 9,  true, true);
      draw(`RECIBO No. ${formatPedido(pedido.id)}`, 12, 14, true, true);
      sep();

      // ── Datos del cliente ─────────────────────────────────────
      draw(`Fecha:    ${pedido.createdAt.toLocaleDateString("es-CO")}`);
      draw(`Hora:     ${pedido.createdAt.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}`);
      draw(`Cliente:  ${pedido.cliente.nombre}`);
      draw(`Telefono: ${pedido.cliente.telefono ?? "No registrado"}`);
      sep();

      // ── Prendas ───────────────────────────────────────────────
      draw("PRENDAS / SERVICIOS", 12, 9, true);
      y -= 2;

      pedido.prendas.forEach((p) => {
        draw(`${p.cantidad} x ${p.tipo}`, 12, 8, true);
        draw(`  Servicio: ${p.servicio}`);
        draw(`  Valor:    ${money(p.valor)}`);

        if (p.descripcion) {
          draw("  NOVEDADES:", 12, 8, true, false, ROJO);
          const lines = wrapText(p.descripcion, 38);
          drawLines(lines.map((l) => `  ${l}`), 12, 7);
        }

        y -= 5;
      });

      sep();

      // ── Totales ───────────────────────────────────────────────
      draw(`TOTAL:    ${money(pedido.total)}`,  12, 10, true);
      draw(`ABONADO:  ${money(abonado)}`,        12, 10, true);
      draw(
        `SALDO:    ${money(Math.max(saldo, 0))}`,
        12, 10, true, false,
        saldo > 0 ? ROJO : NEGRO,
      );

      // Detalle de pagos
      if (pedido.pagos.length > 0) {
        y -= 4;
        draw("PAGOS:", 12, 8, true);
        pedido.pagos.forEach((p) => {
          draw(
            `  ${p.metodo.padEnd(14)} ${money(p.valor)}`,
            12, 8,
          );
        });
      }

      sep();

      // ── Pie ───────────────────────────────────────────────────
      y -= 6;
      draw("ENTREGA DESPUES DE 2 DIAS",  12, 8, true, true, MAGENTA);
      draw("DEL DIA MARCADO",            12, 8, true, true, MAGENTA);
      y -= 8;

      draw("CONTRATO DE SERVICIO",                     12, 7, true);
      draw("Para entregar el trabajo exigimos este recibo.", 12, 6);
      draw("No respondemos por dinero, joyas u objetos", 12, 6);
      draw("dejados en las prendas. Pasados 30 dias",   12, 6);
      draw("cesa la responsabilidad de la empresa.",    12, 6);
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
