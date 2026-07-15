import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { BottomNav, Sidebar, AdaptiveNav } from '../../components/ui/navigation';
import { HomeIcon, CameraIcon, ImageIcon, SettingsIcon, UsersIcon, BellIcon, SearchIcon } from 'lucide-react';

const defaultItems = [
  { label: 'Início', icon: <HomeIcon />, href: '#', isActive: true },
  { label: 'Eventos', icon: <CameraIcon />, href: '#' },
  { label: 'Galeria', icon: <ImageIcon />, href: '#' },
  { label: 'Ajustes', icon: <SettingsIcon />, href: '#' },
];

const manyItems = [
  { label: 'Início', icon: <HomeIcon />, href: '#', isActive: true },
  { label: 'Buscar', icon: <SearchIcon />, href: '#' },
  { label: 'Eventos', icon: <CameraIcon />, href: '#' },
  { label: 'Galeria', icon: <ImageIcon />, href: '#' },
  { label: 'Notificações', icon: <BellIcon />, href: '#' },
  { label: 'Usuários', icon: <UsersIcon />, href: '#' },
  { label: 'Ajustes', icon: <SettingsIcon />, href: '#' },
];

const meta: Meta<typeof BottomNav> = {
  title: 'Layout/Navigation',
  component: BottomNav,
  args: { items: defaultItems },
};

export default meta;
type Story = StoryObj<typeof BottomNav>;

export const MobileBottomNav: Story = {
  render: (args) => (
    <div className="min-h-[200px]">
      <BottomNav {...args} />
    </div>
  ),
  parameters: {
    viewport: { defaultViewport: 'mobile' },
    layout: 'fullscreen',
  },
};

export const DesktopSidebar: Story = {
  render: () => (
    <div className="flex min-h-[400px] border border-border rounded-lg overflow-hidden">
      <Sidebar items={defaultItems} />
      <main className="flex-1 bg-muted/20 p-6">
        <h2 className="text-lg font-semibold">Conteúdo Principal</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Sidebar visível em md+ com 56 de largura.
        </p>
      </main>
    </div>
  ),
  parameters: {
    viewport: { defaultViewport: 'desktop' },
  },
};

export const Adaptive: Story = {
  render: () => (
    <div className="flex min-h-[400px]">
      <AdaptiveNav items={defaultItems} />
      <main className="flex-1 bg-muted/20 p-4 md:p-6">
        <h2 className="text-lg font-semibold">Dashboard</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Mobile: BottomNav com backdrop blur.
          Desktop: Sidebar com 56 de largura, visível a partir de md.
        </p>
      </main>
    </div>
  ),
  parameters: {
    layout: 'fullscreen',
  },
};

export const AdaptiveManyItems: Story = {
  render: () => (
    <div className="flex min-h-[400px]">
      <AdaptiveNav items={manyItems} />
      <main className="flex-1 bg-muted/20 p-4 md:p-6">
        <h2 className="text-lg font-semibold">Navegação Completa</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          7 itens — BottomNav no mobile, Sidebar completa no desktop.
        </p>
      </main>
    </div>
  ),
  parameters: {
    layout: 'fullscreen',
  },
};

export const ActiveState: Story = {
  render: () => (
    <div className="min-h-[200px]">
      <BottomNav
        items={[
          { label: 'Início', icon: <HomeIcon />, href: '#', isActive: false },
          { label: 'Eventos', icon: <CameraIcon />, href: '#', isActive: true },
          { label: 'Galeria', icon: <ImageIcon />, href: '#', isActive: false },
          { label: 'Ajustes', icon: <SettingsIcon />, href: '#', isActive: false },
        ]}
      />
    </div>
  ),
  parameters: {
    viewport: { defaultViewport: 'mobile' },
    layout: 'fullscreen',
  },
};
