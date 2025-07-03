"use client";

import { useMiniKit, useAddFrame } from "@coinbase/onchainkit/minikit";
import {
  Name,
  Identity,
  Address,
  Avatar,
  EthBalance,
} from "@coinbase/onchainkit/identity";
import {
  ConnectWallet,
  Wallet,
  WalletDropdown,
  WalletDropdownDisconnect,
} from "@coinbase/onchainkit/wallet";
import { useAccount } from "wagmi";
import { useEffect, useRef, useState, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";
import Image from "next/image";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

interface Tile {
  id: number;
  lane: number;
  fallDuration: number;
}

export default function Home() {
  // Game state
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [nextTileId, setNextTileId] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [hasStartedOnce, setHasStartedOnce] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Wallet & identity
  const { address: walletAddress } = useAccount();

  const { setFrameReady, isFrameReady, context } = useMiniKit();
  const addFrame = useAddFrame();

  // Leaderboard
  const [leaderboard, setLeaderboard] = useState<
    { wallet_address: string; score: number }[]
  >([]);

  // Game parameters
  const TILE_INTERVAL = 1000;
  const LANES = [0, 1, 2, 3];
  const MIN_SPEED = 3000;
  const MAX_SPEED = 1200;
  const PHASES = 4;

  // Speed calculation
  const getCurrentFallSpeed = () => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return MIN_SPEED;
    const progress = Math.min(audio.currentTime / audio.duration, 1);
    const phase = Math.floor(progress * PHASES);
    return Math.max(
      MIN_SPEED - ((MIN_SPEED - MAX_SPEED) * phase) / (PHASES - 1),
      MAX_SPEED,
    );
  };

  // Spawn tiles
  useEffect(() => {
    if (!gameStarted || gameOver) return;
    const interval = setInterval(() => {
      const lane = Math.floor(Math.random() * LANES.length);
      const newTile: Tile = {
        id: nextTileId,
        lane,
        fallDuration: getCurrentFallSpeed(),
      };
      setTiles((prev) => [...prev, newTile]);
      setNextTileId((id) => id + 1);
    }, TILE_INTERVAL);
    return () => clearInterval(interval);
  }, [gameStarted, gameOver, nextTileId]);

  // Audio play/pause
  useEffect(() => {
    if (gameStarted && !gameOver) {
      audioRef.current?.play().catch(() => {});
    }
  }, [gameStarted]);

  useEffect(() => {
    if (gameOver) {
      audioRef.current?.pause();
    }
  }, [gameOver]);

  // Supabase leaderboard fetch
  useEffect(() => {
    const fetchLeaderboard = async () => {
      const { data } = await supabase
        .from("scores")
        .select("wallet_address, score")
        .order("score", { ascending: false })
        .limit(5);
      if (data) setLeaderboard(data);
    };
    fetchLeaderboard();
  }, [gameOver]);

  // OnchainKit frame
  useEffect(() => {
    if (!isFrameReady) setFrameReady();
  }, [isFrameReady, setFrameReady]);

  // Click handlers
  const handleTileClick = (id: number) => {
    if (tiles[0]?.id === id) {
      setScore((s) => s + 1);
      setTiles((prev) => prev.slice(1));
    } else {
      setGameOver(true);
    }
  };

  const handleAnimationEnd = (tile: Tile) => {
    if (tiles.some((t) => t.id === tile.id)) {
      setGameOver(true);
    }
  };

  // Game state controls
  const startGame = () => {
    setTiles([]);
    setNextTileId(0);
    setScore(0);
    setGameStarted(true);
    setHasStartedOnce(true);
    setGameOver(false);
  };

  const restartGame = async () => {
    if (score > 0 && walletAddress) {
      const { data: existing, error } = await supabase
        .from("scores")
        .select("score")
        .eq("wallet_address", walletAddress)
        .single();

      if (!error && existing && score > existing.score) {
        await supabase
          .from("scores")
          .update({ score })
          .eq("wallet_address", walletAddress);
      } else if (error && existing === null) {
        await supabase
          .from("scores")
          .insert([{ wallet_address: walletAddress, score }]);
      }
    }

    setTiles([]);
    setNextTileId(0);
    setScore(0);
    setGameStarted(true);
    setGameOver(false);

    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0; // 🔥 Reset to start
      audio.play().catch(() => {});
    }
  };

  // Save Frame button
  const saveFrameBtn = useMemo(() => {
    if (context && !context.client?.added) {
      return (
        <button
          className="text-blue-400 underline text-sm"
          onClick={() => addFrame()}
        >
          Save Frame
        </button>
      );
    }
    return null;
  }, [context, addFrame]);

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-zinc-900 to-gray-800 text-white p-4">
      <header className="absolute top-4 right-4 flex gap-4 z-20">
        {saveFrameBtn}
        <Wallet>
          <ConnectWallet>
            <Avatar className="h-6 w-6" />
            <Name />
          </ConnectWallet>
          <WalletDropdown>
            <Identity hasCopyAddressOnClick>
              <Avatar />
              <Name />
              <Address />
              <EthBalance />
            </Identity>
            <WalletDropdownDisconnect />
          </WalletDropdown>
        </Wallet>
      </header>

      <main className="flex flex-col items-center gap-4 pt-16">
        <h1 className="text-2xl font-bold">🎵 Tap Game</h1>

        {!hasStartedOnce ? (
          <button onClick={startGame} className="bg-blue-500 px-4 py-2 rounded">
            ▶️ Start Game
          </button>
        ) : (
          <>
            <div className="relative w-72 h-120 border rounded border-gray-700 overflow-hidden bg-black/10">
              {tiles.map((tile) => (
                <div
                  key={tile.id}
                  className="absolute w-14 h-14 bg-blue-500 rounded cursor-pointer animate-fall"
                  style={{
                    left: `${tile.lane * 70 + 10}px`,
                    animationDuration: `${tile.fallDuration}ms`,
                  }}
                  onClick={() => handleTileClick(tile.id)}
                  onAnimationEnd={() => handleAnimationEnd(tile)}
                />
              ))}
              {gameOver && (
                <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-white z-10">
                  <h2 className="text-2xl font-bold mb-4">💥 Game Over</h2>
                  <button
                    onClick={restartGame}
                    className="bg-white text-black px-6 py-2 rounded"
                  >
                    🔁 Restart
                  </button>
                </div>
              )}
            </div>

            <p className="text-lg">Score: {score}</p>
          </>
        )}

        {/* Leaderboard */}
        <div className="mt-8 w-full max-w-xs bg-white/10 rounded p-4 text-center">
          <h2 className="font-semibold mb-2">🏆 Leaderboard</h2>
          <ol className="list-decimal list-inside space-y-1">
            {leaderboard.map((e, i) => (
              <li key={i}>
                {e.wallet_address.slice(0, 6)}... – {e.score}
              </li>
            ))}
            {leaderboard.length === 0 && <li>No scores yet.</li>}
          </ol>
        </div>
      </main>

      <audio ref={audioRef} src="/music.mp3" preload="auto" />

      <style jsx global>{`
        @keyframes fall {
          0% {
            top: -60px;
          }
          100% {
            top: 100%;
          }
        }
        .animate-fall {
          animation-name: fall;
          animation-timing-function: linear;
        }
      `}</style>
    </div>
  );
}
