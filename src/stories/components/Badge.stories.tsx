import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Badge } from '../../components/ui/badge';
import { CheckIcon, ClockIcon, AlertTriangleIcon } from 'lucide-react';

const meta: Meta<typeof Badge> = {
  title: 'Components/Badge',
  component: Badge,
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'secondary', 'destructive', 'outline', 'ghost', 'link'],
    },
  },
  args: {
    variant: 'default',
    children: 'Aprovado',
  },
};

export default meta;
type Story = StoryObj<typeof Badge>;

export const Default: Story = {};

export const Variants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge variant="default">Default</Badge>
      <Badge variant="secondary">Secondary</Badge>
      <Badge variant="destructive">Destructive</Badge>
      <Badge variant="outline">Outline</Badge>
      <Badge variant="ghost">Ghost</Badge>
    </div>
  ),
};

export const WithIcons: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge variant="default">
        <CheckIcon data-icon="inline-start" />
        Aprovado
      </Badge>
      <Badge variant="secondary">
        <ClockIcon data-icon="inline-start" />
        Pendente
      </Badge>
      <Badge variant="destructive">
        <AlertTriangleIcon data-icon="inline-start" />
        Reprovado
      </Badge>
    </div>
  ),
};

export const ModerationStatuses: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2 p-4">
      <Badge variant="secondary">
        <ClockIcon data-icon="inline-start" />
        Pendente
      </Badge>
      <Badge variant="default">
        <CheckIcon data-icon="inline-start" />
        Aprovado
      </Badge>
      <Badge variant="destructive">
        <AlertTriangleIcon data-icon="inline-start" />
        Reprovado
      </Badge>
      <Badge variant="outline">Rascunho</Badge>
    </div>
  ),
  parameters: {
    viewport: { defaultViewport: 'mobile' },
  },
};
