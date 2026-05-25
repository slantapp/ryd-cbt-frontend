# Question Bulk Upload Template (v3)

Download the official Excel template from the app (**Download Excel Template** on a test, question bank, or practice).

## Questions sheet columns

| Column | Required | Notes |
|--------|----------|-------|
| Question Text | Yes | |
| Question Type | Yes | Short Answer, Multiple Choice, Multiple Select, True/False |
| Option A–D | For MCQ/MSQ | Leave blank for True/False and Short Answer |
| Correct Answer | Yes | Letters, matching option text, or comma-separated for Multiple Select |
| Points | Yes | Number greater than 0 |
| Answer Rationale | No | |
| Topic Tag | No | |
| Image | No | Full `https://` URL or relative path (see below) |
| Grade | Bank only | Required per row when uploading to the question bank |

## Image column (optional)

- Leave empty if the question has no image.
- **Full URL:** `https://cdn.example.com/math/q1.png` — used as-is.
- **Relative path:** `questions/diagram1.png` — shown using `VITE_QUESTION_BASE_URL` in the frontend `.env`.

**Sample row in the downloaded template** (autumn leaves question):

| Question Text | … | Image |
|---------------|---|-------|
| What season do the leaves in the picture suggest? | … | `https://rydlearning.com/images/banner/advert1.jpg` |

Use a direct image URL (`.jpg`, `.png`, etc.) for `<img>` display.

Legacy column names (`img`, `imageUrl`, camelCase) are still accepted on upload.
