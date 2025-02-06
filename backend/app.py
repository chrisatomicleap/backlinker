from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import sys
import os

# Add the parent directory to Python path so we can import web_scraper
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from web_scraper import WebScraper

app = Flask(__name__)
CORS(app)

@app.route('/scrape', methods=['POST'])
def scrape():
    try:
        data = request.json
        urls = data.get('urls', [])
        company_name = data.get('companyName', '')
        backlink_url = data.get('backlinkUrl', '')

        if not isinstance(urls, list) or not urls:
            return jsonify({'error': 'Invalid input: urls must be a non-empty array'}), 400

        scraper = WebScraper()
        results = []
        
        for url in urls:
            try:
                result = scraper.scrape_url(url)
                if result:
                    result['website'] = url
                    result['outreach_email'] = scraper.generate_outreach_email(
                        business_name=result.get('business_name', ''),
                        company_name=company_name,
                        backlink_url=backlink_url
                    )
                    results.append(result)
            except Exception as e:
                print(f"Error scraping {url}: {str(e)}")
                continue

        return jsonify(results)

    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
