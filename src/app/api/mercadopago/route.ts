import { db } from "@/lib/prisma";
import { MercadoPagoConfig, Payment } from "mercadopago";

const client = new MercadoPagoConfig({
    accessToken: process.env.ACESS_TOKEN!,
    options: { timeout: 5000 },
});

const payment = new Payment(client);

function generateIdempotencyKey() {
    return (
        "key-" +
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15)
    );
}

const expirationDate = new Date(Date.now() + 30 * 60 * 1000).toISOString();

export async function POST(req: Request) {
    const { data } = await req.json();

    try {
        const body = {
            transaction_amount: data.amount,
            description: data.description,
            payment_method_id: "pix",
            payer: {
                email: data.payer.email,
                first_name: data.payer.first_name,
                identification: {
                    type: "CPF",
                    number: data.payer.identification.number,
                },
            },
            notification_url: `https://clone-unirv-xddh.vercel.app/api/mercadopago/webhook`,
            date_of_expiration: expirationDate,
        };

        const requestOptions = {
            idempotencyKey: generateIdempotencyKey(),
        };

        // Cria o pagamento via Mercado Pago
        const result = await payment.create({ body, requestOptions });

        if (!result.id) {
            throw new Error("Payment ID não encontrado");
        }
        console.log("Criando order com:", {
            userId: data.userId,
            batchId: data.batchId,
            ticketId: data.ticketId,
            paymentId: result.id.toString(),
        });
        // Após o pagamento ser criado, crie a order no banco
        const newOrder = await db.order.create({
            data: {
                userId: data.userId,
                batchId: data.batchId,
                ticketId: data.ticketId,
                status: "PENDING",
                payment: "PIX",
                paymentId: result.id.toString(), // Aqui usamos o paymentId real
            },
        });

        const qrCode = result.point_of_interaction?.transaction_data?.qr_code;

        return new Response(
            JSON.stringify({
                pix_code: qrCode ?? null,
                order: newOrder,
                paymentId: result.id,
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
        );
    } catch (error) {
        console.error("Erro Mercado Pago:", error);
        return new Response(
            JSON.stringify({ error: "Erro ao criar pagamento" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
}
