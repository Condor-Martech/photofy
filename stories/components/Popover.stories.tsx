import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { SettingsIcon } from "lucide-react"

import {
  Popover,
  PopoverArrow,
  PopoverClose,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from "../../components/ui/popover"
import { Button } from "../../components/ui/button"

const meta: Meta<typeof Popover> = {
  title: "Overlays/Popover",
  component: Popover,
  parameters: {
    docs: {
      description: {
        component:
          "Painel flutuante ancorado no trigger. Use para menus, formulários curtos e infos contextuais que caibam em ~288px de largura.",
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof Popover>

export const Default: Story = {
  render: () => (
    <Popover>
      <PopoverTrigger render={<Button variant="outline">Abrir popover</Button>} />
      <PopoverContent>
        <div className="grid gap-2">
          <PopoverTitle>Configurações do slideshow</PopoverTitle>
          <PopoverDescription>
            Ajuste o comportamento do telão em tempo real.
          </PopoverDescription>
          <div className="mt-2 grid gap-2 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" defaultChecked className="size-4" />
              Reels no telão
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" defaultChecked className="size-4" />
              Overlay do autor
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="size-4" />
              Escurecimento leve
            </label>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  ),
}

export const WithArrow: Story = {
  render: () => (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant="outline" size="icon" aria-label="Configurações">
            <SettingsIcon />
          </Button>
        }
      />
      <PopoverContent side="bottom" align="end">
        <PopoverArrow />
        <PopoverTitle>Preferências</PopoverTitle>
        <PopoverDescription>
          Todas as alterações são salvas automaticamente.
        </PopoverDescription>
      </PopoverContent>
    </Popover>
  ),
}

export const Sides: Story = {
  render: () => (
    <div className="grid gap-6 p-16">
      {(["top", "right", "bottom", "left"] as const).map((side) => (
        <div key={side} className="flex items-center gap-3">
          <span className="w-16 text-xs uppercase text-muted-foreground">
            {side}
          </span>
          <Popover>
            <PopoverTrigger
              render={<Button variant="outline">Side: {side}</Button>}
            />
            <PopoverContent side={side}>
              <PopoverArrow />
              <PopoverTitle>Popover {side}</PopoverTitle>
              <PopoverDescription>Ancorado no lado {side}.</PopoverDescription>
            </PopoverContent>
          </Popover>
        </div>
      ))}
    </div>
  ),
}

export const WithActions: Story = {
  render: () => (
    <Popover>
      <PopoverTrigger render={<Button>Mais ações</Button>} />
      <PopoverContent>
        <div className="grid gap-3">
          <PopoverTitle>Ações do evento</PopoverTitle>
          <div className="flex flex-col gap-1">
            <Button variant="ghost" className="justify-start">Duplicar</Button>
            <Button variant="ghost" className="justify-start">Arquivar</Button>
            <Button variant="ghost" className="justify-start text-destructive">
              Encerrar evento
            </Button>
          </div>
          <div className="flex justify-end gap-2 border-t border-border pt-2">
            <PopoverClose render={<Button variant="ghost" size="sm">Fechar</Button>} />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  ),
}
