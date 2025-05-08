"use client"

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { Copy, Map, MapPin, X } from "lucide-react";
import Link from "next/link";
import { Button } from "../ui/button";
import PixPayment from "../QRCode";
import { api } from "../../../service/api";
import { Skeleton } from "@/components/ui/skeleton"
import { Batch, Event, Ticket, User } from "@prisma/client";

interface EventWithBatchsAndTickets extends Event {
    Batch: (Batch & {
        Tickets: Ticket[]
    })[];
}

type ModalProps = {
    isOpen: boolean;
    onClose: () => void;
    event: EventWithBatchsAndTickets | null;
    isAluno?: boolean;
    user: User | null;
    onSuccess?: () => void;
};


export function Modal({ isOpen, onClose, event, isAluno, user, onSuccess }: ModalProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [qrCode, setQrCode] = useState<{ pix_code: string } | null>(null);

    const getQRCode = async () => {
        const paymentId = Math.random().toString(36).substr(2, 9);
        setIsLoading(true);
        try {
            // 1. Criar o QR Code no Mercado Pago
            const response = await api.post('/mercadopago', {
                data: {
                    description: `Ingresso para o evento ${event?.name}`,
                    amount: isAluno ? event?.Batch[0]?.Tickets[0]?.student_price : event?.Batch[0]?.Tickets[0]?.external_price,
                    paymentId: paymentId,
                    payer: {
                        email: user?.email,
                        first_name: user?.name,
                        identification: {
                            type: "CPF",
                            number: user?.cpf
                        }
                    },
                    userId: user?.id,  // Enviando o userId do usuário logado
                    batchId: event?.Batch[0].id,
                    ticketId: event?.Batch[0]?.Tickets[0]?.id,

                }
            });
            setQrCode(response.data);

            // // 2. Criar a Order
            // await api.post('/orders', {
            //     data: {
            //         userId: user?.id,
            //         ticketId: event?.Batch[0]?.Tickets[0]?.id,
            //         paymentId
            //     }
            // })

            // 3. Atualizar o availableTickets no Batch
            if (event?.Batch?.[0]) {
                await api.patch(`/batchs?id=${event.Batch[0].id}`, {
                    availableTickets: event.Batch[0].availableTickets - 1
                });
            } else {
                console.error("Batch não encontrado ou evento inválido");
            }


            if (onSuccess) onSuccess();

        } catch (error) {
            console.error('Error fetching QR code:', error);
        } finally {
            setIsLoading(false);
        }
    }


    const copyToClipboard = async () => {
        try {
            if (qrCode?.pix_code) {
                await navigator.clipboard.writeText(qrCode.pix_code);
            }
            alert("Chave pix copiada!")
            console.log('Texto copiado para a área de transferência');
        } catch (err) {
            console.log('Falha ao copiar o texto', err);
        }
    };

    useEffect(() => {
        isOpen && getQRCode()
    }, [isOpen])

    return (
        <div>
            <Dialog open={isOpen}>
                <DialogContent className="flex flex-col items-center justify-center text-center p-6 max-w-sm">
                    <DialogTitle className="text-xl font-semibold mb-1">
                        Pagamento do Ingresso
                    </DialogTitle>

                    <div className="text-primary font-semibold text-lg">
                        {event?.name} <span className="text-primary-darker">
                            {isAluno ? event?.Batch[0]?.Tickets[0]?.student_price.toLocaleString('pt-BR', {
                                style: 'currency',
                                currency: 'BRL',
                            }) : event?.Batch[0]?.Tickets[0]?.external_price.toLocaleString('pt-BR', {
                                style: 'currency',
                                currency: 'BRL',
                            })}
                        </span>
                    </div>

                    <div className="flex items-center justify-between gap-4 mt-2 w-55">
                        <div className="flex flex-col items-center border rounded-xl overflow-hidden shadow-md w-20">
                            <div className="text-xl font-bold mt-2">30</div>
                            <div className="text-sm text-gray-600 mb-2">Sex</div>
                            <div className="bg-black text-primary w-full py-1 text-sm font-semibold">
                                Abr.
                            </div>
                        </div>

                        <div className="flex flex-col items-center">
                            <div className="text-lg font-medium">Às 20:00h</div>
                            <div className="text-sm flex items-center">
                                <MapPin></MapPin> <Link href="#" className="underline hover:text-primary-darker transition">Localização</Link>
                            </div>
                        </div>
                    </div>
                    <hr className="w-full my-4 border-gray-300" />

                    {/* Pix info */}
                    <DialogDescription className="w-full text-center">
                        <div className="flex flex-col items-center">

                            {isLoading ?
                                <Skeleton className="h-[200px] w-[200px] rounded-xl" /> : <PixPayment pixCode={qrCode?.pix_code || ''} />
                            }

                            {/* <div className="flex items-center gap-2 mt-2 text-sm text-black cursor-pointer hover:text-primary-darker transition"> */}

                            {/* <Copy className="w-4 h-4" /> */}
                            <Button onClick={copyToClipboard} className="mt-4">Copiar código</Button>
                            {/* </div> */}
                        </div>
                    </DialogDescription>

                    <DialogFooter className="mt-6 text-sm text-center">
                        <p>
                            Caso queira pagar com cartão, entrar em contato pelo{" "}
                            <Link
                                href="https://wa.me/5561999525238?text=Ol%C3%A1%2C%20tudo%20bem%20%3F%0AGostaria%20de%20comprar%20ingressos%20para%20o%20Arraia%20da%20T3!%F0%9F%8C%BE%F0%9F%92%9B%F0%9F%96%A4"
                                target="_blank"
                                className="text-primary underline hover:text-primary-darker transition"
                            >
                                WhatsApp
                            </Link>
                        </p>
                    </DialogFooter>
                    <button
                        onClick={onClose}
                        className="ring-offset-background cursor-pointer focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-xs opacity-70 transition duration-250 hover:opacity-100 hover:scale-125 focus:ring-2 focus:ring-offset-2 focus:outline-hidden"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </DialogContent>
            </Dialog>
        </div>
    );
}
