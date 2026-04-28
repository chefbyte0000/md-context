# md-context

A utility for managing and extracting context from markdown files.

## Quick Start

### Installation

```bash
npm install md-context
```

### Basic Usage

```javascript
const mdContext = require('md-context');

// Extract context from markdown file
const context = mdContext.extract('./document.md');
console.log(context);
```

## Quick Reference Guide

### Core Functions

| Function | Description | Returns |
|----------|-------------|---------|
| `extract(filePath)` | Extract context and metadata from a markdown file | Object |
| `parse(content)` | Parse markdown content string | Object |
| `getHeadings(content)` | Extract all headings from markdown | Array |
| `getLinks(content)` | Extract all links from markdown | Array |
| `getSummary(content)` | Generate summary of markdown content | String |

### API Examples

#### Extract from File
```javascript
const context = mdContext.extract('./README.md');
// Returns: { headings, links, summary, metadata, ... }
```

#### Parse Content
```javascript
const content = `# Title\n\nSome content here`;
const parsed = mdContext.parse(content);
```

#### Get Headings
```javascript
const headings = mdContext.getHeadings(content);
// Returns: [{ level: 1, text: 'Title', ... }]
```

#### Get Links
```javascript
const links = mdContext.getLinks(content);
// Returns: [{ text: 'link text', url: 'https://...' }]
```

## Features

- 📄 Extract structured context from markdown files
- 🔗 Automatic link detection and parsing
- 📊 Heading hierarchy analysis
- 🎯 Summary generation
- 🏷️ Metadata extraction
- ⚡ Fast and lightweight

## Use Cases

- Document analysis and indexing
- Content management systems
- Knowledge base builders
- SEO optimization tools
- Documentation generators

## Configuration

Create an `md-context.config.js` file in your project root:

```javascript
module.exports = {
  // Include hidden sections
  includeHidden: false,
  
  // Maximum heading depth to extract
  maxDepth: 6,
  
  // Generate summaries
  generateSummary: true,
  
  // Extract frontmatter
  extractFrontmatter: true
};
```

## Examples

See the `/examples` directory for more use cases and detailed examples.

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT

## Support

For issues, questions, or suggestions, please open an [issue](https://github.com/chefbyte0000/md-context/issues) on GitHub.

---

**Last updated:** April 28, 2026
