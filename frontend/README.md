# CareerBridge frontend

```sh
npm install
npm run dev     # app
npm test        # vitest
npm run lint    # oxlint
npm run build
```

## Résumé analysis

Choosing a PDF or DOCX file starts the analysis straight away (`uploadResume` in `src/services/candidateApi.js`):
validate type, size and file signature → read the text (`services/resumeText.js`, pdf.js / mammoth, loaded lazily) →
structured analysis (`services/analyzer.js`) validated against the schema in `domain/analysis.js` → evidence,
score and skill gaps saved to an `analyses` history record. The same file for the same profile version is analysed once.

By default the analysis is keyword-based and runs locally. To use an AI service, set `VITE_CV_ANALYSIS_URL`
to a server endpoint you control. That server keeps the model API key and prompt. It receives
`{ schemaVersion, text, skills: [{ id, name }] }` and returns the shape `parseAnalysis` accepts. Invalid output,
errors and responses slower than 20 s fall back to the keyword analysis. Never put a model API key in a `VITE_` variable.

## Plan limits

Enforced in the service layer (`src/services/candidateApi.js`); limits live in `FREE_LIMITS` in `src/domain/permissions.js`.

| | Free | Pro | Max |
|---|---|---|---|
| Skill gaps | 2 in full, rest counted | all | all |
| Courses | 2 starter courses, rest counted | every card listed; opens the same 2 starter courses | all open |
| Job opportunities | 2 viewable, rest counted | all viewable | all, plus eligibility and applying when eligible |

Starter courses are the first courses in a server-side order: courses already started, then courses for the
candidate's highest-priority gaps. Free jobs are those already applied to, then the newest. Locked items are sent
only as a count. Search, filters, paging arguments and direct URLs can't reach them: `getCourse`,
`setLessonComplete` and `getJob` reject them.

# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.
