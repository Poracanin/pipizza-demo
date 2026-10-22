<?php
declare(strict_types=1);

/** Search the authoritative address snapshot, including local area aliases. */
function pi_search_address_rows(array $addresses, string $query, callable $normalize, int $limit = 10): array {
    $tokens = preg_split('/\s+/u', $normalize($query), -1, PREG_SPLIT_NO_EMPTY);
    if (!$tokens) return [];
    $placeTokens = array_filter($tokens, static fn ($token) => !preg_match('/^\d/', $token));
    $results = [];
    foreach ($addresses as $address) {
        $search = $normalize($address['label'] . ' ' . implode(' ', $address['aliases'] ?? []));
        $words = explode(' ', $search);
        foreach ($tokens as $token) {
            if (preg_match('/^\d+[a-z]?$/D', $token)) {
                $matched = in_array($token, $words, true);
                if (!$matched && preg_match('/^\d+$/D', $token)) {
                    foreach ($words as $word) {
                        if (preg_match('/^' . $token . '[a-z]$/D', $word)) { $matched = true; break; }
                    }
                }
                if (!$matched) continue 2;
            } elseif (!str_contains($search, $token)) continue 2;
        }
        $place = $normalize($address['town'] . ' ' . implode(' ', $address['aliases'] ?? []));
        $placeMatches = $placeTokens && count(array_filter($placeTokens, static fn ($token) => str_contains($place, $token))) === count($placeTokens);
        $results[] = ['address'=>$address, 'rank'=>$placeMatches ? 0 : 1];
    }
    usort($results, static fn ($a, $b) => $a['rank'] <=> $b['rank']);
    return array_column(array_slice($results, 0, $limit), 'address');
}
