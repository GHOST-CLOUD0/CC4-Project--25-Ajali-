function LabelSlideContent({ children }) {
  return <>
    <span className="label-slide-button__label" aria-hidden="true">
      <span>{children}</span>
      <span>{children}</span>
    </span>
    <span className="label-slide-button__badge" aria-hidden="true">
      <span>↗</span>
      <span>↗</span>
    </span>
  </>;
}

export function LabelSlideButton({
  children,
  className = "",
  disabled = false,
  type = "button",
  ...props
}) {
  return (
    <button
      {...props}
      type={type}
      disabled={disabled}
      className={`label-slide-button ${className}`.trim()}
    >
      <LabelSlideContent>{children}</LabelSlideContent>
    </button>
  );
}

export function LabelSlideLink({ children, className = "", ...props }) {
  return (
    <Link {...props} className={`label-slide-button ${className}`.trim()}>
      <LabelSlideContent>{children}</LabelSlideContent>
    </Link>
  );
}
import { Link } from "react-router-dom";
