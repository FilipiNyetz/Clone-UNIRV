import { NextResponse } from 'next/server';
import cron from 'node-cron';
import { db } from '@/lib/prisma';
import MercadoPagoConfig, { Payment } from 'mercadopago'; // Ajuste se necessário

const client = new MercadoPagoConfig({
    accessToken: process.env.ACESS_TOKEN!,
    options: { timeout: 5000 },
});

const payment = new Payment(client);

let isCronRunning = false;

// Cron job para verificar pagamentos pendente
const cronJob = cron.schedule('*/5 * * * *', async () => {
    if (isCronRunning) return; // Evita iniciar o cron job se ele já estiver em execução
    isCronRunning = true;
    console.log('🔍 Verificando pagamentos pendentes...');

    const now = new Date();

    // Busca orders pendentes com pagamento via PIX e criadas há mais de 30 minutos
    const orders = await db.order.findMany({
        where: {
            status: 'PENDING',
            payment: 'PIX',
            createdAt: {
                lt: new Date(now.getTime() - 30 * 60 * 1000),
            },
        },
    });

    for (const order of orders) {
        try {
            const paymentData = await payment.get({ id: order.paymentId });

            if (paymentData.status !== 'approved') {
                await db.order.update({
                    where: { id: order.id },
                    data: { status: 'CANCELED' },
                });

                console.log(`⏰ Pedido ${order.id} cancelado (pagamento expirado)`);
            } else {
                await db.order.update({
                    where: { id: order.id },
                    data: { status: 'COMPLETED' },
                });
                console.log(`✅ Pedido ${order.id} confirmado como COMPLETED`);
            }
        } catch (err) {
            console.error(`⚠️ Erro ao verificar pagamento ${order.paymentId}`, err);
        }
    }

    console.log('✅ Verificação concluída');
    isCronRunning = false; // Marca como concluído
});

// Ativar o cron job quando o servidor Next.js for carregado
export async function GET() {
    cronJob.start(); // Inicia o cron se ainda não estiver rodando
    return NextResponse.json({ message: 'Cron job iniciado com sucesso!' });
}
