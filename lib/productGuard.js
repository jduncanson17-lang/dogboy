/**
 * lib/productGuard.js
 * Validates AI-returned product recommendations against the live catalog
 * before they reach the client.
 */

/**
 * @param {Array|null} recommendations  - Raw product_id list or objects from AI response
 * @param {Array}      catalog          - PRODUCT_CATALOG array
 * @param {string}     urgency          - Triage urgency level from AI response
 * @returns {Array} Filtered, capped array of valid catalog items
 */
export function validateProductRecommendations(recommendations, catalog, urgency) {
  if (urgency === 'urgent') return [];
  if (!Array.isArray(recommendations) || recommendations.length === 0) return [];

  const catalogIndex = new Map(catalog.map(p => [p.product_id, p]));

  const filtered = recommendations
    .map(r => {
      const id = typeof r === 'string' ? r : r?.product_id;
      if (!catalogIndex.has(id)) return null;
      // Return the AI's recommendation object as-is — product_id is validated,
      // why_this_fits and how_to_use are preserved for the client to render.
      return typeof r === 'string' ? { product_id: id } : r;
    })
    .filter(Boolean)
    .slice(0, 3);

  return filtered;
}
