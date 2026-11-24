interface User {
  id: number;
  login: string;
  url: string;
}

interface Repo {
  id: number;
  name: string;
  stars: number;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function toUser(raw: unknown): User | null {
  if (!isRecord(raw)) return null;
  const { id, login, html_url } = raw;
  if (typeof id === "number" && typeof login === "string" && typeof html_url === "string") {
    return { id, login, url: html_url };
  }
  return null;
}

function toRepo(raw: unknown): Repo | null {
  if (!isRecord(raw)) return null;
  const { id, name, stargazers_count } = raw;
  if (typeof id === "number" && typeof name === "string" && typeof stargazers_count === "number") {
    return { id, name, stars: stargazers_count };
  }
  return null;
}

async function fetchList<T>(url: string, mapper: (raw: unknown) => T | null): Promise<T[]> {
  const res = await fetch(url, { headers: { "User-Agent": "elevvo-task2" } });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  const data: unknown = await res.json();
  if (!Array.isArray(data)) {
    throw new Error(`Unexpected response shape from ${url}`);
  }
  const items: T[] = [];
  for (const raw of data as unknown[]) {
    const item = mapper(raw);
    if (item !== null) items.push(item);
  }
  return items;
}

async function main(): Promise<void> {
  const start = Date.now();

  const results = await Promise.allSettled([
    fetchList("https://api.github.com/users?per_page=10", toUser),
    fetchList("https://api.github.com/users/nassersostafa-svg/repos", toRepo),
    fetchList("https://api.github.com/this-does-not-exist", toRepo),
  ]);

  const users: User[] = [];
  const repos: Repo[] = [];

  const [usersResult, reposResult, brokenResult] = results;

  if (usersResult.status === "fulfilled") users.push(...usersResult.value);
  else console.error("Users endpoint failed:", String(usersResult.reason));

  if (reposResult.status === "fulfilled") repos.push(...reposResult.value);
  else console.error("Repos endpoint failed:", String(reposResult.reason));

  if (brokenResult.status === "rejected") {
    console.error("Broken endpoint failed (expected):", String(brokenResult.reason));
  }

  console.log(`Users: ${users.length}, Repos: ${repos.length}`);
  console.log(`Done in ${Date.now() - start}ms`);
}

main();
