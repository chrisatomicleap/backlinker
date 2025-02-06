import re
import json
import time
from typing import Dict, List, Optional
import requests
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright
from urllib.parse import urljoin, urlparse
import validators
from tqdm import tqdm
import os
from dotenv import load_dotenv
from openai import OpenAI

# Load environment variables
load_dotenv()

class WebScraper:
    def __init__(self, delay: float = 2.0):
        """Initialize the scraper with configurable delay between requests."""
        self.delay = delay
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        self.openai_client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
        # Company and backlink information
        self.company_name = "Tanglewood Care Homes"
        self.backlink_url = "https://www.tanglewoodcarehomes.co.uk/understanding-dementia-care-guide-for-families-residents/"

    def extract_emails(self, text: str) -> List[str]:
        """Extract email addresses from text using regex."""
        # More comprehensive email pattern
        email_pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
        # Also look for obfuscated emails
        text = text.replace(' [at] ', '@').replace(' [dot] ', '.')
        # Find all emails and clean them
        emails = re.findall(email_pattern, text)
        # Clean and validate emails
        valid_emails = []
        for email in emails:
            email = email.strip('.,')  # Remove trailing punctuation
            if validators.email(email):
                valid_emails.append(email)
        return list(set(valid_emails))

    def extract_phones(self, text: str) -> List[str]:
        """Extract phone numbers from text using regex."""
        phone_patterns = [
            r'\+\d{1,3}[-.\s]?\d{3}[-.\s]?\d{3}[-.\s]?\d{4}',  # International format
            r'\(\d{3}\)\s*\d{3}[-.\s]?\d{4}',  # (123) 456-7890
            r'\d{3}[-.\s]?\d{3}[-.\s]?\d{4}',  # 123-456-7890
            r'\d{5}[-.\s]?\d{6}',  # UK format
            r'0\d{4}[-.\s]?\d{6}',  # UK mobile
            r'\+44\s?\d{4}[-.\s]?\d{6}'  # UK international
        ]
        phones = []
        # Replace common phone text
        text = text.replace('Tel:', '').replace('Phone:', '').replace('Call:', '')
        for pattern in phone_patterns:
            found = re.findall(pattern, text)
            phones.extend(found)
        # Clean phone numbers
        cleaned_phones = []
        for phone in phones:
            # Remove all non-digit characters except + for international
            cleaned = re.sub(r'[^\d+]', '', phone)
            if len(cleaned) >= 10:  # Only keep numbers with reasonable length
                cleaned_phones.append(cleaned)
        return list(set(cleaned_phones))

    def extract_social_links(self, soup: BeautifulSoup, base_url: str) -> Dict[str, str]:
        """Extract social media links from the page."""
        social_patterns = {
            'facebook': r'facebook\.com|fb\.me',
            'twitter': r'twitter\.com|x\.com',
            'linkedin': r'linkedin\.com',
            'instagram': r'instagram\.com',
            'youtube': r'youtube\.com',
            'pinterest': r'pinterest\.com',
            'tiktok': r'tiktok\.com'
        }
        
        social_links = {}
        # Look in both href attributes and text content
        for link in soup.find_all(['a', 'link'], href=True):
            href = urljoin(base_url, link['href'])
            for platform, pattern in social_patterns.items():
                if re.search(pattern, href, re.I):
                    social_links[platform] = href
        
        # Also look for social media icons
        icon_classes = {
            'facebook': r'fb|facebook|social-fb',
            'twitter': r'tw|twitter|social-tw',
            'linkedin': r'ln|linkedin|social-ln',
            'instagram': r'ig|instagram|social-ig',
            'youtube': r'yt|youtube|social-yt',
            'pinterest': r'pin|pinterest',
            'tiktok': r'tiktok|tt'
        }
        
        for link in soup.find_all('a', class_=True):
            classes = ' '.join(link.get('class', []))
            href = urljoin(base_url, link.get('href', ''))
            if validators.url(href):
                for platform, pattern in icon_classes.items():
                    if re.search(pattern, classes, re.I) and platform not in social_links:
                        social_links[platform] = href
        
        return social_links

    def extract_address(self, soup: BeautifulSoup) -> Optional[str]:
        """Extract physical address from the page."""
        address_patterns = [
            r'\d+[a-zA-Z]?[\s,]+(?:[a-zA-Z]+[\s,]*)+(?:street|st|avenue|ave|road|rd|boulevard|blvd|lane|ln|drive|dr|way|court|ct|place|pl)[\s,]+(?:[a-zA-Z]+[\s,]*)+(?:AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY)[\s,]+\d{5}(?:-\d{4})?',  # US format
            r'\d+[a-zA-Z]?[\s,]+(?:[a-zA-Z]+[\s,]*)+(?:street|st|avenue|ave|road|rd|boulevard|blvd|lane|ln|drive|dr|way|court|ct|place|pl)[\s,]+(?:[a-zA-Z]+[\s,]*)+(?:[A-Z]{1,2}\d{1,2}\s\d[A-Z]{2})',  # UK format
        ]
        
        # Try schema.org data first
        schema = soup.find('script', type='application/ld+json')
        if schema:
            try:
                data = json.loads(schema.string)
                if isinstance(data, dict):
                    address = data.get('address')
                    if address:
                        if isinstance(address, str):
                            return address
                        elif isinstance(address, dict):
                            parts = []
                            for key in ['streetAddress', 'addressLocality', 'addressRegion', 'postalCode']:
                                if address.get(key):
                                    parts.append(address[key])
                            if parts:
                                return ', '.join(parts)
            except:
                pass

        # Look for address in text content
        text = soup.get_text(' ', strip=True)
        for pattern in address_patterns:
            match = re.search(pattern, text, re.I)
            if match:
                return match.group(0)

        # Look for address in specific elements
        address_containers = soup.find_all(['div', 'p', 'address'], 
            class_=re.compile(r'address|location|contact', re.I))
        for container in address_containers:
            text = container.get_text(strip=True)
            for pattern in address_patterns:
                match = re.search(pattern, text, re.I)
                if match:
                    return match.group(0)

        return None

    def extract_page_content(self, soup: BeautifulSoup) -> str:
        """Extract relevant text content from the page."""
        # Remove script and style elements
        for script in soup(["script", "style"]):
            script.decompose()

        # Get text content
        text = soup.get_text(separator=' ', strip=True)
        
        # Clean up whitespace
        text = ' '.join(text.split())
        return text[:5000]  # Limit to first 5000 characters

    def generate_outreach_email(self, website_data: Dict) -> str:
        """Generate a personalized outreach email using GPT-4."""
        prompt = f"""
        Generate a friendly and professional outreach email for link building. Use this information:
        
        Business Name: {website_data.get('business_name', 'their company')}
        Website: {website_data.get('website')}
        
        Key points to include:
        1. Introduce yourself and mention you found their website
        2. Compliment something specific about the article content that we believe is a shared interest
        3. We would like a link on the article as our page as we think their readers might find it useful
        4. Mention that we are Atomic Leap working with {self.company_name}
        5. Keep it concise, friendly, and professional and write in a human like manner
        6. put the link to the page we want the link from in the email {website_data.get('website')}
        7. put the link we think would provide a good backlink for them to look at - {self.backlink_url}
        8. Add a clear call to action
        
        Additional context from their website:
        {website_data.get('page_content', '')}
        """

        try:
            response = self.openai_client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "You are an experienced digital marketing professional writing outreach emails for link building."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=500
            )
            return response.choices[0].message.content
        except Exception as e:
            return f"Error generating email: {str(e)}"

    def extract_business_name(self, soup: BeautifulSoup) -> Optional[str]:
        """Extract business name from various sources."""
        # Try title tag first
        if soup.title:
            title = soup.title.string
            # Clean up common suffixes
            title = re.sub(r'\s*[|\-–—]\s*.*$', '', title)
            return title.strip()
            
        # Try meta tags
        meta_title = soup.find('meta', property='og:site_name')
        if meta_title and meta_title.get('content'):
            return meta_title['content'].strip()
            
        # Try schema.org data
        schema = soup.find('script', type='application/ld+json')
        if schema:
            try:
                data = json.loads(schema.string)
                if isinstance(data, dict):
                    return data.get('name')
            except:
                pass
                
        return None

    def find_contact_page(self, soup: BeautifulSoup, base_url: str) -> Optional[str]:
        """Find the contact page URL if it exists."""
        contact_patterns = [
            r'contact',
            r'about\-us',
            r'get\-in\-touch',
            r'reach\-us'
        ]
        
        for link in soup.find_all('a', href=True):
            href = link['href']
            text = link.text.lower()
            
            for pattern in contact_patterns:
                if re.search(pattern, href, re.I) or re.search(pattern, text, re.I):
                    return urljoin(base_url, href)
        return None

    def scrape_url(self, url: str) -> Dict:
        """Main method to scrape a website for contact details."""
        if not validators.url(url):
            return {"error": f"Invalid URL: {url}"}

        result = {
            "website": url,
            "business_name": None,
            "email": [],
            "phone": [],
            "social_links": {},
            "address": None,
            "contact_page": None,
            "page_content": None,
            "outreach_email": None
        }

        try:
            # First try with requests/BeautifulSoup
            response = requests.get(url, headers=self.headers, timeout=30)
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Extract initial data
            result["business_name"] = self.extract_business_name(soup)
            result["email"] = self.extract_emails(response.text)
            result["phone"] = self.extract_phones(response.text)
            result["social_links"] = self.extract_social_links(soup, url)
            result["address"] = self.extract_address(soup)
            result["contact_page"] = self.find_contact_page(soup, url)
            result["page_content"] = self.extract_page_content(soup)

            # If contact page exists and we haven't found much information, scrape it
            if result["contact_page"] and (not result["email"] or not result["phone"]):
                time.sleep(self.delay)
                contact_response = requests.get(result["contact_page"], headers=self.headers, timeout=30)
                contact_soup = BeautifulSoup(contact_response.text, 'html.parser')
                
                result["email"].extend(self.extract_emails(contact_response.text))
                result["phone"].extend(self.extract_phones(contact_response.text))
                if not result["address"]:
                    result["address"] = self.extract_address(contact_soup)

            # If still missing crucial information, try with Playwright
            if not any([result["email"], result["phone"], result["address"]]):
                with sync_playwright() as p:
                    browser = p.chromium.launch()
                    page = browser.new_page()
                    page.goto(url)
                    time.sleep(3)  # Wait for dynamic content
                    content = page.content()
                    dynamic_soup = BeautifulSoup(content, 'html.parser')
                    
                    result["email"].extend(self.extract_emails(content))
                    result["phone"].extend(self.extract_phones(content))
                    if not result["address"]:
                        result["address"] = self.extract_address(dynamic_soup)
                    
                    browser.close()

            # Remove duplicates
            result["email"] = list(set(result["email"]))
            result["phone"] = list(set(result["phone"]))

            # Generate outreach email
            result["outreach_email"] = self.generate_outreach_email(result)

        except Exception as e:
            result["error"] = str(e)

        return result

def main():
    import argparse
    import sys
    import json

    parser = argparse.ArgumentParser(description='Web scraper for contact information')
    parser.add_argument('--urls', type=str, help='JSON string of URLs to scrape')
    parser.add_argument('--company', type=str, help='Company name we are working with')
    parser.add_argument('--backlink', type=str, help='URL we want to promote')
    args = parser.parse_args()

    if args.urls:
        try:
            urls = json.loads(args.urls)
        except json.JSONDecodeError:
            print(json.dumps({"error": "Invalid JSON format for URLs"}))
            sys.exit(1)
    else:
        urls = [
            "https://atomicleap.agency",
        ]
    
    scraper = WebScraper(delay=2.0)
    
    # Update company name and backlink URL if provided
    if args.company:
        scraper.company_name = args.company
    if args.backlink:
        scraper.backlink_url = args.backlink
    
    results = []
    
    for url in tqdm(urls, desc="Scraping websites"):
        result = scraper.scrape_url(url)
        results.append(result)
        time.sleep(scraper.delay)  # Be polite
    
    # Print results to stdout for the Node.js process to capture
    print(json.dumps(results))

if __name__ == "__main__":
    main()
