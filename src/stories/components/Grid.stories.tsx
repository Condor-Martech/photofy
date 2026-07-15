import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Grid } from '../../components/ui/grid';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';

const meta: Meta<typeof Grid> = {
  title: 'Layout/Grid',
  component: Grid,
  args: {
    cols: 3,
    gap: '4',
  },
  argTypes: {
    cols: { control: 'number', min: 1, max: 12 },
    gap: {
      control: 'select',
      options: ['0', '1', '2', '3', '4', '6', '8'],
    },
    align: {
      control: 'select',
      options: ['start', 'center', 'end', 'stretch', 'baseline'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Grid>;

function DemoCell({ children }: { children: string }) {
  return (
    <div className="flex items-center justify-center rounded-lg border border-border bg-muted/30 py-8 text-sm font-medium text-foreground">
      {children}
    </div>
  );
}

export const ThreeColumns: Story = {
  render: () => (
    <Grid cols={3} gap="4">
      <DemoCell>1</DemoCell>
      <DemoCell>2</DemoCell>
      <DemoCell>3</DemoCell>
      <DemoCell>4</DemoCell>
      <DemoCell>5</DemoCell>
      <DemoCell>6</DemoCell>
    </Grid>
  ),
};

export const ResponsiveColumns: Story = {
  render: () => (
    <Grid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} gap="4">
      {Array.from({ length: 8 }, (_, i) => (
        <DemoCell key={i}>{`Item ${i + 1}`}</DemoCell>
      ))}
    </Grid>
  ),
  parameters: {
    viewport: { defaultViewport: 'mobile' },
  },
};

export const EventGrid: Story = {
  render: () => (
    <Grid cols={{ base: 1, md: 2, lg: 3 }} gap="4">
      {[
        { nome: 'Casamento Ana & Pedro', data: '15 Mar 2026', fotos: 234, status: 'Ativo' },
        { nome: 'Formatura Medicina 2026', data: '20 Jun 2026', fotos: 1200, status: 'Ativo' },
        { nome: 'Aniversário 30 anos', data: '08 Ago 2026', fotos: 0, status: 'Rascunho' },
        { nome: 'Conferência Tech 2026', data: '12 Set 2026', fotos: 89, status: 'Ativo' },
        { nome: 'Casamento João & Maria', data: '04 Out 2026', fotos: 567, status: 'Ativo' },
        { nome: 'Festa de Fim de Ano', data: '31 Dez 2026', fotos: 45, status: 'Rascunho' },
      ].map((event) => (
        <Card key={event.nome}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">{event.nome}</CardTitle>
              <Badge variant={event.status === 'Ativo' ? 'default' : 'outline'}>
                {event.status}
              </Badge>
            </div>
            <CardDescription>{event.data}</CardDescription>
          </CardHeader>
          <CardContent>
            <span className="text-xs text-muted-foreground">{event.fotos} fotos</span>
          </CardContent>
        </Card>
      ))}
    </Grid>
  ),
};

export const GapComparison: Story = {
  render: () => (
    <div className="flex flex-col gap-8">
      {([2, 4, 8] as const).map((gap) => (
        <div key={gap}>
          <p className="mb-2 text-xs font-medium text-muted-foreground">gap-{gap}</p>
          <Grid cols={3} gap={String(gap)}>
            <DemoCell>A</DemoCell>
            <DemoCell>B</DemoCell>
            <DemoCell>C</DemoCell>
          </Grid>
        </div>
      ))}
    </div>
  ),
};

export const SingleColumnMobile: Story = {
  render: () => (
    <Grid cols={{ base: 1, sm: 2, md: 4 }} gap="3">
      <DemoCell>1 col (base)</DemoCell>
      <DemoCell>2 cols (sm)</DemoCell>
      <DemoCell>4 cols (md+)</DemoCell>
      <DemoCell>Responsivo</DemoCell>
    </Grid>
  ),
  parameters: {
    viewport: { defaultViewport: 'mobile' },
  },
};
