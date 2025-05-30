'use client'

import { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/modal';
import { api } from '../../service/api';
import { Batch, Event, Ticket } from '@prisma/client';
import { useSession } from 'next-auth/react';
import SkeletonCard from '@/components/SkeletonCard';

declare module 'next-auth' {
  interface User {
    studentId?: string;
  }
}

interface EventWithBatchsAndTickets extends Event {
  Batch: (Batch & {
    Tickets: Ticket[]
  })[];
} 

export default function Home() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { data: userSession, status, update } = useSession({
    required: false
  });
  const [eventsData, setEventsData] = useState<EventWithBatchsAndTickets[]>([]);

  useEffect(() => {
    update()
  }, [])

  const isAluno = useMemo(() => {
    if (status !== "authenticated") return false;
    return !!userSession?.user?.studentId;
  }, [status, userSession?.user?.studentId]);

  const getEvents = async () => {
    setIsLoading(true);
    api.get("/events").then((response) => {
      setEventsData(response.data)
      setIsLoading(false);
    })
  }

  useEffect(() => {
    getEvents()
  }, [])


  return (
    <main className="h-auto px-4 py-8 flex flex-col items-center">
      <div className="flex flex-col max-w-md w-full text-center mb-2 items-center">
        <Image src="/Brasao.png" alt="Brasao da turma" width={80} height={80} />
        <h2 className="text-xl font-semibold text-zinc-800">
          Seja bem-vindo ao portal da <span className="text-primary-darker font-bold">T3</span>
        </h2>
      </div>

      {isLoading && (
       <SkeletonCard /> 
      )}
      {eventsData?.filter((event: EventWithBatchsAndTickets) => event.active).map((event: EventWithBatchsAndTickets) => {
        const formattedDate = new Date(event.date).toLocaleDateString('pt-BR')
        return (
          <div className="w-full max-w-md flex flex-col gap-2" key={event.id}>
            <p>Garanta seu ingresso para o <span className="text-primary-darker">{event.name}</span>!</p>
            <div className="w-full h-50 bg-gray-600 mb-2"></div>
            <div className="flex w-full items-center justify-center flex-col">
              <h3 className="text-m">{formattedDate}</h3>
            </div>

            {event.Batch.map((batch) => 
              <div className={`mt-2 w-full max-w-md`}>
                <Card variant={`${!batch.active ? "disabled" : "default"}`}>
                  <CardContent className="flex flex-col gap-4">
                    <h2 className="text-xl text-left flex pl-4 pr-2 items-center justify-between">
                      <span className="text-primary-darker font-semibold">
                        {batch?.name} 
                      </span>
                      <span className='text-sm'>
                        (Restam {batch?.availableTickets} ingressos)
                      </span>
                    </h2>

                    <div className="border-b border-gray-300 w-full h-px text-antiflash-white">.</div>

                    <div className="flex w-full h-full gap-6">
                      <div className="flex flex-col gap-1 justify-center items-center w-full">
                        <h3 className="text-lg">Aluno</h3>
                        <h1 className="font-semibold">
                          {batch?.Tickets[0]?.student_price.toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          })}
                        </h1>
                        <Button
                          disabled={!isAluno || !userSession}
                          onClick={() => setIsOpen(true)}
                        >
                          COMPRAR
                        </Button>
                      </div>

                      <div className="border-l border-gray-300 h-22 my-auto text-antiflash-white">.</div>

                      <div className="flex flex-col gap-1 justify-center items-center w-full">
                        <h3 className="text-lg">Externo</h3>
                        <h1 className="font-semibold">
                          {batch?.Tickets[0]?.external_price.toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          })}
                        </h1>
                        <Button
                          disabled={isAluno || !userSession}
                          onClick={() => setIsOpen(true)}
                        >
                          COMPRAR
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            <Modal 
            isOpen={isOpen} 
            onClose={() => setIsOpen(false)} 
            event={event} 
            isAluno={isAluno} 
            user={userSession?.user} 
            onSuccess={getEvents}
            />
          </div>
        )
      })}
    </main>
  );
}