import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { InfoIcon, TrashIcon, PencilIcon } from "lucide-react"

import {
  Tooltip,
  TooltipArrow,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../components/ui/tooltip"
import { Button } from "../../components/ui/button"

const meta: Meta<typeof Tooltip> = {
  title: "Overlays/Tooltip",
  component: Tooltip,
  decorators: [
    (Story) => (
      <TooltipProvider delay={100}>
        <div className="p-10">
          <Story />
        </div>
      </TooltipProvider>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          "Dica curta em hover/focus. Não use como fonte primária de informação — em mobile o hover não existe, então use `aria-label`/label visível quando o conteúdo for essencial.",
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof Tooltip>

export const Default: Story = {
  render: () => (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button variant="outline" size="icon" aria-label="Informação">
            <InfoIcon />
          </Button>
        }
      />
      <TooltipContent>Este item foi aprovado às 21:34</TooltipContent>
    </Tooltip>
  ),
}

export const WithArrow: Story = {
  render: () => (
    <Tooltip>
      <TooltipTrigger render={<Button variant="ghost">Hover me</Button>} />
      <TooltipContent>
        <TooltipArrow />
        Tooltip com seta
      </TooltipContent>
    </Tooltip>
  ),
}

export const IconButtons: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Padrão típico: tooltips revelam o label textual de botões só-ícone. O `aria-label` continua sendo obrigatório para leitores de tela e touch.",
      },
    },
  },
  render: () => (
    <div className="flex items-center gap-2">
      <Tooltip>
        <TooltipTrigger
          render={
            <Button variant="ghost" size="icon" aria-label="Editar">
              <PencilIcon />
            </Button>
          }
        />
        <TooltipContent>Editar</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button variant="ghost" size="icon" aria-label="Excluir">
              <TrashIcon />
            </Button>
          }
        />
        <TooltipContent>Excluir</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button variant="ghost" size="icon" aria-label="Info">
              <InfoIcon />
            </Button>
          }
        />
        <TooltipContent>Ver detalhes de auditoria</TooltipContent>
      </Tooltip>
    </div>
  ),
}

export const Sides: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-8 p-16">
      {(["top", "right", "bottom", "left"] as const).map((side) => (
        <Tooltip key={side}>
          <TooltipTrigger
            render={<Button variant="outline">Side: {side}</Button>}
          />
          <TooltipContent side={side}>Tooltip {side}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  ),
}
