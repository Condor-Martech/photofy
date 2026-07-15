import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { spacing } from '../../src/design-tokens/tokens';

function SpacingScale() {
  return (
    <div className="space-y-3">
      {Object.entries(spacing).map(([key, value]) => (
        <div key={key} className="flex items-center gap-4">
          <span className="w-12 text-xs text-neutral-400 font-mono text-right shrink-0">{key}</span>
          <span className="w-20 text-xs text-neutral-400 font-mono shrink-0">{value}</span>
          <div
            className="h-6 bg-primary-500 rounded-sm"
            style={{ width: value }}
          />
        </div>
      ))}
    </div>
  );
}

function SpacingInContext() {
  return (
    <div className="mt-8">
      <h3 className="text-lg font-semibold text-neutral-800 mb-4">Spacing in Context</h3>
      <div className="space-y-6">
        <div>
          <span className="text-xs text-neutral-400 font-mono block mb-2">Card com spacing-4 (1rem) de padding</span>
          <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4">
            <p className="text-sm text-neutral-700">Upload confirmado — sua foto foi recebida!</p>
          </div>
        </div>
        <div>
          <span className="text-xs text-neutral-400 font-mono block mb-2">Lista com spacing-3 (0.75rem) entre itens</span>
          <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4">
            {['Foto aprovada', 'Reel em processamento', 'Pendente de moderação'].map((item, i) => (
              <div key={i} className={`py-3 text-sm text-neutral-700 ${i < 2 ? 'border-b border-neutral-200' : ''}`}>
                {item}
              </div>
            ))}
          </div>
        </div>
        <div>
          <span className="text-xs text-neutral-400 font-mono block mb-2">Botão com spacing-2 (0.5rem) / spacing-4 (1rem)</span>
          <button className="bg-primary-600 text-white text-sm font-medium rounded-lg py-2 px-4 min-h-[44px]">
            Enviar foto
          </button>
        </div>
      </div>
    </div>
  );
}

function Spacing() {
  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-bold text-neutral-900 mb-2">Spacing Tokens</h1>
      <p className="text-sm text-neutral-500 mb-8">
        Escala de espaçamento baseada em grid de 4px. Mobile-first: espaçamentos menores para telas pequenas, crescendo progressivamente.
      </p>
      <SpacingScale />
      <SpacingInContext />
    </div>
  );
}

const meta: Meta<typeof Spacing> = {
  title: 'Design Tokens/Spacing',
  component: Spacing,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof Spacing>;

export const AllSpacing: Story = {};
