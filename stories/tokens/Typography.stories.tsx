import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { typography } from '../../src/design-tokens/tokens';

function FontScale() {
  return (
    <div className="mb-8">
      <h3 className="text-lg font-semibold text-neutral-800 mb-4">Font Scale</h3>
      <div className="space-y-4">
        {Object.entries(typography.fontSize).map(([name, [size, opts]]) => (
          <div key={name} className="flex items-baseline gap-4 border-b border-neutral-100 pb-3">
            <span className="w-16 text-xs text-neutral-400 font-mono shrink-0">{name}</span>
            <span className="w-24 text-xs text-neutral-400 font-mono shrink-0">{size} / {opts.lineHeight}</span>
            <span style={{ fontSize: size, lineHeight: opts.lineHeight }} className="text-neutral-900">
              Photofy — Fotos e Reels ao Vivo
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FontWeights() {
  return (
    <div className="mb-8">
      <h3 className="text-lg font-semibold text-neutral-800 mb-4">Font Weights</h3>
      <div className="space-y-3">
        {Object.entries(typography.fontWeight).map(([name, weight]) => (
          <div key={name} className="flex items-baseline gap-4">
            <span className="w-24 text-xs text-neutral-400 font-mono shrink-0">{name} ({weight})</span>
            <span style={{ fontWeight: weight }} className="text-lg text-neutral-900">
              Moderação em tempo real — aprovar, reprovar, reverter
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LetterSpacings() {
  return (
    <div className="mb-8">
      <h3 className="text-lg font-semibold text-neutral-800 mb-4">Letter Spacing</h3>
      <div className="space-y-3">
        {Object.entries(typography.letterSpacing).map(([name, value]) => (
          <div key={name} className="flex items-baseline gap-4">
            <span className="w-24 text-xs text-neutral-400 font-mono shrink-0">{name} ({value})</span>
            <span style={{ letterSpacing: value }} className="text-base text-neutral-900">
              UPLOAD DE FOTOS E REELS PARA EVENTOS DE MARCA
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FontFamilies() {
  return (
    <div className="mb-8">
      <h3 className="text-lg font-semibold text-neutral-800 mb-4">Font Families</h3>
      <div className="space-y-4">
        <div>
          <span className="text-xs text-neutral-400 font-mono block mb-1">sans</span>
          <span className="text-xl text-neutral-900" style={{ fontFamily: typography.fontFamily.sans.join(', ') }}>
            Inter — Tipografia principal para UI e texto corrido
          </span>
        </div>
        <div>
          <span className="text-xs text-neutral-400 font-mono block mb-1">mono</span>
          <span className="text-xl text-neutral-900" style={{ fontFamily: typography.fontFamily.mono.join(', ') }}>
            JetBrains Mono — Código, slugs, IDs e dados técnicos
          </span>
        </div>
      </div>
    </div>
  );
}

function Typography() {
  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-bold text-neutral-900 mb-2">Typography Tokens</h1>
      <p className="text-sm text-neutral-500 mb-8">
        Escala tipográfica mobile-first. Inter como fonte principal pela legibilidade em dados e UI densa.
      </p>
      <FontFamilies />
      <FontScale />
      <FontWeights />
      <LetterSpacings />
    </div>
  );
}

const meta: Meta<typeof Typography> = {
  title: 'Design Tokens/Typography',
  component: Typography,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof Typography>;

export const AllTypography: Story = {};
