import { NextRequest, NextResponse } from 'next/server';

// Use localhost for development, environment variable for production
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export async function POST(req: NextRequest): Promise<Response> {
  try {
    if (!API_URL) {
      throw new Error('Backend API URL not configured. Please set NEXT_PUBLIC_API_URL environment variable.');
    }

    const data = await req.json();
    console.log('Sending request to backend with data:', data);
    
    // Add timeout to the fetch request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    try {
      const response = await fetch(`${API_URL}/scrape`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Log the response status and headers
      console.log('Backend response status:', response.status);
      console.log('Backend response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        if (response.status === 504) {
          return NextResponse.json(
            { error: 'The request took too long to complete. Please try again with fewer URLs.' },
            { status: 504 }
          );
        }
        
        // Try to get error details from response
        const errorText = await response.text();
        console.log('Error response from backend:', errorText);
        
        try {
          const errorJson = JSON.parse(errorText);
          throw new Error(errorJson.error || `HTTP error! status: ${response.status}`);
        } catch (e) {
          throw new Error(`HTTP error! status: ${response.status}. Response: ${errorText}`);
        }
      }

      const result = await response.json();
      console.log('Received result from backend:', result);
      
      // Check if we got an array of results
      if (!Array.isArray(result)) {
        throw new Error('Expected array of results from backend');
      }

      // Check if any results were successful
      const hasSuccessfulResults = result.some(item => !item.error);
      if (!hasSuccessfulResults) {
        const errors = result.map(item => item.error).filter(Boolean);
        throw new Error(`Failed to process URLs. Errors: ${errors.join(', ')}`);
      }

      return NextResponse.json(result);
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return NextResponse.json(
          { error: 'Request timed out. Please try again with fewer URLs or check your internet connection.' },
          { status: 504 }
        );
      }
      throw error;
    }
  } catch (error: any) {
    console.error('Error in scrape API route:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Failed to process scraping request';
    let statusCode = 500;

    if (error.message.includes('Backend API URL not configured')) {
      errorMessage = error.message;
      statusCode = 500;
    } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      errorMessage = 'Could not connect to the backend server. Please make sure it is running.';
      statusCode = 503;
    } else {
      errorMessage = error.message;
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
}
