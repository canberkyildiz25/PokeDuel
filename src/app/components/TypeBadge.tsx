import { capitalize } from '@/lib/pokemon-utils';

interface Props {
  type: string;
  small?: boolean;
}

export default function TypeBadge({ type, small }: Props) {
  return (
    <span
      className={`type-${type} inline-block rounded-full font-bold uppercase tracking-wider text-white
        ${small ? 'text-[9px] px-2 py-0.5' : 'text-xs px-3 py-1'}`}
      style={{ textShadow: '0 1px 2px rgba(0,0,0,0.4)' }}
    >
      {capitalize(type)}
    </span>
  );
}
