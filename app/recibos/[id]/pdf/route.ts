import { prisma } from "@/lib/prisma";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export const runtime = "nodejs";

function money(value: number) {
  return `$${value.toLocaleString("es-CO")}`;
}

function formatPedido(id: number) {
  return String(id).padStart(5, "0");
}

function textLimit(text: string, max = 34) {
  return text.length > max ? text.slice(0, max) + "..." : text;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const pedidoId = Number(id);

    const pedido: any = await (prisma as any).pedido.findUnique({
      where: { id: pedidoId },
      include: {
        cliente: true,
        prendas: true,
        pagos: true,
      },
    });

    if (!pedido) {
      return new Response("Pedido no encontrado", { status: 404 });
    }

    const abonado = pedido.pagos.reduce(
      (sum: number, pago: any) => sum + pago.valor,
      0
    );

    const saldo = pedido.total - abonado;

    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    function drawReceipt(titulo: string) {
      const page = pdfDoc.addPage([226, 700]);
      let y = 670;

      function draw(
        text: string,
        x = 12,
        size = 8,
        isBold = false,
        center = false,
        color = rgb(0, 0, 0)
      ) {
        const f = isBold ? bold : font;
        const width = f.widthOfTextAtSize(text, size);

        page.drawText(text, {
          x: center ? (226 - width) / 2 : x,
          y,
          size,
          font: f,
          color,
        });

        y -= size + 4;
      }

      function line() {
        draw("------------------------------------------", 12, 7, false, true);
        y -= 3;
      }

      draw("LAVASECO", 12, 10, true, true, rgb(0.75, 0.05, 0.35));
      draw("La Manuelita", 12, 22, true, true, rgb(0.75, 0.05, 0.35));
      draw("Carrera 91 No129B-40", 12, 8, true, true, rgb(0.75, 0.05, 0.35));
      draw("310 761 98 46", 12, 8, true, true, rgb(0.75, 0.05, 0.35));
      draw("SERVICIO EXTRA EN UNA HORA", 12, 8, true, true, rgb(0.75, 0.05, 0.35));

      y -= 6;

      draw(titulo, 12, 10, true, true);
      draw(`RECIBO No. ${formatPedido(pedido.id)}`, 12, 13, true, true);

      line();

      draw(`Fecha: ${pedido.createdAt.toLocaleDateString("es-CO")}`);
      draw(
        `Hora: ${pedido.createdAt.toLocaleTimeString("es-CO", {
          hour: "2-digit",
          minute: "2-digit",
        })}`
      );
      draw(`Cliente: ${textLimit(pedido.cliente.nombre)}`);
      draw(`Telefono: ${pedido.cliente.telefono || "No registrado"}`);

      line();

      draw("PRENDAS / SERVICIOS", 12, 9, true);

      pedido.prendas.forEach((prenda: any) => {
        draw(`${prenda.cantidad} x ${textLimit(prenda.tipo, 28)}`, 12, 8, true);
        draw(`Servicio: ${prenda.servicio || "Lavado"}`);
        draw(`Valor: ${money(prenda.valor || 0)}`);

        if (prenda.descripcion) {
          draw("NOVEDADES:", 12, 8, true, false, rgb(0.8, 0, 0));
          draw(textLimit(prenda.descripcion, 40), 12, 7);
        }

        y -= 4;
      });

      line();

      draw(`TOTAL: ${money(pedido.total)}`, 12, 10, true);
      draw(`ABONADO: ${money(abonado)}`, 12, 10, true);
      draw(`SALDO: ${money(saldo)}`, 12, 10, true);

      y -= 20;

      draw("ENTREGA DESPUÉS DE 2 DÍAS", 12, 8, true, true, rgb(0.75, 0.05, 0.35));
      draw("DEL DÍA MARCADO", 12, 8, true, true, rgb(0.75, 0.05, 0.35));

      y -= 10;

      draw("CONTRATO DE SERVICIO", 12, 7, true);
      draw("Para entregar el trabajo exigimos este recibo.", 12, 6);
      draw("No respondemos por dinero, joyas u objetos", 12, 6);
      draw("dejados en las prendas. Pasados 30 días", 12, 6);
      draw("cesa la responsabilidad de la empresa.", 12, 6);
    }

    drawReceipt("COPIA CLIENTE");
    drawReceipt("COPIA LAVANDERIA");

    const pdf = await pdfDoc.save();

    return new Response(pdf as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="recibo-${formatPedido(
          pedido.id
        )}.pdf"`,
      },
    });
  } catch (error) {
    console.error(error);
    return new Response("Error generando PDF", { status: 500 });
  }
}