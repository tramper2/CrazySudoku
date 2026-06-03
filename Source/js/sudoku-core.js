/**
 * Crazy Sudoku Core Logic
 * Handles board generation, backtracking solver, and difficulty masking.
 */

class SudokuCore {
    constructor() {
        this.boardSize = 9;
        this.boxSize = 3;
    }

    /**
     * Checks if placing num in grid[row][col] is valid according to Sudoku rules.
     */
    isValid(grid, row, col, num) {
        // Check row
        for (let x = 0; x < this.boardSize; x++) {
            if (grid[row][x] === num) return false;
        }

        // Check column
        for (let x = 0; x < this.boardSize; x++) {
            if (grid[x][col] === num) return false;
        }

        // Check 3x3 box
        let startRow = row - (row % this.boxSize);
        let startCol = col - (col % this.boxSize);
        for (let i = 0; i < this.boxSize; i++) {
            for (let j = 0; j < this.boxSize; j++) {
                if (grid[i + startRow][j + startCol] === num) return false;
            }
        }

        return true;
    }

    /**
     * Finds an empty location in the grid.
     * Returns {row, col} or null.
     */
    findEmptyLocation(grid) {
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                if (grid[row][col] === 0) {
                    return { row, col };
                }
            }
        }
        return null;
    }

    /**
     * Fills the grid using backtracking.
     */
    fillGrid(grid) {
        const empty = this.findEmptyLocation(grid);
        if (!empty) return true; // Fully filled

        const { row, col } = empty;
        // Shuffle numbers 1-9 to randomize generation
        const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];
        this.shuffle(numbers);

        for (let num of numbers) {
            if (this.isValid(grid, row, col, num)) {
                grid[row][col] = num;
                if (this.fillGrid(grid)) {
                    return true;
                }
                grid[row][col] = 0; // Backtrack
            }
        }
        return false;
    }

    /**
     * Solves the Sudoku grid and counts solutions (to ensure uniqueness).
     * @param {number[][]} grid 
     * @param {Object} counter object with count property
     */
    solveAndCount(grid, counter) {
        if (counter.count > 1) return; // Optimize: stop if we already have more than 1 solution

        const empty = this.findEmptyLocation(grid);
        if (!empty) {
            counter.count++;
            return;
        }

        const { row, col } = empty;
        for (let num = 1; num <= 9; num++) {
            if (this.isValid(grid, row, col, num)) {
                grid[row][col] = num;
                this.solveAndCount(grid, counter);
                grid[row][col] = 0; // Backtrack
            }
        }
    }

    /**
     * Generates a fully solved 9x9 grid.
     */
    generateFullGrid() {
        const grid = Array.from({ length: 9 }, () => Array(9).fill(0));
        this.fillGrid(grid);
        return grid;
    }

    /**
     * Helper to shuffle an array.
     */
    shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    /**
     * Creates a Sudoku puzzle from a complete board by removing numbers.
     * Guarantees a unique solution.
     * @param {number[][]} fullGrid The solved Sudoku grid
     * @param {number} cluesCount Number of cells to keep visible
     */
    generatePuzzle(fullGrid, cluesCount) {
        // Deep copy the full grid
        const puzzle = fullGrid.map(row => [...row]);
        const cells = [];
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                cells.push({ r, c });
            }
        }
        this.shuffle(cells);

        let targetRemovals = 81 - cluesCount;
        let removed = 0;

        for (let i = 0; i < cells.length; i++) {
            if (removed >= targetRemovals) break;

            const { r, c } = cells[i];
            const backup = puzzle[r][c];
            puzzle[r][c] = 0;

            // Check if there is still a unique solution
            const tempGrid = puzzle.map(row => [...row]);
            const counter = { count: 0 };
            this.solveAndCount(tempGrid, counter);

            if (counter.count === 1) {
                removed++;
            } else {
                puzzle[r][c] = backup; // Put it back if removing breaks uniqueness
            }
        }

        return puzzle;
    }
}

// Export for browser usage
window.SudokuCore = SudokuCore;
