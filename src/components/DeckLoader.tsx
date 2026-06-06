export function DeckLoader({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="sift-empty">
      <div className="sift-deck-loading">
        <span className="sift-loader" aria-hidden="true" />
        <span className="sift-deck-loading-label">{label}</span>
      </div>
    </div>
  );
}
