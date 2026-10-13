import type { Metadata } from 'next';
import { SignIn } from '@/components/SignIn';

export const metadata: Metadata = {
  title: 'Kayıt',
  description: 'Masaya kimin adıyla oturacağını ve hangi turu oynayacağını seç.',
  alternates: { canonical: '/kayit/' },
};

export default function Page() {
  return <SignIn />;
}
