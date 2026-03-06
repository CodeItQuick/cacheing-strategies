const DELAY_MS = 50;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const pages = {
  'news.com':      { title: 'News',          content: 'Top stories today...' },
  'github.com':    { title: 'GitHub',        content: 'Where the world builds software...' },
  'docs.js.org':   { title: 'JS Docs',       content: 'JavaScript documentation...' },
  'reddit.com':    { title: 'Reddit',        content: 'The front page of the internet...' },
  'youtube.com':   { title: 'YouTube',       content: 'Videos and music you love...' },
  'stackoverflow': { title: 'Stack Overflow', content: 'Questions and answers for developers...' },
};

function createPageFetcher({ delay = DELAY_MS } = {}) {
  return async function fetchPage(url) {
    await sleep(delay);
    const page = pages[url] || { title: url, content: 'Page content...' };
    return { url, ...page };
  };
}

module.exports = { createPageFetcher, pages };
