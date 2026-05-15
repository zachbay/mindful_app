type BayWelLogoProps = {
  className?: string;
  imageClassName?: string;
};

export default function BayWelLogo({
  className = "",
  imageClassName = "h-14 w-14"
}: BayWelLogoProps) {
  return (
    <span
      aria-label="BayWel registered trademark"
      className={`inline-flex items-center ${className}`}
    >
      <img
        aria-hidden="true"
        className={`object-contain ${imageClassName}`}
        src="/brand/baywel-logo-registered.png"
      />
    </span>
  );
}
