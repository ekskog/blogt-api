### Blogt API – Current Endpoints Overview

This document describes the **existing** API surface of `blogt-api`. It is descriptive only; it does not yet include the additional endpoints planned for the editor refactor.

---

## Base URL

- **Internal (Kubernetes)**: `http://blogt-api:3000`
- **External (LoadBalancer)**: `http://<external-ip>:3000` (currently `192.168.1.207:3000`)

All endpoints below are relative to this base.

---

## Health

### `GET /health`

- **Description**: Liveness probe used by Kubernetes and for manual health checks.
- **Request**: No body, no query params.
- **Response**:
  - `200 OK` with plain text body: `OK`.

---

## Index

### `GET /`

- **Description**: Placeholder root route; not used by clients for business logic.
- **Response**:
  - `200 OK` with body: `this is not it`.

---

## Posts

Mounted at `\`/posts\``.

### `GET /posts`

- **Description**: Returns an array of posts starting from the **latest post** (according to filesystem).
- **Request**:
  - No body.
  - No query params.
- **Response**:
  - `200 OK` with an array of posts (structure defined by `getPostsArray` in `utils`).
  - `404 Not Found` with `{ "error": "No posts found" }` if no posts exist.

---

### `GET /posts/from/:startDate`

- **Description**: Returns an array of posts starting from (or near) the given `startDate`.
- **Path params**:
  - `startDate` (string): date in a format accepted by `formatDates` (currently treated as a string and normalized there).
- **Response**:
  - `200 OK` with an array of posts (from `getPostsArray`), starting at/around the normalized `startDate`.
  - `404 Not Found` with `{ "error": "No posts found" }` if nothing can be resolved from `startDate`.

---

### `GET /posts/archives`

- **Description**: Returns the archived posts structure from `archive.json`.
- **Response**:
  - `200 OK` with JSON parsed from `posts/archive.json`, typically:
    - `{ [year]: { [month]: [day, ...] } }`
  - `500 Internal Server Error` with plain text `Failed to fetch archives.` if reading/parsing fails.

---

### `GET /posts/buildarchives`

- **Description**: Dynamically scans the `posts` directory and builds an in‑memory archive structure, then returns it.
- **Notes**:
  - Does **not** persist to `archive.json` (builds in memory only).
  - Returns a nested object: `{ [year]: { [month]: [day, ...] } }`.
- **Response**:
  - `200 OK` with the generated JSON archive.
  - `500 Internal Server Error` with plain text `Failed to fetch archives.` on error.

---

### `GET /posts/:dateString`

- **Description**: Returns the raw markdown content for a specific post, by date.
- **Path params**:
  - `dateString` (string): must be in `DDMMYYYY` format (e.g. `05012025`).
- **Validation**:
  - If `dateString` does not match `^\d{8}$`, returns:
    - `400 Bad Request` with plain text `Invalid date format. Use DDMMYYYY.`
- **Behavior**:
  - Maps `DDMMYYYY` → `posts/YYYY/MM/DD.md` under the API’s `posts` directory.
  - Reads the file content and wraps it in an array.
- **Response**:
  - `200 OK` with an array of strings:
    - `[ "<raw markdown content>" ]`
  - `404 Not Found` with plain text `Post not found` if file is missing or unreadable.

---

### `POST /posts`

- **Description**: Creates a new post markdown file and updates the tags index.
- **Request body (JSON)**:
  - `date` (string, **required**): must be in `DDMMYYYY` format.
    - If missing/invalid → `400 Bad Request` with `{ "error": "date must be in DDMMYYYY format" }`.
  - `title` (string, **required**): post title.
    - If missing → `400 Bad Request` with `{ "error": "title is required" }`.
  - `tags` (string[], **required, non‑empty**): array of tag names.
    - If empty or not an array → `400 Bad Request` with `{ "error": "tags must be a non-empty array" }`.
  - `content` (string, optional, default `""`): post body in markdown or text.
- **Behavior**:
  - Splits `date` into `day`, `month`, `year`.
  - Ensures directory `posts/YYYY/MM` exists.
  - Writes markdown file `DD.md` with:
    - Line 1: `Tags: tag1, tag2, ...`
    - Line 2: `Title: <title>`
    - Then `content` on following lines.
  - Calls `updateTagsIndex()` to update `posts/tags_index.json`.
- **Response**:
  - `201 Created` with:
    - `{ "message": "Post created", "path": "YYYY/MM/DD.md" }`
  - `500 Internal Server Error` with `{ "error": "Failed to create post" }` on failure.

---

## Tags

Mounted at `\`/tags\``.

### `GET /tags/:tagName`

- **Description**: Returns the list of posts associated with a given tag, based on `tags_index.json`.
- **Path params**:
  - `tagName` (string): URL‑encoded tag name (may include spaces or special characters).
- **Behavior**:
  - Decodes `tagName` and lowercases it.
  - Reads `posts/tags_index.json`.
  - Parses JSON and looks up the normalized tag key.
  - Returns the associated array or an empty array if the tag is unknown.
- **Response**:
  - `200 OK` with an array of “post files” (shape defined by `tags_index.json`).
  - `500 Internal Server Error` with plain text `Failed to fetch tag data` if reading/parsing fails.

---

## RSS

Mounted at `\`/rss.xml\``.

### `GET /rss.xml`

- **Description**: Returns an RSS 2.0 feed built from the latest posts.
- **Behavior**:
  - Uses `findLatestPost` and `formatDate` to locate the latest date.
  - Uses `getPostsArray(latestDateString)` to load recent posts (raw markdown).
  - Generates RSS:
    - `<title>`: static default (`My Blog RSS Feed`).
    - `<description>`: static default.
    - `<link>`: static default site URL.
    - For each post:
      - `<title>`: `Blog Entry #n`.
      - `<description>`: escaped first 400 characters of the markdown.
      - `<link>`/`<guid>`: default site URL plus an index.
      - `<pubDate>`: synthetic, based on current time minus `n` days.
- **Response**:
  - `200 OK` with `Content-Type: application/rss+xml` and the RSS XML.
  - If there are no posts:
    - Returns a valid but empty RSS channel.
  - `500 Internal Server Error` with plain text `Failed to generate RSS feed` on error.

---

### Notes

- This document reflects the **current** implemented behavior of `blogt-api`.
- Planned additions (for editor integration) will include:
  - Structured `GET /posts/:date` with parsed metadata.
  - Update endpoints for posts content/metadata.
  - Media upload endpoints.
  - Internal‑only write protection for mutating routes.

---

## Planned Endpoints for Editor Integration

> **Status**: Design only. Not yet implemented.

These endpoints are intended to support the blog editor app as a client of `blogt-api`, so that the editor no longer touches the filesystem or MinIO directly.

### `GET /posts/details/:date`

- **Purpose**: Load a single post in a structured form suitable for the editor.
- **Path params**:
  - `date` (string): editor‑friendly date format, e.g. `YYYY-MM-DD`.
- **Behavior (intended)**:
  - Convert `YYYY-MM-DD` → filesystem path `posts/YYYY/MM/DD.md`.
  - Read and parse the markdown file:
    - Extract `Date:`, `Tags:`, `Title:` metadata lines if present.
    - Treat the remainder as the post body/content.
  - Compute:
    - `prev` / `next` date strings for navigation.
    - Optional `imageUrl` using the same convention as the editor today.
- **Response (intended)**:
  - `200 OK` with:
    ```json
    {
      "date": "YYYY-MM-DD",
      "title": "Post title",
      "tags": ["tag1", "tag2"],
      "content": "Raw markdown body without metadata header",
      "htmlContent": "<p>Optional rendered HTML</p>",
      "prev": "YYYY-MM-DD | null",
      "next": "YYYY-MM-DD | null",
      "imageUrl": "https://.../YYYY/MM/DD.jpeg"
    }
    ```
  - `404 Not Found` if the file does not exist.
  - `400 Bad Request` if `date` is not in the expected format.

### `POST /posts` (extended contract – planned)

- **Purpose**: Continue to create posts, but with an editor‑friendly request shape.
- **Current behavior**: Accepts `date` in `DDMMYYYY`, `title`, `tags[]`, `content`, and writes a markdown file with `Tags:` and `Title:` lines plus body.
- **Planned behavior additions**:
  - Accept **either**:
    - `date` as `YYYY-MM-DD`, **or**
    - Keep current `DDMMYYYY` as a legacy option (to be phased out).
  - Optionally accept a `metadata` block:
    ```json
    {
      "date": "YYYY-MM-DD",
      "title": "Post title",
      "tags": ["tag1", "tag2"],
      "content": "Body markdown",
      "imageUrl": "https://.../YYYY/MM/DD.jpeg"
    }
    ```
  - Ensure tags index is updated consistently with the editor’s notion of tags.
- **Security (planned)**:
  - Require an internal auth mechanism (e.g. shared header) for write access when used in production.

### `PUT /posts/:date`

- **Purpose**: Update an existing post (editor “Save Changes”).
- **Path params**:
  - `date` (string): `YYYY-MM-DD` (editor format).
- **Request body (intended)**:
  ```json
  {
    "title": "Updated title",
    "tags": ["tag1", "tag3"],
    "content": "Updated body markdown"
  }
  ```
- **Behavior (intended)**:
  - Map `YYYY-MM-DD` → `posts/YYYY/MM/DD.md`.
  - Overwrite the file with updated metadata header + body.
  - Rebuild or update tags index so tag lookups remain correct.
- **Response (intended)**:
  - `200 OK` with a summary of the updated post (similar to `GET /posts/details/:date`).
  - `404 Not Found` if the target post does not exist.
  - `400 Bad Request` if the date format is invalid.
- **Security (planned)**:
  - Only callable by trusted internal clients (e.g. blog editor), authenticated via internal header/token.

### `POST /media/images`

- **Purpose**: Centralize image upload + processing (currently done directly by the editor via MinIO).
- **Request (intended)**:
  - `Content-Type: multipart/form-data`.
  - Fields:
    - `file`: image file (required).
    - Optional: `date` (`YYYY-MM-DD`) or `path` hints for bucket folder layout.
- **Behavior (intended)**:
  - Resize image (e.g. max 1920x1920) and preserve EXIF where needed.
  - Upload to MinIO/S3 using the existing conventions (e.g. `bucket/year/month/day.jpeg`).
  - Return the public URL for the uploaded image.
- **Response (intended)**:
  - `201 Created` with:
    ```json
    {
      "url": "https://objects.../bucket/YYYY/MM/DD.jpeg"
    }
    ```
  - Appropriate `4xx/5xx` codes for validation or upload errors.
- **Security (planned)**:
  - Restricted to internal/editor usage in production via internal auth.

### Internal Write Protection (Planned)

- All **mutating endpoints** (`POST /posts`, `PUT /posts/:date`, `POST /media/images`, and any future write routes) will:
  - Be callable without strict auth in local development (to keep testing simple).
  - In staging/production:
    - Require a shared secret header (e.g. `X-Internal-Client: blogt-editor`) or equivalent mechanism.
    - Optionally be exposed only on an internal network path/port not reachable from the public internet.
