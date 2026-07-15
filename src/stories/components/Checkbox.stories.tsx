import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Checkbox } from '../../components/ui/checkbox';
import { Label } from '../../components/ui/label';

const meta: Meta<typeof Checkbox> = {
  title: 'Components/Checkbox',
  component: Checkbox,
  argTypes: {
    disabled: { control: 'boolean' },
    defaultChecked: { control: 'boolean' },
  },
  args: {
    disabled: false,
    defaultChecked: false,
  },
};

export default meta;
type Story = StoryObj<typeof Checkbox>;

export const Default: Story = {};

export const WithLabel: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <Checkbox id="terms" />
      <Label htmlFor="terms">Aceito os termos de uso</Label>
    </div>
  ),
};

export const States: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Checkbox id="unchecked" />
        <Label htmlFor="unchecked">Unchecked</Label>
      </div>
      <div className="flex items-center gap-3">
        <Checkbox id="checked" defaultChecked />
        <Label htmlFor="checked">Checked</Label>
      </div>
      <div className="flex items-center gap-3">
        <Checkbox id="disabled" disabled />
        <Label htmlFor="disabled">Disabled</Label>
      </div>
      <div className="flex items-center gap-3">
        <Checkbox id="disabled-checked" disabled defaultChecked />
        <Label htmlFor="disabled-checked">Disabled + Checked</Label>
      </div>
      <div className="flex items-center gap-3">
        <Checkbox id="error" aria-invalid />
        <Label htmlFor="error">Error state</Label>
      </div>
    </div>
  ),
};

export const ConsentForm: Story = {
  render: () => (
    <div className="flex flex-col gap-4 p-4 max-w-sm">
      <p className="text-sm font-medium">Para enviar suas fotos, aceite:</p>
      <div className="flex items-start gap-3">
        <Checkbox id="terms-consent" className="mt-0.5" />
        <Label htmlFor="terms-consent" className="text-sm leading-relaxed">
          Li e aceito os termos de uso e a politica de privacidade
        </Label>
      </div>
      <div className="flex items-start gap-3">
        <Checkbox id="content-consent" className="mt-0.5" />
        <Label htmlFor="content-consent" className="text-sm leading-relaxed">
          Autorizo o uso da minha imagem no evento
        </Label>
      </div>
    </div>
  ),
  parameters: {
    viewport: { defaultViewport: 'mobile' },
  },
};
