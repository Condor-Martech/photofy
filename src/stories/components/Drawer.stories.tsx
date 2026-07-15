import type { Meta, StoryObj } from "@storybook/nextjs-vite"

import {
  Drawer,
  DrawerBody,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "../../components/ui/drawer"
import { Button } from "../../components/ui/button"

const meta: Meta<typeof Drawer> = {
  title: "Overlays/Drawer",
  component: Drawer,
  parameters: {
    docs: {
      description: {
        component:
          "Bottom sheet mobile-first. Padrão `side=\"bottom\"` para o polegar; use `side=\"right\"` para filtros/detalhes em desktop. Handle visual quando bottom facilita o gesto de fechar. `Drawer` substitui `Dialog` em fluxos longos em mobile.",
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof Drawer>

export const BottomSheet: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Padrão mobile: sheet subindo do rodapé, com handle. Respeita safe-area do iOS.",
      },
    },
  },
  render: () => (
    <Drawer>
      <DrawerTrigger render={<Button>Abrir menu de ações</Button>} />
      <DrawerContent side="bottom">
        <DrawerHeader>
          <DrawerTitle>Ações rápidas</DrawerTitle>
          <DrawerDescription>
            Escolha uma ação para este item da moderação.
          </DrawerDescription>
        </DrawerHeader>
        <DrawerBody>
          <div className="flex flex-col gap-2">
            <Button variant="outline" className="justify-start">Aprovar</Button>
            <Button variant="outline" className="justify-start">Reprovar</Button>
            <Button variant="outline" className="justify-start">Ver detalhes</Button>
            <Button variant="destructive" className="justify-start">Excluir</Button>
          </div>
        </DrawerBody>
        <DrawerFooter>
          <DrawerClose render={<Button variant="ghost">Cancelar</Button>} />
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  ),
}

export const RightSide: Story = {
  parameters: {
    docs: {
      description: {
        story: "Painel lateral para filtros/detalhes em desktop.",
      },
    },
  },
  render: () => (
    <Drawer>
      <DrawerTrigger render={<Button variant="outline">Filtros</Button>} />
      <DrawerContent side="right">
        <DrawerHeader>
          <DrawerTitle>Filtrar mídia</DrawerTitle>
          <DrawerDescription>
            Refine a fila de moderação por status, autor e data.
          </DrawerDescription>
        </DrawerHeader>
        <DrawerBody>
          <div className="flex flex-col gap-3 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" defaultChecked className="size-4" />
              Pendentes
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="size-4" /> Aprovados
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="size-4" /> Reprovados
            </label>
          </div>
        </DrawerBody>
        <DrawerFooter>
          <DrawerClose render={<Button variant="ghost">Cancelar</Button>} />
          <Button>Aplicar</Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  ),
}

export const LeftSide: Story = {
  render: () => (
    <Drawer>
      <DrawerTrigger render={<Button variant="outline">Menu</Button>} />
      <DrawerContent side="left">
        <DrawerHeader>
          <DrawerTitle>Navegação</DrawerTitle>
          <DrawerDescription>Painel do organizador.</DrawerDescription>
        </DrawerHeader>
        <DrawerBody>
          <nav className="flex flex-col gap-1 text-sm">
            <a className="rounded-md px-3 py-2 hover:bg-muted" href="#">Eventos</a>
            <a className="rounded-md px-3 py-2 hover:bg-muted" href="#">Moderação</a>
            <a className="rounded-md px-3 py-2 hover:bg-muted" href="#">Galeria</a>
            <a className="rounded-md px-3 py-2 hover:bg-muted" href="#">Solicitações de exclusão</a>
          </nav>
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  ),
}

export const TopBanner: Story = {
  render: () => (
    <Drawer>
      <DrawerTrigger render={<Button variant="outline">Notificações</Button>} />
      <DrawerContent side="top">
        <DrawerHeader>
          <DrawerTitle>Notificações recentes</DrawerTitle>
          <DrawerDescription>3 novas mídias aguardando moderação.</DrawerDescription>
        </DrawerHeader>
        <DrawerBody>
          <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
            <li>• Nova foto de <strong className="text-foreground">Ana</strong></li>
            <li>• Novo reel de <strong className="text-foreground">Pedro</strong></li>
            <li>• Nova foto de <strong className="text-foreground">Marina</strong></li>
          </ul>
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  ),
}
