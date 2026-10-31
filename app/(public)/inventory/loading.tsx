export default function InventoryLoading() {
  return (
    <div aria-busy="true" aria-label="Loading inventory">
      <div className="h-[220px] bg-obsidian" />
      <div className="mx-auto flex max-w-content gap-10 px-6 pb-24 pt-10">
        <div className="hidden h-[640px] w-[300px] shrink-0 animate-pulse bg-white lg:block" />
        <ul className="grid flex-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <li key={i} className="flex flex-col border border-ivory-line bg-white">
              <div className="aspect-[16/10] animate-pulse bg-ivory-soft" />
              <div className="flex flex-col gap-3 p-6">
                <div className="h-3 w-1/2 animate-pulse bg-ivory-soft" />
                <div className="h-6 w-3/4 animate-pulse bg-ivory-soft" />
                <div className="h-4 w-full animate-pulse bg-ivory-soft" />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
