import type { Metadata } from 'next';
import PickemsClient from './PickemsClient';

export const metadata: Metadata = {
  title: "MSI 2026 Pick'em Tracker",
  description: "Live MSI 2026 pick'em leaderboard, standings, and match tracking powered by gol.gg.",
};

export default function PickemsPage() {
  return <PickemsClient />;
}
