/* INTENT loading — logo animasi full-code (stroke-draw diamond + orbit sweep). */
export default function RootLoading() {
  return (
    <div className="grid min-h-screen place-items-center bg-intent-bg" role="status" aria-label="Loading">
      <div className="flex flex-col items-center gap-5">
        <svg width="84" height="84" viewBox="0 0 72 72" fill="none" aria-hidden="true">
          {/* orbit track */}
          <circle cx="36" cy="36" r="31" stroke="rgba(45,212,191,0.18)" strokeWidth="1" />
          {/* diamond outline — stroke draw loop */}
          <path d="M36 8 L60 36 L36 64 L12 36 Z" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" className="loader-diamond" />
          {/* broken horizontal bar */}
          <path d="M16 36 H31 M41 36 H56" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" className="loader-bar" />
          {/* teal sweep dot on orbit */}
          <g className="loader-orbit">
            <circle cx="36" cy="5" r="3" fill="#2DD4BF" />
          </g>
        </svg>
        <div className="mono text-[10px] font-semibold uppercase tracking-[0.34em] text-intent-muted">
          Loading&nbsp;intelligence
        </div>
      </div>
    </div>
  );
}
