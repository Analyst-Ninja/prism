"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@prism/ui/lib/gsap";

// Flat triangles in tones of blue. They slide in once per browser session and then stay still.
const FACETS = [
  { d: "M0 460 330 40 660 460Z", fill: "#1D4ED8", o: 0.95 },
  { d: "M0 460 190 200 380 460Z", fill: "#3B82F6", o: 0.9 },
  { d: "M330 40 660 460 480 460Z", fill: "#0F2F78", o: 1 },
  { d: "M330 40 420 170 240 170Z", fill: "#DBE8FF", o: 0.95 },
  { d: "M380 460 560 250 700 460Z", fill: "#7BA7F5", o: 0.85 },
  { d: "M0 270 150 130 150 380Z", fill: "#16398F", o: 0.9 },
  { d: "M560 70 800 70 800 330Z", fill: "#3B82F6", o: 0.35 },
  { d: "M700 460 800 330 800 460Z", fill: "#1D4ED8", o: 0.9 },
];

const SEEN = "prism.facets.seen";

export function FacetField({ className }: { className?: string }) {
  const root = useRef<SVGSVGElement>(null);

  useGSAP(
    () => {
      let seen = false;
      try {
        seen = sessionStorage.getItem(SEEN) === "1";
      } catch {}
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        if (seen) return;
        gsap.from(".facet", {
          x: (i) => (i % 2 ? 90 : -90),
          y: 70,
          rotate: (i) => (i % 2 ? 14 : -14),
          opacity: 0,
          transformOrigin: "50% 50%",
          duration: 1.2,
          ease: "power3.out",
          stagger: 0.09,
          onComplete: () => {
            try {
              sessionStorage.setItem(SEEN, "1");
            } catch {}
          },
        });
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <svg ref={root} viewBox="0 0 800 460" preserveAspectRatio="xMidYMax slice" aria-hidden="true" className={className}>
      {FACETS.map((f, i) => (
        <path key={i} className="facet" d={f.d} fill={f.fill} fillOpacity={f.o} />
      ))}
    </svg>
  );
}
