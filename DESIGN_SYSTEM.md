# Photofy Design System

Documento vivo. Atualize conforme novos tokens ou componentes forem adicionados.

---

## Tokens

Definidos em `src/design-tokens/tokens.ts` e mapeados para Tailwind em `tailwind.config.ts`.

### Color

| Token       | Tailwind              | Uso                                        |
| ----------- | --------------------- | ------------------------------------------ |
| `brand`     | `bg-brand-*`          | Acoes primarias, links, realce             |
| `neutral`   | `bg-neutral-*`        | Texto, fundos, bordas                      |
| `success`   | `bg-success-*`        | Confirmacao, toast de sucesso              |
| `warning`   | `bg-warning-*`        | Avisos, toast de alerta                    |
| `error`     | `bg-error-*`          | Erro, acao destrutiva                      |
| `info`      | `bg-info-*`           | Informacao, toast informativo              |

Para cores semanticas (componentes shadcn) usar as variaveis CSS em `src/app/globals.css`:

- `bg-primary`, `bg-secondary`, `bg-muted`, `bg-accent`, `bg-destructive`
- `text-primary-foreground`, `text-secondary-foreground`, etc.
- `border`, `ring`, `input`

### Tipografia

| Nivel    | Tamanho  | Line-height | Peso           | Uso tipico                        |
| -------- | -------- | ----------- | -------------- | --------------------------------- |
| `xs`     | 0.75rem  | 1rem        | medium         | meta, badge, caption              |
| `sm`     | 0.875rem | 1.25rem     | normal/medium  | body secundario, label            |
| `base`   | 1rem     | 1.5rem      | normal         | body primario em mobile           |
| `lg`     | 1.125rem | 1.75rem     | semibold       | subtitulo                         |
| `xl`     | 1.25rem  | 1.75rem     | semibold       | titulo de secao                   |
| `2xl`    | 1.5rem   | 2rem        | bold           | heading de pagina                 |
| `3xl`    | 1.875rem | 2.25rem     | bold           | heading grande (mobile first)     |
| `4xl`    | 2.25rem  | 2.5rem      | bold           | hero (apenas desktop)             |

Font families: `Inter` (sans), `JetBrains Mono` (mono).

### Espacamento

Escala linear: `0.5 → 1 → 1.5 → 2 → 2.5 → 3 → 4 → 5 → 6 → 8 → 10 → 12 → 16 → 20 → 24`.

Usar `gap-{n}`, `p-{n}`, `m-{n}`, `space-x-{n}` do Tailwind — **nunca valores hardcoded**.

### Breakpoints

| Label | Tailwind | Largura | Target                      |
| ----- | -------- | ------- | --------------------------- |
| sm    | `sm:`    | 640px   | Mobile landscape, tablet    |
| md    | `md:`    | 768px   | Tablet portrait, small desktop |
| lg    | `lg:`    | 1024px  | Desktop                     |
| xl    | `xl:`    | 1280px  | Desktop wide                |
| 2xl   | `2xl:`   | 1536px  | Desktop超大                  |

**Mobile-first**: sempre comecar do breakpoint base (sem prefixo) e escalar com `sm:`, `md:`, etc.

### Touch targets

- Minimo: `44px` (`min-h-touch`, `min-w-touch`)
- Confortavel: `48px` (`min-h-touch-comfortable`, `min-w-touch-comfortable`)
- Aplicar a todo elemento interativo (botoes, links, tabs, inputs)

---

## Componentes

### Base

| Componente  | Path                          | Quando usar                        | Variantes                                                       |
| ----------- | ----------------------------- | ---------------------------------- | --------------------------------------------------------------- |
| **Button**  | `src/components/ui/button.tsx`    | Acao principal ou secundaria       | `default`, `outline`, `secondary`, `ghost`, `destructive`, `link` |
|             |                               |                                    | Size: `default`, `xs`, `sm`, `lg`, `icon`, `icon-xs`, `icon-sm`, `icon-lg` |
| **Input**   | `src/components/ui/input.tsx`     | Entrada de texto livre             | Aceita `type`, `placeholder`, `disabled`, `aria-invalid`        |
| **Select**  | `src/components/ui/select.tsx`    | Selecao unica em lista pre-definida | Composicao: `Select` > `SelectTrigger` + `SelectValue` > `SelectContent` > `SelectItem` |
| **Checkbox**| `src/components/ui/checkbox.tsx`  | Opcao booleana, multipla escolha   | `checked`, `defaultChecked`, `disabled`, `aria-invalid`         |
| **RadioGroup**| `src/components/ui/radio-group.tsx` | Opcao unica entre poucas alternativas | `RadioGroup` > `RadioGroupItem`, aceita `defaultValue`         |
| **Badge**   | `src/components/ui/badge.tsx`     | Status, tag, contagem              | `default`, `secondary`, `destructive`, `outline`, `ghost`, `link` |
| **Avatar**  | `src/components/ui/avatar.tsx`    | Foto de perfil ou placeholder      | Size: `sm`, `default`, `lg`. Subcomponentes: `AvatarImage`, `AvatarFallback`, `AvatarBadge`, `AvatarGroup` |

### Dados

| Componente    | Path                              | Quando usar                          | Subcomponentes                                                   |
| ------------- | --------------------------------- | ------------------------------------ | ---------------------------------------------------------------- |
| **Table**     | `src/components/ui/table.tsx`         | Lista tabular com colunas            | `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell`, `TableCaption` |
| **Card**      | `src/components/ui/card.tsx`          | Bloco autonomo de conteudo           | `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter` |
| **ListItem**  | `src/components/ui/list-item.tsx`     | Item de lista vertical               | Variant: `default`, `interactive`, `static`. Sub: `ListItemLeading`, `ListItemContent`, `ListItemTitle`, `ListItemDescription`, `ListItemTrailing` |
| **EmptyState**| `src/components/ui/empty-state.tsx`   | Estado vazio (sem dados, erro, etc.) | Size: `default`, `compact`, `fullpage`. Sub: `EmptyStateIcon`, `EmptyStateTitle`, `EmptyStateDescription`, `EmptyStateAction` |

### Overlay

| Componente | Path                          | Quando usar                              | Props especiais                               |
| ---------- | ----------------------------- | ---------------------------------------- | --------------------------------------------- |
| **Dialog** | `src/components/ui/dialog.tsx`    | Modal de confirmacao, formulario          | `showClose={true/false}`                      |
| **Drawer** | `src/components/ui/drawer.tsx`    | Painel lateral / bottom sheet (mobile)    | `side`: `bottom` (default), `top`, `left`, `right`. `showClose`, `showHandle` |
| **Toast**  | `src/components/ui/toast.tsx`     | Feedback temporario nao-bloqueante        | Envolver app com `<Toaster>`. Tipos: `success`, `error`, `warning`, `info` |
| **Tooltip**| `src/components/ui/tooltip.tsx`   | Explicacao curta ao hover/focus           | Envolver com `<TooltipProvider>`. `side`: `top` (default), `bottom`, `left`, `right` |
| **Popover**| `src/components/ui/popover.tsx`   | Conteudo contextual flutuante             | `side`, `align`. Sub: `PopoverTitle`, `PopoverDescription`, `PopoverArrow` |

### Layout

| Componente    | Path                              | Quando usar                          | Props                                              |
| ------------- | --------------------------------- | ------------------------------------ | -------------------------------------------------- |
| **Stack**     | `src/components/ui/stack.tsx`         | Layout unidimensional (flex)         | `direction`, `spacing`, `align`, `justify`, `wrap`. Atalhos: `<HStack>`, `<VStack>` |
| **Grid**      | `src/components/ui/grid.tsx`          | Layout bidimensional (grid)          | `cols` (number ou objeto responsivo `{base, sm, md, lg, xl}`), `gap`, `align`, `justify` |
| **Container** | `src/components/ui/container.tsx`     | Wrapper centralizado com max-width   | `size`: `sm`, `md`, `lg` (default), `xl`, `full`. `padding`: `none`, `sm`, `md` (default), `lg` |
| **AdaptiveNav**| `src/components/ui/navigation.tsx`    | Navegacao adaptativa mobile/desktop  | `items: NavItem[]`. Mobile: `BottomNav` (fixed bottom). Desktop: `Sidebar` (w-56) |

---

## Quando usar cada componente

### Formularios

```
Form
├── Stack (gap-4)
│   ├── Input                    → texto livre
│   ├── Select                   → opcao unica em lista
│   ├── RadioGroup               → 2-5 opcoes exclusivas
│   ├── Checkbox                 → aceite booleano (termos, LGPD)
│   └── Button (type="submit")   → envio
```

### Listas de dados

```
Container
└── Stack (gap-4)
    ├── EmptyState               → quando a lista esta vazia
    ├── Card                     → card-grid para exibicao visual
    │   └── CardContent
    └── Table                    → tabela para dados tabulares densos
        └── TableHeader / TableBody
```

### Dialogs vs Drawers vs Popovers

| Situacao                                         | Componente |
| ------------------------------------------------ | ---------- |
| Confirmacao critica, formulario curto            | Dialog     |
| Conteudo longo, acao rapida em mobile (bottom)   | Drawer     |
| Menu contextual, filtro rapido                   | Popover    |
| Dica rapida no hover (icone, label truncada)     | Tooltip    |
| Feedback temporario de acao (salvo, erro)        | Toast      |

### Navegacao

- **Mobile** (`<md`): `BottomNav` — navbar fixa inferior com icone + label.
- **Desktop** (`>=md`): `Sidebar` — barra lateral esquerda com icone + label.
- **Ambos**: `AdaptiveNav` — renderiza BottomNav em mobile e Sidebar em desktop automaticamente.

---

## Mobile-first: regras de ouro

1. **Touch targets**: todo elemento interativo >= 44x44px. Usar `min-h-touch` e `min-w-touch`.
2. **Form inputs** em mobile usam `text-base` (evita zoom automatico do iOS). Em desktop, `md:text-sm`.
3. **Drawer bottom sheet** e o padrao mobile para dialogs — Dialog fica para desktop ou casos especificos.
4. **Stack** com `direction={{ base: "column", md: "row" }}` para layouts que empilham em mobile e viram linha em desktop.
5. **Grid** com `cols={{ base: 1, sm: 2, lg: 3 }}` para galerias/cards que aumentam colunas com espaco.
6. **Safe areas**: usar `pb-[env(safe-area-inset-bottom)]` em elementos fixos na parte inferior.

---

## Como propor um componente novo

1. Abrir um issue no Multica (prefixo `PHF`, workspace `photofy`).
2. Incluir: contexto de uso, rascunho de API (props + variantes), referencia visual (se aplicavel).
3. Se o componente ja existe em shadcn/ui (ver `https://ui.shadcn.com`), preferir `npx shadcn add` e customizar.
4. Se for componente novo, criar em `src/components/ui/` seguindo o padrao:
   - Nome do arquivo: `kebab-case.tsx`
   - Subcomponentes exportados individualmente (nao como objeto)
   - `data-slot` para identificacao em testes
   - `cn()` da `@/lib/utils` para merge de classes
   - Variantes com `class-variance-authority` (cva) quando aplicavel
5. Criar story em `src/stories/` com:
   - Controles (args) para todas as props relevantes
   - Viewport configurado com breakpoints do projeto
   - Addon a11y ativo
6. PR para `staging` seguindo as convencoes de `CLAUDE.md`.

---

## Storybook

```bash
pnpm storybook           # dev em localhost:6006
pnpm build-storybook     # build estatico (publicado no CI)
```

Addons configurados:
- `@storybook/addon-a11y` — auditoria de acessibilidade em cada story
- `@storybook/addon-docs` — documentacao gerada de MDX + TS
- `@chromatic-com/storybook` — testes visuais
- `@storybook/addon-vitest` — testes de componentes integrados

Breakpoints de viewport configurados em `.storybook/preview.tsx`: 375px, 414px, 768px, 1024px, 1280px, 1536px.
