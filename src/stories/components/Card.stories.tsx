import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { CameraIcon, UsersIcon, CalendarIcon } from 'lucide-react';

const meta: Meta<typeof Card> = {
  title: 'Components/Card',
  component: Card,
  args: {},
};

export default meta;
type Story = StoryObj<typeof Card>;

export const Default: Story = {
  render: () => (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Casamento Ana & Pedro</CardTitle>
        <CardDescription>15 de Março, 2026 — Jardim Botânico</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <CameraIcon className="size-4" />
            234 fotos
          </span>
          <span className="flex items-center gap-1">
            <UsersIcon className="size-4" />
            87 participantes
          </span>
        </div>
      </CardContent>
      <CardFooter>
        <Button size="sm" variant="outline">Ver detalhes</Button>
      </CardFooter>
    </Card>
  ),
};

export const Variants: Story = {
  render: () => (
    <div className="flex flex-col gap-4 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Evento com Header</CardTitle>
          <CardDescription>Descrição do evento</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm">Conteúdo do card com informações detalhadas.</p>
        </CardContent>
        <CardFooter className="gap-2">
          <Button size="sm">Ação principal</Button>
          <Button size="sm" variant="ghost">Cancelar</Button>
        </CardFooter>
      </Card>

      <Card className="w-full max-w-sm">
        <CardContent className="py-4">
          <p className="text-sm">Card sem header — apenas conteúdo.</p>
        </CardContent>
      </Card>

      <Card className="w-full max-w-sm border-dashed">
        <CardContent className="flex items-center justify-center py-8">
          <p className="text-sm text-muted-foreground">Card com borda tracejada</p>
        </CardContent>
      </Card>
    </div>
  ),
};

export const EventCard: Story = {
  render: () => (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <CardTitle>Formatura Medicina 2026</CardTitle>
            <CardDescription>
              <CalendarIcon className="mr-1 inline size-3" />
              20 Jun 2026, 19:00
            </CardDescription>
          </div>
          <Badge variant="default">Ativo</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-lg font-bold">1.2k</p>
            <p className="text-xs text-muted-foreground">Fotos</p>
          </div>
          <div>
            <p className="text-lg font-bold">48</p>
            <p className="text-xs text-muted-foreground">Reels</p>
          </div>
          <div>
            <p className="text-lg font-bold">320</p>
            <p className="text-xs text-muted-foreground">Convidados</p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="justify-between">
        <Button size="sm" variant="outline">Painel</Button>
        <Button size="sm">QR Code</Button>
      </CardFooter>
    </Card>
  ),
  parameters: {
    viewport: { defaultViewport: 'mobile' },
  },
};

export const MobileCardList: Story = {
  render: () => (
    <div className="flex flex-col gap-3 p-4">
      {[
        { title: 'Casamento Ana & Pedro', date: '15 Mar 2026', photos: 234, status: 'Ativo' },
        { title: 'Formatura Medicina', date: '20 Jun 2026', photos: 1200, status: 'Ativo' },
        { title: 'Aniversário 30 anos', date: '08 Ago 2026', photos: 0, status: 'Rascunho' },
      ].map((event) => (
        <Card key={event.title}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">{event.title}</CardTitle>
              <Badge variant={event.status === 'Ativo' ? 'default' : 'outline'}>
                {event.status}
              </Badge>
            </div>
            <CardDescription>{event.date}</CardDescription>
          </CardHeader>
          <CardContent>
            <span className="text-xs text-muted-foreground">{event.photos} fotos enviadas</span>
          </CardContent>
        </Card>
      ))}
    </div>
  ),
  parameters: {
    viewport: { defaultViewport: 'mobile' },
  },
};
