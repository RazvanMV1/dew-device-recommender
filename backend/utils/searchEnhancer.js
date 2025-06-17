

const removeDiacritics = (text) =>
    text.normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/\s+/g, ' ').trim();

const synonymMap = {
    'casti': ['headphones', 'earbuds', 'earphones', 'headset'],
    'headphones': ['earbuds', 'earphones', 'casti', 'audio'],
    'boxa': ['speaker', 'speakers'],
    'audio': ['sound', 'speakers', 'headphones'],

    'telefon': ['phone', 'smartphone', 'mobile'],
    'smartphone': ['phone', 'android', 'ios'],
    'iphone': ['apple', 'smartphone'],
    'android': ['smartphone'],

    'tableta': ['tablet', 'ipad'],
    'tablet': ['ipad', 'android tablet'],
    'ipad': ['tablet'],

    'laptop': ['notebook', 'ultrabook', 'macbook'],
    'macbook': ['laptop', 'apple'],

    'procesor': ['cpu', 'chip', 'intel', 'amd'],
    'placa de baza': ['motherboard', 'mb'],
    'placa video': ['gpu', 'graphics card', 'nvidia', 'radeon'],
    'memorie': ['ram', 'ddr'],
    'stocare': ['storage', 'ssd', 'hdd'],
    'sursa': ['power supply', 'psu'],
    'carcasa': ['case', 'pc case'],

    'mouse': ['mice', 'gaming mouse'],
    'tastatura': ['keyboard', 'gaming keyboard'],
    'monitor': ['display', 'screen'],
    'camera': ['webcam'],
    'microfon': ['mic', 'microphone'],
    'imprimanta': ['printer'],
    'scanner': ['scanner'],

    'ceas': ['watch'],
    'smartwatch': ['smartwatch', 'fitness watch'],
    'bratara': ['fitness tracker'],
    'drone': ['flying camera', 'quadcopters'],

    'incarcator': ['charger', 'power adapter'],
    'husa': ['case', 'cover'],
    'cablu': ['cable', 'usb cable'],
    'dock': ['docking station'],

    'router': ['modem', 'wifi router'],
    'wifi': ['wireless', 'wi-fi'],
    'bluetooth': ['wireless'],

    'camera fata': ['front camera'],
    'camera spate': ['rear camera'],
    'selfie': ['front camera'],
    'baterie': ['battery', 'autonomy'],
    'ecran': ['display', 'screen'],
    'rezolutie': ['resolution'],
    'touch': ['touchscreen']
};

function normalizeSearchTerm(term) {
    if (!term) return '';
    return removeDiacritics(term.toLowerCase().trim());
}

function getSynonyms(normalizedTerm) {
    if (!normalizedTerm) return [];

    const words = normalizedTerm.split(' ');
    const allSynonyms = new Set();

    for (const word of words) {
        allSynonyms.add(word);
        const mapped = synonymMap[word];
        if (mapped && Array.isArray(mapped)) {
            mapped.forEach(s => allSynonyms.add(s));
        }
    }

    return Array.from(allSynonyms);
}

function buildSearchPipeline(terms, externalFilter = {}) {
    const termConditions = terms.map(term => ({
        $or: [
            { name: { $regex: term, $options: 'i' } },
            { title: { $regex: term, $options: 'i' } },
            { brand: { $regex: term, $options: 'i' } },
            { description: { $regex: term, $options: 'i' } },
            { category: { $regex: term, $options: 'i' } },
            { features: { $elemMatch: { $regex: term, $options: 'i' } } }
        ]
    }));

    return [
        {
            $match: {
                $and: [
                    externalFilter,
                    { $or: termConditions }
                ]
            }
        }
    ];
}

module.exports = {
    normalizeSearchTerm,
    getSynonyms,
    buildSearchPipeline
};
