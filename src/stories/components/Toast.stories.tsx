import type { Meta, StoryObj } from "@storybook/nextjs-vite"

import { Toaster, useToast } from "../../components/ui/toast"
import { Button } from "../../components/ui/button"

function ToastPlayground() {
  const toast = useToast()

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        onClick={() =>
          toast.add({
            title: "Foto aprovada",
            description: "Já apareceu no telão do evento.",
            type: "success",
          })
        }
      >
        Success
      </Button>
      <Button
        variant="outline"
        onClick={() =>
          toast.add({
            title: "Falha no upload",
            description: "Verifique a conexão do dispositivo e tente novamente.",
            type: "error",
          })
        }
      >
        Error
      </Button>
      <Button
        variant="outline"
        onClick={() =>
          toast.add({
            title: "Fila alta",
            description: "Mais de 20 itens aguardando moderação.",
            type: "warning",
          })
        }
      >
        Warning
      </Button>
      <Button
        variant="outline"
        onClick={() =>
          toast.add({
            title: "Slideshow atualizado",
            description: "A configuração foi propagada para o dispositivo pareado.",
            type: "info",
          })
        }
      >
        Info
      </Button>
      <Button
        variant="ghost"
        onClick={() =>
          toast.add({
            title: "Item reprovado",
            description: "Foi registrado em moderation_log.",
            type: "error",
            actionProps: {
              children: "Reverter",
              onClick: () =>
                toast.add({
                  title: "Reversão registrada",
                  type: "success",
                }),
            },
          })
        }
      >
        Com ação
      </Button>
      <Button
        variant="ghost"
        onClick={() =>
          toast.add({
            title: "Persistente",
            description: "Este toast não dispensa sozinho. Feche no X.",
            type: "info",
            timeout: 0,
          })
        }
      >
        Persistente
      </Button>
    </div>
  )
}

const meta: Meta<typeof Toaster> = {
  title: "Overlays/Toast",
  component: Toaster,
  parameters: {
    docs: {
      description: {
        component:
          "Notificações não modais. `Toaster` provê o `Provider` + `Viewport` prontos. Chame `useToast().add({...})` de qualquer lugar da árvore. Em mobile, aparecem centrados no rodapé respeitando safe-area; em desktop, canto inferior direito.",
      },
    },
  },
  render: () => (
    <Toaster>
      <ToastPlayground />
    </Toaster>
  ),
}

export default meta
type Story = StoryObj<typeof Toaster>

export const Playground: Story = {}

export const AutoDismissed: Story = {
  render: () => (
    <Toaster timeout={3000}>
      <AutoTrigger />
    </Toaster>
  ),
}

function AutoTrigger() {
  const toast = useToast()
  return (
    <Button
      onClick={() =>
        toast.add({
          title: "Auto-dismissed em 3s",
          type: "info",
        })
      }
    >
      Disparar
    </Button>
  )
}
