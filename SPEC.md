# Gov Content Hub — Content Spec

This file defines required fields and validation rules for each content type.
The `ContentRevision.data` JSON must follow these shapes.

---

## Common rules

- `slug` lives on `ContentItem.slug` and must be unique
- `status` lives on `ContentItem.status`
- All “required” fields must be present before moving to IN_REVIEW or PUBLISHED

---

## NEWS (ContentRevision.data)

Required:
- title: string
- summary: string
- body: string

Optional:
- heroImageUrl: string
- tags: string[]

Example:
```json
{
  "title": "Storm recovery updates",
  "summary": "Road closures and support services.",
  "body": "Full article content here...",
  "heroImageUrl": "https://example.com/image.jpg",
  "tags": ["weather", "community"]
}
