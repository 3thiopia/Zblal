const FLOATING_ITEMS = [
  { top: '8%', left: '6%', delay: '0s', rotate: '-12deg', size: 'text-2xl' },
  { top: '18%', right: '7%', delay: '1.4s', rotate: '14deg', size: 'text-xl' },
  { bottom: '22%', left: '5%', delay: '2.6s', rotate: '10deg', size: 'text-xl' },
  { bottom: '12%', right: '8%', delay: '0.9s', rotate: '-10deg', size: 'text-2xl' },
  { top: '52%', right: '4%', delay: '3.2s', rotate: '8deg', size: 'text-lg' },
];

export function FloatingPoops() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 overflow-hidden select-none z-0"
    >
      {FLOATING_ITEMS.map((item, idx) => (
        <span
          key={idx}
          style={{
            top: item.top,
            left: item.left,
            right: item.right,
            bottom: item.bottom,
            animationDelay: item.delay,
          }}
          className={`animate-float-slow hidden sm:block absolute opacity-[0.09] ${item.size}`}
        >
          <span style={{ display: 'inline-block', transform: `rotate(${item.rotate})` }}>
            💩
          </span>
        </span>
      ))}
    </div>
  );
}
