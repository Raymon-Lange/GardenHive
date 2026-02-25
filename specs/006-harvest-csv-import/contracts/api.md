# API Contracts: Harvest CSV Import

**Branch**: `006-harvest-csv-import`
**Date**: 2026-02-25

All endpoints are mounted on the existing `/api/harvests` router.
All endpoints require a valid Bearer JWT token (`Authorization: Bearer <token>`).

---

## GET /api/harvests/template

Download the CSV template file.

### Request

```
GET /api/harvests/template
Authorization: Bearer <token>
```

No request body.

### Response — 200 OK

```
Content-Type: text/csv
Content-Disposition: attachment; filename="harvest-template.csv"
```

Body (plain CSV text):

```
Plant Name,Date,Quantity (oz)
Tomato,06/15/2025,8
```

### Response — 401 Unauthorized

```json
{ "error": "Unauthorized" }
```

---

## POST /api/harvests/import

Upload a CSV file for preview. Parses and validates every row, attempts
case-insensitive plant name matching, and returns a preview object. **Does not
write to the database.**

### Request

```
POST /api/harvests/import
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

Form field:

| Field | Type | Required | Description |
|---|---|---|---|
| `file` | File | Yes | CSV file (`.csv`, `text/csv`) |

### Response — 200 OK

```json
{
  "totalRows": 5,
  "matched": [
    {
      "row": 1,
      "plantId": "64a1b2c3d4e5f6a7b8c9d0e1",
      "plantName": "Tomato",
      "plantEmoji": "🍅",
      "date": "2025-06-15T00:00:00.000Z",
      "quantity": 8
    }
  ],
  "unmatched": [
    {
      "row": 2,
      "rawName": "Tomatoe",
      "suggestion": {
        "plantId": "64a1b2c3d4e5f6a7b8c9d0e1",
        "plantName": "Tomato",
        "plantEmoji": "🍅"
      }
    }
  ],
  "errors": [
    {
      "row": 3,
      "field": "date",
      "message": "Invalid date format — expected MM/DD/YYYY or MM/DD/YY"
    }
  ]
}
```

### Response — 400 Bad Request

Returned when the file is missing, not a CSV, or required columns are absent.

```json
{ "error": "Only CSV files are accepted" }
```

```json
{ "error": "Missing required columns: Plant Name, Quantity (oz)" }
```

### Response — 401 Unauthorized

```json
{ "error": "Unauthorized" }
```

---

## POST /api/harvests/bulk

Create multiple harvest records from a resolved import payload. Called after the
user has confirmed or overridden all unmatched rows.

### Request

```
POST /api/harvests/bulk
Authorization: Bearer <token>
Content-Type: application/json
```

Body:

```json
{
  "rows": [
    {
      "plantId": "64a1b2c3d4e5f6a7b8c9d0e1",
      "harvestedAt": "2025-06-15T00:00:00.000Z",
      "quantity": 8
    },
    {
      "plantId": "64a1b2c3d4e5f6a7b8c9d0e2",
      "harvestedAt": "2025-07-04T00:00:00.000Z",
      "quantity": 12.5
    }
  ]
}
```

Row fields:

| Field | Type | Required | Constraints |
|---|---|---|---|
| `plantId` | String | Yes | Valid ObjectId referencing a plant visible to the user |
| `harvestedAt` | String | Yes | ISO 8601 date string |
| `quantity` | Number | Yes | Positive number (oz) |

### Response — 201 Created

```json
{
  "imported": 2,
  "harvests": [
    {
      "_id": "...",
      "userId": "...",
      "plantId": "64a1b2c3d4e5f6a7b8c9d0e1",
      "quantity": 8,
      "unit": "oz",
      "harvestedAt": "2025-06-15T00:00:00.000Z",
      "season": "Summer 2025",
      "createdAt": "...",
      "updatedAt": "..."
    }
  ]
}
```

### Response — 400 Bad Request

```json
{ "error": "rows must be a non-empty array" }
```

```json
{ "error": "Row 2: plantId is required" }
```

### Response — 401 Unauthorized

```json
{ "error": "Unauthorized" }
```
