// Mirror of apps/fun/components/slot/SlotCardSkeleton — same shimmer
// placeholder, sized to the casino lobby's SlotCard so the layout doesn't
// jump when /themes/graduated lands.

export function SlotCardSkeleton() {
  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden animate-pulse">
      <div className="aspect-[4/3] bg-white/[0.04]" />
      <div className="p-4 space-y-3">
        <div className="flex items-baseline justify-between">
          <div className="h-4 w-24 rounded bg-white/[0.06]" />
          <div className="h-3 w-12 rounded bg-white/[0.04]" />
        </div>
        <div className="flex items-center justify-between">
          <div className="h-3 w-16 rounded bg-white/[0.05]" />
          <div className="h-3 w-10 rounded bg-white/[0.05]" />
        </div>
        <div className="h-1.5 w-full rounded-full bg-white/[0.04] overflow-hidden">
          <div className="h-full w-1/3 bg-white/[0.08]" />
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
