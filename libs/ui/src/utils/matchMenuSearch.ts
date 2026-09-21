import { OptionValue, Product } from '../domain/entities';

export type MatchMenuSearchResult = {
  matched: boolean;
  matchedProductName: boolean;
  matchedOptionValues: OptionValue[];
};

function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter((token) => token.length > 0);
}

// Mirrors apps/api/domain/search_query.go + data/mysql/product_search.go (D12);
// the query -> expected fixtures in matchMenuSearch.test.ts are kept identical to
// product_search_test.go so a semantic drift between them shows up as a failing test.
export function matchMenuSearch(
  query: string,
  product: Product
): MatchMenuSearchResult {
  const tokens = tokenize(query);

  const result: MatchMenuSearchResult = {
    matched: true,
    matchedProductName: false,
    matchedOptionValues: [],
  };

  for (const token of tokens) {
    let tokenMatched = false;

    if (product.name.toLowerCase().includes(token)) {
      result.matchedProductName = true;
      tokenMatched = true;
    }

    if (product.category.name.toLowerCase().includes(token)) {
      tokenMatched = true;
    }

    for (const option of product.options) {
      for (const value of option.values) {
        if (value.name.toLowerCase().includes(token)) {
          tokenMatched = true;
          if (!result.matchedOptionValues.some((v) => v.id === value.id)) {
            result.matchedOptionValues.push(value);
          }
        }
      }
    }

    if (!tokenMatched) {
      result.matched = false;
    }
  }

  return result;
}
