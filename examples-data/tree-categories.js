// Demo data for examples-tree.html — a small food taxonomy.
// Each option carries a materialized dot-path; parent/level are derived from it.
export const categories = [
    // Fruit — 4 sub-branches, one going 4 levels deep (Berries › Strawberry › varieties)
    { value: 'fruit',     label: 'Fruit',       path: '1' },
    { value: 'pome',      label: 'Pome fruit',  path: '1.1' },
    { value: 'apple',     label: 'Apple',       path: '1.1.1' },
    { value: 'pear',      label: 'Pear',        path: '1.1.2' },
    { value: 'quince',    label: 'Quince',      path: '1.1.3' },
    { value: 'stone',     label: 'Stone fruit', path: '1.2' },
    { value: 'peach',     label: 'Peach',       path: '1.2.1' },
    { value: 'plum',      label: 'Plum',        path: '1.2.2' },
    { value: 'cherry',    label: 'Cherry',      path: '1.2.3' },
    { value: 'apricot',   label: 'Apricot',     path: '1.2.4' },
    { value: 'berries',   label: 'Berries',     path: '1.3' },
    { value: 'straw',     label: 'Strawberry',  path: '1.3.1' },
    { value: 'straw-cam', label: 'Camarosa',    path: '1.3.1.1' },
    { value: 'straw-alb', label: 'Albion',      path: '1.3.1.2' },
    { value: 'blue',      label: 'Blueberry',   path: '1.3.2' },
    { value: 'rasp',      label: 'Raspberry',   path: '1.3.3' },
    { value: 'citrus',    label: 'Citrus',      path: '1.4' },
    { value: 'orange',    label: 'Orange',      path: '1.4.1' },
    { value: 'lemon',     label: 'Lemon',       path: '1.4.2' },
    { value: 'lime',      label: 'Lime',        path: '1.4.3' },
    // Vegetables — 3 sub-branches of varying size
    { value: 'veg',       label: 'Vegetables',  path: '2' },
    { value: 'root',      label: 'Root',        path: '2.1' },
    { value: 'carrot',    label: 'Carrot',      path: '2.1.1' },
    { value: 'beet',      label: 'Beetroot',    path: '2.1.2' },
    { value: 'radish',    label: 'Radish',      path: '2.1.3' },
    { value: 'leafy',     label: 'Leafy',       path: '2.2' },
    { value: 'kale',      label: 'Kale',        path: '2.2.1' },
    { value: 'spinach',   label: 'Spinach',     path: '2.2.2' },
    { value: 'lettuce',   label: 'Lettuce',     path: '2.2.3' },
    { value: 'chard',     label: 'Chard',       path: '2.2.4' },
    { value: 'brassica',  label: 'Brassica',    path: '2.3' },
    { value: 'broccoli',  label: 'Broccoli',    path: '2.3.1' },
    { value: 'caulif',    label: 'Cauliflower', path: '2.3.2' },
    { value: 'cabbage',   label: 'Cabbage',     path: '2.3.3' },
    // Dairy — a whole extra root
    { value: 'dairy',     label: 'Dairy',       path: '3' },
    { value: 'cheese',    label: 'Cheese',      path: '3.1' },
    { value: 'cheddar',   label: 'Cheddar',     path: '3.1.1' },
    { value: 'brie',      label: 'Brie',        path: '3.1.2' },
    { value: 'gouda',     label: 'Gouda',       path: '3.1.3' },
    { value: 'milk',      label: 'Milk',        path: '3.2' },
    { value: 'milk-w',    label: 'Whole milk',  path: '3.2.1' },
    { value: 'milk-s',    label: 'Skim milk',   path: '3.2.2' },
    { value: 'milk-o',    label: 'Oat milk',    path: '3.2.3' },
    // Grains — a fourth root
    { value: 'grains',    label: 'Grains',      path: '4' },
    { value: 'cereal',    label: 'Cereal',      path: '4.1' },
    { value: 'wheat',     label: 'Wheat',       path: '4.1.1' },
    { value: 'rice',      label: 'Rice',        path: '4.1.2' },
    { value: 'oats',      label: 'Oats',        path: '4.1.3' },
    { value: 'bakery',    label: 'Bakery',      path: '4.2' },
    { value: 'sourdough', label: 'Sourdough',   path: '4.2.1' },
    { value: 'rye',       label: 'Rye bread',   path: '4.2.2' }
];

// A "full title" ships WITH the data. Here we build a breadcrumb by joining each
// option's ancestor labels — the component never computes it.
const labelByPath = new Map(categories.map(c => [c.path, c.label]));
export const categoriesWithFullTitles = categories.map(c => {
    const segs = c.path.split('.');
    const fullTitle = segs
        .map((_, i) => labelByPath.get(segs.slice(0, i + 1).join('.')))
        .filter(Boolean)
        .join(' / ');
    return { ...c, fullTitle };
});
