import React from 'react';
import EsportsClient from './EsportsClient';
import { fetchEsportsData } from './api';

export const metadata = {
  title: 'League of Legends Esports Hub | Luke H. Jung',
  description: 'Live active database of pro League of Legends teams and players.',
};

export default async function EsportsPage() {
  // Server-side fetching
  const { teams, players } = await fetchEsportsData();

  return (
    <EsportsClient 
      initialTeams={teams} 
      initialPlayers={players} 
    />
  );
}
