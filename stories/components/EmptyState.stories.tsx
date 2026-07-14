import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import {
  EmptyState,
  EmptyStateIcon,
  EmptyStateTitle,
  EmptyStateDescription,
  EmptyStateAction,
} from '../../components/ui/empty-state';
import { Button } from '../../components/ui/button';
import {
  CameraIcon,
  ImagePlusIcon,
  SearchIcon,
  InboxIcon,
  UsersIcon,
  QrCodeIcon,
} from 'lucide-react';

const meta: Meta<typeof EmptyState> = {
  title: 'Components/EmptyState',
  component: EmptyState,
  argTypes: {
    size: {
      control: 'select',
      options: ['compact', 'default', 'fullpage'],
    },
  },
  args: {
    size: 'default',
  },
};

export default meta;
type Story = StoryObj<typeof EmptyState>;

export const Default: Story = {
  render: (args) => (
    <EmptyState {...args}>
      <EmptyStateIcon>
        <CameraIcon />
      </EmptyStateIcon>
      <EmptyStateTitle>Nenhuma foto ainda</EmptyStateTitle>
      <EmptyStateDescription>
        As fotos enviadas pelos participantes vão aparecer aqui em tempo real.
      </EmptyStateDescription>
    </EmptyState>
  ),
};

export const WithAction: Story = {
  render: () => (
    <EmptyState>
      <EmptyStateIcon>
        <ImagePlusIcon />
      </EmptyStateIcon>
      <EmptyStateTitle>Nenhuma foto enviada</EmptyStateTitle>
      <EmptyStateDescription>
        Escaneie o QR code do evento para começar a enviar suas fotos.
      </EmptyStateDescription>
      <EmptyStateAction>
        <Button>
          <QrCodeIcon data-icon="inline-start" />
          Escanear QR code
        </Button>
      </EmptyStateAction>
    </EmptyState>
  ),
};

export const Compact: Story = {
  render: () => (
    <div className="w-full max-w-md rounded-lg border border-border p-4">
      <EmptyState size="compact">
        <EmptyStateIcon>
          <SearchIcon />
        </EmptyStateIcon>
        <EmptyStateTitle>Nenhum resultado</EmptyStateTitle>
        <EmptyStateDescription>
          Nenhuma foto encontrada para &quot;casamento&quot;.
        </EmptyStateDescription>
      </EmptyState>
    </div>
  ),
};

export const FullPage: Story = {
  render: () => (
    <EmptyState size="fullpage">
      <EmptyStateIcon>
        <UsersIcon />
      </EmptyStateIcon>
      <EmptyStateTitle>Nenhum participante</EmptyStateTitle>
      <EmptyStateDescription>
        Ainda não há participantes neste evento. Compartilhe o link ou QR code para convidar pessoas.
      </EmptyStateDescription>
      <EmptyStateAction className="flex gap-2">
        <Button variant="outline">Copiar link</Button>
        <Button>
          <QrCodeIcon data-icon="inline-start" />
          Gerar QR code
        </Button>
      </EmptyStateAction>
    </EmptyState>
  ),
};

export const ModerationQueueEmpty: Story = {
  render: () => (
    <EmptyState>
      <EmptyStateIcon>
        <InboxIcon />
      </EmptyStateIcon>
      <EmptyStateTitle>Fila de moderação vazia</EmptyStateTitle>
      <EmptyStateDescription>
        Todas as fotos foram revisadas. Novas fotos enviadas pelos participantes aparecerão aqui automaticamente.
      </EmptyStateDescription>
    </EmptyState>
  ),
  parameters: {
    viewport: { defaultViewport: 'mobile' },
  },
};

export const GalleryEmpty: Story = {
  render: () => (
    <div className="p-4">
      <EmptyState>
        <EmptyStateIcon>
          <CameraIcon />
        </EmptyStateIcon>
        <EmptyStateTitle>Álbum vazio</EmptyStateTitle>
        <EmptyStateDescription>
          As fotos aprovadas do evento vão aparecer aqui. Peça para os participantes começarem a enviar!
        </EmptyStateDescription>
        <EmptyStateAction>
          <Button size="sm" variant="outline">
            Compartilhar QR code
          </Button>
        </EmptyStateAction>
      </EmptyState>
    </div>
  ),
  parameters: {
    viewport: { defaultViewport: 'mobile' },
  },
};
