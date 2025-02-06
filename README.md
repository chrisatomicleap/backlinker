# Web Scraper with Outreach Email Generator

A full-stack web application that scrapes contact information from websites and generates personalized outreach emails using OpenAI's GPT model.

## Features

- **Frontend (Next.js)**:
  - Modern, responsive UI
  - Drag-and-drop CSV upload
  - Paste multiple URLs
  - Real-time scraping status
  - Export results to CSV
  - Error handling and feedback

- **Backend (Flask)**:
  - Concurrent URL processing
  - Contact information extraction:
    - Business Name
    - Email Addresses
    - Phone Numbers
    - Social Media Links
  - OpenAI integration for email generation
  - Rate limiting and polite scraping

## Tech Stack

- **Frontend**:
  - Next.js 13+
  - TypeScript
  - Tailwind CSS
  - Axios

- **Backend**:
  - Python 3.11+
  - Flask
  - BeautifulSoup4
  - OpenAI API
  - Concurrent processing

## Setup

1. Clone this repository
2. Install frontend dependencies:
```bash
cd frontend
npm install
```

3. Install backend dependencies:
```bash
cd backend
pip install -r requirements.txt
```

4. Set up environment variables:
Create a `.env` file in the root directory:
```env
OPENAI_API_KEY=your_openai_api_key
```

## Development

1. Start the backend server:
```bash
cd backend
python app.py
```

2. Start the frontend development server:
```bash
cd frontend
npm run dev
```

3. Open http://localhost:3000 in your browser

## Deployment

### Backend (AWS App Runner)
The backend is automatically deployed to AWS App Runner through GitHub Actions when pushing to the main branch.

Required AWS setup:
1. Create an AWS account
2. Set up IAM role with necessary permissions
3. Configure GitHub repository secrets:
   - `AWS_ROLE_ARN`
   - `APPRUNNER_SERVICE_ROLE_ARN`
   - `OPENAI_API_KEY`

### Frontend (Netlify)
The frontend is deployed to Netlify.

Required environment variables:
- `NEXT_PUBLIC_API_URL`: URL of the deployed backend

## Output Format

The scraper outputs data in the following format:
```json
{
  "url": "https://example.com",
  "business_name": "Example Business",
  "emails": ["contact@example.com"],
  "phones": ["+1 123-456-7890"],
  "social_links": {
    "facebook": "https://facebook.com/example",
    "twitter": "https://twitter.com/example"
  },
  "outreach_email": "Generated personalized email content"
}
```

## Legal Considerations

Please ensure you have permission to scrape websites and comply with their robots.txt files and terms of service.

## License

MIT
