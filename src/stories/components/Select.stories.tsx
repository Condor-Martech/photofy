import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Label } from '../../components/ui/label';

function SelectDemo({ disabled = false, placeholder = 'Selecione...' }: { disabled?: boolean; placeholder?: string }) {
  return (
    <Select disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Formato</SelectLabel>
          <SelectItem value="photo">Foto</SelectItem>
          <SelectItem value="reel">Reel</SelectItem>
          <SelectItem value="both">Ambos</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

const meta: Meta<typeof SelectDemo> = {
  title: 'Components/Select',
  component: SelectDemo,
  argTypes: {
    disabled: { control: 'boolean' },
    placeholder: { control: 'text' },
  },
  args: {
    disabled: false,
    placeholder: 'Selecione o formato',
  },
};

export default meta;
type Story = StoryObj<typeof SelectDemo>;

export const Default: Story = {};

export const WithLabel: Story = {
  render: () => (
    <div className="flex flex-col gap-2 max-w-sm">
      <Label>Tipo de midia</Label>
      <SelectDemo />
    </div>
  ),
};

export const States: Story = {
  render: () => (
    <div className="flex flex-col gap-4 max-w-sm">
      <div className="flex flex-col gap-2">
        <Label>Normal</Label>
        <SelectDemo />
      </div>
      <div className="flex flex-col gap-2">
        <Label>Disabled</Label>
        <SelectDemo disabled />
      </div>
    </div>
  ),
};

export const MobileFullWidth: Story = {
  render: () => (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex flex-col gap-2">
        <Label>Evento</Label>
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Selecione o evento" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Eventos ativos</SelectLabel>
              <SelectItem value="casamento-ana">Casamento Ana & Pedro</SelectItem>
              <SelectItem value="corp-2026">Evento Corporativo 2026</SelectItem>
              <SelectItem value="fest-15">Festa de 15 anos</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    </div>
  ),
  parameters: {
    viewport: { defaultViewport: 'mobile' },
  },
};
