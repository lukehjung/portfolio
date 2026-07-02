import type { Metadata } from 'next';
import TFTClient from './TFTClient';

export const metadata: Metadata = {
  title: 'TFT Analytics',
  description: 'Riot ID-verified TFT rank progression and match history, cached at the edge.',
};

export default function TFTPage() {
  return <TFTClient />;
}
