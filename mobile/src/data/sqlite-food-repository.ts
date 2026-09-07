import { SEARCH_MAX_RESULTS, SEARCH_PAGE_SIZE, loggedFoodIds, resolveSource } from '@/data/catalog-constants';
import type { FoodRepository, FoodSearchQuery } from '@/data/food-repository-types';
import { attachCustomSources, buildClusterIndex, collapseSearchHits } from '@/domain/catalog-groups';
import { catalogSearchScore, matchesFoodQuery } from '@/domain/nutrition';
import { extractIngredientTokens, normalizeFoodQuery } from '@/domain/search';
import type { Food } from '@/types/nutrition';

export type SqlParam = string | number | boolean | null | Uint8Array;

export type SqlQuery = {
  all: <T>(sql: string, params?: SqlParam[]) => T[];
  first: <T>(sql: string, params?: SqlParam[]) => T | undefined;
};

type FoodRow = { id: string; cluster_id: string; json: string };

const CANDIDATE_LIMIT = 200;

export function createSqliteFoodRepository(sql: SqlQuery): FoodRepository {
  const featuredIds = new Set(
    sql.all<{ id: string }>('SELECT id FROM foods WHERE is_featured = 1').map((row) => row.id),
  );

  const parse = (row: FoodRow): Food => JSON.parse(row.json) as Food;

  const loadRowsByIds = (ids: string[]): FoodRow[] => {
    if (!ids.length) return [];
    const unique = [...new Set(ids)];
    return sql.all<FoodRow>(
      `SELECT id, cluster_id, json FROM foods WHERE id IN (${unique.map(() => '?').join(',')})`,
      unique,
    );
  };

  const loadByIds = (ids: string[]): Food[] => {
    const byId = new Map(loadRowsByIds(ids).map((row) => [row.id, parse(row)]));
    return [...new Set(ids)].map((id) => byId.get(id)).filter((food): food is Food => Boolean(food));
  };

  const loadClusterRows = (clusterIds: string[]): FoodRow[] => {
    if (!clusterIds.length) return [];
    const unique = [...new Set(clusterIds)];
    return sql.all<FoodRow>(
      `SELECT id, cluster_id, json FROM foods WHERE cluster_id IN (${unique.map(() => '?').join(',')})`,
      unique,
    );
  };

  return {
    search(options: FoodSearchQuery) {
      const {
        customFoods = [], query = '', category = 'all', favouriteFoodIds = [],
        entries = [], verifiedFoodIds = [], limit = SEARCH_PAGE_SIZE,
      } = options;
      const source = resolveSource(options);
      const needle = query.trim();
      const logged = new Set(loggedFoodIds(entries));
      const verified = new Set(verifiedFoodIds);
      const customIds = new Set(customFoods.map((food) => food.id));
      const browseAll = source === 'official' || source === 'overseas' || source === 'supermarket' || source === 'logged';
      const pageSize = Math.min(Math.max(1, limit), SEARCH_MAX_RESULTS);

      let rows: FoodRow[] = [];
      if (!needle && !browseAll) {
        rows = sql.all<FoodRow>('SELECT id, cluster_id, json FROM foods WHERE is_featured = 1');
      } else if (!needle) {
        rows = loadFiltered(sql, source, category, logged, verified, 400);
      } else {
        const candidateIds = searchCandidateIds(sql, needle);
        const hitRows = loadRowsByIds(candidateIds);
        const clusterIds = [...new Set(hitRows.map((row) => row.cluster_id))];
        const clustered = loadClusterRows(clusterIds);
        const byId = new Map(clustered.map((row) => [row.id, row]));
        for (const row of hitRows) byId.set(row.id, row);
        rows = [...byId.values()];
      }

      const catalogFoods = rows.map(parse);
      const catalog = [...customFoods, ...catalogFoods];
      const index = customFoods.length
        ? buildClusterIndex(catalog)
        : new Map(rows.map((row) => [row.id, row.cluster_id]));
      const matches = catalog
        .filter((food) => (category === 'all' || food.category === category) && matchesFoodQuery(food, query))
        .filter((food) => matchesSource(food, source, logged, verified))
        .filter((food) => needle.length > 0 || browseAll || featuredIds.has(food.id) || customIds.has(food.id));

      const collapsed = collapseSearchHits(matches, catalog, index, source === 'common' ? undefined : source);
      collapsed.sort((a, b) => {
        const score = (food: Food) => {
          const members = [food, ...(food.alternateSources ?? []).map((item) => catalog.find((entry) => entry.id === item.foodId)).filter(Boolean)] as Food[];
          return Math.max(...members.map((member) => catalogSearchScore(member, query, { favouriteFoodIds, logged, featuredIds, customIds })));
        };
        const delta = score(b) - score(a);
        return delta !== 0 ? delta : a.nameEn.localeCompare(b.nameEn);
      });
      return needle.length > 0 || browseAll ? collapsed.slice(0, pageSize) : collapsed;
    },

    getById(id, customFoods = []) {
      const custom = customFoods.find((food) => food.id === id);
      if (custom) return custom;
      const row = sql.first<FoodRow>('SELECT id, cluster_id, json FROM foods WHERE id = ?', [id]);
      return row ? parse(row) : undefined;
    },

    getByIds(ids, customFoods = []) {
      const result: Record<string, Food> = {};
      for (const food of customFoods) {
        if (ids.includes(food.id)) result[food.id] = food;
      }
      const missing = ids.filter((id) => !result[id]);
      for (const food of loadByIds(missing)) result[food.id] = food;
      return result;
    },

    cluster(foodId, customFoods = []) {
      const custom = customFoods.find((food) => food.id === foodId);
      const row = sql.first<FoodRow>('SELECT id, cluster_id, json FROM foods WHERE id = ?', [foodId]);
      if (row) {
        const members = attachCustomSources(loadClusterRows([row.cluster_id]).map(parse), customFoods);
        if (custom && !members.some((food) => food.id === custom.id)) return [custom, ...members];
        return members;
      }
      if (custom) return attachCustomSources([custom], customFoods.filter((food) => food.id !== custom.id));
      return [];
    },

    listCompositeDishes(customFoods = []) {
      const rows = sql.all<FoodRow>('SELECT id, cluster_id, json FROM foods WHERE has_composition = 1');
      return [...customFoods.filter((food) => food.composition), ...rows.map(parse)];
    },
  };
}

function matchesSource(food: Food, source: ReturnType<typeof resolveSource>, logged: Set<string>, verified: Set<string>) {
  switch (source) {
    case 'logged': return logged.has(food.id) || verified.has(food.id);
    case 'supermarket': return food.tags.includes('supermarket');
    case 'official': return food.tags.includes('fsanz');
    case 'overseas': return food.tags.includes('overseas');
    default: return true;
  }
}

function loadFiltered(
  sql: SqlQuery,
  source: ReturnType<typeof resolveSource>,
  category: 'all' | Food['category'],
  logged: Set<string>,
  verified: Set<string>,
  limit: number,
): FoodRow[] {
  const clauses = ['1 = 1'];
  const params: SqlParam[] = [];
  if (category !== 'all') {
    clauses.push('category = ?');
    params.push(category);
  }
  if (source === 'supermarket') clauses.push('is_supermarket = 1');
  if (source === 'official') clauses.push('is_fsanz = 1');
  if (source === 'overseas') clauses.push('is_overseas = 1');
  if (source === 'logged') {
    const ids = [...new Set([...logged, ...verified])];
    if (!ids.length) return [];
    clauses.push(`id IN (${ids.map(() => '?').join(',')})`);
    params.push(...ids);
  }
  params.push(limit);
  return sql.all<FoodRow>(
    `SELECT id, cluster_id, json FROM foods WHERE ${clauses.join(' AND ')} LIMIT ?`,
    params,
  );
}

function searchCandidateIds(sql: SqlQuery, query: string): string[] {
  const ids = new Set<string>();
  const needle = query.trim().toLowerCase();
  const digits = query.replace(/\D/g, '');
  if (digits.length >= 8) {
    for (const row of sql.all<{ id: string }>(
      'SELECT id FROM foods WHERE search_extra LIKE ? LIMIT 40',
      [`%${digits}%`],
    )) {
      ids.add(row.id);
    }
  }
  if (needle === '超市') {
    return sql.all<{ id: string }>('SELECT id FROM foods WHERE is_supermarket = 1 LIMIT ?', [CANDIDATE_LIMIT]).map((row) => row.id);
  }
  if (needle === '美国' || needle === 'usda' || needle === 'overseas') {
    return sql.all<{ id: string }>('SELECT id FROM foods WHERE is_overseas = 1 LIMIT ?', [CANDIDATE_LIMIT]).map((row) => row.id);
  }
  if (needle === 'fsanz' || needle === 'afcd' || needle === 'ausnut') {
    return sql.all<{ id: string }>('SELECT id FROM foods WHERE is_fsanz = 1 LIMIT ?', [CANDIDATE_LIMIT]).map((row) => row.id);
  }

  const normalized = normalizeFoodQuery(query);
  const tokens = extractIngredientTokens(normalized);
  if (tokens.length >= 2) {
    addFtsMatches(sql, ids, tokens.map((token) => `"${escapeFtsToken(token)}"`).join(' AND '));
  }
  for (const term of candidateNeedles(query, normalized, tokens)) {
    if (ids.size >= CANDIDATE_LIMIT) break;
    addFtsMatches(sql, ids, toFtsQuery(term));
    const like = `%${term.toLowerCase()}%`;
    for (const row of sql.all<{ id: string }>(
      'SELECT id FROM foods WHERE lower(name_zh) LIKE ? OR lower(name_en) LIKE ? OR lower(search_extra) LIKE ? LIMIT ?',
      [like, like, like, CANDIDATE_LIMIT],
    )) {
      ids.add(row.id);
      if (ids.size >= CANDIDATE_LIMIT) break;
    }
  }
  return [...ids].slice(0, CANDIDATE_LIMIT);
}

function candidateNeedles(query: string, normalized: string, tokens: string[]): string[] {
  return [...new Set([query.trim(), normalized, ...tokens].filter((term) => term.length >= 1))]
    .sort((a, b) => b.length - a.length);
}

function addFtsMatches(sql: SqlQuery, ids: Set<string>, fts: string | null) {
  if (!fts || ids.size >= CANDIDATE_LIMIT) return;
  try {
    for (const row of sql.all<{ id: string }>('SELECT id FROM foods_fts WHERE foods_fts MATCH ? LIMIT ?', [fts, CANDIDATE_LIMIT])) {
      ids.add(row.id);
      if (ids.size >= CANDIDATE_LIMIT) break;
    }
  } catch {
    // Invalid FTS syntax should fall through to LIKE.
  }
}

function escapeFtsToken(token: string): string {
  return token.replace(/['"^:*(){}[\]\\]/g, ' ').trim();
}

function toFtsQuery(query: string): string | null {
  const tokens = query
    .replace(/['"^:*(){}[\]\\]/g, ' ')
    .trim()
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 1);
  if (!tokens.length) return null;
  return tokens.map((token) => `"${token}"`).join(' OR ');
}
