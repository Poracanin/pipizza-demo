<?php
declare(strict_types=1);
require __DIR__ . '/../private/address-search.php';
$rows = json_decode(file_get_contents(__DIR__ . '/../private/addresses.json'), true, 64, JSON_THROW_ON_ERROR);
$normalize = static fn (string $value): string => trim(preg_replace('/[^a-z0-9]+/', ' ', strtolower(strtr($value, array_combine(preg_split('//u', 'ÁČĎÉĚÍŇÓŘŠŤÚŮÝŽáčďéěíňóřšťúůýž', -1, PREG_SPLIT_NO_EMPTY), str_split('ACDEEINORSTUUYZacdeeinorstuuyz'))))));
$expected = [
    'Novy Svet 1'=>'8289450', 'Teskovice 1'=>'4544510', 'Kyjovice 1'=>'4633849',
    'Dolni Lhota 1'=>'4626397', 'Katerinice 1'=>'8218544', 'Frycovice 1'=>'14098261',
    'Mosnov 2'=>'8266786', 'Pustejov 1'=>'8276315', 'Janova 6'=>'86170091',
    'Janova Sasankova 6s'=>'86170091', 'Sasankova 1307'=>'88556581',
];
foreach ($expected as $query=>$id) {
    $matches = pi_search_address_rows($rows, $query, $normalize);
    if (!in_array($id, array_column($matches, 'id'), true)) throw new RuntimeException('Missing address for ' . $query);
}
foreach (['Novy Svet'=>'Nový Svět','Slatina'=>'Slatina'] as $query=>$town) {
    if (pi_search_address_rows($rows, $query, $normalize)[0]['town'] !== $town) throw new RuntimeException('Town should precede an unrelated street: ' . $query);
}
foreach (['Sasankova 1','Sasankova 1s'] as $query) {
    if (array_column(pi_search_address_rows($rows, $query, $normalize), 'id') !== ['76169570']) throw new RuntimeException('House suffix matching: ' . $query);
}
foreach (['Sasankova 1t','Janova 60','Svinov Bilovecka','Janova Vsetin'] as $query) {
    if (pi_search_address_rows($rows, $query, $normalize)) throw new RuntimeException('Unexpected delivery scope: ' . $query);
}
echo "19 PHP address search checks passed.\n";
