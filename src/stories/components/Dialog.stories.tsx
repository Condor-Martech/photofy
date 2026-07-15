import type { Meta, StoryObj } from "@storybook/nextjs-vite"

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/ui/dialog"
import { Button } from "../../components/ui/button"

const meta: Meta<typeof Dialog> = {
  title: "Overlays/Dialog",
  component: Dialog,
  parameters: {
    docs: {
      description: {
        component:
          "Modal overlay para confirmações, formulários curtos e detalhes. Em mobile, considere usar `Drawer` para ações longas (mais confortável com o polegar).",
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof Dialog>

export const Default: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger
        render={<Button variant="outline">Abrir dialog</Button>}
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirmar publicação</DialogTitle>
          <DialogDescription>
            Esta foto vai para o telão do evento. Deseja aprovar agora?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose
            render={<Button variant="ghost">Cancelar</Button>}
          />
          <Button>Aprovar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
}

export const Destructive: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger
        render={<Button variant="destructive">Excluir item</Button>}
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir esta foto?</DialogTitle>
          <DialogDescription>
            Esta ação é permanente e será registrada em `deletion_request`.
            Só o organizador do evento pode reverter dentro de 24h.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="ghost">Cancelar</Button>} />
          <Button variant="destructive">Excluir</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
}

export const WithForm: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger render={<Button>Reportar conteúdo</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reportar este item</DialogTitle>
          <DialogDescription>
            O organizador do evento revisa cada denúncia. O envio é anônimo
            para o autor do conteúdo.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2 text-sm">
          <label htmlFor="motivo" className="font-medium text-foreground">
            Motivo
          </label>
          <textarea
            id="motivo"
            rows={4}
            className="w-full rounded-lg border border-input bg-transparent p-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            placeholder="Descreva brevemente o problema..."
          />
        </div>
        <DialogFooter>
          <DialogClose render={<Button variant="ghost">Cancelar</Button>} />
          <Button>Enviar denúncia</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
}

export const OpenByDefault: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Uncontrolled com `defaultOpen`, útil para debug em Storybook. Em prod, prefira controlar com `open` + `onOpenChange`.",
      },
    },
  },
  render: () => (
    <Dialog defaultOpen>
      <DialogTrigger render={<Button variant="outline">Trigger</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Título</DialogTitle>
          <DialogDescription>Descrição do dialog.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button>OK</Button>} />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
}
