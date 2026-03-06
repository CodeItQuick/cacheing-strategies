const DELAY_MS = 50;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createGameFeed({ random = Math.random, delay = DELAY_MS } = {}) {
  const games = {};

  return async function getScore(gameId) {
    await sleep(delay);

    if (!games[gameId]) {
      games[gameId] = { home: 0, away: 0, period: 1, clock: '20:00' };
    }

    const game = games[gameId];
    const roll = random();

    if (roll < 0.15) game.home++;
    else if (roll < 0.30) game.away++;

    return {
      gameId,
      home: game.home,
      away: game.away,
      period: game.period,
    };
  };
}

module.exports = { createGameFeed };
