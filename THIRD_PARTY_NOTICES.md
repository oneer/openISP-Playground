# Third-Party Notices

This project references third-party open-source work for ISP pipeline structure, terminology, and algorithm guidance.

## cruxopen/openISP

- Repository: https://github.com/cruxopen/openISP
- Local reference: `third_party/openISP`
- License: MIT
- Copyright: Copyright (c) 2019 cruxopen

The upstream project is included as a Git submodule for attribution, reference, and comparison. Browser-side modules in `apps/playground/src/isp` are TypeScript implementations maintained in this repository unless a file explicitly states otherwise.

When adding or porting modules from openISP:

1. Keep the upstream MIT license available in `third_party/openISP/LICENSE`.
2. Prefer clean TypeScript implementations in `apps/playground/src/isp`.
3. If copying substantial upstream source text, retain the original copyright and license notice in the copied file.
4. Document user-visible behavior and any meaningful algorithm differences in this repository.
