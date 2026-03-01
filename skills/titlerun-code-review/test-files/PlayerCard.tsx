// Synthetic test file for integration testing
import React from 'react';

interface Player {
  id: number;
  name: string;
  position: string;
  value: number;
}

interface PlayerCardProps {
  players: Player[];
  selectedId: number;
}

export function PlayerCard({ players, selectedId }: PlayerCardProps) {
  // ANTI-PATTERN: .find() without useMemo
  const selectedPlayer = players.find(p => p.id === selectedId);
  
  if (!selectedPlayer) {
    return <div>No player selected</div>;
  }
  
  return (
    <div className="player-card">
      <h2>{selectedPlayer.name}</h2>
      <p>Position: {selectedPlayer.position}</p>
      <p>Value: {selectedPlayer.value}</p>
    </div>
  );
}
