
import dayjs from 'dayjs';
import 'dayjs/locale/ru';
import relativeTime from 'dayjs/plugin/relativeTime';
import updateLocale from 'dayjs/plugin/updateLocale';
import isToday from 'dayjs/plugin/isToday';
import isYesterday from 'dayjs/plugin/isYesterday';

// Configure Dayjs plugins and locale once
dayjs.extend(relativeTime);
dayjs.extend(updateLocale);
dayjs.extend(isToday);
dayjs.extend(isYesterday);

dayjs.locale('ru');

// Custom locale updates if needed (e.g., shorter months)
dayjs.updateLocale('ru', {
  monthsShort: [
    "Янв", "Фев", "Мар", "Апр", "Май", "Июн",
    "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"
  ]
});

export const date = dayjs;

// Examples:
// date().format('DD MMMM YYYY') -> "25 октября 2023"
// date(isoString).fromNow() -> "2 часа назад"
