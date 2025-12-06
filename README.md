# OnMySide - Browser-Based AI Assistant

A fully client-side AI assistant that runs entirely in your browser with web search capabilities. No server required!

## Features

- 🤖 **In-Browser AI Models**: Runs LLM and embeddings models directly in the browser using Transformers.js
- 🔍 **Web Search**: Integrates with Google Custom Search API for real-time information
- 💾 **Local Caching**: Uses IndexedDB to cache search results and embeddings
- 📱 **Fully Static**: Can be deployed as a static site (GitHub Pages, Netlify, etc.)

## Tech Stack

- **Framework**: Next.js 14 (static export)
- **AI Models**: 
  - LLM: `Xenova/LaMini-Flan-T5-248M` (text generation)
  - Embeddings: `Xenova/all-MiniLM-L6-v2` (semantic search)
- **Libraries**: Transformers.js, IndexedDB

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment variables**:
   Create a `.env.local` file:
   ```
   NEXT_PUBLIC_GOOGLE_API_KEY=your_google_api_key
   NEXT_PUBLIC_GOOGLE_SEARCH_ENGINE_ID=your_search_engine_id
   ```

3. **Run development server**:
   ```bash
   npm run dev
   ```

4. **Build for production**:
   ```bash
   npm run build
   ```

## Deployment to GitHub Pages

### Automatic Deployment (Recommended)

1. **Push your code to GitHub**

2. **Set up GitHub Secrets**:
   - Go to your repository → Settings → Secrets and variables → Actions
   - Add these secrets:
     - `NEXT_PUBLIC_GOOGLE_API_KEY`: Your Google API key
     - `NEXT_PUBLIC_GOOGLE_SEARCH_ENGINE_ID`: Your Google Search Engine ID

3. **Enable GitHub Pages**:
   - Go to Settings → Pages
   - Source: Select "GitHub Actions"
   - The workflow will automatically deploy on every push to `main`

4. **If deploying to a subdirectory** (repo name is NOT `username.github.io`):
   - Update `.github/workflows/deploy.yml` and add:
     ```yaml
     env:
       GITHUB_REPOSITORY_NAME: your-repo-name
     ```
   - Or set it as a repository secret

### Manual Deployment

1. **Build the site**:
   ```bash
   npm run build
   ```

2. **Deploy the `out/` directory**:
   - Push the `out/` directory to the `gh-pages` branch, or
   - Use GitHub Actions (recommended)

## Environment Variables

- `NEXT_PUBLIC_GOOGLE_API_KEY`: Your Google Custom Search API key
- `NEXT_PUBLIC_GOOGLE_SEARCH_ENGINE_ID`: Your Google Custom Search Engine ID
- `GITHUB_REPOSITORY_NAME` (optional): Repository name if deploying to subdirectory

## Notes

- **API Keys**: Since this is a client-side app, your Google API keys will be visible in the browser. Consider setting up API key restrictions in Google Cloud Console.
- **Model Loading**: Models are downloaded from Hugging Face CDN on first use (can be large, ~100-200MB total).
- **Browser Compatibility**: Requires modern browsers with WebAssembly support.

## License

MIT

