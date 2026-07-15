import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';

const meta: Meta<typeof Input> = {
  title: 'Components/Input',
  component: Input,
  argTypes: {
    type: {
      control: 'select',
      options: ['text', 'email', 'password', 'number', 'tel', 'url', 'search'],
    },
    placeholder: { control: 'text' },
    disabled: { control: 'boolean' },
    'aria-invalid': { control: 'boolean' },
  },
  args: {
    type: 'text',
    placeholder: 'Seu nome',
    disabled: false,
  },
};

export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = {};

export const WithLabel: Story = {
  render: () => (
    <div className="flex flex-col gap-2 max-w-sm">
      <Label htmlFor="name">Nome do participante</Label>
      <Input id="name" placeholder="Digite seu nome" />
    </div>
  ),
};

export const Types: Story = {
  render: () => (
    <div className="flex flex-col gap-4 max-w-sm">
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" placeholder="voce@email.com" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Senha</Label>
        <Input id="password" type="password" placeholder="••••••••" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="tel">Telefone</Label>
        <Input id="tel" type="tel" placeholder="+55 11 99999-9999" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="search">Buscar</Label>
        <Input id="search" type="search" placeholder="Buscar evento..." />
      </div>
    </div>
  ),
};

export const States: Story = {
  render: () => (
    <div className="flex flex-col gap-4 max-w-sm">
      <div className="flex flex-col gap-2">
        <Label>Normal</Label>
        <Input placeholder="Estado normal" />
      </div>
      <div className="flex flex-col gap-2">
        <Label>Disabled</Label>
        <Input placeholder="Desabilitado" disabled />
      </div>
      <div className="flex flex-col gap-2">
        <Label>Error</Label>
        <Input placeholder="Campo invalido" aria-invalid />
      </div>
    </div>
  ),
};

export const MobileFullWidth: Story = {
  render: () => (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="author">Autor</Label>
        <Input id="author" placeholder="Seu nome" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="message">Mensagem</Label>
        <Input id="message" placeholder="Deixe uma mensagem" />
      </div>
    </div>
  ),
  parameters: {
    viewport: { defaultViewport: 'mobile' },
  },
};
