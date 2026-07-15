import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Container } from '../../components/ui/container';

const meta: Meta<typeof Container> = {
  title: 'Layout/Container',
  component: Container,
  args: {
    size: 'lg',
    padding: 'md',
  },
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'xl', 'full'],
    },
    padding: {
      control: 'select',
      options: ['none', 'sm', 'md', 'lg'],
    },
    as: {
      control: 'select',
      options: ['div', 'section', 'article', 'main', 'header', 'footer', 'nav'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Container>;

export const Default: Story = {
  render: (args) => (
    <Container {...args}>
      <div className="flex items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/30 bg-muted/20 py-16 text-sm text-muted-foreground">
        Container Content
      </div>
    </Container>
  ),
};

export const SizeComparison: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      {(['sm', 'md', 'lg', 'xl', 'full'] as const).map((size) => (
        <div key={size}>
          <p className="mb-1 text-xs font-medium text-muted-foreground">
            {size}
          </p>
          <Container size={size} padding="none">
            <div className="flex items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/30 bg-muted/20 py-8 text-sm text-muted-foreground">
              max-w-{size}
            </div>
          </Container>
        </div>
      ))}
    </div>
  ),
};

export const ResponsivePadding: Story = {
  render: () => (
    <Container size="lg" padding="md">
      <div className="rounded-xl border bg-card p-4 text-sm text-card-foreground shadow-sm">
        <p className="font-medium">Padding responsivo</p>
        <p className="mt-1 text-muted-foreground">
          px-4 em mobile, px-6 em tablet, px-8 em desktop
        </p>
      </div>
    </Container>
  ),
};

export const SectionExample: Story = {
  render: () => (
    <div className="flex flex-col gap-8">
      <Container as="section" size="md">
        <div className="rounded-xl border bg-card p-4 text-sm">
          <h3 className="font-semibold">Seção MD</h3>
          <p className="text-muted-foreground">Container de tamanho médio com elemento &lt;section&gt;.</p>
        </div>
      </Container>
      <Container as="section" size="xl">
        <div className="rounded-xl border bg-card p-4 text-sm">
          <h3 className="font-semibold">Seção XL</h3>
          <p className="text-muted-foreground">Container amplo para páginas com muito conteúdo.</p>
        </div>
      </Container>
    </div>
  ),
};
