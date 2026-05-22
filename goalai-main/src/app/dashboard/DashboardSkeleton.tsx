export function DashboardHeaderSkeleton() {
  return (
    <header className="px-6 pt-8 pb-2 animate-pulse">
      <div className="max-w-lg mx-auto flex items-center justify-between">
        <div className="h-4 w-32 bg-gray-200 rounded" />
        <div className="w-8 h-8 rounded-full bg-gray-100" />
      </div>
    </header>
  );
}

export function TrustScoreSkeleton() {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 flex items-center justify-between animate-pulse">
      <div>
        <div className="h-3 w-24 bg-gray-200 rounded mb-2" />
        <div className="h-8 w-20 bg-gray-200 rounded" />
      </div>
      <div className="text-right">
        <div className="h-3 w-16 bg-gray-200 rounded mb-2 ml-auto" />
        <div className="h-4 w-28 bg-gray-200 rounded ml-auto" />
      </div>
    </div>
  );
}

export function TaskListSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-4 w-32 bg-gray-200 rounded mb-4" />
      {[...Array(3)].map((_, i) => (
        <div
          key={i}
          className="bg-white border border-gray-100 rounded-xl p-4 space-y-3"
        >
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 rounded bg-gray-200" />
            <div className="h-4 w-40 bg-gray-200 rounded" />
          </div>
          <div className="h-3 w-24 bg-gray-200 rounded" />
        </div>
      ))}
    </div>
  );
}

export function GenerateTasksSkeleton() {
  return (
    <div className="text-center py-16 animate-pulse">
      <div className="h-5 w-40 bg-gray-200 rounded mx-auto mb-2" />
      <div className="h-4 w-56 bg-gray-200 rounded mx-auto mb-8" />
      <div className="h-10 w-32 bg-gray-900 rounded-xl mx-auto" />
    </div>
  );
}
