export function LogoMark({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M4 8.2h16c.2 1.4-.4 2.6-1.6 3.1H5.6C4.4 10.8 3.8 9.6 4 8.2Z" />
      <path d="M5 12.2h14l-.6 1.4H5.6L5 12.2Z" />
      <path d="M5.4 14.4h13.2c.7 1.8-.2 3.8-2.2 4.4H7.6c-2-.6-2.9-2.6-2.2-4.4Z" />
    </svg>
  );
}
