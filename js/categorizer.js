/**
 * Brain Dump Categorizer
 * Inteligentny algorytm kategoryzacji notatek bez użycia zewnętrznego API
 * Analizuje wzorce językowe, słowa kluczowe i strukturę tekstu
 */

const Categorizer = {
    // Predefiniowane kategorie z ich wzorcami
    categories: {
        'zadanie': {
            icon: '[x]',
            keywords: ['zrobić', 'kupić', 'zadzwonić', 'wysłać', 'sprawdzić', 'naprawić',
                      'umówić', 'zapłacić', 'oddać', 'odebrać', 'przygotować', 'dokończyć',
                      'todo', 'task', 'must', 'trzeba', 'muszę', 'należy', 'pamiętaj'],
            patterns: [/^[-•\*]\s/m, /^\d+[\.\)]\s/m, /do zrobienia/i, /lista/i]
        },
        'pomysł': {
            icon: '*',
            keywords: ['pomysł', 'idea', 'może', 'można by', 'co jeśli', 'a gdyby',
                      'warto by', 'fajnie by było', 'koncept', 'innowacja', 'projekt'],
            patterns: [/^co (jeśli|gdyby)/i, /^a (może|gdyby)/i, /!/]
        },
        'pytanie': {
            icon: '?',
            keywords: ['dlaczego', 'jak', 'kiedy', 'gdzie', 'kto', 'co', 'czy',
                      'który', 'ile', 'czemu', 'po co', 'skąd'],
            patterns: [/\?$/, /\?[\.!\s]*$/, /^(jak|dlaczego|kiedy|gdzie|kto|co|czy)/i]
        },
        'praca': {
            icon: '@',
            keywords: ['spotkanie', 'meeting', 'deadline', 'projekt', 'klient', 'szef',
                      'zespół', 'prezentacja', 'raport', 'email', 'mail', 'firma',
                      'biuro', 'praca', 'zlecenie', 'kontrakt', 'umowa', 'faktura'],
            patterns: [/@\w+/, /deadline/i, /ASAP/i]
        },
        'zakupy': {
            icon: '$',
            keywords: ['kupić', 'sklep', 'zakupy', 'lista zakupów', 'zamówić',
                      'cena', 'promocja', 'rabat', 'allegro', 'amazon', 'olx'],
            patterns: [/\d+\s*(zł|pln|€|\$)/i, /kupić/i]
        },
        'wydarzenie': {
            icon: '>>',
            keywords: ['spotkanie', 'wizyta', 'urodziny', 'rocznica', 'impreza',
                      'koncert', 'wyjazd', 'lot', 'rezerwacja', 'termin', 'data'],
            patterns: [/\d{1,2}[\.\/\-]\d{1,2}/, /o\s+\d{1,2}:\d{2}/,
                      /(poniedziałek|wtorek|środa|czwartek|piątek|sobota|niedziela)/i,
                      /(styczeń|luty|marzec|kwiecień|maj|czerwiec|lipiec|sierpień|wrzesień|październik|listopad|grudzień)/i]
        },
        'notatka': {
            icon: '#',
            keywords: ['notatka', 'zapamiętać', 'ważne', 'uwaga', 'info', 'informacja'],
            patterns: []
        },
        'inspiracja': {
            icon: '~',
            keywords: ['cytat', 'motywacja', 'inspiracja', 'marzenie', 'cel', 'sukces',
                      'motto', 'życie', 'przyszłość', 'wizja'],
            patterns: [/^["„"]/, /[""]$/]
        },
        'kontakt': {
            icon: '&',
            keywords: ['telefon', 'numer', 'adres', 'email', 'kontakt', 'osoba'],
            patterns: [/\d{3}[\s\-]?\d{3}[\s\-]?\d{3}/, /\S+@\S+\.\S+/]
        },
        'finanse': {
            icon: '%',
            keywords: ['pieniądze', 'kasa', 'przelew', 'rachunek', 'opłata', 'rata',
                      'kredyt', 'oszczędności', 'budżet', 'wydatek', 'koszt', 'pensja'],
            patterns: [/\d+\s*(zł|pln|€|\$|tys)/i]
        },
        'zdrowie': {
            icon: '+',
            keywords: ['lekarz', 'wizyta', 'lek', 'tabletki', 'recepta', 'badanie',
                      'dentysta', 'szpital', 'zdrowie', 'dieta', 'trening', 'siłownia'],
            patterns: []
        }
    },

    /**
     * Kategoryzuje tekst notatki
     * @param {string} text - Treść notatki
     * @returns {Object} - {category: string, icon: string, confidence: number}
     */
    categorize(text) {
        if (!text || typeof text !== 'string') {
            return { category: 'notatka', icon: '#', confidence: 0 };
        }

        const normalizedText = text.toLowerCase().trim();
        const scores = {};

        // Oblicz wynik dla każdej kategorii
        for (const [categoryName, categoryData] of Object.entries(this.categories)) {
            let score = 0;

            // Sprawdź słowa kluczowe
            for (const keyword of categoryData.keywords) {
                if (normalizedText.includes(keyword.toLowerCase())) {
                    score += 2;
                }
            }

            // Sprawdź wzorce regex
            for (const pattern of categoryData.patterns) {
                if (pattern.test(text)) {
                    score += 3;
                }
            }

            scores[categoryName] = score;
        }

        // Znajdź kategorię z najwyższym wynikiem
        let bestCategory = 'notatka';
        let bestScore = 0;

        for (const [category, score] of Object.entries(scores)) {
            if (score > bestScore) {
                bestScore = score;
                bestCategory = category;
            }
        }

        // Oblicz confidence (0-1)
        const maxPossibleScore = 15; // Przybliżony max
        const confidence = Math.min(bestScore / maxPossibleScore, 1);

        return {
            category: bestCategory,
            icon: this.categories[bestCategory].icon,
            confidence: confidence
        };
    },

    /**
     * Zwraca wszystkie dostępne kategorie
     * @returns {Array} - Lista kategorii z ikonami
     */
    getAllCategories() {
        return Object.entries(this.categories).map(([name, data]) => ({
            name,
            icon: data.icon
        }));
    },

    /**
     * Dodaje nowe słowa kluczowe do kategorii (uczenie się)
     * @param {string} category - Nazwa kategorii
     * @param {string} keyword - Nowe słowo kluczowe
     */
    addKeyword(category, keyword) {
        if (this.categories[category]) {
            this.categories[category].keywords.push(keyword.toLowerCase());
        }
    },

    /**
     * Ekstrahuje potencjalne tagi z tekstu
     * @param {string} text - Treść notatki
     * @returns {Array} - Lista tagów
     */
    extractTags(text) {
        const tags = [];

        // Znajdź hashtagi
        const hashtagMatches = text.match(/#\w+/g);
        if (hashtagMatches) {
            tags.push(...hashtagMatches.map(t => t.slice(1)));
        }

        // Znajdź @mentions
        const mentionMatches = text.match(/@\w+/g);
        if (mentionMatches) {
            tags.push(...mentionMatches.map(t => t.slice(1)));
        }

        return [...new Set(tags)]; // Usuń duplikaty
    }
};

// Eksportuj jako globalny obiekt
window.Categorizer = Categorizer;
