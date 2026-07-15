import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { breakpoints, touchTarget } from '../../src/design-tokens/tokens';

function BreakpointTable() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200">
            <th className="text-left py-3 px-4 text-neutral-600 font-medium">Token</th>
            <th className="text-left py-3 px-4 text-neutral-600 font-medium">Valor</th>
            <th className="text-left py-3 px-4 text-neutral-600 font-medium">Uso</th>
            <th className="text-left py-3 px-4 text-neutral-600 font-medium">Persona principal</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-neutral-100">
            <td className="py-3 px-4 font-mono text-xs text-neutral-500">base (mobile)</td>
            <td className="py-3 px-4 font-mono text-xs text-neutral-500">&lt; 640px</td>
            <td className="py-3 px-4 text-neutral-700">Upload via QR, galeria mobile</td>
            <td className="py-3 px-4 text-neutral-700">Participante</td>
          </tr>
          {Object.entries(breakpoints).map(([name, value]) => {
            const usage: Record<string, { usage: string; persona: string }> = {
              sm: { usage: 'Layout de 2 colunas, formulário mais largo', persona: 'Participante (landscape)' },
              md: { usage: 'Navegação lateral, painel de moderação compacto', persona: 'Moderador (tablet)' },
              lg: { usage: 'Painel completo, tabela de dados, sidebar', persona: 'Moderador / Organizador' },
              xl: { usage: 'Dashboard multi-painel, slideshow config', persona: 'Organizador (desktop)' },
              '2xl': { usage: 'Telão, data grids densos', persona: 'Operador / Admin' },
            };
            const info = usage[name] || { usage: '—', persona: '—' };
            return (
              <tr key={name} className="border-b border-neutral-100">
                <td className="py-3 px-4 font-mono text-xs text-neutral-500">{name}</td>
                <td className="py-3 px-4 font-mono text-xs text-neutral-500">{value}</td>
                <td className="py-3 px-4 text-neutral-700">{info.usage}</td>
                <td className="py-3 px-4 text-neutral-700">{info.persona}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function TouchTargets() {
  return (
    <div className="mt-8">
      <h3 className="text-lg font-semibold text-neutral-800 mb-4">Touch Targets (Mobile-first)</h3>
      <p className="text-sm text-neutral-500 mb-4">
        WCAG 2.5.5 recomenda mínimo de 44x44px para touch targets. Participante usa celular — todos os elementos interativos devem respeitar isso.
      </p>
      <div className="flex flex-wrap gap-6 items-end">
        <div className="flex flex-col items-center gap-2">
          <div
            className="bg-primary-600 text-white rounded-lg flex items-center justify-center text-sm font-medium"
            style={{ width: touchTarget.min, height: touchTarget.min }}
          >
            44px
          </div>
          <span className="text-xs text-neutral-400 font-mono">min ({touchTarget.min})</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <div
            className="bg-primary-600 text-white rounded-lg flex items-center justify-center text-sm font-medium"
            style={{ width: touchTarget.comfortable, height: touchTarget.comfortable }}
          >
            48px
          </div>
          <span className="text-xs text-neutral-400 font-mono">comfortable ({touchTarget.comfortable})</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <button className="bg-primary-600 text-white rounded-lg px-4 text-sm font-medium min-h-[44px]">
            Enviar foto
          </button>
          <span className="text-xs text-neutral-400 font-mono">button (min-h-touch)</span>
        </div>
      </div>
    </div>
  );
}

function ResponsiveDemo() {
  return (
    <div className="mt-8">
      <h3 className="text-lg font-semibold text-neutral-800 mb-4">Responsive Demo</h3>
      <p className="text-sm text-neutral-500 mb-4">
        Redimensione o viewport do Storybook para ver as mudanças. Use os viewports configurados no addon de viewport.
      </p>
      <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {['Upload', 'Moderação', 'Slideshow', 'Galeria'].map((item) => (
            <div key={item} className="bg-white border border-neutral-200 rounded-lg p-4 text-center">
              <span className="text-sm font-medium text-neutral-700">{item}</span>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-neutral-400 font-mono">
          grid-cols-1 → md:grid-cols-2 → lg:grid-cols-4
        </p>
      </div>
    </div>
  );
}

function Breakpoints() {
  return (
    <div className="p-6 max-w-5xl">
      <h1 className="text-2xl font-bold text-neutral-900 mb-2">Breakpoints & Touch Targets</h1>
      <p className="text-sm text-neutral-500 mb-8">
        Breakpoints mobile-first. O design parte do menor viewport (mobile) e escala para cima. A persona Participante usa majoritariamente celular.
      </p>
      <BreakpointTable />
      <TouchTargets />
      <ResponsiveDemo />
    </div>
  );
}

const meta: Meta<typeof Breakpoints> = {
  title: 'Design Tokens/Breakpoints',
  component: Breakpoints,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof Breakpoints>;

export const AllBreakpoints: Story = {};
