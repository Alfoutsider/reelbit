// Shimmer-pulse placeholders that match SlotCard's bounding box.
// Rendered while the home page's /tokens fetch is in flight, so the layout
// doesn't jump when real data arrives.
//
// Tailwind's `animate-pulse` is fine here — content is decorative, the
// alternative shimmer-keyframe gradient is overkill for a 1-2 frame state.

export function SlotCardSkeleton() {
  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden animate-pulse">
      {/* Hero image placeholder */}
      <div className="aspect-[4/3] bg-white/[0.04]" />

      <div className="p-4 space-y-3">
        {/* Name + ticker line */}
        <div className="flex items-baseline justify-between">
          <div className="h-4 w-24 rounded bg-white/[0.06]" />
          <div className="h-3 w-12 rounded bg-white/[0.04]" />
        </div>

        {/* MCAP / progress row */}
        <div className="flex items-center justify-between">
          <div className="h-3 w-16 rounded bg-white/[0.05]" />
          <div className="h-3 w-10 rounded bg-white/[0.05]" />
        </div>

        {/* Progress bar */}
        <div className="h-1.5 w-full rounded-full bg-white/[0.04] overflow-hidden">
          <div className="h-full w-1/3 bg-white/[0.08]" />
        </div>

        {/* Footer meta */}
        <div className="flex items-center gap-2 pt-1">
          <div className="h-2.5 w-2.5 rounded-full bg-white/[0.05]" />
          <div className="h-2.5 w-20 rounded bg-white/[0.04]" />
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
