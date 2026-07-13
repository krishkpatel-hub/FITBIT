const sizeClasses = {
  sm: {
    mark: 'h-7 w-7',
    wordmark: 'text-[0.8rem]',
    tagline: 'text-[0.48rem]',
  },
  md: {
    mark: 'h-9 w-9',
    wordmark: 'text-[0.95rem]',
    tagline: 'text-[0.56rem]',
  },
  lg: {
    mark: 'h-12 w-12',
    wordmark: 'text-[1.15rem]',
    tagline: 'text-[0.64rem]',
  },
};

function GorillaMark({ className = 'h-9 w-9' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      role="img"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="64" height="64" rx="14" fill="#0D0D0D" />
      <path d="M32 7L47 12L57 27L54 44L43 57H21L10 44L7 27L17 12L32 7Z" fill="#D4AF37" />
      <path d="M17 24L27 15H37L47 24L51 38L41 51H23L13 38L17 24Z" fill="#0D0D0D" />
      <path d="M21 27L30 24L27 32H18L21 27Z" fill="#FFFFFF" />
      <path d="M43 27L34 24L37 32H46L43 27Z" fill="#FFFFFF" />
      <path d="M23 39L29 34H35L41 39L37 50H27L23 39Z" fill="#D4AF37" />
      <path d="M29 40H35L37 45H27L29 40Z" fill="#0D0D0D" />
      <path d="M25 51H39L36 56H28L25 51Z" fill="#FFFFFF" />
      <path d="M7 29L16 31L14 42L8 41L7 29Z" fill="#D4AF37" />
      <path d="M57 29L48 31L50 42L56 41L57 29Z" fill="#D4AF37" />
      <path d="M27 17L20 24L14 23L18 15L27 17Z" fill="#D4AF37" />
      <path d="M37 17L44 24L50 23L46 15L37 17Z" fill="#D4AF37" />
    </svg>
  );
}

function Logo({
  iconOnly = false,
  showWordmark = true,
  showTagline = false,
  size = 'md',
  className = '',
  markClassName,
  ariaLabel = 'GetJackedCoach',
}) {
  const resolvedSize = sizeClasses[size] || sizeClasses.md;
  const shouldShowWordmark = showWordmark && !iconOnly;

  return (
    <span className={`inline-flex items-center gap-3 ${className}`} aria-label={ariaLabel}>
      <GorillaMark className={markClassName || resolvedSize.mark} />

      {shouldShowWordmark && (
        <span className="leading-none">
          <span
            className={`block font-black uppercase tracking-[-0.045em] text-[#FFFFFF] ${resolvedSize.wordmark}`}
          >
            GETJACKED<span className="text-[#D4AF37]">COACH</span>
          </span>
          {showTagline && (
            <span
              className={`mt-1 hidden font-semibold tracking-[0.16em] text-[#8FA3AD] sm:block ${resolvedSize.tagline}`}
            >
              Adaptive Strength Programming
            </span>
          )}
        </span>
      )}
    </span>
  );
}

export default Logo;
