# Claire AI Assistant Chrome Extension

Claire is an AI-powered Chrome extension that functions as an all-in-one assistant, providing various capabilities:

- General AI assistant
- Writing assistant
- Coding assistant
- PDF analyzer
- Web page analyzer
- Video summarizer

## Features

- Chat interface with AI powered by LM Studio API
- Multiple assistant modes for different tasks
- Web page content extraction
- YouTube video information extraction
- Configurable API settings

## Requirements

- Chrome browser
- LM Studio running locally (or another compatible API endpoint)
- Node.js and npm for development

## Setup and Installation

### Development Setup

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Start the development build:
   ```
   npm start
   ```
4. Load the extension in Chrome:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `dist` folder from this project

### Using LM Studio

1. Download and install [LM Studio](https://lmstudio.ai/)
2. Load a model in LM Studio
3. Start the local server in LM Studio (default: http://localhost:<LOCAL_PORT>/v1)
4. Configure the extension to use your LM Studio API endpoint

## Configuration

You can configure the API settings in the extension:
1. Click the extension icon to open the popup
2. Click the settings icon in the top-right corner
3. Enter your LM Studio API URL and model name
4. Click "Save"

## Usage

1. Click the Claire icon in your Chrome toolbar
2. Select the assistant mode from the sidebar menu
3. Type your message and press Enter or click the send button
4. For web page analysis, navigate to the page you want to analyze, then open Claire and select "Web Analyzer"

## Development

The extension is built with:
- React
- TypeScript
- Material-UI
- Webpack

### Project Structure

- `src/`: Source code
  - `components/`: React components
  - `api/`: API service for LM Studio
  - `popup.tsx`: Main popup UI
  - `background.ts`: Background script
  - `contentScript.ts`: Content script for web page interaction
- `public/`: Static assets and manifest.json
- `dist/`: Build output (generated)

## License

MIT
