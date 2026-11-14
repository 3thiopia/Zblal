import { motion, useReducedMotion } from 'motion/react';

interface AboutToiletArtProps {
  mood?: 'sad' | 'flushing' | 'happy';
  spotless?: boolean;
  showLiquidOutflow?: boolean;
  className?: string;
}

export function AboutToiletArt({
  mood = 'sad',
  spotless = false,
  showLiquidOutflow = false,
  className = '',
}: AboutToiletArtProps) {
  const prefersReducedMotion = useReducedMotion();
  const isFlushing = mood === 'flushing';
  const isHappy = mood === 'happy';

  return (
    <div className={`relative select-none ${className}`}>
      {/* Soft Glow Behind Spotless Toilet */}
      {spotless && (
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          aria-hidden="true"
          className="pointer-events-none absolute inset-4 rounded-full bg-radial from-[#CEF04E]/45 via-[#A7F3D0]/30 to-transparent blur-2xl"
        />
      )}

      <svg
        viewBox="0 0 320 330"
        className="relative z-10 w-full h-full drop-shadow-[0_22px_32px_rgba(20,59,43,0.14)]"
        role="img"
        aria-label={
          isHappy
            ? 'Spotless white cartoon toilet with a happy smiling poop character'
            : '3D styled cartoon toilet with an expressive sad poop character'
        }
      >
        <defs>
          {/* 3D Porcelain Shading Gradients */}
          <linearGradient id="tankGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="68%" stopColor={spotless ? '#F9FCFA' : '#F3F4EF'} />
            <stop offset="100%" stopColor={spotless ? '#E6F4EC' : '#DCE3DD'} />
          </linearGradient>
          <linearGradient id="bowlGrad" x1="0.15" y1="0" x2="0.85" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="55%" stopColor={spotless ? '#F7FCF9' : '#F1F2EC'} />
            <stop offset="100%" stopColor={spotless ? '#DCF0E5' : '#D2DBD5'} />
          </linearGradient>
          <linearGradient id="pedestalGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={spotless ? '#EEF7F2' : '#E7EAE3'} />
            <stop offset="45%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor={spotless ? '#DCECE3' : '#CFD8D2'} />
          </linearGradient>
          <linearGradient id="innerBowlGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={spotless ? '#D8F3E5' : '#D4DED8'} />
            <stop offset="100%" stopColor={spotless ? '#EBF9F2' : '#E9EEEB'} />
          </linearGradient>
          <linearGradient id="poopBodyGrad" x1="0.2" y1="0" x2="0.8" y2="1">
            <stop offset="0%" stopColor="#9C6840" />
            <stop offset="55%" stopColor="#7C4E2C" />
            <stop offset="100%" stopColor="#5C371C" />
          </linearGradient>
          <linearGradient id="liquidFlowGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8C5830" />
            <stop offset="100%" stopColor="#6D4120" />
          </linearGradient>
        </defs>

        {/* Floor Shadow */}
        <ellipse
          cx="160"
          cy="296"
          rx="88"
          ry="13"
          fill="#143B2B"
          fillOpacity={spotless ? '0.08' : '0.12'}
        />

        {/* Optional Outflow Stream at Base of Toilet */}
        {showLiquidOutflow && (
          <motion.g
            animate={
              prefersReducedMotion
                ? undefined
                : { y: [0, 3, 0] }
            }
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <path
              d="M142 284 C140 302 135 316 144 330 L176 330 C185 316 180 302 178 284 Z"
              fill="url(#liquidFlowGrad)"
            />
            <path
              d="M150 292 C149 306 148 316 151 326"
              fill="none"
              stroke="#B27A4E"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
          </motion.g>
        )}

        {/* Toilet Tank (3D Depth Shadow + Body) */}
        <rect
          x="88"
          y="34"
          width="144"
          height="92"
          rx="18"
          fill="url(#tankGrad)"
          stroke="#143B2B"
          strokeWidth="4.2"
        />
        {/* Tank Side 3D Highlight */}
        <path
          d="M100 50 L100 112"
          stroke="#FFFFFF"
          strokeWidth="4"
          strokeLinecap="round"
          strokeOpacity="0.8"
        />

        {/* Tank Lid */}
        <rect
          x="80"
          y="24"
          width="160"
          height="20"
          rx="10"
          fill="#FFFFFF"
          stroke="#143B2B"
          strokeWidth="4.2"
        />

        {/* Interactive / Animated Flush Button on Tank Top */}
        <motion.rect
          x="145"
          y="18"
          width="30"
          height="8"
          rx="4"
          fill="#CEF04E"
          stroke="#143B2B"
          strokeWidth="2.8"
          animate={
            isFlushing && !prefersReducedMotion
              ? { y: [0, 4, 0] }
              : { y: 0 }
          }
          transition={{ duration: 0.45 }}
        />

        {/* Pedestal Base */}
        <path
          d="M106 184 L114 274 C115 286 128 292 160 292 C192 292 205 286 206 274 L214 184 Z"
          fill="url(#pedestalGrad)"
          stroke="#143B2B"
          strokeWidth="4.2"
          strokeLinejoin="round"
        />

        {/* Toilet Outer Bowl with 3D Shading */}
        <path
          d="M72 146 C72 204 108 232 160 232 C212 232 248 204 248 146 Z"
          fill="url(#bowlGrad)"
          stroke="#143B2B"
          strokeWidth="4.2"
          strokeLinejoin="round"
        />
        {/* Porcelain Glossy Reflection on Bowl Front */}
        <path
          d="M92 170 C98 194 114 208 134 214"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="5"
          strokeLinecap="round"
          strokeOpacity="0.85"
        />

        {/* Toilet Rim Back */}
        <ellipse
          cx="160"
          cy="144"
          rx="90"
          ry="31"
          fill="#FFFFFF"
          stroke="#143B2B"
          strokeWidth="4.2"
        />

        {/* Toilet Inner Bowl Opening */}
        <ellipse
          cx="160"
          cy="145"
          rx="71"
          ry="22"
          fill="url(#innerBowlGrad)"
          stroke="#143B2B"
          strokeWidth="3.2"
        />

        {/* Flushing Vortex Water Swirl */}
        {isFlushing && (
          <motion.g
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{
              opacity: [0, 1, 1, 0],
              scale: [0.7, 1.05, 0.9, 0.6],
              rotate: prefersReducedMotion ? 0 : 720,
            }}
            transition={{ duration: 1.5, ease: 'easeInOut' }}
            style={{ transformOrigin: '160px 146px' }}
          >
            <ellipse
              cx="160"
              cy="146"
              rx="54"
              ry="15"
              fill="none"
              stroke="#38BDF8"
              strokeWidth="4"
              strokeDasharray="18 10"
            />
            <ellipse
              cx="160"
              cy="146"
              rx="34"
              ry="9"
              fill="none"
              stroke="#0EA5E9"
              strokeWidth="3.5"
              strokeDasharray="12 8"
            />
          </motion.g>
        )}

        {/* Cute Expressive Poop Character Inside the Bowl */}
        <motion.g
          animate={
            prefersReducedMotion
              ? undefined
              : isFlushing
              ? {
                  y: [0, 4, -3, 0],
                  rotate: [-4, 5, -3, 0],
                  scale: [1, 0.94, 1.03, 1],
                }
              : isHappy
              ? {
                  y: [0, -4, 0],
                  scaleY: [1, 1.03, 1],
                }
              : {
                  y: [0, 3, 0],
                  scaleY: [1, 0.97, 1],
                }
          }
          transition={{
            duration: isFlushing ? 0.75 : isHappy ? 1.6 : 2.3,
            repeat: isFlushing ? 1 : Infinity,
            ease: 'easeInOut',
          }}
          style={{ transformOrigin: '160px 148px' }}
        >
          {/* Bottom Swirl */}
          <path
            d="M110 148 C110 132 124 123 160 123 C196 123 210 132 210 148 C210 158 192 162 160 162 C128 162 110 158 110 148 Z"
            fill="url(#poopBodyGrad)"
            stroke="#2E1B0E"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />
          {/* Middle Swirl */}
          <path
            d="M120 128 C120 110 136 102 160 102 C184 102 200 110 200 128 C200 137 184 140 160 140 C136 140 120 137 120 128 Z"
            fill="url(#poopBodyGrad)"
            stroke="#2E1B0E"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />
          {/* Top Peak */}
          <path
            d="M134 106 C134 90 146 83 160 82 C167 75 164 66 159 62 C170 64 180 74 179 86 C185 90 187 98 186 106 C186 113 174 116 160 116 C146 116 134 113 134 106 Z"
            fill="url(#poopBodyGrad)"
            stroke="#2E1B0E"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />
          {/* 3D Character Gloss Highlight */}
          <path
            d="M131 124 C133 116 139 112 145 111"
            fill="none"
            stroke="#BA855C"
            strokeWidth="3.2"
            strokeLinecap="round"
          />

          {/* Facial Expression: Sad vs Happy */}
          {isHappy ? (
            <g>
              {/* Happy Rosy Cheeks */}
              <ellipse cx="135" cy="129" rx="5.5" ry="3.2" fill="#FDA4AF" fillOpacity="0.7" />
              <ellipse cx="185" cy="129" rx="5.5" ry="3.2" fill="#FDA4AF" fillOpacity="0.7" />

              {/* Happy Sparkling Eyes */}
              <circle cx="144" cy="120" r="7" fill="#FFFFFF" stroke="#2E1B0E" strokeWidth="2.3" />
              <circle cx="145" cy="120" r="3.8" fill="#1B231F" />
              <circle cx="143" cy="118" r="1.6" fill="#FFFFFF" />
              <circle cx="146.5" cy="121.5" r="0.9" fill="#FFFFFF" />

              <circle cx="176" cy="120" r="7" fill="#FFFFFF" stroke="#2E1B0E" strokeWidth="2.3" />
              <circle cx="175" cy="120" r="3.8" fill="#1B231F" />
              <circle cx="173" cy="118" r="1.6" fill="#FFFFFF" />
              <circle cx="176.5" cy="121.5" r="0.9" fill="#FFFFFF" />

              {/* Raised Cheerful Eyebrows */}
              <path
                d="M137 108 Q144 104 150 108"
                fill="none"
                stroke="#2E1B0E"
                strokeWidth="2.6"
                strokeLinecap="round"
              />
              <path
                d="M170 108 Q176 104 183 108"
                fill="none"
                stroke="#2E1B0E"
                strokeWidth="2.6"
                strokeLinecap="round"
              />

              {/* Big Happy Smile */}
              <path
                d="M149 133 Q160 144 171 133"
                fill="none"
                stroke="#2E1B0E"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </g>
          ) : (
            <g>
              {/* Sad / Worried Eyebrows */}
              <path
                d="M136 110 Q143 108 149 104"
                fill="none"
                stroke="#2E1B0E"
                strokeWidth="2.8"
                strokeLinecap="round"
              />
              <path
                d="M184 110 Q177 108 171 104"
                fill="none"
                stroke="#2E1B0E"
                strokeWidth="2.8"
                strokeLinecap="round"
              />

              {/* Blinking Sad Eyes */}
              <g className="animate-blink-eye">
                <circle cx="144" cy="121" r="7" fill="#FFFFFF" stroke="#2E1B0E" strokeWidth="2.3" />
                <circle cx="145" cy="122" r="3.6" fill="#1B231F" />
                <circle cx="143.5" cy="120" r="1.4" fill="#FFFFFF" />

                <circle cx="176" cy="121" r="7" fill="#FFFFFF" stroke="#2E1B0E" strokeWidth="2.3" />
                <circle cx="175" cy="122" r="3.6" fill="#1B231F" />
                <circle cx="173.5" cy="120" r="1.4" fill="#FFFFFF" />
              </g>

              {/* Little Glistening Sweat / Tear Drop */}
              <motion.path
                d="M136 127 C134 130 134 134 136 135 C138 136 140 133 138 129 Z"
                fill="#7DD3FC"
                stroke="#143B2B"
                strokeWidth="1.2"
                animate={prefersReducedMotion ? undefined : { opacity: [0.55, 1, 0.55], y: [0, 2, 0] }}
                transition={{ duration: 1.9, repeat: Infinity, ease: 'easeInOut' }}
              />

              {/* Funny Frown Mouth */}
              <path
                d="M151 138 Q160 131 169 138"
                fill="none"
                stroke="#2E1B0E"
                strokeWidth="2.8"
                strokeLinecap="round"
              />
            </g>
          )}
        </motion.g>

        {/* Front Bowl Rim Overlap so character sits inside the bowl */}
        <path
          d="M72 146 C84 166 118 176 160 176 C202 176 236 166 248 146"
          fill="none"
          stroke="#143B2B"
          strokeWidth="4.2"
          strokeLinecap="round"
        />

        {/* Sparkling Clean Stars when Spotless */}
        {spotless && (
          <g>
            {[
              { x: 64, y: 84, s: 1, delay: 0 },
              { x: 256, y: 74, s: 0.9, delay: 0.2 },
              { x: 266, y: 186, s: 1.05, delay: 0.35 },
              { x: 54, y: 196, s: 0.85, delay: 0.5 },
              { x: 160, y: 48, s: 0.8, delay: 0.15 },
            ].map((star, idx) => (
              <motion.path
                key={idx}
                d={`M${star.x} ${star.y - 11 * star.s} Q${star.x} ${star.y} ${star.x + 11 * star.s} ${star.y} Q${star.x} ${star.y} ${star.x} ${star.y + 11 * star.s} Q${star.x} ${star.y} ${star.x - 11 * star.s} ${star.y} Q${star.x} ${star.y} ${star.x} ${star.y - 11 * star.s} Z`}
                fill="#CEF04E"
                stroke="#143B2B"
                strokeWidth="1.6"
                initial={{ opacity: 0, scale: 0 }}
                animate={
                  prefersReducedMotion
                    ? { opacity: 1, scale: 1 }
                    : {
                        opacity: [0.4, 1, 0.4],
                        scale: [0.8, 1.15, 0.8],
                        rotate: [0, 12, 0],
                      }
                }
                transition={{
                  duration: 2.1,
                  delay: star.delay,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                style={{ transformOrigin: `${star.x}px ${star.y}px` }}
              />
            ))}
          </g>
        )}
      </svg>
    </div>
  );
}
