import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Button } from '../../components/ui/button';
import { UploadIcon, SearchIcon, TrashIcon } from 'lucide-react';

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'outline', 'secondary', 'ghost', 'destructive', 'link'],
    },
    size: {
      control: 'select',
      options: ['default', 'xs', 'sm', 'lg', 'icon', 'icon-xs', 'icon-sm', 'icon-lg'],
    },
    disabled: { control: 'boolean' },
  },
  args: {
    variant: 'default',
    size: 'default',
    disabled: false,
    children: 'Enviar foto',
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Default: Story = {};

export const Variants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <Button variant="default">Default</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="destructive">Destructive</Button>
      <Button variant="link">Link</Button>
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Button size="xs">Extra Small</Button>
      <Button size="sm">Small</Button>
      <Button size="default">Default (44px)</Button>
      <Button size="lg">Large (48px)</Button>
    </div>
  ),
};

export const WithIcons: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <Button>
        <UploadIcon data-icon="inline-start" />
        Upload
      </Button>
      <Button variant="outline">
        <SearchIcon data-icon="inline-start" />
        Buscar
      </Button>
      <Button variant="destructive">
        <TrashIcon data-icon="inline-start" />
        Excluir
      </Button>
      <Button variant="ghost" size="icon">
        <SearchIcon />
      </Button>
    </div>
  ),
};

export const States: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <Button>Normal</Button>
      <Button disabled>Disabled</Button>
      <Button className="hover:bg-primary/80">Hover (simule)</Button>
      <Button className="focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50">Focus (tab)</Button>
    </div>
  ),
};

export const MobileTouchTargets: Story = {
  render: () => (
    <div className="flex flex-col gap-3 p-4">
      <p className="text-sm text-muted-foreground">
        Touch targets mobile-first (min 44px):
      </p>
      <Button size="default">Default — 44px height</Button>
      <Button size="lg">Large — 48px height</Button>
      <Button size="icon" variant="outline" aria-label="Search">
        <SearchIcon />
      </Button>
    </div>
  ),
  parameters: {
    viewport: { defaultViewport: 'mobile' },
  },
};
