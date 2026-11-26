# Terra v2 — пакет A / первый пилот

База: 60406fbe2bd049f341b02209cab7633aaa6349f2. Источник: Terra_UI_Design_Contract_v2.md, разделы 1–3, 5, 10, 11, 12, 14 и приложение A. Это реестр пилота, не отчёт о закрытии UI-001–UI-160. Старые PR #114/#115/#117 не включаются в этот diff.

## Инвентаризация подтверждённая чтением исходников

| RC / screen | Статус до пилота | Доказательство и решение |
|---|---|---|
| RC-06 / SCR-02 | needs-fix | App.tsx сохраняет единственный shell и tab-panel; TerraOverview содержит отдельные мобильную и desktop ветки. Мобильный выбор месяца использует центрированный absolute popover внутри левой колонки, цели prev/next и строки меньше 44px. Пилот: in-flow disclosure, общий token, доступные имена и выбранность. |
| RC-09/10 / SCR-02 | confirmed-existing / needs-fix | public/terra-ui.css уже содержит полную палитру v2, filterUiTokens.ts — 44px controls и surfaces. docs/ui-design-contract.md указывает старые значения canvas/surface/ink/border. Исправить документацию, не менять палитру. |
| RC-14 / SCR-02, SCR-06 | needs-fix | TerraOverview.tsx фактически рисует два AreaChart; импортированный OverviewExpenseChart не используется. Мобильный график без оси Y; desktop имеет негативный left margin и градиент. Существующие period data, reference limit, avg/max и drilldown сохранить. Переиспользовать OverviewExpenseChart, нулевая база, столбцы, фиксированная высота, точные значения и кнопки детализации. |
| RC-14 / SCR-02 | needs-fix | mobileCategories округляет item.amount до рублей после точной агрегации; desktop показывает исходную сумму. Снять только presentation rounding. Семейный баланс не изменяется фильтром истории; сохранить явное объяснение. |
| RC-21 / SCR-02, SCR-06 | needs-fix | В overview chart/progress geometry видны даже в privacyMode; DrillDownModal скрывает chart и member distribution. Привести отображение к существующему privacy pattern. Не менять persisted setting. |
| RC-14 / SCR-06 | needs-fix, subsequent | Аналитика реализована в существующем DrillDownModal / DrillDownMobile, не отдельная вкладка. DrillDownAnalyticsChart имеет старые локальные цвета, transition-all, мелкие controls, собственные SVG и округление отдельных покупок; требуется отдельная сверка вычислений до замены графика. В текущем пилоте — унификация toolbar/поверхностей без изменения агрегатов. |
| RC-07,08 / SCR-13 | blocked/implemented | visualViewport, safe-area, dialog hooks уже существуют. Физические iOS/Android, клавиатура и Back остаются отдельным gate. |
| RC-02/03 / SCR-01,13 | confirmed-existing | App.tsx закрывает финансовые экраны через FinancialDataState, scopes существующие. Не менять в UI-пилоте. |
| RC-04 / SCR-07 | confirmed-existing | PR #119–121: очередь и XLSX cleanup; не менять parser, storage, notifications. |

## План проверки

1. Reuse shared token, keep current shell and actual data. No new dependency or Firestore rule.
2. Overview chart: 390×844, 1440×900, both themes, day/week/month, zero/empty and private state, exact value disclosure, opening/closing period controls, existing navigation to Budget/analytics.
3. Produce screenshots of actual authenticated application with populated emulator fixtures (no production access), including analytics dialog; attach artifact to existing CRUD workflow. Verify no horizontal overflow, touch targets, stable graph height, correct focus state. Additional widths and full existing navigation audit retained.
4. Approval gate: preview screenshots must be reviewed before expanding or merging. Existing financial, build and emulator gates apply.

Unverified: runtime measurements/screenshots at time of writing, actual mobile Safari/Android, full registry mapping, legacy PR conflicts. Do not mark `verified` until evidence is available.
