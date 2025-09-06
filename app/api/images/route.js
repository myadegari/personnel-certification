import { NextResponse } from 'next/server';
import { join } from 'path';
import { createReadStream } from 'fs';
import { stat } from 'fs/promises';
import path from 'path';

const API_KEY = process.env.IMAGE_ACCESS_KEY;

export async function GET(request) {
    const authHeader = request.headers.get('authorization');
    const apiKey = authHeader?.split(' ')[1];

    if (apiKey !== API_KEY) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // Get path from query parameter
        const { searchParams } = new URL(request.url);
        const imagePath = searchParams.get('path');

        if (!imagePath) {
            return NextResponse.json({ error: 'Image path is required' }, { status: 400 });
        }

        // Sanitize the path to prevent directory traversal attacks
        const normalizedPath = path.normalize(imagePath).replace(/^(\.\.(\/|\\|$))+/, '');
        const fullPath = join(process.cwd(), 'public', normalizedPath);

        // Verify the path is within the uploads directory
        const uploadsDir = join(process.cwd(), 'public', 'uploads');
        if (!fullPath.startsWith(uploadsDir)) {
            return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
        }

        await stat(fullPath);
        const imageStream = createReadStream(fullPath);

        // Set content type based on file extension
        const contentType = path.extname(fullPath).toLowerCase() === '.png' 
            ? 'image/png' 
            : path.extname(fullPath).toLowerCase() === '.jpg' || path.extname(fullPath).toLowerCase() === '.jpeg'
            ? 'image/jpeg'
            : 'application/octet-stream';

        return new NextResponse(imageStream, {
            headers: {
                'Content-Type': contentType
            }
        });
    } catch (error) {
        console.error('Image access error:', error);
        return NextResponse.json({ error: 'Image not found or invalid request' }, { status: 404 });
    }
}