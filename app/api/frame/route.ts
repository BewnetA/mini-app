import { NextResponse } from 'next/server';

export async function POST() {
  const html = `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Frame</title>
    </head>
    <body>
      <img src="https://your-app.vercel.app/og.png" alt="Game Thumbnail" style="width:100%; max-width:400px;"/>
      <div style="margin-top: 1em;">
        <a href="https://your-app.vercel.app" style="display:inline-block; padding: 10px 20px; background:#0066ff; color:#fff; text-decoration:none; border-radius:5px;">
          🚀 Start Game
        </a>
      </div>
    </body>
  </html>
  `;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html',
    },
  });
}
