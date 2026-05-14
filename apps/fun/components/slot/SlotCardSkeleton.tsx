export function SlotCardSkeleton() {
  return (
    <div className="rounded-2xl border border-white/5 overflow-hidden" style={{ background: "var(--bg-card)" }}>
      <div className="aspect-[4/3] skeleton rounded-none" />
      <div className="p-4 space-y-3">
        <div className="flex items-baseline justify-between">
          <div className="h-4 w-28 skeleton" />
          <div className="h-3 w-10 skeleton" />
        </div>
        <div className="flex items-center justify-between">
          <div className="h-3 w-16 skeleton" />
          <div className="h-3 w-8 skeleton" />
        </div>
        <div className="h-1.5 w-full rounded-full skeleton" />
        <div className="flex items-center gap-2 pt-1">
          <div className="h-2.5 w-2.5 rounded-full skeleton" />
          <div className="h-2.5 w-20 skeleton" />
        </div>
      </div>
    </div>
  );
}

export function SlotCardSkeletonGrid({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <SlotCardSkeleton key={i} />
      ))}
    </div>
  );
}
