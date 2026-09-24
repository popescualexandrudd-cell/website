/** The gold ball that travels between scenes (cinematic layout only). Positioned by the director. */
export function TravelingBall() {
  return (
    <div className="travel-ball" aria-hidden="true">
      <div className="travel-ball-glow" />
      <div className="travel-ball-body">
        <svg viewBox="0 0 100 100" className="travel-ball-seam" focusable="false">
          <path d="M 19 10 C 44 34, 44 66, 19 90" />
          <path d="M 81 10 C 56 34, 56 66, 81 90" />
        </svg>
      </div>
      <div className="travel-ball-cover" />
    </div>
  );
}
