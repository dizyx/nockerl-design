// bun test preload: a happy-dom document for the *.dom.test.tsx behavior tests.
// Registers window/document/etc. as globals and flags the React act() environment.
// Additive: the pure-logic *.test.ts files never touch these globals.
// This gateway environment runs with NODE_ENV=production, which would make `react` resolve
// its production build, where `act` does not exist. Tests are tests: force the test env
// BEFORE anything imports react (this preload is the first module bun test evaluates).
process.env['NODE_ENV'] = 'test';

import { GlobalRegistrator } from '@happy-dom/global-registrator';

GlobalRegistrator.register();
(globalThis as Record<string, unknown>)['IS_REACT_ACT_ENVIRONMENT'] = true;
