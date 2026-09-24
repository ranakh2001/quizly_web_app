// A circular initial badge (first letter of the user's name) - the only "photo" this app has.
export function Avatar({ name }) {
  const letter = name?.trim()?.[0]?.toUpperCase() ?? '?';
  return (
    <span className="avatar" aria-hidden="true">
      {letter}
    </span>
  );
}
