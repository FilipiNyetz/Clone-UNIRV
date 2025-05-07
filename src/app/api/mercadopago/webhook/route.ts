// src/app/api/mercadopago/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { db } from '@/lib/prisma';

// Configuração do cliente Mercado Pago
const client = new MercadoPagoConfig({
    accessToken: process.env.ACESS_TOKEN!,
    options: { timeout: 5000 },
});

const payment = new Payment(client);

// Função que lida com notificações do Mercado Pago
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const paymentId = body?.data?.id;

        if (!paymentId) {
            return NextResponse.json({ error: 'ID de pagamento não encontrado' }, { status: 400 });
        }

        // Recupera os dados detalhados do pagamento pelo ID
        const paymentData = await payment.get({ id: paymentId });
        const status = paymentData.status;
        const email = paymentData.payer?.email;

        // Atualiza a order com o novo status
        const order = await db.order.update({
            where: { paymentId: paymentId.toString() },
            data: {
                status: status === "approved"
                    ? "COMPLETED"
                    : status === "cancelled"
                        ? "CANCELED"
                        : "PENDING"
            },
        });

        console.log(`✅ Webhook processado para ${email} com status ${status}`);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('❌ Erro no processamento do webhook:', error);
        return new NextResponse('Erro interno no servidor', { status: 500 });
    }
}


// Rejeita outros métodos HTTP
export function GET() {
    return new NextResponse('Método não permitido', { status: 405 });
}
