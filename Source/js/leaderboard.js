/**
 * CrazySudoku - Custom API Server Leaderboard & Visitor Counter Handler
 */

const API_BASE_URL = 'http://15.164.104.181';
const API_KEY = '__CRAZY_SUDOKU_API_KEY__';

let clientIdentifier = '';
let cachedTotalVisitors = 0;

/**
 * Get or create unique client ID
 */
function getOrCreateClientId() {
    if (clientIdentifier) return clientIdentifier;
    
    // Check if there is an existing ID from our new system or the legacy LootLocker system
    let clientId = localStorage.getItem('sudoku_browser_id') || localStorage.getItem('sudoku_player_id');
    if (!clientId) {
        // Generate a new random unique client ID
        clientId = 'usr_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        localStorage.setItem('sudoku_browser_id', clientId);
    } else if (!localStorage.getItem('sudoku_browser_id')) {
        // Migrate legacy ID to new key
        localStorage.setItem('sudoku_browser_id', clientId);
    }
    clientIdentifier = clientId;
    return clientIdentifier;
}

/**
 * Initialize Leaderboard & Register Visitor
 */
async function initLeaderboard() {
    try {
        const visitorId = getOrCreateClientId();
        
        const response = await fetch(`${API_BASE_URL}/api/v1/visitor/count`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': API_KEY
            },
            body: JSON.stringify({ visitor_id: visitorId })
        });

        const data = await response.json();
        
        if (response.ok && data.success) {
            cachedTotalVisitors = data.total_visitors;
            console.log('방문자 카운트 성공. 현재 총 방문자:', cachedTotalVisitors);
            return true;
        } else {
            console.error('방문자 등록 실패:', data.error || data);
            return false;
        }
    } catch (error) {
        console.error('API 통신 오류:', error);
        return false;
    }
}

/**
 * Retrieve total visitor count
 */
async function getTotalVisitorCount() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/visitor/count`, {
            method: 'GET',
            headers: {
                'x-api-key': API_KEY
            }
        });
        
        const data = await response.json();
        if (response.ok && data.success) {
            cachedTotalVisitors = data.total_visitors;
            return cachedTotalVisitors;
        }
        return cachedTotalVisitors;
    } catch (error) {
        console.error('방문자 수 조회 오류:', error);
        return cachedTotalVisitors;
    }
}

/**
 * Save player nickname locally
 */
async function setPlayerNickname(nickname) {
    if (!nickname) return false;
    localStorage.setItem('sudoku_nickname', nickname);
    return true;
}

/**
 * Submit score to leaderboard
 */
async function submitScoreToLeaderboard(encodedScore) {
    try {
        const browserId = getOrCreateClientId();
        const nickname = localStorage.getItem('sudoku_nickname') || 'Anonymous';
        
        const response = await fetch(`${API_BASE_URL}/api/v1/leaderboard`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': API_KEY
            },
            body: JSON.stringify({
                browser_id: browserId,
                username: nickname,
                score: encodedScore
            })
        });

        const data = await response.json();
        if (response.ok && data.success) {
            console.log('점수 제출 완료:', encodedScore);
            // Save best score locally
            localStorage.setItem('sudoku_best_score_v2', encodedScore);
            return true;
        } else {
            console.error('점수 제출 실패:', data.error || data);
            return false;
        }
    } catch (error) {
        console.error('점수 제출 통신 오류:', error);
        return false;
    }
}

/**
 * Get leaderboard rankings
 */
async function getLeaderboard(limit = 10) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/leaderboard?limit=${limit}`, {
            method: 'GET',
            headers: {
                'x-api-key': API_KEY
            }
        });

        const data = await response.json();
        if (response.ok && data.success) {
            const list = data.data || [];
            const myNickname = localStorage.getItem('sudoku_nickname');
            
            return list.map(item => ({
                rank: item.rank,
                name: item.username,
                score: item.score,
                isMe: myNickname && item.username === myNickname
            }));
        } else {
            console.error('리더보드 조회 실패:', data.error || data);
            return [];
        }
    } catch (error) {
        console.error('리더보드 조회 오류:', error);
        return [];
    }
}

/**
 * Get player's best score from local storage
 */
async function getPlayerBestScore() {
    const scoreStr = localStorage.getItem('sudoku_best_score_v2');
    return scoreStr ? parseInt(scoreStr, 10) : null;
}

// Expose functions globally
window.initLootLocker = initLeaderboard; // maintaining old name alias for safety
window.initLeaderboard = initLeaderboard;
window.setPlayerNickname = setPlayerNickname;
window.submitScoreToLootLocker = submitScoreToLeaderboard; // maintaining old name alias for safety
window.submitScoreToLeaderboard = submitScoreToLeaderboard;
window.getLootLockerLeaderboard = getLeaderboard; // maintaining old name alias for safety
window.getLeaderboard = getLeaderboard;
window.getPlayerBestScore = getPlayerBestScore;
window.getTotalVisitorCount = getTotalVisitorCount;
