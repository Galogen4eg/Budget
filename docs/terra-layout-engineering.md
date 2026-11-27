# Terra layout engineering

Complement to Terra v2, not replacement. Sources: https://github.com/alexpate/awesome-design-systems ; https://www.carbondesignsystem.com/building-blocks/foundations/2x-grid/guidelines ; https://github.com/pbakaus/impeccable/blob/main/skill/reference/layout.md . Use structural ideas, not branding or a new dependency.

- `.terra-layout-context` establishes actual available width. `.terra-layout-grid` selects four, eight (520+ CSS px), twelve (1040+ CSS px) equal tracks. Workspace uses 8/4 at wide content widths, financial summary 4/4/4; intermediate layout stacks without overflow.
- Page rails 12px mobile, 24px desktop; surfaces and gaps 12px mobile, 16px desktop. Use the existing 4px rhythm. Keep natural heights, never stretch short cards to match long content.
- Heading/action groups: explicit title and action columns, 44px controls, visible keyboard focus. Wrap deliberately on narrow screens. Numeric columns are tabular and right-aligned; metadata shares title axis.
- Accept only after real screenshots and bounding-box tests: rails, spacing, padding, headers, controls, dense and empty states, long names, amounts, both themes, reduced motion and zoom. Geometry is necessary, not sufficient for visual acceptance. Exact-SHA CI before publication; native Android/Safari separately.

Pilot: Overview draft PR139. Other sections not migrated. New browser verification and review required.
