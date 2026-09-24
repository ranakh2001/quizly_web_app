// Reusable, presentational button. Feature code should not write raw <button> styling.
export function Button({ variant = 'primary', children, ...props }) {
  return (
    <button className={`button button--${variant}`} {...props}>
      {children}
    </button>
  );
}
