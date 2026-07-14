import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { RadioGroup, RadioGroupItem } from '../../components/ui/radio-group';
import { Label } from '../../components/ui/label';

function RadioGroupDemo({ disabled = false }: { disabled?: boolean }) {
  return (
    <RadioGroup defaultValue="photo" disabled={disabled}>
      <div className="flex items-center gap-3">
        <RadioGroupItem value="photo" id="radio-photo" />
        <Label htmlFor="radio-photo">Foto</Label>
      </div>
      <div className="flex items-center gap-3">
        <RadioGroupItem value="reel" id="radio-reel" />
        <Label htmlFor="radio-reel">Reel</Label>
      </div>
      <div className="flex items-center gap-3">
        <RadioGroupItem value="both" id="radio-both" />
        <Label htmlFor="radio-both">Ambos</Label>
      </div>
    </RadioGroup>
  );
}

const meta: Meta<typeof RadioGroupDemo> = {
  title: 'Components/RadioGroup',
  component: RadioGroupDemo,
  argTypes: {
    disabled: { control: 'boolean' },
  },
  args: {
    disabled: false,
  },
};

export default meta;
type Story = StoryObj<typeof RadioGroupDemo>;

export const Default: Story = {};

export const States: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm font-medium mb-3">Normal</p>
        <RadioGroupDemo />
      </div>
      <div>
        <p className="text-sm font-medium mb-3">Disabled</p>
        <RadioGroupDemo disabled />
      </div>
    </div>
  ),
};

export const MobileLayout: Story = {
  render: () => (
    <div className="flex flex-col gap-4 p-4">
      <p className="text-sm font-medium">Tipo de envio:</p>
      <RadioGroup defaultValue="individual">
        <div className="flex items-center gap-3">
          <RadioGroupItem value="individual" id="ind" />
          <Label htmlFor="ind">Individual</Label>
        </div>
        <div className="flex items-center gap-3">
          <RadioGroupItem value="batch" id="batch" />
          <Label htmlFor="batch">Em lote</Label>
        </div>
        <div className="flex items-center gap-3">
          <RadioGroupItem value="qr" id="qr" />
          <Label htmlFor="qr">Via QR Code</Label>
        </div>
      </RadioGroup>
    </div>
  ),
  parameters: {
    viewport: { defaultViewport: 'mobile' },
  },
};
