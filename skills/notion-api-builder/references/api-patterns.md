# Notion API Patterns

## Authentication

```bash
Authorization: Bearer <integration_token>
Notion-Version: 2022-06-28
Content-Type: application/json
```

## Creating a Page

```json
POST /v1/pages
{
  "parent": { "page_id": "<parent_page_id>" },
  "properties": {
    "title": [{ "text": { "content": "Page Title" } }]
  },
  "icon": { "emoji": "📋" },
  "cover": { "external": { "url": "https://..." } },
  "children": [ /* blocks */ ]
}
```

## Creating a Database

```json
POST /v1/databases
{
  "parent": { "page_id": "<parent_page_id>" },
  "title": [{ "text": { "content": "My Database" } }],
  "properties": {
    "Name": { "title": {} },
    "Status": {
      "select": {
        "options": [
          { "name": "Active", "color": "green" },
          { "name": "Inactive", "color": "red" }
        ]
      }
    },
    "Amount": { "number": { "format": "dollar" } },
    "Email": { "email": {} },
    "Date": { "date": {} }
  }
}
```

## Adding Blocks to a Page

```json
PATCH /v1/blocks/{page_id}/children
{
  "children": [ /* array of block objects */ ]
}
```

## Block Type Reference

| Type | Key | Notes |
|------|-----|-------|
| Paragraph | `paragraph` | Basic text |
| Heading 1/2/3 | `heading_1`, `heading_2`, `heading_3` | |
| Bulleted list | `bulleted_list_item` | |
| Numbered list | `numbered_list_item` | |
| To-do | `to_do` | Has `checked` boolean |
| Toggle | `toggle` | Contains children |
| Code | `code` | Has `language` field |
| Callout | `callout` | Has `icon` and `color` |
| Quote | `quote` | |
| Divider | `divider` | Empty object `{}` |
| Table of contents | `table_of_contents` | |
| Column list | `column_list` | Contains `column` children |
| Column | `column` | Only inside `column_list` |
| Synced block | `synced_block` | Original or reference |
| Bookmark | `bookmark` | Has `url` |
| Image | `image` | External or file |
| Embed | `embed` | Has `url` |

### Block Example — Callout

```json
{
  "type": "callout",
  "callout": {
    "icon": { "emoji": "💡" },
    "color": "blue_background",
    "rich_text": [{ "text": { "content": "Pro tip text here" } }]
  }
}
```

### Block Example — Toggle Heading

```json
{
  "type": "heading_2",
  "heading_2": {
    "rich_text": [{ "text": { "content": "Section Title" } }],
    "is_toggleable": true,
    "children": [ /* nested blocks */ ]
  }
}
```

## Database Properties

### Relation

```json
"Invoices": {
  "relation": {
    "database_id": "<target_db_id>",
    "single_property": {}
  }
}
```

### Rollup

```json
"Total Amount": {
  "rollup": {
    "relation_property_name": "Invoices",
    "rollup_property_name": "Amount",
    "function": "sum"
  }
}
```

Rollup functions: `sum`, `average`, `min`, `max`, `count`, `count_values`, `unique`, `show_unique`, `percent_empty`, `percent_not_empty`, etc.

### Formula

```json
"Outstanding": {
  "formula": {
    "expression": "prop(\"Total Invoiced\") - prop(\"Total Paid\")"
  }
}
```

### Common Formula Patterns

```
# Days until due
dateBetween(prop("Due Date"), now(), "days")

# Days overdue
if(prop("Days Until Due") < 0, abs(prop("Days Until Due")), 0)

# Reliability score
round((prop("Paid Count") / prop("Invoice Count")) * 100)

# Status indicator with emoji
if(prop("Status") == "Paid", "✅ Paid",
  if(prop("Days Overdue") > 30, "🔴 30+ Days",
    if(prop("Days Overdue") > 14, "🟠 14+ Days",
      if(prop("Days Overdue") > 0, "🟡 Overdue", "⚪ Draft"))))
```

## Synced Blocks

### Create Original

```json
{
  "type": "synced_block",
  "synced_block": {
    "synced_from": null,
    "children": [ /* content */ ]
  }
}
```

### Reference (deploy to other pages)

```json
{
  "type": "synced_block",
  "synced_block": {
    "synced_from": { "block_id": "<original_synced_block_id>" }
  }
}
```

## Adding Database Rows

```json
POST /v1/pages
{
  "parent": { "database_id": "<db_id>" },
  "properties": {
    "Name": { "title": [{ "text": { "content": "Row title" } }] },
    "Status": { "select": { "name": "Active" } },
    "Amount": { "number": 1500 },
    "Date": { "date": { "start": "2026-02-09" } },
    "Client": { "relation": [{ "id": "<page_id>" }] }
  }
}
```

## Querying a Database

```json
POST /v1/databases/{db_id}/query
{
  "filter": {
    "property": "Status",
    "select": { "equals": "Overdue" }
  },
  "sorts": [
    { "property": "Due Date", "direction": "ascending" }
  ]
}
```

## Updating a Block

```json
PATCH /v1/blocks/{block_id}
{
  "paragraph": {
    "rich_text": [{ "text": { "content": "Updated text" } }]
  }
}
```

## Pagination

All list endpoints return max 100 items. Check `has_more` and use `start_cursor`:

```json
POST /v1/databases/{db_id}/query
{ "start_cursor": "<cursor_from_previous_response>" }
```
