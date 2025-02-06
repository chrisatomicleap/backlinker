# Web Scraper Frontend

Next.js frontend for the web scraper application, providing a modern UI for scraping contact information and generating outreach emails.

## Features

- Modern, responsive UI with Tailwind CSS
- Drag-and-drop CSV upload
- Bulk URL processing
- Real-time scraping status updates
- CSV export with separate email subject and body
- Error handling and user feedback

## Tech Stack

- Next.js 13+
- TypeScript
- Tailwind CSS
- Axios

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
Create a `.env.local` file with:
```env
NEXT_PUBLIC_API_URL=your_backend_url
```

3. Run development server:
```bash
npm run dev
```

## Development

- `npm run dev`: Start development server
- `npm run build`: Build for production
- `npm run start`: Start production server
- `npm run lint`: Run ESLint

## Deployment

The application is deployed to Netlify. Push to main branch to trigger automatic deployment.

Required Environment Variables:
- `NEXT_PUBLIC_API_URL`: URL of the backend API

## Legal Considerations

Please ensure you have permission to scrape websites and comply with their robots.txt files and terms of service.
