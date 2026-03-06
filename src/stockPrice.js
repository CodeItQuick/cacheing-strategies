const DELAY_MS = 50;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createStockFeed({ initialPrice = 100, volatility = 2, random = Math.random, delay = DELAY_MS } = {}) {
  let price = initialPrice;

  return async function getPrice(ticker) {
    await sleep(delay);
    const change = (random() * volatility * 2) - volatility;
    price = Math.round((price + change) * 100) / 100;
    return { ticker, price };
  };
}

module.exports = { createStockFeed };
