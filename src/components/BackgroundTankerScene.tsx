import { useEffect, useId, useState } from 'react';
import { useReducedMotion } from 'motion/react';

interface BackgroundTankerSceneProps {
  variant?: 'desktop' | 'mobile';
  className?: string;
}

/**
 * Full-scene background composition for the Zblal registration page:
 * Upper-left cartoon toilet -> long thick winding suction hose with stylized
 * directional brown flow -> bottom-right blue Ethiopian septic vacuum tanker.
 */
export function BackgroundTankerScene({
  variant = 'desktop',
  className = '',
}: BackgroundTankerSceneProps) {
  const uid = useId().replace(/:/g, '');
  const prefersReducedMotion = useReducedMotion() ?? false;
  const [isTabActive, setIsTabActive] = useState<boolean>(() =>
    typeof document === 'undefined' ? true : document.visibilityState !== 'hidden'
  );

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const handleVisibilityChange = () => {
      setIsTabActive(document.visibilityState !== 'hidden');
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const shouldAnimate = !prefersReducedMotion && isTabActive;
  const tankGradId = `popo-tank-grad-${uid}`;
  const cabGradId = `popo-cab-grad-${uid}`;

  if (variant === 'mobile') {
    const mobileHosePath =
      'M 52 42 C 80 40, 82 68, 66 84 S 48 118, 82 118 S 124 78, 154 94 S 204 121, 232 115';

    return (
      <div
        aria-hidden="true"
        className={`pointer-events-none select-none overflow-hidden ${
          shouldAnimate ? '' : 'suction-paused'
        } ${className}`}
      >
        <svg
          viewBox="0 0 380 144"
          className="w-full h-auto block overflow-hidden"
          fill="none"
        >
          <defs>
            <linearGradient id={tankGradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4686BF" />
              <stop offset="54%" stopColor="#2B679E" />
              <stop offset="100%" stopColor="#1D4A75" />
            </linearGradient>
            <linearGradient id={cabGradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3B79B2" />
              <stop offset="100%" stopColor="#235584" />
            </linearGradient>
          </defs>

          {/* Upper-Left Cartoon Toilet */}
          <g>
            <ellipse cx="42" cy="70" rx="20" ry="3.2" fill="#1F3A4D" fillOpacity="0.18" />
            <rect
              x="18"
              y="14"
              width="17"
              height="34"
              rx="4"
              fill="#EDF2F5"
              stroke="#24445C"
              strokeWidth="2.2"
            />
            <rect
              x="16"
              y="11"
              width="21"
              height="5"
              rx="2.5"
              fill="#F7FAFC"
              stroke="#24445C"
              strokeWidth="2"
            />
            <line
              x1="21"
              y1="22"
              x2="27"
              y2="22"
              stroke="#24445C"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M 33 52 L 51 52 L 49 70 L 31 70 Z"
              fill="#E2E8ED"
              stroke="#24445C"
              strokeWidth="2.2"
              strokeLinejoin="round"
            />
            <path
              d="M 28 38 L 62 38 C 62 54, 54 60, 44 60 C 34 60, 28 52, 28 38 Z"
              fill="#F5F8FA"
              stroke="#24445C"
              strokeWidth="2.2"
              strokeLinejoin="round"
            />
            <ellipse
              cx="45"
              cy="38.5"
              rx="17"
              ry="5"
              fill="#FFFFFF"
              stroke="#24445C"
              strokeWidth="2.2"
            />
            <ellipse cx="45" cy="39" rx="11" ry="2.8" fill="#7B4E2B" fillOpacity="0.6" />
          </g>

          {/* Winding Thick Suction Hose Across Mobile Scene */}
          <g className={shouldAnimate ? 'animate-hose-flex' : undefined}>
            <path
              d={mobileHosePath}
              stroke="#1C394E"
              strokeOpacity="0.12"
              strokeWidth="15"
              strokeLinecap="round"
              transform="translate(0, 3)"
            />
            <path
              d={mobileHosePath}
              stroke="#24445C"
              strokeWidth="13"
              strokeLinecap="round"
              strokeOpacity="0.58"
            />
            <path
              d={mobileHosePath}
              stroke="#C2D4E1"
              strokeWidth="9"
              strokeLinecap="round"
              strokeOpacity="0.55"
            />
            <path
              d={mobileHosePath}
              stroke="#7A4C2A"
              strokeWidth="5.8"
              strokeLinecap="round"
              strokeOpacity="0.82"
            />
            {shouldAnimate && (
              <>
                <path
                  d={mobileHosePath}
                  stroke="#5E371B"
                  strokeWidth="5.2"
                  strokeLinecap="round"
                  strokeDasharray="28 32"
                  className="animate-hose-flow"
                />
                <path
                  d={mobileHosePath}
                  stroke="#BA8254"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeDasharray="12 48"
                  className="animate-hose-capsules"
                />
              </>
            )}
            <path
              d={mobileHosePath}
              stroke="#3B627B"
              strokeWidth="11.5"
              strokeDasharray="2 9"
              strokeOpacity="0.28"
            />
            <rect
              x="46"
              y="36"
              width="10"
              height="6.5"
              rx="2.5"
              fill="#2E4F66"
              stroke="#1B3244"
              strokeWidth="1.5"
            />
          </g>

          {/* Bottom-Right Blue Ethiopian Tanker Truck (shifted down so lower portion clips at bottom edge) */}
          <g transform="translate(0, 19)">
            <ellipse cx="298" cy="129" rx="68" ry="4" fill="#1F3A4D" fillOpacity="0.2" />
            <rect
              x="226"
              y="90"
              width="12"
              height="12"
              rx="3"
              fill="#1E4B73"
              stroke="#153552"
              strokeWidth="1.8"
            />
            <circle cx="232" cy="96" r="3" fill="#9BC0DC" />
            <rect x="234" y="102" width="124" height="9" rx="3" fill="#1E364A" />
            <rect
              x="258"
              y="46"
              width="20"
              height="7.5"
              rx="2.5"
              fill="#235788"
              stroke="#173A5C"
              strokeWidth="1.6"
            />
            <rect
              x="232"
              y="52"
              width="86"
              height="50"
              rx="21"
              fill={`url(#${tankGradId})`}
              stroke="#173A5C"
              strokeWidth="2.2"
            />
            <rect
              x="236"
              y="72"
              width="78"
              height="8.5"
              rx="3"
              fill="#EEF5FB"
              fillOpacity="0.78"
            />
            <rect
              x="244"
              y="65"
              width="6.5"
              height="22"
              rx="3"
              fill="#163554"
              fillOpacity="0.65"
            />
            <rect
              x="245.5"
              y="73"
              width="3.5"
              height="12.5"
              rx="1.8"
              fill="#85532E"
              className={shouldAnimate ? 'animate-tank-pulse' : undefined}
            />
            <path
              d="M 322 62 L 352 62 C 356 62, 359 65, 360 70 L 365 86 L 365 106 L 322 106 Z"
              fill={`url(#${cabGradId})`}
              stroke="#173A5C"
              strokeWidth="2.2"
              strokeLinejoin="round"
            />
            <path
              d="M 337 67 L 351 67 L 357 83 L 337 83 Z"
              fill="#DCEAF5"
              stroke="#173A5C"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <rect
              x="325"
              y="67"
              width="8.5"
              height="16"
              rx="2"
              fill="#DCEAF5"
              stroke="#173A5C"
              strokeWidth="1.5"
            />
            <rect x="320" y="103" width="47" height="5.5" rx="2.5" fill="#1B3347" />
            <circle cx="255" cy="116" r="11.5" fill="#1B2A38" stroke="#12202B" strokeWidth="2" />
            <circle cx="255" cy="116" r="5.5" fill="#B9C9D6" />
            <circle cx="282" cy="116" r="11.5" fill="#1B2A38" stroke="#12202B" strokeWidth="2" />
            <circle cx="282" cy="116" r="5.5" fill="#B9C9D6" />
            <circle cx="345" cy="116" r="11.5" fill="#1B2A38" stroke="#12202B" strokeWidth="2" />
            <circle cx="345" cy="116" r="5.5" fill="#B9C9D6" />
          </g>
        </svg>
      </div>
    );
  }

  // Desktop Full-Scene Path:
  // Starts inside upper-left toilet opening (166, 166) -> winds with big natural
  // flexible bends down the left margin and sweeps across the bottom background ->
  // connects directly into the lowered bottom-right tanker intake valve at (1060, 790).
  const desktopHosePath =
    'M 166 166 C 224 160, 232 232, 184 274 S 72 342, 112 418 S 292 478, 268 558 S 126 658, 206 728 S 500 775, 615 742 S 855 745, 945 772 S 1045 791, 1060 790';

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none select-none overflow-hidden ${
        shouldAnimate ? '' : 'suction-paused'
      } ${className}`}
    >
      <svg
        viewBox="0 0 1360 820"
        preserveAspectRatio="xMidYMax meet"
        className="w-full h-full block overflow-hidden"
        fill="none"
      >
        <defs>
          <linearGradient id={tankGradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4686BF" />
            <stop offset="52%" stopColor="#2A659C" />
            <stop offset="100%" stopColor="#1B4873" />
          </linearGradient>
          <linearGradient id={cabGradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3B79B2" />
            <stop offset="100%" stopColor="#225587" />
          </linearGradient>
        </defs>

        {/* 1. UPPER-LEFT AREA: Simple Clean Cartoon Toilet */}
        <g>
          {/* Soft floor shadow under toilet */}
          <ellipse cx="144" cy="228" rx="52" ry="8" fill="#1F3A4D" fillOpacity="0.16" />

          {/* Toilet cistern / water tank */}
          <rect
            x="92"
            y="84"
            width="42"
            height="78"
            rx="9"
            fill="#EDF2F5"
            stroke="#24445C"
            strokeWidth="3.5"
          />
          <rect
            x="87"
            y="78"
            width="52"
            height="11"
            rx="5"
            fill="#F8FAFC"
            stroke="#24445C"
            strokeWidth="3.2"
          />
          {/* Flush lever */}
          <line
            x1="99"
            y1="101"
            x2="112"
            y2="101"
            stroke="#24445C"
            strokeWidth="3.2"
            strokeLinecap="round"
          />

          {/* Pedestal base */}
          <path
            d="M 122 178 L 166 178 L 161 226 L 116 226 Z"
            fill="#E2E8ED"
            stroke="#24445C"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />

          {/* Rounded bowl */}
          <path
            d="M 112 148 L 194 148 C 194 186, 174 198, 152 198 C 128 198, 112 180, 112 148 Z"
            fill="#F5F8FA"
            stroke="#24445C"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />

          {/* Toilet rim & dark-brown interior opening */}
          <ellipse
            cx="153"
            cy="148.5"
            rx="42"
            ry="11"
            fill="#FFFFFF"
            stroke="#24445C"
            strokeWidth="3.5"
          />
          <ellipse cx="153" cy="149" rx="28" ry="6.2" fill="#7B4E2B" fillOpacity="0.62" />

          {/* Subtle suction pulse ring inside bowl opening */}
          {shouldAnimate && (
            <ellipse
              cx="162"
              cy="151"
              rx="14"
              ry="4.2"
              stroke="#7B4E2B"
              strokeWidth="2"
              className="animate-suction-ring"
            />
          )}
        </g>

        {/* 2. LONG THICK WINDING SUCTION HOSE (Upper-Left Toilet -> Bottom-Right Truck) */}
        <g className={shouldAnimate ? 'animate-hose-flex' : undefined}>
          {/* Soft ambient shadow underneath hose */}
          <path
            d={desktopHosePath}
            stroke="#1B394E"
            strokeOpacity="0.11"
            strokeWidth="30"
            strokeLinecap="round"
            transform="translate(0, 6)"
          />

          {/* Thick outer vacuum hose wall */}
          <path
            d={desktopHosePath}
            stroke="#24445C"
            strokeWidth="26"
            strokeLinecap="round"
            strokeOpacity="0.58"
          />

          {/* Translucent inner hose sleeve so brown flow reads clearly inside */}
          <path
            d={desktopHosePath}
            stroke="#C7D7E3"
            strokeWidth="18.5"
            strokeLinecap="round"
            strokeOpacity="0.6"
          />

          {/* Continuous stylized brown cartoon stream base */}
          <path
            d={desktopHosePath}
            stroke="#7B4D2B"
            strokeWidth="12.5"
            strokeLinecap="round"
            strokeOpacity="0.78"
          />

          {/* Unmistakable directional brown flow segments moving toilet -> truck */}
          {shouldAnimate && (
            <>
              <path
                d={desktopHosePath}
                stroke="#5A3418"
                strokeWidth="11"
                strokeLinecap="round"
                strokeDasharray="28 32"
                className="animate-hose-flow"
              />
              <path
                d={desktopHosePath}
                stroke="#B87E4F"
                strokeWidth="4.6"
                strokeLinecap="round"
                strokeDasharray="12 48"
                className="animate-hose-capsules"
              />
            </>
          )}

          {/* Corrugated rubber vacuum-hose rib rings along outer sleeve */}
          <path
            d={desktopHosePath}
            stroke="#3B627B"
            strokeWidth="23.5"
            strokeDasharray="3.5 14"
            strokeOpacity="0.28"
          />

          {/* Suction nozzle cuff dipping cleanly into the toilet opening */}
          <rect
            x="154"
            y="147"
            width="18"
            height="19"
            rx="5"
            transform="rotate(-12 163 156)"
            fill="#2B4E66"
            stroke="#1B3244"
            strokeWidth="2.5"
          />
        </g>

        {/* 3. BOTTOM-RIGHT AREA: Familiar Blue Ethiopian Septic Vacuum Tanker Truck (shifted downward so lower portion extends beyond bottom edge) */}
        <g transform="translate(0, 104)">
          {/* Ground line & shadow under parked truck */}
          <line
            x1="1032"
            y1="744"
            x2="1338"
            y2="744"
            stroke="#24445C"
            strokeOpacity="0.26"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <ellipse cx="1192" cy="744" rx="136" ry="7" fill="#1F3A4D" fillOpacity="0.2" />

          {/* Rear hose intake valve flange (receives winding hose cleanly) */}
          <rect
            x="1048"
            y="675"
            width="20"
            height="22"
            rx="4.5"
            fill="#1C476E"
            stroke="#143350"
            strokeWidth="2.6"
          />
          <circle cx="1058" cy="686" r="5" fill="#9BC0DC" />

          {/* Heavy-duty truck chassis beam */}
          <rect x="1062" y="694" width="246" height="16" rx="4.5" fill="#1E364A" />

          {/* Top vacuum pump dome & gauge mount */}
          <rect
            x="1112"
            y="570"
            width="36"
            height="14"
            rx="4.5"
            fill="#235788"
            stroke="#173A5C"
            strokeWidth="2.6"
          />
          <rect
            x="1174"
            y="573"
            width="20"
            height="11"
            rx="3.5"
            fill="#2B6BA3"
            stroke="#173A5C"
            strokeWidth="2.4"
          />
          {/* Subtle top hose storage rail */}
          <line
            x1="1084"
            y1="579"
            x2="1210"
            y2="579"
            stroke="#1B4368"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Cylindrical Blue Septic Vacuum Tank */}
          <rect
            x="1062"
            y="584"
            width="168"
            height="110"
            rx="44"
            fill={`url(#${tankGradId})`}
            stroke="#173A5C"
            strokeWidth="3.5"
          />

          {/* Classic Ethiopian tanker crisp white horizontal band */}
          <rect
            x="1068"
            y="629"
            width="156"
            height="16"
            rx="4"
            fill="#EEF5FB"
            fillOpacity="0.78"
          />

          {/* Tank structural rib seams */}
          <line
            x1="1122"
            y1="586"
            x2="1122"
            y2="692"
            stroke="#173A5C"
            strokeOpacity="0.28"
            strokeWidth="3"
          />
          <line
            x1="1176"
            y1="586"
            x2="1176"
            y2="692"
            stroke="#173A5C"
            strokeOpacity="0.28"
            strokeWidth="3"
          />

          {/* Vertical sight-glass indicator showing gentle intake pulse */}
          <rect
            x="1086"
            y="610"
            width="12"
            height="48"
            rx="6"
            fill="#153352"
            fillOpacity="0.65"
          />
          <rect
            x="1088.5"
            y="628"
            width="7"
            height="27"
            rx="3.5"
            fill="#85532E"
            className={shouldAnimate ? 'animate-tank-pulse' : undefined}
          />

          {/* Classic Ethiopian Boxy Forward-Control Truck Cab */}
          <path
            d="M 1236 604 L 1296 604 C 1304 604, 1309 610, 1312 618 L 1322 652 L 1322 702 L 1236 702 Z"
            fill={`url(#${cabGradId})`}
            stroke="#173A5C"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />
          {/* Cab Windshield */}
          <path
            d="M 1268 614 L 1294 614 L 1308 647 L 1268 647 Z"
            fill="#DCEAF5"
            stroke="#173A5C"
            strokeWidth="2.6"
            strokeLinejoin="round"
          />
          {/* Cab Side Window */}
          <rect
            x="1244"
            y="614"
            width="17"
            height="33"
            rx="3.5"
            fill="#DCEAF5"
            stroke="#173A5C"
            strokeWidth="2.4"
          />
          {/* Side mirror */}
          <rect
            x="1308"
            y="622"
            width="6"
            height="16"
            rx="2"
            fill="#1B3A56"
          />
          {/* Front grille & amber headlight */}
          <rect
            x="1288"
            y="662"
            width="24"
            height="12"
            rx="2.5"
            fill="#173A5C"
            fillOpacity="0.42"
          />
          <rect
            x="1315"
            y="670"
            width="7"
            height="9"
            rx="2"
            fill="#F2D16B"
            fillOpacity="0.88"
          />
          {/* Front & rear bumper trim */}
          <rect x="1233" y="696" width="93" height="10" rx="3.5" fill="#1B3347" />

          {/* Dual Rear Wheels & Front Wheel */}
          <g>
            <circle cx="1104" cy="721" r="22" fill="#1B2A38" stroke="#12202B" strokeWidth="3.2" />
            <circle cx="1104" cy="721" r="10.5" fill="#B9C9D6" />
            <circle cx="1104" cy="721" r="4" fill="#2A4D6E" />
          </g>
          <g>
            <circle cx="1156" cy="721" r="22" fill="#1B2A38" stroke="#12202B" strokeWidth="3.2" />
            <circle cx="1156" cy="721" r="10.5" fill="#B9C9D6" />
            <circle cx="1156" cy="721" r="4" fill="#2A4D6E" />
          </g>
          <g>
            <circle cx="1283" cy="721" r="22" fill="#1B2A38" stroke="#12202B" strokeWidth="3.2" />
            <circle cx="1283" cy="721" r="10.5" fill="#B9C9D6" />
            <circle cx="1283" cy="721" r="4" fill="#2A4D6E" />
          </g>
        </g>
      </svg>
    </div>
  );
}
