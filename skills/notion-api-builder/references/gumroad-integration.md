# Gumroad Integration & Editor Automation

## The Problem

Gumroad's product description editor uses **ProseMirror**, a structured rich-text editor. Standard DOM manipulation doesn't work:

- `innerHTML` injection is **not persisted** — ProseMirror overwrites it
- `document.execCommand()` is unreliable
- Direct DOM manipulation bypasses ProseMirror's state management

## The Solution: Clipboard API + Paste

Use `navigator.clipboard.write()` with an HTML blob, then simulate `Cmd+V`:

```javascript
// 1. Build your HTML content
const html = `<h1>Product Title</h1><p>Description here</p>`;

// 2. Write to clipboard as text/html
const blob = new Blob([html], { type: 'text/html' });
const item = new ClipboardItem({ 'text/html': blob });
await navigator.clipboard.write([item]);

// 3. Focus the editor and select all
const editor = document.querySelector('.ProseMirror');
editor.focus();
document.execCommand('selectAll');

// 4. Simulate Cmd+V (must be done via browser automation)
// The paste event triggers ProseMirror's input handler
```

### Important Notes

- The clipboard write must happen in a user-gesture context or with permissions
- In browser automation, use `Cmd+A` then `Cmd+V` after clipboard is loaded
- **Human must click the Save button** — Gumroad's save is not automatable via API

## Gumroad Format Options

ProseMirror in Gumroad supports these block types:

| Format | HTML Tag | Notes |
|--------|----------|-------|
| Text | `<p>` | Default paragraph |
| Header | `<h1>` | Largest heading |
| Title | `<h2>` | Medium heading |
| Subtitle | `<h3>` | Smallest heading |
| Bulleted list | `<ul><li>` | Unordered |
| Numbered list | `<ol><li>` | Ordered |
| Code block | `<pre><code>` | Monospace |

## Workflow

1. Generate HTML content programmatically
2. Use browser automation to navigate to the Gumroad product edit page
3. Write HTML to clipboard via `navigator.clipboard.write()`
4. Focus editor, select all, paste
5. **Tell the human to click Save** (or verify save manually)

## Tips

- Preview the HTML in a local browser before pasting
- Gumroad strips most styling — stick to the supported formats above
- Images must be uploaded separately via Gumroad's image uploader
- Test on a draft product first before updating a live listing
