import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Thử truy vấn cơ bản kiểm tra kết nối với PostgreSQL
    await prisma.$queryRaw`SELECT 1`;
    
    // Đếm số user trong bảng mẫu
    const userCount = await prisma.user.count();

    return NextResponse.json({
      success: true,
      message: 'Kết nối cơ sở dữ liệu PostgreSQL thành công!',
      data: {
        userCount,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        success: false,
        message: 'Chưa thể kết nối tới cơ sở dữ liệu PostgreSQL.',
        error: errMessage,
        hint: 'Nếu dùng Docker ở máy local, hãy đảm bảo Docker Desktop đã mở và bạn đã chạy: docker compose up -d',
      },
      { status: 503 }
    );
  }
}
