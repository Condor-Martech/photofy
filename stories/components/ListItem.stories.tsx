import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import {
  ListItem,
  ListItemLeading,
  ListItemContent,
  ListItemTitle,
  ListItemDescription,
  ListItemTrailing,
} from '../../components/ui/list-item';
import { Avatar, AvatarFallback } from '../../components/ui/avatar';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import {
  CheckIcon,
  ClockIcon,
  AlertTriangleIcon,
  ChevronRightIcon,
  ImagePlusIcon,
  TrashIcon,
} from 'lucide-react';

const meta: Meta<typeof ListItem> = {
  title: 'Components/ListItem',
  component: ListItem,
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'interactive', 'static'],
    },
  },
  args: {
    variant: 'default',
  },
};

export default meta;
type Story = StoryObj<typeof ListItem>;

export const Default: Story = {
  render: (args) => (
    <div className="w-full max-w-md divide-y divide-border rounded-lg border border-border">
      <ListItem {...args}>
        <ListItemLeading>
          <Avatar size="sm">
            <AvatarFallback>AS</AvatarFallback>
          </Avatar>
        </ListItemLeading>
        <ListItemContent>
          <ListItemTitle>Ana Silva</ListItemTitle>
          <ListItemDescription>Enviou 12 fotos</ListItemDescription>
        </ListItemContent>
        <ListItemTrailing>
          <Badge variant="default">
            <CheckIcon data-icon="inline-start" />
            Aprovado
          </Badge>
        </ListItemTrailing>
      </ListItem>
      <ListItem {...args}>
        <ListItemLeading>
          <Avatar size="sm">
            <AvatarFallback>BC</AvatarFallback>
          </Avatar>
        </ListItemLeading>
        <ListItemContent>
          <ListItemTitle>Bruno Costa</ListItemTitle>
          <ListItemDescription>Enviou 8 fotos</ListItemDescription>
        </ListItemContent>
        <ListItemTrailing>
          <Badge variant="secondary">
            <ClockIcon data-icon="inline-start" />
            Pendente
          </Badge>
        </ListItemTrailing>
      </ListItem>
      <ListItem {...args}>
        <ListItemLeading>
          <Avatar size="sm">
            <AvatarFallback>CD</AvatarFallback>
          </Avatar>
        </ListItemLeading>
        <ListItemContent>
          <ListItemTitle>Carla Dias</ListItemTitle>
          <ListItemDescription>Enviou 23 fotos</ListItemDescription>
        </ListItemContent>
        <ListItemTrailing>
          <Badge variant="destructive">
            <AlertTriangleIcon data-icon="inline-start" />
            Reprovado
          </Badge>
        </ListItemTrailing>
      </ListItem>
    </div>
  ),
};

export const Interactive: Story = {
  render: () => (
    <div className="w-full max-w-md divide-y divide-border rounded-lg border border-border">
      <ListItem variant="interactive">
        <ListItemContent>
          <ListItemTitle>Casamento Ana & Pedro</ListItemTitle>
          <ListItemDescription>15 Mar 2026 — 234 fotos</ListItemDescription>
        </ListItemContent>
        <ListItemTrailing>
          <ChevronRightIcon className="size-4 text-muted-foreground" />
        </ListItemTrailing>
      </ListItem>
      <ListItem variant="interactive">
        <ListItemContent>
          <ListItemTitle>Formatura Medicina</ListItemTitle>
          <ListItemDescription>20 Jun 2026 — 1.2k fotos</ListItemDescription>
        </ListItemContent>
        <ListItemTrailing>
          <ChevronRightIcon className="size-4 text-muted-foreground" />
        </ListItemTrailing>
      </ListItem>
      <ListItem variant="interactive">
        <ListItemContent>
          <ListItemTitle>Aniversário 30 anos</ListItemTitle>
          <ListItemDescription>08 Ago 2026 — Rascunho</ListItemDescription>
        </ListItemContent>
        <ListItemTrailing>
          <ChevronRightIcon className="size-4 text-muted-foreground" />
        </ListItemTrailing>
      </ListItem>
    </div>
  ),
};

export const WithActions: Story = {
  render: () => (
    <div className="w-full max-w-md divide-y divide-border rounded-lg border border-border">
      <ListItem variant="static">
        <ListItemLeading>
          <ImagePlusIcon className="size-5 text-muted-foreground" />
        </ListItemLeading>
        <ListItemContent>
          <ListItemTitle>foto_ana_001.jpg</ListItemTitle>
          <ListItemDescription>2.4 MB — há 3 minutos</ListItemDescription>
        </ListItemContent>
        <ListItemTrailing className="flex gap-1">
          <Button size="icon-xs" variant="ghost">
            <CheckIcon className="size-3.5 text-success-500" />
          </Button>
          <Button size="icon-xs" variant="ghost">
            <TrashIcon className="size-3.5 text-destructive" />
          </Button>
        </ListItemTrailing>
      </ListItem>
      <ListItem variant="static">
        <ListItemLeading>
          <ImagePlusIcon className="size-5 text-muted-foreground" />
        </ListItemLeading>
        <ListItemContent>
          <ListItemTitle>reel_bruno_final.mp4</ListItemTitle>
          <ListItemDescription>18.7 MB — há 5 minutos</ListItemDescription>
        </ListItemContent>
        <ListItemTrailing className="flex gap-1">
          <Button size="icon-xs" variant="ghost">
            <CheckIcon className="size-3.5 text-success-500" />
          </Button>
          <Button size="icon-xs" variant="ghost">
            <TrashIcon className="size-3.5 text-destructive" />
          </Button>
        </ListItemTrailing>
      </ListItem>
    </div>
  ),
};

export const MobileModerationQueue: Story = {
  render: () => (
    <div className="flex flex-col p-4">
      <h2 className="mb-3 text-base font-semibold">Fila de moderação</h2>
      <div className="divide-y divide-border rounded-lg border border-border">
        {[
          { name: 'Ana Silva', initials: 'AS', count: 3, time: 'há 2 min', status: 'pending' },
          { name: 'Bruno Costa', initials: 'BC', count: 1, time: 'há 5 min', status: 'pending' },
          { name: 'Carla Dias', initials: 'CD', count: 7, time: 'há 8 min', status: 'pending' },
          { name: 'Diego Ferreira', initials: 'DF', count: 2, time: 'há 12 min', status: 'pending' },
        ].map((item) => (
          <ListItem key={item.initials} variant="interactive">
            <ListItemLeading>
              <Avatar size="sm">
                <AvatarFallback>{item.initials}</AvatarFallback>
              </Avatar>
            </ListItemLeading>
            <ListItemContent>
              <ListItemTitle>{item.name}</ListItemTitle>
              <ListItemDescription>
                {item.count} fotos — {item.time}
              </ListItemDescription>
            </ListItemContent>
            <ListItemTrailing>
              <Badge variant="secondary">
                <ClockIcon data-icon="inline-start" />
                {item.count}
              </Badge>
            </ListItemTrailing>
          </ListItem>
        ))}
      </div>
    </div>
  ),
  parameters: {
    viewport: { defaultViewport: 'mobile' },
  },
};
