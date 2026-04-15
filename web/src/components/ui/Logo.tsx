import Image from 'next/image';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  dark?: boolean;
}

const sizes = {
  sm: { icon: 28, text: 'text-sm' },
  md: { icon: 36, text: 'text-base' },
  lg: { icon: 56, text: 'text-xl' },
};

export function Logo({ size = 'md', showText = true, dark = false }: LogoProps) {
  const s = sizes[size];

  return (
    <div className="flex items-center gap-2.5">
      <div style={{ width: s.icon, height: s.icon }} className="flex-shrink-0 relative">
        <Image
          src="/logo.png"
          alt="Central Altitude"
          width={s.icon}
          height={s.icon}
          className="object-contain"
          priority
        />
      </div>
      {showText && (
        <div>
          <p className={`${s.text} font-bold leading-tight ${dark ? 'text-white' : 'text-neutral-900'}`}>
            Central Altitude
          </p>
          <p className={`text-xs leading-tight ${dark ? 'text-white/60' : 'text-neutral-500'}`}>
            Topografia
          </p>
        </div>
      )}
    </div>
  );
}
