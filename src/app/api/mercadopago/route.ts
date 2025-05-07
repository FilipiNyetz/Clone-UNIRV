// src/app/api/mercadopago/route.ts
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

// 👇 Rota do Mercado Pago para gerar pagamento via PIX
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
            notification_url: `https://clone-unirv-xddh.vercel.app/api/mercadopago/webhook?paymentId=${data.paymentId}`,
            date_of_expiration: expirationDate,
        };

        const requestOptions = {
            idempotencyKey: generateIdempotencyKey(),
        };

        // Cria o pagamento via Mercado Pago
        const result = await payment.create({ body, requestOptions });

        const qrCode = result.point_of_interaction?.transaction_data?.qr_code;

        // Verifica se o paymentId existe
        if (!result.id) {
            throw new Error("Payment ID não encontrado");
        }

        // Após o pagamento ser criado, crie a order no banco
        const newOrder = await db.order.create({
            data: {
                userId: data.userId,
                ticketId: data.ticketId,
                status: "PENDING",
                payment: "PIX",
                paymentId: result.id.toString(), // Usando o paymentId retornado do Mercado Pago
            },
        });

        return new Response(
            JSON.stringify({
                pix_code: qrCode ?? null,
                order: newOrder,
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
