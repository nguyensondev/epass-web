import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/jwt';
import { fetchTransactions } from '@/lib/epass-api';
import ExcelJS from 'exceljs';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const payload = await verifyToken(token);

    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'Start date and end date are required' }, { status: 400 });
    }

    // Fetch transactions
    const transactions = await fetchTransactions(
      new Date(startDate),
      new Date(endDate)
    );

    // Create Excel file
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Transactions');

    sheet.columns = [
      { header: 'Ngày giờ qua Trạm', key: 'timestampIn', width: 25 },
      { header: 'Tên Trạm', key: 'stationInName', width: 25 },
      { header: 'Loại vé', key: 'ticketTypeName', width: 20 },
      { header: 'Phí', key: 'price', width: 20 },
    ];

    // Sort newest → oldest
    transactions.sort(
      (a, b) => new Date(b.timestampIn).getTime() - new Date(a.timestampIn).getTime()
    );

    let totalAmount = 0;

    transactions.forEach((item) => {
      totalAmount += item.price || 0;

      sheet.addRow({
        timestampIn: item.timestampIn,
        stationInName: item.stationInName,
        ticketTypeName: item.ticketTypeName,
        price: new Intl.NumberFormat('vi-VN', {
          style: 'currency',
          currency: 'VND',
        }).format(item.price),
      });
    });

    // Add empty row
    sheet.addRow({});

    // Add total row
    const totalRow = sheet.addRow({
      ticketTypeName: 'TỔNG TIỀN',
      price: new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
      }).format(totalAmount),
    });
    totalRow.font = { bold: true };

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Return file
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="epass-transactions-${new Date().toISOString().split('T')[0]}.xlsx"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to export' },
      { status: 500 }
    );
  }
}
