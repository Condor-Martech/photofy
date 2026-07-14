// Badge de pendentes do painel de moderação (PHF-040).

export function BadgePendentes({ total }: { total: number }) {
  return (
    <span
      role="status"
      aria-label={`${total} itens pendentes`}
      className="inline-flex min-w-6 items-center justify-center rounded-full bg-amber-500 px-2 py-0.5 text-sm font-semibold text-white"
    >
      {total}
    </span>
  );
}
