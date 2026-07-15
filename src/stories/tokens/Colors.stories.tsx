import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { colors } from '../../src/design-tokens/tokens';

function Swatch({ color, name }: { color: string; name: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="w-16 h-16 rounded-lg border border-neutral-200 shadow-sm"
        style={{ backgroundColor: color }}
      />
      <span className="text-xs text-neutral-600 font-mono">{name}</span>
      <span className="text-xs text-neutral-400 font-mono">{color}</span>
    </div>
  );
}

function ColorScale({ name, scale }: { name: string; scale: Record<string, string> }) {
  return (
    <div className="mb-8">
      <h3 className="text-lg font-semibold text-neutral-800 mb-4 capitalize">{name}</h3>
      <div className="flex flex-wrap gap-3">
        {Object.entries(scale).map(([shade, value]) => (
          <Swatch key={shade} color={value} name={`${name}-${shade}`} />
        ))}
      </div>
    </div>
  );
}

function Colors() {
  return (
    <div className="p-6 max-w-5xl">
      <h1 className="text-2xl font-bold text-neutral-900 mb-2">Color Tokens</h1>
      <p className="text-sm text-neutral-500 mb-8">
        Paleta de cores do Photofy. Inspirada na limpeza visual do Twenty CRM, adaptada para o contexto de eventos.
      </p>
      <ColorScale name="primary" scale={colors.primary} />
      <ColorScale name="neutral" scale={colors.neutral} />
      <ColorScale name="success" scale={colors.success} />
      <ColorScale name="warning" scale={colors.warning} />
      <ColorScale name="error" scale={colors.error} />
      <ColorScale name="info" scale={colors.info} />
    </div>
  );
}

const meta: Meta<typeof Colors> = {
  title: 'Design Tokens/Colors',
  component: Colors,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof Colors>;

export const AllColors: Story = {};
