# Website Contact Information Scraper

A robust Python web scraper that extracts contact information from websites including business names, email addresses, phone numbers, social media links, and physical addresses.

## Features

- Extracts multiple types of contact information:
  - Business Name
  - Email Addresses
  - Phone Numbers
  - Social Media Links (Facebook, Twitter, LinkedIn, Instagram)
  - Physical Address
  - Contact Page URL
- Uses both static (BeautifulSoup) and dynamic (Playwright) scraping
- Respects website rate limits with configurable delays
- Handles various phone number and email formats
- Saves results in JSON format

## Installation

1. Clone this repository
2. Install the required packages:
```bash
pip install -r requirements.txt
```
3. Install Playwright browsers:
```bash
playwright install
```

## Usage

1. Edit the `urls` list in `web_scraper.py` to include the websites you want to scrape:
```python
urls = [
    "https://example1.com",
    "https://example2.com",
    # Add more URLs here
]
```

2. Run the scraper:
```bash
python web_scraper.py
```

The results will be saved in `scraping_results.json` in the same directory.

## Output Format

The scraper outputs JSON in the following format:
```json
{
  "website": "https://example.com",
  "business_name": "Example Business",
  "email": ["contact@example.com"],
  "phone": ["+1 123-456-7890"],
  "social_links": {
    "facebook": "https://facebook.com/example",
    "linkedin": "https://linkedin.com/company/example"
  },
  "address": "123 Example Street, New York, NY",
  "contact_page": "https://example.com/contact"
}
```

## Notes

- The scraper implements polite scraping practices with delays between requests
- It uses multiple fallback strategies to handle different website structures
- For dynamic websites, it automatically switches to using Playwright
- Error handling is implemented to ensure robustness

## Legal Considerations

Please ensure you have permission to scrape the websites and comply with their robots.txt files and terms of service.
