// app/page.tsx
import GameClient from "./GameClient";

export const metadata = {
  title: "🎵 Tap Game",
  description: "Test your rhythm on Farcaster!",
  openGraph: {
    title: "🎵 Tap Game",
    description: "Test your rhythm and tap to the beat!",
    images: ["https://your-app.vercel.app/og.png"],
  },
  other: {
    "fc:frame": "vNext",
    "fc:frame:image": "https://your-app.vercel.app/og.png",
    "fc:frame:button:1": "▶️ Play",
    "fc:frame:post_url": "https://your-app.vercel.app/api/frame",
  },
};

export default function Page() {
  return <GameClient />;
}
