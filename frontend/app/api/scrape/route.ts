import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { join } from 'path';

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const { urls, companyName, backlinkUrl } = await req.json();

    if (!Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json(
        { error: 'Invalid input: urls must be a non-empty array' },
        { status: 400 }
      );
    }

    // Create a temporary file to store URLs
    const tempUrls = JSON.stringify(urls);
    
    // Spawn Python process with company name and backlink URL
    const pythonProcess = spawn('python', [
      join(process.cwd(), '..', 'web_scraper.py'),
      '--urls', tempUrls,
      '--company', companyName,
      '--backlink', backlinkUrl
    ]);

    const response: Promise<Response> = new Promise((resolve) => {
      let dataString = '';
      let errorString = '';

      pythonProcess.stdout.on('data', (data) => {
        dataString += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        errorString += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          resolve(
            NextResponse.json(
              { error: `Process exited with code ${code}: ${errorString}` },
              { status: 500 }
            )
          );
          return;
        }

        try {
          const results = JSON.parse(dataString);
          resolve(NextResponse.json(results));
        } catch (error) {
          resolve(
            NextResponse.json(
              { error: 'Failed to parse Python script output' },
              { status: 500 }
            )
          );
        }
      });
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
