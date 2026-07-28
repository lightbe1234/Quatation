type LoadingSpinnerProps = {
  className?: string
}

export function LoadingSpinner({
  className = 'size-4',
}: LoadingSpinnerProps) {
  return (
    <svg
      aria-hidden="true"
      className={`${className} animate-spin`}
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        className="opacity-90"
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="3"
      />
    </svg>
  )
}
