function sanitizeSearchQuery(input) {
  if (typeof input !== 'string') return false;
  const query = input.trim();
  if (!query) return false;
  const patterns = [
    /<[^>]*>/g,
    /(javascript:)/i,
  ];
  if (patterns.some(re => re.test(query))) {
    return false;
  }
  return query;
}

module.exports = {
  sanitizeSearchQuery,
};
