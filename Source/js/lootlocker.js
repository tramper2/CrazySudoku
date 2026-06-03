/**
 * CrazySudoku - LootLocker API Handler
 */

const LOOTLOCKER_GAME_KEY = 'dev_e59ce9dbaa624c00bf632a2c0aa048e8';
const LOOTLOCKER_LEADERBOARD_KEY = 'crazysudoku';
const LOOTLOCKER_API_URL = 'https://api.lootlocker.io/game';

let playerToken = '';
let playerId = '';

/**
 * LootLocker 게스트 로그인 세션 시작
 */
async function initLootLocker() {
    try {
        // 이미 저장된 로컬 플레이어 식별자가 있다면 사용
        let localPlayerId = localStorage.getItem('sudoku_player_id');
        
        const payload = {
            game_key: LOOTLOCKER_GAME_KEY,
            game_version: '1.0.0'
        };
        
        if (localPlayerId) {
            payload.player_identifier = localPlayerId;
        }

        const response = await fetch(`${LOOTLOCKER_API_URL}/v2/session/guest`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        
        if (response.ok) {
            playerToken = data.session_token;
            playerId = data.player_id;
            // 다음 접속을 위해 식별자 로컬 스토리지에 유지
            localStorage.setItem('sudoku_player_id', data.player_identifier);
            console.log('LootLocker 게스트 세션 시작 성공. Player ID:', playerId);
            return true;
        } else {
            console.error('LootLocker 로그인 실패:', data.message || data);
            return false;
        }
    } catch (error) {
        console.error('LootLocker 통신 오류:', error);
        return false;
    }
}

/**
 * 플레이어 닉네임 설정
 * @param {string} nickname 
 */
async function setPlayerNickname(nickname) {
    if (!playerToken) {
        console.warn('LootLocker 세션이 활성화되지 않았습니다. 로그인을 시도합니다.');
        const ok = await initLootLocker();
        if (!ok) return false;
    }

    try {
        const response = await fetch(`${LOOTLOCKER_API_URL}/player/name`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'x-session-token': playerToken
            },
            body: JSON.stringify({ name: nickname })
        });

        const data = await response.json();
        if (response.ok) {
            console.log('플레이어 이름 설정 완료:', nickname);
            return true;
        } else {
            console.error('이름 변경 실패:', data.message || data);
            return false;
        }
    } catch (error) {
        console.error('이름 변경 통신 오류:', error);
        return false;
    }
}

/**
 * 리더보드에 점수(시간 초) 제출
 * @param {number} scoreSeconds 
 */
async function submitScoreToLootLocker(scoreSeconds) {
    if (!playerToken) {
        console.warn('LootLocker 세션이 활성화되지 않았습니다.');
        const ok = await initLootLocker();
        if (!ok) return false;
    }

    try {
        const response = await fetch(`${LOOTLOCKER_API_URL}/leaderboards/${LOOTLOCKER_LEADERBOARD_KEY}/submit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-session-token': playerToken
            },
            body: JSON.stringify({ score: scoreSeconds })
        });

        const data = await response.json();
        if (response.ok) {
            console.log('점수 제출 완료:', scoreSeconds, '초');
            return true;
        } else {
            console.error('점수 제출 실패:', data.message || data);
            return false;
        }
    } catch (error) {
        console.error('점수 제출 통신 오류:', error);
        return false;
    }
}

/**
 * 리더보드 랭킹 목록 가져오기 (기본 상위 10개, 최대 50개)
 * @param {number} count 
 */
async function getLootLockerLeaderboard(count = 10) {
    if (!playerToken) {
        const ok = await initLootLocker();
        if (!ok) return [];
    }

    try {
        const response = await fetch(`${LOOTLOCKER_API_URL}/leaderboards/${LOOTLOCKER_LEADERBOARD_KEY}/list?count=${count}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'x-session-token': playerToken
            }
        });

        const data = await response.json();
        if (response.ok) {
            // items 배열 가공 후 리턴
            const items = data.items || [];
            return items.map(item => ({
                rank: item.rank,
                name: (item.player && item.player.name) ? item.player.name : `Guest-${item.player.id}`,
                score: item.score, // 초 단위 기록
                isMe: item.player && String(item.player.id) === String(playerId)
            }));
        } else {
            console.error('리더보드 조회 실패:', data.message || data);
            return [];
        }
    } catch (error) {
        console.error('리더보드 조회 오류:', error);
        return [];
    }
}

/**
 * 현재 로그인한 게스트 플레이어의 기존 최고 랭킹 점수(초) 조회
 */
async function getPlayerBestScore() {
    if (!playerToken || !playerId) {
        return null;
    }

    try {
        const response = await fetch(`${LOOTLOCKER_API_URL}/leaderboards/${LOOTLOCKER_LEADERBOARD_KEY}/member/${playerId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'x-session-token': playerToken
            }
        });

        const data = await response.json();
        if (response.ok && data.score) {
            return data.score; // 기존 등록된 최고 시간 초
        }
        return null;
    } catch (error) {
        console.error('기존 점수 조회 오류:', error);
        return null;
    }
}
