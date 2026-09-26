import { ImageResponse } from 'next/og'

export const alt = 'Dr. Wolf Brain — An AI Chess Coach That Learns How You Think'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#1b120a',
          backgroundImage: 'radial-gradient(circle at 50% 30%, #382414 0%, #140d07 100%)',
          padding: '60px 80px',
          fontFamily: 'serif',
          color: '#f6eedb',
          border: '12px solid #2d1c10',
          position: 'relative',
        }}
      >
        {/* Top bar with badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              color: '#d89b3f',
              fontSize: '24px',
              fontWeight: 600,
              letterSpacing: '1px',
            }}
          >
            {/* Shield / Crown SVG */}
            <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3zm0 4a3 3 0 110 6 3 3 0 010-6zm4.5 11c-.75 1.5-2.5 2.5-4.5 2.5s-3.75-1-4.5-2.5c.35-1.5 2-2.5 4.5-2.5s4.15 1 4.5 2.5z" />
            </svg>
            <span>DR. WOLF BRAIN</span>
          </div>
          <div
            style={{
              backgroundColor: 'rgba(216, 155, 63, 0.15)',
              border: '1px solid #d89b3f',
              color: '#e8b86d',
              padding: '6px 18px',
              borderRadius: '999px',
              fontSize: '18px',
              fontFamily: 'sans-serif',
              fontWeight: 500,
            }}
          >
            Think First · Stockfish 18 · Evidence Engine
          </div>
        </div>

        {/* Central Headline & Value Prop */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            maxWidth: '960px',
            marginTop: '20px',
            marginBottom: '20px',
          }}
        >
          <div
            style={{
              fontSize: '60px',
              lineHeight: 1.15,
              fontWeight: 700,
              color: '#fdfbf7',
              marginBottom: '20px',
            }}
          >
            An AI chess coach that learns how you think.
          </div>
          <div
            style={{
              fontSize: '25px',
              lineHeight: 1.4,
              color: '#d1bfa3',
              fontFamily: 'sans-serif',
              fontWeight: 400,
              maxWidth: '820px',
            }}
          >
            Listens before it speaks. Grounded in Stockfish analysis, structured learner evidence, and Socratic practice.
          </div>
        </div>

        {/* Bottom stats / features bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '40px',
            width: '100%',
            paddingTop: '24px',
            borderTop: '1px solid rgba(216, 155, 63, 0.25)',
            fontSize: '18px',
            color: '#bfa78a',
            fontFamily: 'sans-serif',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#d89b3f', fontWeight: 'bold' }}>•</span> Think First Socratic Sessions
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#d89b3f', fontWeight: 'bold' }}>•</span> Deterministic Stockfish Evaluation
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#d89b3f', fontWeight: 'bold' }}>•</span> Evolving Cognitive Learner Model
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
