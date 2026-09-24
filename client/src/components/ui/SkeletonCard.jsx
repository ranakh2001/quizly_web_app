// A pulsing placeholder the size of a real card - shown in place of quiz-list / results-list
// items while their data is loading, instead of a plain "Loading..." line.
export function SkeletonCard() {
  return <div className="skeleton-card glass" aria-hidden="true" />;
}
