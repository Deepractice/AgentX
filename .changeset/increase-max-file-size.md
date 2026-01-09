---
"@agentxjs/ui": minor
---

Increase default file upload size limit from 5MB to 100MB

Increase the default `maxFileSize` in InputPane component from 5MB to 100MB to support larger file uploads. This change addresses user feedback about file size restrictions.

**Changes**:

- InputPane default `maxFileSize`: 5MB → 100MB (104857600 bytes)
- Users can still override this value via props if needed

**Note**: This is a frontend limit. Backend/API limits may still apply and should be configured separately.

Resolves #173
