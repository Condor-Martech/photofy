// PHF-052 — Parâmetros configuráveis do slideshow.
// Lógica de domínio pura (sem Next.js/Supabase): valida os parâmetros contra
// os ranges do SPEC (02-spec.md §3, tabela slideshow_config) e aplica a config
// para montar a rotação do telão. Consumida pelo endpoint
// PATCH /api/eventos/:slug/slideshow-config e pela tela de slideshow (PHF-051).

export type Ordem = 'cronologica' | 'recentes' | 'aleatoria';
export type Transicao = 'fade' | 'slide' | 'nenhuma';
export type DuracaoReelTelao = 'completo' | 'limitado';

export interface SlideshowConfig {
  seg_por_slide: number; // 3..30
  ordem: Ordem;
  transicao: Transicao;
  exibir_autor_mensagem: boolean;
  incluir_reels: boolean;
  duracao_reel_telao: DuracaoReelTelao;
  loop: boolean;
  escurecimento_bg: number; // 0..80 (%)
}

// Defaults idênticos ao `default` de cada coluna em 02-spec.md §3.
export const SLIDESHOW_DEFAULTS: SlideshowConfig = {
  seg_por_slide: 6,
  ordem: 'recentes',
  transicao: 'fade',
  exibir_autor_mensagem: true,
  incluir_reels: true,
  duracao_reel_telao: 'completo',
  loop: true,
  escurecimento_bg: 30,
};

const ORDENS: readonly Ordem[] = ['cronologica', 'recentes', 'aleatoria'];
const TRANSICOES: readonly Transicao[] = ['fade', 'slide', 'nenhuma'];
const DURACOES: readonly DuracaoReelTelao[] = ['completo', 'limitado'];

const RANGES = {
  seg_por_slide: { min: 3, max: 30 },
  escurecimento_bg: { min: 0, max: 80 },
} as const;

export interface ConfigError {
  field: string;
  message: string;
}

/**
 * Valida um corpo de PATCH do slideshow-config. Todos os campos são opcionais
 * (semântica PATCH); só valida os que vierem. Campos desconhecidos são erro
 * (pega typo em nome de parâmetro antes de gravar no banco).
 * Retorna os campos válidos em `value` e a lista de problemas em `errors`.
 */
export function validateSlideshowConfigPatch(
  input: unknown,
): { value: Partial<SlideshowConfig>; errors: ConfigError[] } {
  const errors: ConfigError[] = [];
  const value: Partial<SlideshowConfig> = {};

  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    return { value, errors: [{ field: '_', message: 'corpo deve ser um objeto' }] };
  }
  const body = input as Record<string, unknown>;

  const int = (field: keyof typeof RANGES) => {
    const v = body[field];
    if (!Number.isInteger(v)) {
      errors.push({ field, message: 'deve ser inteiro' });
      return;
    }
    const { min, max } = RANGES[field];
    if ((v as number) < min || (v as number) > max) {
      errors.push({ field, message: `deve estar entre ${min} e ${max}` });
      return;
    }
    value[field] = v as number;
  };

  const enumField = <T extends string>(field: keyof SlideshowConfig, allowed: readonly T[]) => {
    const v = body[field];
    if (!allowed.includes(v as T)) {
      errors.push({ field, message: `deve ser um de: ${allowed.join(', ')}` });
      return;
    }
    (value[field] as T) = v as T;
  };

  const bool = (field: keyof SlideshowConfig) => {
    const v = body[field];
    if (typeof v !== 'boolean') {
      errors.push({ field, message: 'deve ser booleano' });
      return;
    }
    (value[field] as boolean) = v;
  };

  for (const key of Object.keys(body)) {
    switch (key) {
      case 'seg_por_slide':
      case 'escurecimento_bg':
        int(key);
        break;
      case 'ordem':
        enumField('ordem', ORDENS);
        break;
      case 'transicao':
        enumField('transicao', TRANSICOES);
        break;
      case 'duracao_reel_telao':
        enumField('duracao_reel_telao', DURACOES);
        break;
      case 'exibir_autor_mensagem':
      case 'incluir_reels':
      case 'loop':
        bool(key);
        break;
      default:
        errors.push({ field: key, message: 'parâmetro desconhecido' });
    }
  }

  return { value, errors };
}

/** Preenche defaults por cima de uma config parcial (ex.: linha nova do evento). */
export function withDefaults(partial: Partial<SlideshowConfig> = {}): SlideshowConfig {
  return { ...SLIDESHOW_DEFAULTS, ...partial };
}

export interface MediaLike {
  id: string;
  tipo: 'foto' | 'reel';
  status: string; // pendente | aprovado | reprovado | erro
  criado_em: string; // ISO 8601
}

/**
 * Monta a rotação do telão a partir da config: só entram itens APROVADOS
 * (regra de moderação), reels são incluídos/excluídos por `incluir_reels`, e a
 * ordem segue `ordem`. `seg_por_slide`, `loop` e `transicao` são consumidos
 * pelo player — aqui só devolvemos a lista ordenada.
 *
 * `rng` é injetável para tornar a ordem "aleatoria" testável.
 * ponytail: shuffle Fisher-Yates simples; suficiente para a rotação de um telão.
 */
export function buildPlaylist<T extends MediaLike>(
  items: readonly T[],
  config: SlideshowConfig,
  rng: () => number = Math.random,
): T[] {
  const rotacao = items.filter(
    (it) => it.status === 'aprovado' && (config.incluir_reels || it.tipo !== 'reel'),
  );

  switch (config.ordem) {
    case 'cronologica': // mais antigos primeiro
      return rotacao.sort((a, b) => a.criado_em.localeCompare(b.criado_em));
    case 'recentes': // mais recentes primeiro
      return rotacao.sort((a, b) => b.criado_em.localeCompare(a.criado_em));
    case 'aleatoria': {
      for (let i = rotacao.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [rotacao[i], rotacao[j]] = [rotacao[j], rotacao[i]];
      }
      return rotacao;
    }
  }
}
