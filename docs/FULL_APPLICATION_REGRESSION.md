# Budget: full regression round

Release base: 49a19ed971b69e2d1ed6aee4fa87b69277eaed2c. This QA branch adds no application code. The seven scenarios in fullApplicationCrudBrowser.mjs run on a disposable loopback Firebase project, with two independent authenticated accounts and actual checked-in rules. No production records are touched. Each scenario has an independent error record; a failure must fail the workflow. The existing financial operation test and six-viewport browser smoke remain mandatory.

Coverage added (not yet run): events, shopping, chat send/reaction, personal theme, wallet, debts, mandatory payments. Existing confirmed production checks: transaction CRUD with reload and cleanup; navigation at 1440/390. Remaining: all nested buttons, imports with representative bank files, quick lists/pantry, recurring event edits, category and goal UI CRUD, external services, actual second production user, offline and physical devices. No claim of complete coverage until each is verified.

Source-confirmed limitations: FamilyChat topic create/delete are placeholders that show informational messages, file attachment is not supported. Wallet camera banner can pre-fill simulated demo data; real camera recognition not established. Do not treat mere navigation to these features as success.
