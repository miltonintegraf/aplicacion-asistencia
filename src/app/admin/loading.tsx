const cards = Array.from({ length: 4 });
const rows = Array.from({ length: 6 });

export default function AdminLoading() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 animate-pulse">
      <div className="mb-8">
        <div className="h-8 w-56 rounded bg-gray-200" />
        <div className="mt-3 h-4 w-72 rounded bg-gray-100" />
      </div>

      <div className="grid grid-cols-1 min-[520px]:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5 mb-8">
        {cards.map((_, index) => (
          <div
            key={index}
            className="h-28 rounded-xl border border-gray-200 bg-white shadow-md shadow-gray-200/70 p-5"
          >
            <div className="h-4 w-24 rounded bg-gray-100" />
            <div className="mt-4 h-8 w-16 rounded bg-gray-200" />
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-md shadow-gray-200/70 overflow-hidden">
        <div className="border-b border-gray-100 p-5">
          <div className="h-5 w-44 rounded bg-gray-200" />
        </div>
        <div className="divide-y divide-gray-50">
          {rows.map((_, index) => (
            <div key={index} className="flex items-center gap-4 p-5">
              <div className="h-10 w-10 rounded-full bg-gray-100" />
              <div className="flex-1">
                <div className="h-4 w-48 rounded bg-gray-200" />
                <div className="mt-2 h-3 w-32 rounded bg-gray-100" />
              </div>
              <div className="h-8 w-24 rounded bg-gray-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
