function Logo({ showWordmark = true, className = '', markClassName = 'h-9 w-9' }) {
  return (
    <span className={`inline-flex items-center gap-3 ${className}`} aria-label="GetJackedCoach">
      <svg
        className={markClassName}
        viewBox="0 0 64 64"
        role="img"
        aria-hidden="true"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="64" height="64" rx="14" fill="#090A09" />
        <path
          d="M41.5 15H29.75C21.6 15 15 21.6 15 29.75v4.5C15 42.4 21.6 49 29.75 49H41"
          fill="none"
          stroke="#D4AF37"
          strokeWidth="4"
          strokeLinecap="square"
          strokeLinejoin="miter"
        />
        <path
          d="M43 47V19"
          fill="none"
          stroke="#F4F4F0"
          strokeWidth="4"
          strokeLinecap="square"
        />
        <path
          d="M35 27L43 19L51 27"
          fill="none"
          stroke="#F4F4F0"
          strokeWidth="4"
          strokeLinecap="square"
          strokeLinejoin="miter"
        />
        <path
          d="M18 35H50"
          fill="none"
          stroke="#8FA3AD"
          strokeWidth="3"
          strokeLinecap="square"
        />
        <path d="M13 28V42M51 28V42" stroke="#D4AF37" strokeWidth="4" strokeLinecap="square" />
        <path
          d="M35.5 27.5C32.8 25.7 28.8 25.8 26.3 28.2C23 31.3 23.8 37.5 28 39.7C31.8 41.7 36.1 40 38.4 37.1"
          fill="none"
          stroke="#D4AF37"
          strokeWidth="3"
          strokeLinecap="square"
          strokeLinejoin="miter"
        />
      </svg>

      {showWordmark && (
        <span className="leading-none">
          <span className="block text-[0.95rem] font-black uppercase tracking-[-0.04em] text-[#F4F4F0]">
            GETJACKED<span className="text-[#D4AF37]">COACH</span>
          </span>
          <span className="mt-1 hidden text-[0.56rem] font-semibold uppercase tracking-[0.22em] text-[#8FA3AD] sm:block">
            Train Smart. Get Stronger.
          </span>
        </span>
      )}
    </span>
  );
}

export default Logo;
