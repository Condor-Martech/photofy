import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
  TableFooter,
} from '../../components/ui/table';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Avatar, AvatarFallback } from '../../components/ui/avatar';
import {
  CheckIcon,
  ClockIcon,
  AlertTriangleIcon,
  ArrowUpDownIcon,
} from 'lucide-react';

const meta: Meta<typeof Table> = {
  title: 'Components/Table',
  component: Table,
  args: {},
};

export default meta;
type Story = StoryObj<typeof Table>;

const moderationData = [
  { id: 1, participant: 'Ana Silva', initials: 'AS', photos: 12, approved: 10, pending: 2, rejected: 0 },
  { id: 2, participant: 'Bruno Costa', initials: 'BC', photos: 8, approved: 5, pending: 1, rejected: 2 },
  { id: 3, participant: 'Carla Dias', initials: 'CD', photos: 23, approved: 20, pending: 3, rejected: 0 },
  { id: 4, participant: 'Diego Ferreira', initials: 'DF', photos: 5, approved: 5, pending: 0, rejected: 0 },
  { id: 5, participant: 'Elena Rodrigues', initials: 'ER', photos: 17, approved: 12, pending: 4, rejected: 1 },
];

export const Default: Story = {
  render: () => (
    <Table>
      <TableCaption>Participantes do evento — moderação de fotos</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Participante</TableHead>
          <TableHead className="text-right">Fotos</TableHead>
          <TableHead className="text-right">Aprovadas</TableHead>
          <TableHead className="text-right">Pendentes</TableHead>
          <TableHead className="text-right">Reprovadas</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {moderationData.map((row) => (
          <TableRow key={row.id}>
            <TableCell className="font-medium">
              <div className="flex items-center gap-2">
                <Avatar size="sm">
                  <AvatarFallback>{row.initials}</AvatarFallback>
                </Avatar>
                {row.participant}
              </div>
            </TableCell>
            <TableCell className="text-right">{row.photos}</TableCell>
            <TableCell className="text-right">{row.approved}</TableCell>
            <TableCell className="text-right">{row.pending}</TableCell>
            <TableCell className="text-right">{row.rejected}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ),
};

export const Sortable: Story = {
  render: () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>
            <button className="flex items-center gap-1 hover:text-foreground">
              Participante <ArrowUpDownIcon className="size-3" />
            </button>
          </TableHead>
          <TableHead className="text-right">
            <button className="ml-auto flex items-center gap-1 hover:text-foreground">
              Fotos <ArrowUpDownIcon className="size-3" />
            </button>
          </TableHead>
          <TableHead className="text-right">Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {moderationData.map((row) => (
          <TableRow key={row.id}>
            <TableCell className="font-medium">{row.participant}</TableCell>
            <TableCell className="text-right">{row.photos}</TableCell>
            <TableCell className="text-right">
              <Badge variant={row.pending > 0 ? 'secondary' : 'default'}>
                {row.pending > 0 ? (
                  <><ClockIcon data-icon="inline-start" />{row.pending} pendentes</>
                ) : (
                  <><CheckIcon data-icon="inline-start" />Tudo revisado</>
                )}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ),
};

export const WithFooter: Story = {
  render: () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Participante</TableHead>
          <TableHead className="text-right">Fotos</TableHead>
          <TableHead className="text-right">Aprovadas</TableHead>
          <TableHead className="text-right">Pendentes</TableHead>
          <TableHead className="text-right">Reprovadas</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {moderationData.map((row) => (
          <TableRow key={row.id}>
            <TableCell className="font-medium">{row.participant}</TableCell>
            <TableCell className="text-right">{row.photos}</TableCell>
            <TableCell className="text-right">{row.approved}</TableCell>
            <TableCell className="text-right">{row.pending}</TableCell>
            <TableCell className="text-right">{row.rejected}</TableCell>
          </TableRow>
        ))}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell className="font-medium">Total</TableCell>
          <TableCell className="text-right">
            {moderationData.reduce((s, r) => s + r.photos, 0)}
          </TableCell>
          <TableCell className="text-right">
            {moderationData.reduce((s, r) => s + r.approved, 0)}
          </TableCell>
          <TableCell className="text-right">
            {moderationData.reduce((s, r) => s + r.pending, 0)}
          </TableCell>
          <TableCell className="text-right">
            {moderationData.reduce((s, r) => s + r.rejected, 0)}
          </TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  ),
};

export const MobileResponsiveCards: Story = {
  render: () => (
    <div className="p-4">
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Participante</TableHead>
              <TableHead className="text-right">Fotos</TableHead>
              <TableHead className="text-right">Aprovadas</TableHead>
              <TableHead className="text-right">Pendentes</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {moderationData.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <Avatar size="sm">
                      <AvatarFallback>{row.initials}</AvatarFallback>
                    </Avatar>
                    {row.participant}
                  </div>
                </TableCell>
                <TableCell className="text-right">{row.photos}</TableCell>
                <TableCell className="text-right">{row.approved}</TableCell>
                <TableCell className="text-right">{row.pending}</TableCell>
                <TableCell className="text-right">
                  <Badge variant={row.pending > 0 ? 'secondary' : 'default'}>
                    {row.pending > 0 ? 'Pendente' : 'Revisado'}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-3 md:hidden">
        {moderationData.map((row) => (
          <Card key={row.id}>
            <CardContent className="py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Avatar size="sm">
                    <AvatarFallback>{row.initials}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">{row.participant}</span>
                </div>
                <Badge variant={row.pending > 0 ? 'secondary' : 'default'}>
                  {row.pending > 0 ? (
                    <><ClockIcon data-icon="inline-start" />{row.pending}</>
                  ) : (
                    <><CheckIcon data-icon="inline-start" />OK</>
                  )}
                </Badge>
              </div>
              <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                <span>{row.photos} fotos</span>
                <span>{row.approved} aprovadas</span>
                {row.rejected > 0 && (
                  <span className="flex items-center gap-0.5 text-destructive">
                    <AlertTriangleIcon className="size-3" />
                    {row.rejected}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  ),
  parameters: {
    viewport: { defaultViewport: 'mobile' },
  },
};
