export function appendUniqueMadingPosts(current, incoming) {
  const seen = new Set(current.map((post) => `${post._kind}-${post.id}`));
  const uniqueIncoming = [];

  for (const post of incoming) {
    const key = `${post._kind}-${post.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    uniqueIncoming.push(post);
  }

  return [...current, ...uniqueIncoming].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );
}
