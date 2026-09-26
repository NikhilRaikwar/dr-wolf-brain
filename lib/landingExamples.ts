import { Chess } from 'chess.js'

export type PieceType = 'p' | 'r' | 'n' | 'b' | 'q' | 'k'
export type PieceColor = 'w' | 'b'

export type BoardSquare = {
  piece?: { type: PieceType; color: PieceColor }
  highlight?: boolean
}

export interface LandingChessExample {
  id: string
  title: string
  fen: string
  sideToMove: 'white' | 'black'
  illustratedMove?: {
    san: string
    from: [number, number] // [row, col] 0-7
    to: [number, number]   // [row, col] 0-7
    fromSquare: string
    toSquare: string
  }
  highlightSquare?: [number, number] // [row, col]
  triggerType?: 'opponent_threat' | 'hanging' | 'king_safety' | 'forcing_candidate' | 'passive_piece'
  question?: string
  coachNote?: string
  copyMode: 'factual' | 'illustrative'
}

/**
 * Converts a standard FEN string into an 8x8 BoardSquare grid
 */
export function fenToBoardGrid(
  fen: string,
  highlightSquare?: [number, number]
): (BoardSquare | null)[][] {
  const chess = new Chess(fen)
  const board = chess.board()

  return board.map((row, rIdx) =>
    row.map((cell, cIdx) => {
      if (!cell) {
        return highlightSquare && highlightSquare[0] === rIdx && highlightSquare[1] === cIdx
          ? { highlight: true }
          : null
      }

      const isHighlighted =
        highlightSquare !== undefined &&
        highlightSquare[0] === rIdx &&
        highlightSquare[1] === cIdx

      return {
        piece: {
          type: cell.type as PieceType,
          color: cell.color as PieceColor,
        },
        highlight: isHighlighted,
      }
    })
  )
}

// 1. Hero Section Demonstration Board
export const heroExample: LandingChessExample = {
  id: 'hero-demonstration',
  title: 'Open Classical Development',
  fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
  sideToMove: 'white',
  highlightSquare: [4, 2], // c4 square (Bc4 developed)
  copyMode: 'illustrative',
}

// 2. Think First Section Socratic Trigger Example
export const thinkFirstExample: LandingChessExample = {
  id: 'think-first-trigger',
  title: 'Think First Socratic Moment',
  fen: 'r1bqkb1r/pppp1ppp/2n5/4p3/2B1n3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 5',
  sideToMove: 'white',
  triggerType: 'opponent_threat',
  question: 'Before you move — what is your opponent threatening?',
  copyMode: 'illustrative',
}

// 3. Review Section Demonstrating Legal Nc3 Development
export const reviewExample: LandingChessExample = {
  id: 'review-development-nc3',
  title: 'Review: Queenside Knight Development',
  // Position after 1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. d3 d5 5. exd5 Nxd5
  // White to move. Nb1-c3 is 100% legal.
  fen: 'r1bqkb1r/ppp2ppp/2n5/3np3/2B5/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 6',
  sideToMove: 'white',
  illustratedMove: {
    san: 'Nc3',
    from: [7, 1], // b1
    to: [5, 2],   // c3
    fromSquare: 'b1',
    toSquare: 'c3',
  },
  highlightSquare: [5, 2], // c3 square
  coachNote: 'Nc3 develops the queenside knight and adds control over central squares.',
  copyMode: 'illustrative',
}
