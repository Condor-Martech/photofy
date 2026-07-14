import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
  AvatarBadge,
  AvatarGroup,
  AvatarGroupCount,
} from '../../components/ui/avatar';

const meta: Meta<typeof Avatar> = {
  title: 'Components/Avatar',
  component: Avatar,
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'default', 'lg'],
    },
  },
  args: {
    size: 'default',
  },
};

export default meta;
type Story = StoryObj<typeof Avatar>;

export const Default: Story = {
  render: (args) => (
    <Avatar {...args}>
      <AvatarImage src="https://i.pravatar.cc/150?u=photofy" alt="Participante" />
      <AvatarFallback>PH</AvatarFallback>
    </Avatar>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Avatar size="sm">
        <AvatarFallback>SM</AvatarFallback>
      </Avatar>
      <Avatar size="default">
        <AvatarFallback>MD</AvatarFallback>
      </Avatar>
      <Avatar size="lg">
        <AvatarFallback>LG</AvatarFallback>
      </Avatar>
    </div>
  ),
};

export const WithFallback: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Avatar size="sm">
        <AvatarFallback>AB</AvatarFallback>
      </Avatar>
      <Avatar size="default">
        <AvatarFallback>CD</AvatarFallback>
      </Avatar>
      <Avatar size="lg">
        <AvatarFallback>EF</AvatarFallback>
      </Avatar>
    </div>
  ),
};

export const WithBadge: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Avatar size="default">
        <AvatarFallback>PH</AvatarFallback>
        <AvatarBadge />
      </Avatar>
      <Avatar size="lg">
        <AvatarImage src="https://i.pravatar.cc/150?u=photofy" alt="User" />
        <AvatarFallback>PH</AvatarFallback>
        <AvatarBadge />
      </Avatar>
    </div>
  ),
};

export const Group: Story = {
  render: () => (
    <AvatarGroup>
      <Avatar size="default">
        <AvatarFallback>A</AvatarFallback>
      </Avatar>
      <Avatar size="default">
        <AvatarFallback>B</AvatarFallback>
      </Avatar>
      <Avatar size="default">
        <AvatarFallback>C</AvatarFallback>
      </Avatar>
      <AvatarGroupCount>+12</AvatarGroupCount>
    </AvatarGroup>
  ),
};

export const MobileModerationList: Story = {
  render: () => (
    <div className="flex flex-col gap-3 p-4">
      {[
        { name: 'Ana Silva', initials: 'AS' },
        { name: 'Bruno Costa', initials: 'BC' },
        { name: 'Carla Dias', initials: 'CD' },
      ].map((user) => (
        <div key={user.initials} className="flex items-center gap-3">
          <Avatar size="default">
            <AvatarFallback>{user.initials}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-sm font-medium">{user.name}</span>
            <span className="text-xs text-muted-foreground">Enviou 3 fotos</span>
          </div>
        </div>
      ))}
    </div>
  ),
  parameters: {
    viewport: { defaultViewport: 'mobile' },
  },
};
