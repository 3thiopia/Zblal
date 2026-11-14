export type TileType = 'WALL' | 'PATH' | 'TUNNEL' | 'PEN';

export interface GridPoint {
  col: number;
  row: number;
}

export interface MazeDefinition {
  id: number;
  name: string;
  cols: number;
  rows: number;
  grid: string[];
}

/**
 * 15x17 retro arcade mazes.
 * Legend:
 *   '#' = Wall
 *   '.' = Walkable tile with regular toilet-paper roll
 *   'G' = Walkable tile with golden toilet-paper roll (speed boost)
 *   'P' = POOP MAN start tile (walkable, empty)
 *   'E' = Germ house / spawn tiles (walkable for germs, empty)
 *   ' ' = Empty walkable tile (tunnel or pen doorway)
 */
export const POOP_MAN_MAZES: MazeDefinition[] = [
  {
    id: 1,
    name: 'Addis Pipes',
    cols: 15,
    rows: 17,
    grid: [
      '###############',
      '#G.....#.....G#',
      '#.##.#.#.#.##.#',
      '#.............#',
      '#.##.#.#.#.##.#',
      '#....#.#.#....#',
      '###..# # #..###',
      ' ....#EEE#.... ',
      '###..#####..###',
      '#.............#',
      '#.##.#####.##.#',
      '#..#.......#..#',
      '##.#.#.#.#.#.##',
      '#....#.P.#....#',
      '#.####.#.####.#',
      '#G...........G#',
      '###############',
    ],
  },
  {
    id: 2,
    name: 'Bole Sewer',
    cols: 15,
    rows: 17,
    grid: [
      '###############',
      '#G..#.....#..G#',
      '#.#.#.###.#.#.#',
      '#.............#',
      '###.#.#.#.#.###',
      '#...#.....#...#',
      '#.#..# # #..#.#',
      ' ....#EEE#.... ',
      '#.#..#####..#.#',
      '#.............#',
      '#.##.##.##.##.#',
      '#.#....#....#.#',
      '#.#.##.#.##.#.#',
      '#......P......#',
      '#.##.#####.##.#',
      '#G...........G#',
      '###############',
    ],
  },
  {
    id: 3,
    name: 'Merkato Drain',
    cols: 15,
    rows: 17,
    grid: [
      '###############',
      '#G...........G#',
      '#.##.##.##.##.#',
      '#....#...#....#',
      '#.##.#.#.#.##.#',
      '#.............#',
      '###..# # #..###',
      ' ....#EEE#.... ',
      '###..#####..###',
      '#....#...#....#',
      '#.##.#.#.#.##.#',
      '#.............#',
      '#.#.###.###.#.#',
      '#.#....P....#.#',
      '#.#.##.#.##.#.#',
      '#G.....#.....G#',
      '###############',
    ],
  },
];

export function getMazeForLevel(level: number): MazeDefinition {
  const index = (Math.max(1, level) - 1) % POOP_MAN_MAZES.length;
  return POOP_MAN_MAZES[index];
}

export function isWallTile(maze: MazeDefinition, col: number, row: number): boolean {
  if (row < 0 || row >= maze.rows) return true;
  // Horizontal wrap-around tunnel on rows with open side edges
  if (col < 0 || col >= maze.cols) {
    return maze.grid[row][0] === '#' || maze.grid[row][maze.cols - 1] === '#';
  }
  return maze.grid[row][col] === '#';
}
