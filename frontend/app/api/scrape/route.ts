import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function POST(req: NextRequest): Promise<Response> {
  try {
    if (!API_URL) {
      throw new Error('Backend API URL not configured. Please set NEXT_PUBLIC_API_URL environment variable.');
    }

    const data = await req.json();
    
    // Add timeout to the fetch request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

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

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return NextResponse.json(result);
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return NextResponse.json(
          { error: 'Request timed out while trying to reach the backend server' },
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

    if (error.cause?.code === 'ECONNREFUSED') {
      errorMessage = 'Could not connect to backend server. Please ensure the backend is running and accessible.';
      statusCode = 503;
    } else if (error.message.includes('NEXT_PUBLIC_API_URL')) {
      errorMessage = error.message;
      statusCode = 500;
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
}
