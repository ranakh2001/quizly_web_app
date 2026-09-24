// Reusable, presentational button. Feature code should not write raw <button> styling.
// className merges with (rather than replaces) the base classes, since {...props} would
// otherwise silently win over an earlier className attribute and drop the button's styling.
export function Button({ variant = 'primary', className = '', children, ...props }) {
  return (
    <button className={`button button--${variant} ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}
