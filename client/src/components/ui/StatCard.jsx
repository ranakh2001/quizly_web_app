// A small glass tile showing one number and its label - used on the student Home (available/
// upcoming/completed counts) and Results (completed/average/best) summary rows.
export function StatCard({ value, label }) {
  return (
    <div className="stat-card glass">
      <p className="stat-card__value">{value}</p>
      <p className="stat-card__label">{label}</p>
    </div>
  );
}
