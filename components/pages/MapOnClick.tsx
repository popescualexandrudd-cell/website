"use client";

import { useState } from "react";

type Props = { lat: number; lng: number; title: string; buttonLabel: string; notice: string };

/**
 * The OpenStreetMap iframe loads only after an explicit click, so visiting the page sends no
 * request to a third party (GDPR: nothing is shared until the visitor asks for the map).
 */
export function MapOnClick({ lat, lng, title, buttonLabel, notice }: Props) {
  const [show, setShow] = useState(false);
  const d = 0.006;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - d}%2C${lat - d}%2C${lng + d}%2C${lat + d}&layer=mapnik&marker=${lat}%2C${lng}`;
  return (
    <div className="map-shell">
      {show ? (
        <iframe
          src={src}
          title={title}
          loading="lazy"
          referrerPolicy="no-referrer"
          sandbox="allow-scripts allow-same-origin"
        />
      ) : (
        <div className="map-placeholder">
          <p className="mx-auto max-w-md text-cerneala-2">{notice}</p>
          <p>
            <button type="button" className="btn btn-secondary" onClick={() => setShow(true)}>
              {buttonLabel}
            </button>
          </p>
        </div>
      )}
    </div>
  );
}
