# Budget — UI design contract

Purpose: a calm, trustworthy family planning and money interface for two people, optimized for narrow phones first and wide desktop screens second. This is a continuation of Budget's established Terra appearance, **not** a visual rebrand.

## Visual direction

Visual thesis: the active financial amount or selected calendar date is the focal point; neighboring controls should be quieter. No decorative hero graphics, fake metrics, glowing borders, excessive gradients or repetitive animated cards.

| Role | Light | Dark |
| --- | --- | --- |
| App canvas | `#F6F1E8` | `#151716` |
| Surface | `#FFFCF7` | `#1D201E` |
| Primary action | `#4A7C59` | existing green-on-dark tokens |
| Main ink | `#1F2A24` | `#F3F1EC` |
| Border | `#E2D8C8` | `#313733` |
| Dangerous action | existing restrained red | existing dark-mode red |

Use existing project font utilities (`font-headline` for main amounts/headings and `font-sans` or `font-body` for UI copy). Limit typography to three useful levels: page heading, section heading, readable 12–14px labels and 14–16px interactive/body content. Avoid tracking-heavy ALL CAPS for recurring navigation and actions.

## Reusable UI primitives

For the primary screen sections, reuse constants in `components/filterUiTokens.ts`: `SURFACE_CARD` for flat cards, `PAGE_HEADING` and `SECTION_HEADING` for hierarchy, and `FILTER_RAIL`/`FILTER_CHIP` for filters and preset actions.

- **One card silhouette:** `rounded-2xl`, a fine outline, consistent warm off-white canvas and compact `p-4 sm:p-5`. Do not mix gratuitous `rounded-[28px]`, oversized drop shadows and floating gradient containers on neighboring pages.
- **One filter behavior:** every chip is `flex-none shrink-0`, 44px tall, text kept on one line; the **rail** scrolls horizontally with `min-w-0` and `overflow-x-auto`. Never distribute full rows of filters into compressed equal-width columns.
- **One navigation hierarchy:** a clear page title and muted secondary date / selection controls; actions are identifiable, never represented by a handful of unrelated ornamental icon buttons.
- **One state language:** restrained dark-green selection, neutral inactive state, meaningful danger red. Do not use glowing gradients or bouncing animations merely to signal an active item.
- **Long real content:** large family names, repeated purchases and finance amounts must retain accessible names, avoid page-wide overflow and remain clickable on 320px phones.
- **Release check:** record actual widths and heights of controls with Chromium; text-based JSX checks alone do not prove a layout works. Keep this check separate from real family-account E2E.

## Layout and behavior

- Mobile: one main content column, horizontal spacing 12–16px, readable dates and amounts, no fixed pixel minimum taller than the viewport. Respect `100dvh` and safe-area bottom padding in sticky controls and modal footers.
- Desktop: visible date navigation with an optional details sidebar; keep the main calendar legible at 1024px without a fixed 380px sidebar consuming the workspace.
- Minimum touch target **44 × 44 CSS px**, with exceptions only where a much larger surrounding clickable target already exists.
- Real `button` elements for dates, cards and toggles. Keyboard focus must be visible. Reflect selected state with `aria-pressed`, not color alone. Label icon-only actions.
- Empty states tell the person what to do next. Display only actual money, chart values and events; never insert illustrative figures into live accounting widgets.
- Personal/family scope and participant ownership must remain explicit. UI polish must not change financial calculations or silently assign records to another person.
- Calendar: plans, tasks and events. Do **not** connect the financial monthly plan or expense forecasts to calendar dates.
- Preserve existing family Firestore APIs, retries, import safety and editing/deletion semantics.

## Motion

Based on Emil Kowalski's interaction guidance: no animation for high-frequency calendar navigation and keyboard input. A subtle 100–160ms press transform is sufficient for touch feedback when desired; transitions should target exact properties, not `transition-all`. Modal entrances may be about 180–220ms ease-out. Always honor `prefers-reduced-motion`. Avoid decorative pulsing, springy overshoot or arbitrary zooms.

## Review gates

1. Test important date calculations and stable identity/financial behaviors before layout changes.
2. Run Node regression tests, TypeScript check and Vite production build on the exact PR head.
3. Inspect 320px, 375px, 430px mobile widths, tablet width and 1024px+ desktop; check landscape and font scaling.
4. Verify actual add/edit/delete and calendar month/week/list workflows, including repeat events, with real browser interactions. Test Safari/iOS and Android separately.
5. Never mark a draft as deployable until checks run and any cross-PR dependencies are resolved.

References for design approach: Anthropic `frontend-design` and `theme-factory`, pbakaus `impeccable`, Leonxlnx `taste-skill`, emilkowalski `emil-design-eng`. These were consulted as external guidance, not installed as executable Budget skills.

## Dashboard consistency release

Overview cards and charts use DASHBOARD_CARD / CHART_TOOLTIP; chart period filters use FILTER_RAIL / FILTER_CHIP. Both chart plots use a fixed-height viewport per breakpoint and no replayed Area animation. Toolbar actions use 44px targets. Mobile navigation keeps minimum 44px width, stable selected background and no decorative blur or hover scaling. Global Framer Motion respects the user's system preference. Scoped CSS motion is loaded through public/terra-ui.css, not the unused legacy index.css; do not enable the legacy fixed body styles as part of visual changes. Browser regression exercises period switching, surface tokens and reduced motion at existing viewport matrix. Finance formulas, access and Firestore are unchanged.

## Unified palette
Semantic colors are defined in public/terra-ui.css for both themes. Core section surfaces use the same canvas, surface, soft, border, ink and muted roles; keep category/status and loyalty-brand colors distinct. Desktop settings is bounded to 1120×780 with independent sidebar/content scrolling. Pointer chart focus is suppressed only inside Recharts; keyboard focus remains visible. No data model or scroll architecture changes.

## Terra v2 pilot

The project-provided Terra_UI_Design_Contract_v2.md (2026-11-26) is the target standard. Current semantic CSS remains authoritative for actual colors; see docs/terra-v2-pilot.md for scoped findings, acceptance criteria and remaining checks. Do not copy demonstration layouts or replace financial APIs.


## Terra v2.1 — обязательная визуальная приёмка (27.11.2026)

Этот раздел дополняет Terra_UI_Design_Contract_v2.md и уточняет предыдущие визуальные рекомендации. Доступность, финансовая корректность и сохранение функций имеют приоритет. Применяется заново ко всему приложению, включая уже выпущенные разделы. Перед каждым новым разделом и ревью заново прочитать этот контракт, актуальный CSS, общие компоненты и навыки design-system, ui-design, reference-review, motion, verification, code-review и release. Не полагаться на память о предыдущем проходе. Использовать принципы Impeccable, Taste, Anthropic frontend-design/theme-factory, Emil Design Engineering, Material, HIG, Carbon и WCAG из исходного контракта; awesome-коллекции — источники поиска паттернов, а не доказательство качества. Не утверждать, что изучены все внешние каталоги.

### VA-01. Геометрия и свободное место
Шкала 4/8/12/16/20/24/32 px; основные поля 12 px mobile, 24 px desktop, интервалы 12/16 px. Проверять bounding boxes, общие оси, базовые линии, высоты, оптический центр и баланс свободного пространства. Измерять реальную доступную ширину, естественные ширины заголовков, кнопок, полей и gap. Если элементы с читаемыми подписями и 44 px целями помещаются, оставить на одной строке; не переносить из-за w-full, завышенных min-width, фиктивных grid spans, flex-basis или неподходящих viewport-breakpoints. Если места действительно нет, осмысленно перестроить группу, сохранить основное действие и доступность вторичных. Не уменьшать читаемость и touch targets. Не заполнять пустоты бессмысленными элементами. Отдельно проверять toolbar, footer, search+actions, chips, даты и заголовки.

### VA-02. Сдержанная палитра и визуальный вес
Нейтральные тёплые поверхности, спокойный мшистый зелёный, приглушённый кирпично-пыльный красный. В dark mode исключить неоновые emerald/lime, кричащий алый и яркие большие заливки, случайные Tailwind red/rose/green/emerald оттенки и локальные hex для общих ролей. Цвета управляются семантическими токенами, включая модалки/порталы, toast, графики и состояния. Пользовательские цвета категорий, участников и брендов не перекрашивать вслепую. Развести primary action, selected state, income, expense, warning, danger; обычный расход не ошибка. Деструктивное действие в спокойном состоянии — нейтральная кнопка с danger-text/иконкой, при подтверждении допускается сдержанная danger-solid; не окрашивать весь диалог красным. Акцентная заливка выделяет одно главное действие, остальное тише. В обеих темах обычный текст >=4.5:1, крупный >=3:1, существенные графические объекты и границы >=3:1. При недостаточном контрасте добавить ясную границу/иконку. Проверять действительные computed styles, включая hover, selected, focus, loading, ошибки и disabled; визуально сравнить соседние блоки. Оттенки кандидаты до просмотра реального рендера, не окончательная палитра по одному числу.

### VA-03. Типографика и композиция
Ограниченная шкала размеров и веса, согласованный line-height, читаемые русские названия, суммы и подписи. Оптическое выравнивание иконок, чисел, единиц, заголовков и действий. Сравнить плотность, контраст, визуальный вес, композицию соседних экранов. Убрать нейрослоп, повторяющиеся подписи, вложенные карточки, лишние бейджи, свечения, тени и градиенты.

### VA-04. Адаптивность
Проверка 320/375/390/430/768/1024/1440/1920 CSS px, обе темы, обе ориентации где применимо, длинные значения, пустые/ошибочные/загруженные состояния. Сетка и переносы зависят от доступной ширины контента (container queries), а не только окна. Проверить scroll, tabbar, sticky, safe-area, редакторы, клавиатуру и доступность всех действий. Семь календарных дней на очень узком экране требуют явного безопасного решения, а не скрытого ослабления общего правила touch targets.

### VA-05. Сценарии, окна, переходы и motion
Единица аудита — целый пользовательский сценарий, не страница. Для каждого раздела составить инвентарь всех достижимых экранов и состояний: основной/детальный экран, модалки, sheets, вложенные диалоги, редакторы создания/изменения, подтверждения удаления, выбор категории/даты/участника, фильтры, popover/menu, подсказки, toast, ошибки/загрузка/пустой результат, успешное сохранение, навигация и возврат. Проверить переход от входа к действию и обратно, фактическое изменение данных только в изолированном тесте, отмену, Escape/Back, возврат фокуса и сохранение контекста/прокрутки. Проверить порталы, z-index, отсутствие мерцания и скачка размеров, блокировку фона, safe-area и видимость footer при клавиатуре. Проверить цвета, выравнивание и переносы ВНУТРИ каждого окна, включая длинные сообщения и два действия в подтверждении. Анимация функциональна, прерываема, с prefers-reduced-motion; никаких эффектов ради эффектов. Не менять бизнес-поведение ради визуального сходства. Если какое-либо состояние не удалось открыть, явно записать причину, а не считать его принятым.

### VA-06. Реальные изображения и измерения
Получить скриншоты до/после на фактическом приложении с синтетическими данными. Просмотреть визуально, а не только сгенерировать архив. Для всех изменённых экранов/окон/состояний записать viewport, тему, SHA, артефакт, конкретную проблему и результат. Добавить браузерные регрессии по измеренным переносам, ширинам, высотам, отступам, контрасту и взаимодействиям. Зелёная сборка, snapshot или отсутствие overflow не доказывают качество композиции. Пропущенные скриншоты и устройства отмечать отдельно.

### VA-07. Обязательный контроль перед merge
Отдельно выполнить visual review (VA-01–VA-06), code review, реальные регрессионные тесты, typecheck, build, browser smoke, Firestore rules и two-account emulator. Не сливать UI PR при красном/неизвестном обязательном CI или непринятой визуальной части. Проверять точный SHA, артефакты и сравнение с соседними разделами. Для утверждения production проверить READY и alias; реальные Android/iOS/PWA и live smoke отмечать по факту. Не использовать production-данные при QA.

### VA-08. Повторный аудит по очереди
0 — общие токены/палитра, shell, шапки/панели действий, кнопки/поля/модалки; 1 — обзор; 2 — бюджет/операции/импорт; 3 — аналитика/графики; 4 — планы/календарь; 5 — покупки/кладовая; 6 — семейный чат; 7 — сервисы/долги/карты; 8 — настройки/интеграции; 9 — сравнительная приёмка всего приложения. В каждой итерации отдельно учитывать все достижимые окна и переходы по VA-05. Вести статусы: найдено, исправлено, визуально проверено, функционально проверено, опубликовано, заблокировано. Перед переходом к следующему разделу перечитать VA-01–VA-08. Предыдущий релиз не отменяет необходимость повторной проверки.
