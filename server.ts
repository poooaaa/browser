import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { Brave } from './src/lib/brave.js';

async function startServer() {
  const app = express();
  const PORT = 3000;

  const braveSearch = new Brave();

  // Parse JSON bodies
  app.use(express.json());

  // API Route
  app.get('/api/search', async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query) {
        res.status(400).json({ error: 'Query parameter "q" is required' });
        return;
      }
      
      const offset = req.query.offset ? parseInt(req.query.offset as string) : undefined;
      const count = req.query.count ? parseInt(req.query.count as string) : undefined;

      const results = await braveSearch.search(query, { offset, count });
      res.json(results);
    } catch (error: any) {
      console.error('Search error:', error);
      res.status(500).json({ error: 'Failed to fetch search results', message: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist', 'client');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
