import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Stack, HStack, VStack } from '../../components/ui/stack';

const meta: Meta<typeof Stack> = {
  title: 'Layout/Stack',
  component: Stack,
  args: {
    spacing: '4',
    direction: 'column',
  },
  argTypes: {
    direction: {
      control: 'select',
      options: ['column', 'row'],
    },
    spacing: {
      control: 'select',
      options: ['0', '1', '2', '3', '4', '6', '8', '10', '12'],
    },
    align: {
      control: 'select',
      options: ['start', 'center', 'end', 'stretch', 'baseline'],
    },
    justify: {
      control: 'select',
      options: ['start', 'center', 'end', 'between', 'around', 'evenly'],
    },
    wrap: {
      control: 'boolean',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Stack>;

function Box({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center rounded-lg border border-border bg-muted/30 px-6 py-4 text-sm font-medium text-foreground">
      {label}
    </div>
  );
}

export const Vertical: Story = {
  render: (args) => (
    <Stack {...args} direction="column">
      <Box label="Item 1" />
      <Box label="Item 2" />
      <Box label="Item 3" />
    </Stack>
  ),
};

export const Horizontal: Story = {
  render: (args) => (
    <Stack {...args} direction="row">
      <Box label="Item 1" />
      <Box label="Item 2" />
      <Box label="Item 3" />
    </Stack>
  ),
};

export const SpacingComparison: Story = {
  render: () => (
    <div className="flex flex-col gap-8">
      {([2, 4, 6, 8] as const).map((spacing) => (
        <div key={spacing}>
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            gap-{spacing}
          </p>
          <VStack spacing={String(spacing)}>
            <Box label={`Item A - gap-${spacing}`} />
            <Box label={`Item B - gap-${spacing}`} />
            <Box label={`Item C - gap-${spacing}`} />
          </VStack>
        </div>
      ))}
    </div>
  ),
};

export const Alignments: Story = {
  render: () => (
    <div className="flex flex-col gap-8">
      {(['start', 'center', 'end', 'stretch'] as const).map((align) => (
        <div key={align}>
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            align-items: {align}
          </p>
          <HStack align={align} spacing="2" className="border border-dashed border-border rounded-lg p-4">
            <div className="rounded-lg bg-primary/10 px-4 py-2 text-sm">Short</div>
            <div className="rounded-lg bg-primary/10 px-4 py-6 text-sm">Tall</div>
            <div className="rounded-lg bg-primary/10 px-4 py-3 text-sm">Medium</div>
          </HStack>
        </div>
      ))}
    </div>
  ),
};

export const ResponsiveDirection: Story = {
  render: () => (
    <Stack
      direction={{ base: 'column', md: 'row' }}
      spacing="4"
      align="center"
    >
      <div className="rounded-xl bg-primary/10 p-6 text-center w-full md:w-auto">
        <p className="text-lg font-bold">Antes</p>
        <p className="text-sm text-muted-foreground">Empilhado em mobile</p>
      </div>
      <div className="text-muted-foreground hidden md:block">→</div>
      <div className="text-muted-foreground md:hidden">↓</div>
      <div className="rounded-xl bg-primary/10 p-6 text-center w-full md:w-auto">
        <p className="text-lg font-bold">Depois</p>
        <p className="text-sm text-muted-foreground">Lado a lado em desktop</p>
      </div>
    </Stack>
  ),
  parameters: {
    viewport: { defaultViewport: 'mobile' },
  },
};

export const Wrapped: Story = {
  render: () => (
    <HStack spacing="2" wrap>
      {Array.from({ length: 12 }, (_, i) => (
        <Box key={i} label={`Tag ${i + 1}`} />
      ))}
    </HStack>
  ),
};
