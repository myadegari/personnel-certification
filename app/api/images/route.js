import { NextResponse } from 'next/server';
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
        const { searchParams } = new URL(request.url);
        const rawPath = searchParams.get('path');

        if (!rawPath) {
            return NextResponse.json({ error: 'Image path is required' }, { status: 400 });
        }

        const uploadsDir = path.resolve(process.cwd(), 'public', 'uploads');
        const fullPath = path.resolve(uploadsDir, rawPath);

        // Ensure the resolved path stays within uploads
        if (!fullPath.startsWith(uploadsDir + path.sep)) {
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