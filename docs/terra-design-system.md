# Terra Design System — pilot

Storybook is the catalog of real presentational components, not a second application.
Do not create alternate header markup for a new page. Use TerraPageHeader and TerraHeaderAction, with TerraMobileHeader wiring actual notifications/settings. Keep page actions separate from global navigation. Main create actions have a verb and a visible label, secondary actions use accessible icon buttons; destructive actions never use the primary green style. Use the existing Terra semantic tokens and focus states. Chat may have a context-specific title and back action. Preserve data logic and all working actions.

The first pilot covers mobile headers and chat; desktop headers outside chat are not migrated yet. The two-row header is a proposal to validate before merge. Story fixtures use no Firebase, private family data or authenticated calls. They are not proof of production integration.

## Local catalog
```powershell
npm install
npm run storybook
```
Open http://localhost:6006. Select Terra / PageHeader and a theme. Resize the preview for narrow screens.

With Storybook running in another terminal:
```powershell
npx playwright install chromium
npm run check:terra-ui
```
Screenshots are written to terra-ui-screenshots/. Build with npm run build-storybook. CI should run these cases and upload screenshots. Do not treat generated screenshots as an approved regression baseline; review and approve first.

## Acceptance
Review all six sections on 360/390/768/1280 px in both themes. One visible mobile header, accessible labels, 44px action targets, no overflow, correct primary/secondary placement and actual application callbacks. Verify existing authenticated regression tests; test the real app on mobile Chrome and Safari. No change to financial calculations, Firebase or calendar semantics. No merge before CI and review of screenshots. Follow up: desktop header, Button/Card/Filter/Modal primitives, six full-screen stories and approved visual baselines.
