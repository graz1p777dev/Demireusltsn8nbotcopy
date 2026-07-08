export function InventoryPlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex h-full min-h-[60vh] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border text-center">
      <h1 className="text-lg font-semibold">{title}</h1>
      <p className="text-sm text-muted-foreground">Раздел в разработке</p>
    </div>
  )
}
