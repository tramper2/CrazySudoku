/**
 * Crazy Sudoku Application Logic
 * Integrates SudokuCore, handles events, manages items, debuffs and state.
 */

document.addEventListener('DOMContentLoaded', () => {
    const core = new window.SudokuCore();

    // Game States
    let solvedGrid = [];
    let puzzleGrid = [];
    let userGrid = [];
    let notesGrid = Array.from({ length: 81 }, () => new Set());
    
    let selectedCell = null;
    let maxLives = 3;
    let lives = 3;
    let points = 3;
    let maxPoints = 3;
    let timer = 0;
    let timerInterval = null;
    let difficulty = 'easy';
    let isPlaying = false;
    let isPaused = false;
    let isNoteMode = false;

    // Items and Debuffs
    let activeShield = false;
    let isImmune = false;
    let immunityTimer = 0;
    let immunityInterval = null;
    let debuffInterval = null;
    let activeDebuff = null;
    let debuffTimeout = null;

    // DOM Elements
    const gridContainer = document.getElementById('sudoku-grid');
    const timerVal = document.getElementById('timer-val');
    const livesContainer = document.getElementById('lives-container');
    const pointsVal = document.getElementById('points-val');
    const difficultyVal = document.getElementById('difficulty-val');
    const difficultySelect = document.getElementById('difficulty-select');
    const btnStart = document.getElementById('btn-start');
    const btnPause = document.getElementById('btn-pause');
    const btnReset = document.getElementById('btn-reset');
    const btnResume = document.getElementById('btn-resume');
    const btnNote = document.getElementById('btn-note');
    const btnAutoNotes = document.getElementById('btn-auto-notes');
    const btnErase = document.getElementById('btn-erase');
    
    // Items Buttons & Badges
    const itemReveal = document.getElementById('item-reveal');
    const itemShield = document.getElementById('item-shield');
    const itemPurify = document.getElementById('item-purify');
    const shieldIndicator = document.getElementById('shield-indicator');
    const immunityIndicator = document.getElementById('immunity-indicator');

    // Debuff bar
    const debuffBar = document.getElementById('debuff-bar');
    const debuffMsg = document.getElementById('debuff-msg');
    
    // Modal
    const gameModal = document.getElementById('game-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalMessage = document.getElementById('modal-message');
    const modalStatDifficulty = document.getElementById('modal-stat-difficulty');
    const modalStatTime = document.getElementById('modal-stat-time');
    const modalBtnRestart = document.getElementById('modal-btn-restart');
    const modalBtnClose = document.getElementById('modal-btn-close');
    const pauseOverlay = document.getElementById('pause-overlay');

    // Ranking DOM Elements
    const rankingSubmitContainer = document.getElementById('ranking-submit-container');
    const rankingNicknameInput = document.getElementById('ranking-nickname');
    const btnSubmitRanking = document.getElementById('btn-submit-ranking');
    const rankingSubmitStatus = document.getElementById('ranking-submit-status');
    const rankingModal = document.getElementById('ranking-modal');
    const rankingTableBody = document.getElementById('ranking-table-body');
    const btnCloseRanking = document.getElementById('btn-close-ranking');
    const btnShowAllRanks = document.getElementById('btn-show-all-ranks');
    const miniRankList = document.getElementById('mini-rank-list');

    // Initialize UI state
    updateLivesUI();
    updatePointsUI();

    // 리더보드 및 방문자 API 연동 초기화
    if (window.initLeaderboard) {
        window.initLeaderboard().then(success => {
            if (success) {
                refreshMiniLeaderboard();
                updateVisitorCountUI();
            }
        });
    }

    // Event Listeners
    btnStart.addEventListener('click', startNewGame);
    btnPause.addEventListener('click', togglePause);
    btnResume.addEventListener('click', togglePause);
    btnReset.addEventListener('click', resetCurrentGame);
    btnNote.addEventListener('click', toggleNoteMode);
    btnAutoNotes.addEventListener('click', populateAutoNotes);
    btnErase.addEventListener('click', eraseSelectedCell);
    
    // Numpad Buttons
    document.querySelectorAll('.num-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const num = parseInt(btn.dataset.num);
            inputNumber(num);
        });
    });

    // Item Buttons
    itemReveal.addEventListener('click', useItemReveal);
    itemShield.addEventListener('click', useItemShield);
    itemPurify.addEventListener('click', useItemPurify);

    // Modal buttons
    modalBtnRestart.addEventListener('click', () => {
        hideModal();
        startNewGame();
    });
    modalBtnClose.addEventListener('click', hideModal);

    // Ranking Buttons
    btnSubmitRanking.addEventListener('click', submitPlayerScore);
    btnShowAllRanks.addEventListener('click', showFullLeaderboard);
    btnCloseRanking.addEventListener('click', () => rankingModal.classList.add('hide'));

    // Keyboard Navigation
    document.addEventListener('keydown', handleKeyDown);

    // ----------------------------------------------------
    // Game Core Operations
    // ----------------------------------------------------

    function startNewGame() {
        difficulty = difficultySelect.value;
        difficultyVal.textContent = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
        
        // Reset states
        solvedGrid = core.generateFullGrid();
        
        let clues = 45;
        if (difficulty === 'medium') clues = 35;
        if (difficulty === 'hard') clues = 25;
        if (difficulty === 'crazy') clues = 28; // Starts slightly hard, with debuffs

        puzzleGrid = core.generatePuzzle(solvedGrid, clues);
        userGrid = puzzleGrid.map(row => [...row]);
        notesGrid = Array.from({ length: 81 }, () => new Set());
        
        selectedCell = null;
        lives = maxLives;
        points = maxPoints;
        timer = 0;
        isNoteMode = false;
        isPaused = false;
        isPlaying = true;
        
        // Active status
        activeShield = false;
        isImmune = false;
        immunityTimer = 0;
        if (immunityInterval) clearInterval(immunityInterval);
        
        clearDebuffs();
        if (debuffInterval) clearInterval(debuffInterval);

        btnPause.disabled = false;
        btnReset.disabled = false;
        btnNote.classList.remove('active');
        btnNote.innerHTML = '<i class="fa-solid fa-pen"></i> 메모: OFF';

        updateLivesUI();
        updatePointsUI();
        updateShieldUI();
        updateImmunityUI();
        
        renderBoard();
        startTimer();

        if (difficulty === 'crazy') {
            setupCrazyMode();
        }

        saveToLocalStorage();
    }

    function resetCurrentGame() {
        if (!isPlaying) return;
        userGrid = puzzleGrid.map(row => [...row]);
        notesGrid = Array.from({ length: 81 }, () => new Set());
        selectedCell = null;
        lives = maxLives;
        timer = 0;
        
        clearDebuffs();
        updateLivesUI();
        renderBoard();
        saveToLocalStorage();
    }

    function renderBoard() {
        gridContainer.innerHTML = '';
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                const cellVal = userGrid[r][c];
                const cell = document.createElement('div');
                cell.classList.add('sudoku-cell');
                cell.dataset.row = r;
                cell.dataset.col = c;

                if (puzzleGrid[r][c] !== 0) {
                    cell.textContent = cellVal;
                    cell.classList.add('original');
                } else if (cellVal !== 0) {
                    cell.textContent = cellVal;
                    cell.classList.add('user-input');
                    // Check if incorrect
                    if (cellVal !== solvedGrid[r][c]) {
                        cell.classList.add('incorrect');
                    }
                } else {
                    // Render Notes if empty
                    const cellIndex = r * 9 + c;
                    const notes = notesGrid[cellIndex];
                    if (notes.size > 0) {
                        const notesGridEl = document.createElement('div');
                        notesGridEl.classList.add('notes-grid');
                        for (let n = 1; n <= 9; n++) {
                            const noteNum = document.createElement('div');
                            noteNum.classList.add('note-num');
                            if (notes.has(n)) {
                                noteNum.textContent = n;
                            }
                            notesGridEl.appendChild(noteNum);
                        }
                        cell.appendChild(notesGridEl);
                    }
                }

                // Grid click selection
                cell.addEventListener('click', () => selectCell(r, c));
                gridContainer.appendChild(cell);
            }
        }
        highlightIntersections();
    }

    function selectCell(row, col) {
        if (!isPlaying || isPaused) return;
        selectedCell = { row, col };
        
        // Remove active styling, then apply to matches
        document.querySelectorAll('.sudoku-cell').forEach(el => {
            el.classList.remove('selected', 'highlight-rowcol', 'highlight-same');
        });

        const targetVal = userGrid[row][col];
        document.querySelectorAll('.sudoku-cell').forEach(el => {
            const r = parseInt(el.dataset.row);
            const c = parseInt(el.dataset.col);

            if (r === row && c === col) {
                el.classList.add('selected');
            } else if (r === row || c === col || (Math.floor(r/3) === Math.floor(row/3) && Math.floor(c/3) === Math.floor(col/3))) {
                el.classList.add('highlight-rowcol');
            }

            if (targetVal !== 0 && userGrid[r][c] === targetVal) {
                el.classList.add('highlight-same');
            }
        });
    }

    function highlightIntersections() {
        if (!selectedCell) return;
        selectCell(selectedCell.row, selectedCell.col);
    }

    function clearNumberFromRelatedNotes(row, col, num) {
        // Remove num from notes in same row
        for (let c = 0; c < 9; c++) {
            notesGrid[row * 9 + c].delete(num);
        }
        // Remove num from notes in same column
        for (let r = 0; r < 9; r++) {
            notesGrid[r * 9 + col].delete(num);
        }
        // Remove num from notes in same 3x3 box
        const startRow = row - (row % 3);
        const startCol = col - (col % 3);
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
                const targetRow = startRow + r;
                const targetCol = startCol + c;
                notesGrid[targetRow * 9 + targetCol].delete(num);
            }
        }
    }

    function inputNumber(num) {
        if (!isPlaying || isPaused || !selectedCell) return;
        const { row, col } = selectedCell;

        // Cannot overwrite original prefilled cell
        if (puzzleGrid[row][col] !== 0) return;

        if (isNoteMode) {
            const cellIndex = row * 9 + col;
            if (userGrid[row][col] !== 0) return; // Note only in empty cell

            if (notesGrid[cellIndex].has(num)) {
                notesGrid[cellIndex].delete(num);
            } else {
                notesGrid[cellIndex].add(num);
            }
            renderBoard();
        } else {
            // Input Mode
            userGrid[row][col] = num;
            const cellIndex = row * 9 + col;
            notesGrid[cellIndex].clear(); // Clear notes when inputting
            
            // Auto remove this number from notes of conflicting cells in row, col, and box
            clearNumberFromRelatedNotes(row, col, num);

            if (num !== solvedGrid[row][col]) {
                // Incorrect logic
                if (activeShield) {
                    // Shield protects life
                    activeShield = false;
                    updateShieldUI();
                    showFloatingAlert("Shield Blocked Wrong Move!");
                } else {
                    lives--;
                    updateLivesUI();
                    if (lives <= 0) {
                        endGame(false);
                    }
                }
            }

            renderBoard();
            checkWinCondition();
        }
        saveToLocalStorage();
    }

    function eraseSelectedCell() {
        if (!isPlaying || isPaused || !selectedCell) return;
        const { row, col } = selectedCell;
        if (puzzleGrid[row][col] !== 0) return; // Prefilled cannot be erased

        userGrid[row][col] = 0;
        const cellIndex = row * 9 + col;
        notesGrid[cellIndex].clear();
        
        renderBoard();
        saveToLocalStorage();
    }

    function toggleNoteMode() {
        isNoteMode = !isNoteMode;
        if (isNoteMode) {
            btnNote.classList.add('active');
            btnNote.innerHTML = '<i class="fa-solid fa-pen"></i> 메모: ON';
        } else {
            btnNote.classList.remove('active');
            btnNote.innerHTML = '<i class="fa-solid fa-pen"></i> 메모: OFF';
        }
    }

    function populateAutoNotes() {
        if (!isPlaying || isPaused) return;
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                const cellIndex = r * 9 + c;
                if (userGrid[r][c] !== 0) {
                    notesGrid[cellIndex].clear();
                    continue;
                }
                notesGrid[cellIndex].clear();
                for (let num = 1; num <= 9; num++) {
                    if (core.isValid(userGrid, r, c, num)) {
                        notesGrid[cellIndex].add(num);
                    }
                }
            }
        }
        renderBoard();
        saveToLocalStorage();
    }

    // ----------------------------------------------------
    // Timer & Status updates
    // ----------------------------------------------------

    function startTimer() {
        if (timerInterval) clearInterval(timerInterval);
        timerInterval = setInterval(() => {
            if (!isPaused) {
                timer++;
                const mins = String(Math.floor(timer / 60)).padStart(2, '0');
                const secs = String(timer % 60).padStart(2, '0');
                timerVal.textContent = `${mins}:${secs}`;
            }
        }, 1000);
    }

    function togglePause() {
        if (!isPlaying) return;
        isPaused = !isPaused;
        if (isPaused) {
            pauseOverlay.classList.remove('hide');
            btnPause.innerHTML = '<i class="fa-solid fa-play"></i> 계속하기';
        } else {
            pauseOverlay.classList.add('hide');
            btnPause.innerHTML = '<i class="fa-solid fa-pause"></i> 일시정지';
        }
    }

    function updateLivesUI() {
        livesContainer.innerHTML = '';
        for (let i = 0; i < maxLives; i++) {
            const heart = document.createElement('i');
            heart.classList.add('fa-solid', 'fa-heart', 'life-heart');
            if (i >= lives) {
                heart.classList.add('lost');
            }
            livesContainer.appendChild(heart);
        }
    }

    function updatePointsUI() {
        pointsVal.textContent = `${points} / ${maxPoints}`;
        // Disable items if points run out
        const hasPoints = points > 0;
        itemReveal.disabled = !hasPoints;
        itemShield.disabled = !hasPoints || activeShield;
        itemPurify.disabled = !hasPoints || (!activeDebuff && !isImmune);
    }

    function updateShieldUI() {
        if (activeShield) {
            shieldIndicator.classList.remove('hide');
        } else {
            shieldIndicator.classList.add('hide');
        }
        updatePointsUI();
    }

    function updateImmunityUI() {
        if (isImmune) {
            immunityIndicator.classList.remove('hide');
            immunityIndicator.textContent = `${immunityTimer}s`;
        } else {
            immunityIndicator.classList.add('hide');
        }
        updatePointsUI();
    }

    // ----------------------------------------------------
    // Crazy Mode & Debuffs Engine
    // ----------------------------------------------------

    function setupCrazyMode() {
        // Triggers debuffs every 20-30 seconds
        debuffInterval = setInterval(() => {
            if (isPaused || !isPlaying || isImmune) return;
            triggerRandomDebuff();
        }, 22000);
    }

    function triggerRandomDebuff() {
        if (isImmune) return;

        const debuffs = ['flashbang', 'numberhide', 'earthquake'];
        const selectDebuff = debuffs[Math.floor(Math.random() * debuffs.length)];
        activeDebuff = selectDebuff;

        debuffBar.classList.remove('hide');
        
        if (selectDebuff === 'flashbang') {
            debuffMsg.textContent = '⚡ 경고: 플래시 뱅! (화면 일시 눈부심)';
            document.body.classList.add('flashbang-active');
            debuffTimeout = setTimeout(() => {
                document.body.classList.remove('flashbang-active');
                clearDebuffs();
            }, 3000);
        } else if (selectDebuff === 'numberhide') {
            debuffMsg.textContent = '👁️ 경고: 숫자 숨바꼭질! (숫자가 보이지 않음)';
            gridContainer.classList.add('number-hidden');
            debuffTimeout = setTimeout(() => {
                gridContainer.classList.remove('number-hidden');
                clearDebuffs();
            }, 6000);
        } else if (selectDebuff === 'earthquake') {
            debuffMsg.textContent = '🌋 경고: 지진 발생! (보드가 요동칩니다)';
            gridContainer.classList.add('earthquake');
            debuffTimeout = setTimeout(() => {
                gridContainer.classList.remove('earthquake');
                clearDebuffs();
            }, 5000);
        }
        updatePointsUI();
    }

    function clearDebuffs() {
        activeDebuff = null;
        debuffBar.classList.add('hide');
        document.body.classList.remove('flashbang-active');
        gridContainer.classList.remove('number-hidden', 'earthquake');
        if (debuffTimeout) clearTimeout(debuffTimeout);
        updatePointsUI();
    }

    // ----------------------------------------------------
    // Items Actions
    // ----------------------------------------------------

    function useItemReveal() {
        if (points <= 0 || !selectedCell) return;
        const { row, col } = selectedCell;
        if (puzzleGrid[row][col] !== 0) return; // Ignore original prefilleds

        const correctNum = solvedGrid[row][col];
        userGrid[row][col] = correctNum;
        points--;
        
        // Auto remove this number from notes of conflicting cells in row, col, and box
        clearNumberFromRelatedNotes(row, col, correctNum);

        renderBoard();
        checkWinCondition();
        updatePointsUI();
        saveToLocalStorage();
    }

    function useItemShield() {
        if (points <= 0 || activeShield) return;
        activeShield = true;
        points--;
        updateShieldUI();
        saveToLocalStorage();
    }

    function useItemPurify() {
        if (points <= 0) return;
        
        clearDebuffs();
        isImmune = true;
        immunityTimer = 15; // 15 seconds immunity
        points--;

        updateImmunityUI();

        if (immunityInterval) clearInterval(immunityInterval);
        immunityInterval = setInterval(() => {
            if (!isPaused) {
                immunityTimer--;
                updateImmunityUI();
                if (immunityTimer <= 0) {
                    isImmune = false;
                    clearInterval(immunityInterval);
                    updateImmunityUI();
                }
            }
        }, 1000);

        saveToLocalStorage();
    }

    // Helper alerts
    function showFloatingAlert(msg) {
        const alertEl = document.createElement('div');
        alertEl.style.position = 'fixed';
        alertEl.style.top = '15%';
        alertEl.style.left = '50%';
        alertEl.style.transform = 'translate(-50%, -50%)';
        alertEl.style.background = 'rgba(6, 182, 212, 0.95)';
        alertEl.style.color = '#fff';
        alertEl.style.padding = '12px 24px';
        alertEl.style.borderRadius = '8px';
        alertEl.style.fontSize = '1rem';
        alertEl.style.fontWeight = 'bold';
        alertEl.style.boxShadow = '0 0 15px rgba(6, 182, 212, 0.8)';
        alertEl.style.zIndex = '99999';
        alertEl.style.fontFamily = 'Outfit, sans-serif';
        alertEl.textContent = msg;

        document.body.appendChild(alertEl);
        setTimeout(() => {
            alertEl.remove();
        }, 2500);
    }

    // ----------------------------------------------------
    // Game Completion Logic
    // ----------------------------------------------------

    function checkWinCondition() {
        // Game clear is when userGrid equals solvedGrid
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                if (userGrid[r][c] !== solvedGrid[r][c]) {
                    return; // Puzzle not solved yet
                }
            }
        }
        endGame(true);
    }

    function endGame(isWin) {
        isPlaying = false;
        if (timerInterval) clearInterval(timerInterval);
        if (debuffInterval) clearInterval(debuffInterval);
        clearDebuffs();

        // Update statistics
        let stats = JSON.parse(localStorage.getItem('crazy_sudoku_stats')) || {
            easy: 0, medium: 0, hard: 0, crazy: 0, bestTime: 999999
        };

        if (isWin) {
            stats[difficulty]++;
            if (timer < stats.bestTime) {
                stats.bestTime = timer;
            }
            localStorage.setItem('crazy_sudoku_stats', JSON.stringify(stats));

            modalTitle.textContent = '🎉 MISSION CLEAR!';
            modalTitle.style.color = 'var(--neon-cyan)';
            modalMessage.textContent = '두뇌가 한계를 극복했습니다! 완벽한 퍼즐 풀이 성공!';

            // 랭킹 입력 폼 활성화 및 이전 입력 닉네임 불러오기
            if (rankingSubmitContainer) {
                rankingSubmitContainer.classList.remove('hide');
                const savedNickname = localStorage.getItem('sudoku_nickname') || '';
                rankingNicknameInput.value = savedNickname;
                rankingSubmitStatus.textContent = '';
                rankingSubmitStatus.className = 'submit-status-msg';
                btnSubmitRanking.disabled = false;
            }
        } else {
            modalTitle.textContent = '💥 MISSION FAILED...';
            modalTitle.style.color = 'var(--neon-red)';
            modalMessage.textContent = '라이프가 전부 소진되었습니다. 다시 도전해 보세요!';

            // 실패 시 랭킹 등록 불가 처리
            if (rankingSubmitContainer) {
                rankingSubmitContainer.classList.add('hide');
            }
        }

        // Show stats
        modalStatDifficulty.textContent = difficulty.toUpperCase();
        const mins = String(Math.floor(timer / 60)).padStart(2, '0');
        const secs = String(timer % 60).padStart(2, '0');
        modalStatTime.textContent = `${mins}:${secs}`;

        gameModal.classList.remove('hide');
        localStorage.removeItem('crazy_sudoku_game_state');
    }

    function hideModal() {
        gameModal.classList.add('hide');
    }

    // ----------------------------------------------------
    // Keyboard handlers
    // ----------------------------------------------------

    function handleKeyDown(e) {
        if (!isPlaying || isPaused) return;

        // Navigation
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            e.preventDefault();
            if (!selectedCell) {
                selectCell(0, 0);
                return;
            }
            let { row, col } = selectedCell;
            if (e.key === 'ArrowUp') row = (row - 1 + 9) % 9;
            if (e.key === 'ArrowDown') row = (row + 1) % 9;
            if (e.key === 'ArrowLeft') col = (col - 1 + 9) % 9;
            if (e.key === 'ArrowRight') col = (col + 1) % 9;
            selectCell(row, col);
            return;
        }

        // Number typing
        if (e.key >= '1' && e.key <= '9') {
            inputNumber(parseInt(e.key));
            return;
        }

        // Deletion
        if (e.key === 'Backspace' || e.key === 'Delete') {
            eraseSelectedCell();
            return;
        }

        // Toggle notes
        if (e.key.toLowerCase() === 'n') {
            toggleNoteMode();
            return;
        }

        // Pause
        if (e.key === 'Escape') {
            togglePause();
            return;
        }
    }

    // ----------------------------------------------------
    // LocalStorage State Saving
    // ----------------------------------------------------

    function saveToLocalStorage() {
        if (!isPlaying) return;
        const state = {
            solvedGrid,
            puzzleGrid,
            userGrid,
            notesGrid: notesGrid.map(set => Array.from(set)),
            lives,
            points,
            timer,
            difficulty,
            activeShield,
            isImmune,
            immunityTimer
        };
        localStorage.setItem('crazy_sudoku_game_state', JSON.stringify(state));
    }

    function restoreFromLocalStorage() {
        const stateStr = localStorage.getItem('crazy_sudoku_game_state');
        if (!stateStr) return;
        
        try {
            const state = JSON.parse(stateStr);
            solvedGrid = state.solvedGrid;
            puzzleGrid = state.puzzleGrid;
            userGrid = state.userGrid;
            notesGrid = state.notesGrid.map(arr => new Set(arr));
            lives = state.lives;
            points = state.points;
            timer = state.timer;
            difficulty = state.difficulty;
            activeShield = state.activeShield;
            isImmune = state.isImmune;
            immunityTimer = state.immunityTimer;

            isPlaying = true;
            difficultySelect.value = difficulty;
            difficultyVal.textContent = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);

            btnPause.disabled = false;
            btnReset.disabled = false;

            updateLivesUI();
            updatePointsUI();
            updateShieldUI();
            updateImmunityUI();
            renderBoard();
            startTimer();

            if (difficulty === 'crazy') {
                setupCrazyMode();
            }

            if (isImmune && immunityTimer > 0) {
                immunityInterval = setInterval(() => {
                    if (!isPaused) {
                        immunityTimer--;
                        updateImmunityUI();
                        if (immunityTimer <= 0) {
                            isImmune = false;
                            clearInterval(immunityInterval);
                            updateImmunityUI();
                        }
                    }
                }, 1000);
            }
        } catch (e) {
            console.error("Failed to restore game state", e);
            localStorage.removeItem('crazy_sudoku_game_state');
        }
    }

    // ----------------------------------------------------
    // LootLocker Leaderboard Integration Helpers
    // ----------------------------------------------------

    function formatTime(seconds) {
        const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
        const secs = String(seconds % 60).padStart(2, '0');
        return `${mins}:${secs}`;
    }

    // Encoding: Easy (10000 - time), Medium (20000 - time), Hard (30000 - time), Crazy (40000 - time)
    // Higher score is better.
    function encodeLeaderboardScore(time, diff) {
        const safeTime = Math.min(Math.max(0, time), 9999);
        let base = 10000;
        if (diff === 'crazy') base = 40000;
        else if (diff === 'hard') base = 30000;
        else if (diff === 'medium') base = 20000;
        return base - safeTime;
    }

    function decodeLeaderboardScore(score) {
        if (score > 30000) {
            return { difficulty: 'CRAZY', time: 40000 - score, difficultyClass: 'neon-red' };
        } else if (score > 20000) {
            return { difficulty: 'HARD', time: 30000 - score, difficultyClass: 'neon-yellow' };
        } else if (score > 10000) {
            return { difficulty: 'MEDIUM', time: 20000 - score, difficultyClass: 'neon-violet' };
        } else {
            return { difficulty: 'EASY', time: 10000 - score, difficultyClass: 'neon-cyan' };
        }
    }

    // 방문자 수 업데이트 함수
    async function updateVisitorCountUI() {
        const valEl = document.getElementById('visitor-count-val');
        if (!valEl || !window.getTotalVisitorCount) return;
        const count = await window.getTotalVisitorCount();
        if (count > 0) {
            valEl.textContent = count.toLocaleString();
        }
    }

    async function refreshMiniLeaderboard() {
        if (!miniRankList || !window.getLootLockerLeaderboard) return;
        
        try {
            const list = await window.getLootLockerLeaderboard(5); // 상위 5명
            miniRankList.innerHTML = '';
            
            if (list.length === 0) {
                miniRankList.innerHTML = '<li class="loading">등록된 순위가 없습니다.</li>';
                return;
            }

            list.forEach(item => {
                const li = document.createElement('li');
                if (item.isMe) li.classList.add('me');
                
                const decoded = decodeLeaderboardScore(item.score);
                li.innerHTML = `
                    <span>
                        <span class="rank-num">#${item.rank}</span>
                        <span class="rank-name">${item.name}</span>
                        <span class="rank-diff ${decoded.difficultyClass}" style="font-size: 0.7rem; font-weight: bold; margin-left: 4px;">[${decoded.difficulty}]</span>
                    </span>
                    <span class="rank-time">${formatTime(decoded.time)}</span>
                `;
                miniRankList.appendChild(li);
            });
        } catch (error) {
            console.error('미니 리더보드 갱신 실패:', error);
            miniRankList.innerHTML = '<li class="loading">순위 로드 실패</li>';
        }
    }

    async function submitPlayerScore() {
        const nickname = rankingNicknameInput.value.trim();
        
        if (!nickname) {
            rankingSubmitStatus.textContent = '닉네임을 입력해주세요!';
            rankingSubmitStatus.className = 'submit-status-msg status-error';
            return;
        }

        if (nickname.length > 10) {
            rankingSubmitStatus.textContent = '닉네임은 최대 10자까지입니다.';
            rankingSubmitStatus.className = 'submit-status-msg status-error';
            return;
        }

        btnSubmitRanking.disabled = true;
        rankingSubmitStatus.textContent = '기록 분석 중...';
        rankingSubmitStatus.className = 'submit-status-msg status-loading';

        try {
            // 1. 기존 리더보드 최고 기록 조회
            let bestScore = null;
            if (window.getPlayerBestScore) {
                bestScore = await window.getPlayerBestScore();
            }

            // 2. 기록 단축 여부 검사 (서버가 Descending이므로 클수록 우수)
            const isFirstRecord = bestScore === null || bestScore === 0;
            const encodedCurrentScore = encodeLeaderboardScore(timer, difficulty);
            const isRecordBeaten = !isFirstRecord && encodedCurrentScore > bestScore;

            // 3. 플레이어 닉네임 설정 (기록 경신 여부와 무관하게 닉네임은 업데이트 허용)
            const nameSuccess = await window.setPlayerNickname(nickname);
            if (!nameSuccess) {
                throw new Error('이름 등록에 실패했습니다.');
            }

            // 닉네임 로컬 스토리지 보존
            localStorage.setItem('sudoku_nickname', nickname);

            if (isFirstRecord || isRecordBeaten) {
                // 4. 새 기록이 더 빠른 경우에만 점수(시간 초) 제출
                rankingSubmitStatus.textContent = '신기록 전송 중...';
                const scoreSuccess = await window.submitScoreToLootLocker(encodedCurrentScore);
                if (!scoreSuccess) {
                    throw new Error('점수 등록에 실패했습니다.');
                }
                
                const decodedBest = isFirstRecord ? null : decodeLeaderboardScore(bestScore);
                const sameDiff = decodedBest && decodedBest.difficulty === difficulty.toUpperCase();
                const timeDiffStr = (isFirstRecord || !sameDiff) ? '' : ` (이전 대비 -${decodedBest.time - timer}초 단축!)`;
                
                rankingSubmitStatus.textContent = `명예의 전당 신기록 등록 완료!${timeDiffStr}`;
                rankingSubmitStatus.className = 'submit-status-msg status-success';
            } else {
                // 기존 최고 기록보다 느린 경우 점수 제출은 스킵하고 안내만 표시
                const decodedBest = decodeLeaderboardScore(bestScore);
                rankingSubmitStatus.textContent = `닉네임 수정 완료! (최고 기록 [${decodedBest.difficulty}] ${formatTime(decodedBest.time)}이 더 우수하여 점수는 유지됩니다.)`;
                rankingSubmitStatus.className = 'submit-status-msg status-success';
            }
            
            // 미니 랭킹 즉시 갱신
            refreshMiniLeaderboard();
        } catch (error) {
            console.error(error);
            rankingSubmitStatus.textContent = error.message || '등록 중 오류가 발생했습니다.';
            rankingSubmitStatus.className = 'submit-status-msg status-error';
            btnSubmitRanking.disabled = false;
        }
    }

    async function showFullLeaderboard() {
        if (!rankingModal || !rankingTableBody || !window.getLootLockerLeaderboard) return;

        rankingTableBody.innerHTML = '<tr><td colspan="4" style="text-align:center; font-style:italic;">불러오는 중...</td></tr>';
        rankingModal.classList.remove('hide');

        try {
            const list = await window.getLootLockerLeaderboard(30); // 상위 30명
            rankingTableBody.innerHTML = '';

            if (list.length === 0) {
                rankingTableBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">순위가 아직 존재하지 않습니다. 첫 랭커가 되어보세요!</td></tr>';
                return;
            }

            list.forEach(item => {
                const tr = document.createElement('tr');
                if (item.isMe) tr.classList.add('me-row');

                const decoded = decodeLeaderboardScore(item.score);
                tr.innerHTML = `
                    <td>#${item.rank}</td>
                    <td>${item.name}</td>
                    <td class="${decoded.difficultyClass}" style="font-weight: bold; font-size: 0.85rem;">${decoded.difficulty}</td>
                    <td>${formatTime(decoded.time)}</td>
                `;
                rankingTableBody.appendChild(tr);
            });
        } catch (error) {
            console.error(error);
            rankingTableBody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:var(--neon-red);">순위를 불러오는 중 오류가 발생했습니다.</td></tr>';
        }
    }

    // Attempt restoring game state on load
    restoreFromLocalStorage();
});
