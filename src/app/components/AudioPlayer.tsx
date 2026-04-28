'use client';

interface Props {
  playing: boolean;
  onToggle: () => void;
}

export default function AudioPlayer({ playing, onToggle }: Props) {
  return (
    <button
      onClick={onToggle}
      title={playing ? 'Müziği durdur' : 'Müziği aç'}
      className="fixed top-4 right-4 z-50 w-11 h-11 rounded-full flex items-center justify-center text-xl
        hover:scale-110 transition-transform duration-200 cursor-pointer"
      style={{
        background: 'rgba(0,0,0,0.55)',
        border: '1px solid rgba(255,215,0,0.3)',
        backdropFilter: 'blur(8px)',
      }}
    >
      {playing ? '🎵' : '🔇'}
    </button>
  );
}
