// Tipos do slideshow do telão (Epic 5 / PHF-051). ItemMidia espelha a tabela
// media_items e SlideshowConfig a tabela slideshow_config (02-spec.md §3).
// Definidos localmente (não importados do painel de moderação) para não acoplar
// esta feature ao merge da branch de Epic 4 — é o mesmo shape do schema.

export type StatusMidia = "pendente" | "aprovado" | "reprovado" | "erro";
export type TipoMidia = "foto" | "reel";

export interface ItemMidia {
  id: string;
  event_id: string;
  tipo: TipoMidia;
  autor: string | null;
  mensagem: string | null;
  status: StatusMidia;
  url_original: string;
  url_processada: string | null;
  url_thumb: string | null;
  exif_removido: boolean;
  criado_em: string;
}

export type OrdemSlideshow = "cronologica" | "recentes" | "aleatoria";

// Espelha slideshow_config. PHF-051 usa seg_por_slide, ordem, incluir_reels e
// loop; os demais campos são consumidos pela apresentação (PHF-052).
export interface SlideshowConfig {
  seg_por_slide: number;
  ordem: OrdemSlideshow;
  transicao: "fade" | "slide" | "nenhuma";
  exibir_autor_mensagem: boolean;
  incluir_reels: boolean;
  duracao_reel_telao: "completo" | "limitado";
  loop: boolean;
  escurecimento_bg: number;
}

// Evento de Realtime já normalizado (o adaptador de Supabase converte o payload
// de postgres_changes nisto — ver canal-realtime.ts).
export type EventoSlideshow =
  | { tipo: "insert"; item: ItemMidia }
  | { tipo: "update"; item: ItemMidia }
  | { tipo: "delete"; id: string };

// Porta de assinatura: recebe um callback por evento e devolve o cancelamento.
// A inversão de dependência mantém a rotação/hook testáveis sem Supabase real.
export type AssinarSlideshow = (
  aoReceber: (evento: EventoSlideshow) => void,
) => () => void;
