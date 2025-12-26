
class SmartCategorizer {
    constructor() {
        this.rules = [
            // Supermarkets
            { pattern: /пятерочка|магнит|дикси|вкусвилл|ашан|лента|перекресток|метро|окей|spar|eurospar|азбука вкуса/i, category: 'Продукты' },
            { pattern: /супермаркет|универсам|продукты/i, category: 'Продукты' },
            
            // Transport
            { pattern: /яндекс.*такси|uber|gett|ситимобил|maxim/i, category: 'Транспорт' },
            { pattern: /луккойл|газпромнефть|роснефть|татнефть|shell|bp|азс|заправка/i, category: 'Транспорт' },
            { pattern: /метро|транспорт|автобус|троллейбус|трамвай|парковка/i, category: 'Транспорт' },
            
            // Fast Food & Restaurants
            { pattern: /макдональдс|вкусно и точка|бургер кинг|kfc|ростикс|теремок|додо/i, category: 'Кафе' },
            { pattern: /ресторан|кафе|кофейня|бар|паб|доставка еды|delivery|яндекс.еда/i, category: 'Кафе' },
            
            // Health
            { pattern: /аптека|здоровье|доктор|клиника|медицин|стоматолог|инвитро/i, category: 'Здоровье' },
            
            // Home & Utilities
            { pattern: /жкх|квартплата|электроэнерг|мосэнерго|газ|вода/i, category: 'Дом' },
            { pattern: /интернет|провайдер|ростелеком|мгтс|дом.ру/i, category: 'Дом' },
            { pattern: /леруа|икеа|хофф|obi|строитель|ремонт/i, category: 'Дом' },
            
            // Communications
            { pattern: /мтс|билайн|мегафон|теле2|yota|связь/i, category: 'Связь' },
            
            // Clothes
            { pattern: /одежда|обувь|zara|h&m|uniqlo|lamoda|wildberries|ozon/i, category: 'Одежда' },
            
            // Entertainment
            { pattern: /кино|театр|концерт|билет|ivi|netflix|kinopoisk|яндекс.плюс/i, category: 'Развлечения' },
            
            // Transfers & Salary
            { pattern: /зарплата|аванс|премия/i, category: 'Зарплата' },
            { pattern: /перевод|сбербанк онлайн|тинькофф/i, category: 'Переводы' }
        ];

        this.mccMap = {
            '5411': 'Продукты', '5422': 'Продукты', '5441': 'Продукты', '5451': 'Продукты', '5462': 'Продукты', '5499': 'Продукты',
            '5811': 'Кафе', '5812': 'Кафе', '5813': 'Кафе', '5814': 'Кафе',
            '4111': 'Транспорт', '4121': 'Транспорт', '4131': 'Транспорт', '4789': 'Транспорт',
            '5541': 'Транспорт', '5542': 'Транспорт', // Gas
            '5912': 'Здоровье', '8011': 'Здоровье', '8021': 'Здоровье', '8031': 'Здоровье', '8043': 'Здоровье', '8062': 'Здоровье', '8071': 'Здоровье', '8099': 'Здоровье',
            '4812': 'Связь', '4814': 'Связь', '4816': 'Дом', // Internet often here
            '4900': 'Дом', // Utilities
            '5200': 'Дом', '5211': 'Дом', '5231': 'Дом', '5251': 'Дом', '5261': 'Дом', // Home improvement
            '5611': 'Одежда', '5621': 'Одежда', '5631': 'Одежда', '5641': 'Одежда', '5651': 'Одежда', '5661': 'Одежда', '5691': 'Одежда', '5699': 'Одежда',
            '7832': 'Развлечения', '7922': 'Развлечения', '7929': 'Развлечения', '7932': 'Развлечения', '7933': 'Развлечения', '7941': 'Развлечения', '7991': 'Развлечения', '7996': 'Развлечения', '7998': 'Развлечения', '7999': 'Развлечения'
        };
    }

    categorize(description = '', mcc = '') {
        // 1. Try MCC
        if (mcc && this.mccMap[mcc]) {
            return { categoryId: this.mapToSystemId(this.mccMap[mcc]), confidence: 0.9 };
        }

        // 2. Try Keywords
        const lowerDesc = description.toLowerCase();
        for (const rule of this.rules) {
            if (rule.pattern.test(lowerDesc)) {
                return { categoryId: this.mapToSystemId(rule.category), confidence: 0.8 };
            }
        }

        // 3. Fallback
        return { categoryId: 'cat_8', confidence: 0 }; // 'Разное'
    }

    mapToSystemId(name) {
        // Map readable names to IDs used in DB
        const map = {
            'Продукты': 'cat_1',
            'Дом': 'cat_2',
            'Транспорт': 'cat_3',
            'Развлечения': 'cat_4',
            'Зарплата': 'cat_5',
            'Здоровье': 'cat_6',
            'Кафе': 'cat_7',
            'Разное': 'cat_8',
            'Связь': 'cat_2', // Map to Home for now or create new
            'Одежда': 'cat_8', // Map to Other for now
            'Переводы': 'cat_8'
        };
        return map[name] || 'cat_8';
    }
}

// Global instance
window.SmartCategorizer = new SmartCategorizer();
