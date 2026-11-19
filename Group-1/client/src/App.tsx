/**
 * Root Application Container & Screen Router
 * for SHARD-4: BLACKOUT PROTOCOL
 */

import React, { useState, useEffect, useCallback } from 'react';
import { GameCanvas } from './canvas/GameCanvas.js';
import { HUD } from './ui/HUD.js';
import { MobileControlsOverlay } from './ui/MobileControlsOverlay.js';
import { JournalModal } from './ui/JournalModal.js';
import { SettingsModal } from './ui/SettingsModal.js';
import { InspectorDrawer } from './ui/InspectorDrawer.js';
import { LobbyScreen } from './ui/LobbyScreen.js';
import { EndingScreen } from './ui/EndingScreen.js';
import { socketClient } from './net/socketClient.js';
import { audio } from './audio/proceduralAudio.js';
import { GameSnapshot, TelemetryInspectorData, RoomInfo } from '@shared/types.js';

export const App: React.FC = () => {
  const [screen, setScreen] = useState<'lobby' | 'playing' | 'ending'>('lobby');
  const [localPlayerId, setLocalPlayerId] = useState<string>('');
  const [currentSnapshot, setCurrentSnapshot] = useState<GameSnapshot | null>(null);
  const [telemetry, setTelemetry] = useState<TelemetryInspectorData | null>(null);

  // Modals state
  const [isJournalOpen, setIsJournalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);

  useEffect(() => {
    // Connect socket on mount
    socketClient.connect();

    // Global Key Listener for F2 and Tab
    const handleKeyDown = (e: KeyboardEvent) => {
      // AudioContext user gesture unlock
      audio.init();

      if (e.code === 'F2') {
        e.preventDefault();
        setIsInspectorOpen((prev) => !prev);
      }
      if (e.code === 'Tab') {
        e.preventDefault();
        setIsJournalOpen((prev) => !prev);
      }
      if (e.code === 'Escape') {
        setIsJournalOpen(false);
        setIsSettingsOpen(false);
        setIsInspectorOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('click', () => audio.init(), { once: true });
    window.addEventListener('touchstart', () => audio.init(), { once: true });

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleGameStarted = (id: string, roomInfo: RoomInfo) => {
    audio.init();
    setLocalPlayerId(id);
    setScreen('playing');
  };

  const handleSnapshotUpdate = useCallback((snapshot: GameSnapshot) => {
    setCurrentSnapshot(snapshot);
    if (snapshot.gameStatus === 'victory') {
      setScreen('ending');
    }
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black text-gray-100 select-none">
      {screen === 'lobby' && (
        <LobbyScreen onGameStarted={handleGameStarted} />
      )}

      {(screen === 'playing' || screen === 'ending') && (
        <>
          {/* Main 2D Canvas Engine */}
          <GameCanvas
            localPlayerId={localPlayerId}
            onSnapshotUpdate={handleSnapshotUpdate}
            onTelemetryUpdate={setTelemetry}
            onOpenJournal={() => setIsJournalOpen(true)}
          />

          {/* Tactical HUD */}
          <HUD
            snapshot={currentSnapshot}
            localPlayerId={localPlayerId}
            onOpenJournal={() => setIsJournalOpen(true)}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onOpenInspector={() => setIsInspectorOpen(true)}
          />

          {/* Mobile Touch Overlay */}
          <MobileControlsOverlay />

          {/* Forensic Evidence Journal Modal */}
          {isJournalOpen && (
            <JournalModal
              logs={currentSnapshot?.mysteryLogs || []}
              onClose={() => setIsJournalOpen(false)}
            />
          )}

          {/* Settings Modal */}
          <SettingsModal
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
          />

          {/* F2 Telemetry & OOP Inspector Drawer */}
          <InspectorDrawer
            isOpen={isInspectorOpen}
            onClose={() => setIsInspectorOpen(false)}
            telemetry={telemetry}
          />

          {/* Mission Victory / Definitive Ending Screen */}
          {screen === 'ending' && (
            <EndingScreen
              snapshot={currentSnapshot}
              onRestart={() => {
                setScreen('lobby');
                setCurrentSnapshot(null);
              }}
            />
          )}
        </>
      )}
    </div>
  );
};
