import { Chess } from 'chess.js'

// Import or define the exact FENs and moves used across the landing page
const examples = [
  {
    id: 'hero-demonstration',
    title: 'Hero Section Board',
    fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
    sideToMove: 'w',
  },
  {
    id: 'think-first-trigger',
    title: 'Think First Socratic Example',
    fen: 'r1bqkb1r/pppp1ppp/2n5/4p3/2B1n3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 5',
    sideToMove: 'w',
  },
  {
    id: 'review-development-nc3',
    title: 'Review Section Mockup',
    fen: 'r1bqkb1r/ppp2ppp/2n5/3np3/2B5/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 6',
    sideToMove: 'w',
    assertMove: 'Nc3',
    fromSquare: 'b1',
    toSquare: 'c3',
  },
]

console.log('--- Verifying Landing Page Chess Examples ---')
let passed = 0
let total = examples.length

for (const ex of examples) {
  try {
    const chess = new Chess(ex.fen)
    
    // 1. Validate FEN and King counts
    const board = chess.board()
    let whiteKings = 0
    let blackKings = 0
    for (const row of board) {
      for (const piece of row) {
        if (piece && piece.type === 'k') {
          if (piece.color === 'w') whiteKings++
          if (piece.color === 'b') blackKings++
        }
      }
    }

    if (whiteKings !== 1 || blackKings !== 1) {
      throw new Error(`Invalid King count: White=${whiteKings}, Black=${blackKings}`)
    }

    // 2. Validate side to move
    if (chess.turn() !== ex.sideToMove) {
      throw new Error(`Turn mismatch: Expected ${ex.sideToMove}, got ${chess.turn()}`)
    }

    // 3. Validate illustrated move legality if specified
    if (ex.assertMove) {
      const legalMoves = chess.moves()
      if (!legalMoves.includes(ex.assertMove)) {
        throw new Error(
          `Move ${ex.assertMove} is illegal in FEN: ${ex.fen}. Legal moves: ${legalMoves.join(', ')}`
        )
      }

      // Also test playing the move via verbose object
      const moveResult = chess.move({ from: ex.fromSquare, to: ex.toSquare })
      if (!moveResult) {
        throw new Error(`Failed to execute move from ${ex.fromSquare} to ${ex.toSquare}`)
      }
    }

    console.log(`✓ [${ex.id}] ${ex.title}: Valid FEN & Legal (${ex.assertMove ? `Move ${ex.assertMove} confirmed legal` : 'Valid Position'})`)
    passed++
  } catch (err) {
    console.error(`✗ [${ex.id}] ${ex.title} FAILED: ${err.message}`)
  }
}

console.log(`\nResult: ${passed}/${total} landing chess examples verified successfully.`)

if (passed !== total) {
  process.exit(1)
}
