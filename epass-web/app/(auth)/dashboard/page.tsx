'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { format, subDays } from 'date-fns';
import { vi } from 'date-fns/locale';
import { ArrowUpDown, FileSpreadsheet, Loader2, Wallet, Search, Calendar, Filter, X, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/ui/loading';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/lib/store';

interface Transaction {
  id: string;
  timestampIn: string;
  stationInName: string;
  ticketTypeName: string;
  price: number;
  plateNumber?: string;
}

interface TransactionsResponse {
  success: boolean;
  data: Transaction[];
  count: number;
  error?: string;
  isAuthError?: boolean;
}

interface BalanceInfo {
  balance: number;
  accountNumber: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [balance, setBalance] = useState<BalanceInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAuthError, setIsAuthError] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter states
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: subDays(new Date(), 60),
    to: new Date(),
  });
  const [selectedStation, setSelectedStation] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  // Get auth token from Zustand store
  const authToken = useAuthStore((state) => state.token);

  // Fetch transactions for given date range
  const fetchTransactionsData = useCallback(async (start: Date, end: Date) => {
    if (!authToken) return;

    try {
      const startDate = format(start, 'yyyy-MM-dd');
      const endDate = format(end, 'yyyy-MM-dd');

      const response = await fetch(
        `/api/transactions?startDate=${startDate}&endDate=${endDate}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      const data: TransactionsResponse = await response.json();

      if (!response.ok) {
        // Check if it's an auth error (ePass token expired)
        if (data.isAuthError || response.status === 401) {
          setIsAuthError(true);
          setError(data.error || 'Phiên ePass đã hết hạn. Vui lòng đăng nhập lại.');
          // Clear transactions to show empty state
          setAllTransactions([]);
          return;
        }
        throw new Error(data.error || 'Failed to fetch transactions');
      }

      if (data.success) {
        setAllTransactions(data.data || []);
        setIsAuthError(false);
        setError('');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch transactions');
    }
  }, [authToken]);

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError('');
      setIsAuthError(false);

      try {
        // Fetch balance
        if (authToken) {
          const balanceResponse = await fetch('/api/balance', {
            headers: {
              Authorization: `Bearer ${authToken}`,
            },
          });

          if (balanceResponse.ok) {
            const balanceData = await balanceResponse.json();
            if (balanceData.success) {
              setBalance(balanceData.data);
            }
          } else {
            const balanceData = await balanceResponse.json();
            if (balanceData.isAuthError || balanceResponse.status === 401) {
              setIsAuthError(true);
              setError(balanceData.error || 'Phiên ePass đã hết hạn. Vui lòng đăng nhập lại.');
            }
          }
        }

        // Fetch transactions for the initial date range
        await fetchTransactionsData(dateRange.from, dateRange.to);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch transactions');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [authToken]); // Only run on auth change, not dateRange change

  // Fetch new data when date range changes
  useEffect(() => {
    if (!isLoading) {
      fetchTransactionsData(dateRange.from, dateRange.to);
    }
  }, [dateRange.from, dateRange.to, fetchTransactionsData, isLoading]);

  const handleExport = async () => {
    try {
      // Export filtered transactions using ExcelJS
      const ExcelJS = require('exceljs');
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Giao dịch');

      // Add columns
      worksheet.columns = [
        { header: 'Thời gian', key: 'timestamp', width: 20 },
        { header: 'Trạm', key: 'station', width: 30 },
        { header: 'Loại vé', key: 'type', width: 20 },
        { header: 'Biển số', key: 'plate', width: 15 },
        { header: 'Số tiền', key: 'price', width: 15 },
      ];

      // Style the header row
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE6F2FF' },
      };

      // Add data
      filteredTransactions.forEach(t => {
        worksheet.addRow({
          timestamp: formatDateTime(t.timestampIn),
          station: t.stationInName,
          type: t.ticketTypeName,
          plate: t.plateNumber || '',
          price: formatCurrency(t.price),
        });
      });

      // Add total row
      const totalRow = worksheet.addRow({
        timestamp: 'TỔNG CỘNG',
        station: '',
        type: '',
        plate: '',
        price: formatCurrency(stats.sum),
      });
      totalRow.font = { bold: true };
      totalRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE6F2FF' },
      };

      // Generate buffer
      const buffer = await workbook.xlsx.writeBuffer();

      // Download
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `epass-transactions-${format(dateRange.from, 'yyyy-MM-dd')}-to-${format(dateRange.to, 'yyyy-MM-dd')}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Export error:', err);
      alert('Không thể xuất file. Vui lòng thử lại.');
    }
  };

  const clearFilters = () => {
    setDateRange({ from: subDays(new Date(), 60), to: new Date() });
    setSelectedStation('');
    setSelectedType('');
    setSearchQuery('');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const formatDateTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, 'dd/MM/yyyy HH:mm', { locale: vi });
    } catch {
      return dateString;
    }
  };

  // Parse Vietnamese date format (DD/MM/YYYY HH:mm:ss) to Date object
  function parseVietnameseDate(dateString: string): Date {
    // Format: "12/02/2026 12:13:30"
    const parts = dateString.split(' ');
    const dateParts = parts[0].split('/');
    const timeParts = parts[1] ? parts[1].split(':') : ['0', '0', '0'];

    // dateParts: [day, month, year]
    // timeParts: [hour, minute, second]
    return new Date(
      parseInt(dateParts[2]), // year
      parseInt(dateParts[1]) - 1, // month (0-indexed)
      parseInt(dateParts[0]), // day
      parseInt(timeParts[0]), // hour
      parseInt(timeParts[1]), // minute
      parseInt(timeParts[2]) || 0 // second
    );
  }

  // Get unique stations and types for filters
  const uniqueStations = useMemo(() => {
    const stations = new Set(allTransactions.map(t => t.stationInName).filter(Boolean));
    return Array.from(stations).sort();
  }, [allTransactions]);

  const uniqueTypes = useMemo(() => {
    const types = new Set(allTransactions.map(t => t.ticketTypeName).filter(Boolean));
    return Array.from(types).sort();
  }, [allTransactions]);

  // Filter transactions based on all filters
  const filteredTransactions = useMemo(() => {
    let result = [...allTransactions];

    // Date range filter - use custom parser for Vietnamese date format
    result = result.filter(t => {
      const transactionDate = parseVietnameseDate(t.timestampIn);
      // Normalize dates to midnight for comparison
      const fromDate = new Date(dateRange.from);
      fromDate.setHours(0, 0, 0, 0);
      const toDate = new Date(dateRange.to);
      toDate.setHours(23, 59, 59, 999);
      return transactionDate >= fromDate && transactionDate <= toDate;
    });

    // Station filter
    if (selectedStation) {
      result = result.filter(t => t.stationInName === selectedStation);
    }

    // Type filter
    if (selectedType) {
      result = result.filter(t => t.ticketTypeName === selectedType);
    }

    // Search query filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(t =>
        t.stationInName?.toLowerCase().includes(query) ||
        t.ticketTypeName?.toLowerCase().includes(query) ||
        formatDateTime(t.timestampIn).includes(query) ||
        formatCurrency(t.price).includes(query)
      );
    }

    // Sort by date descending (newest first)
    result.sort((a, b) => {
      const dateA = parseVietnameseDate(a.timestampIn);
      const dateB = parseVietnameseDate(b.timestampIn);
      return dateB.getTime() - dateA.getTime();
    });

    return result;
  }, [allTransactions, dateRange, selectedStation, selectedType, searchQuery]);

  // Calculate stats from filtered transactions
  const stats = useMemo(() => {
    return {
      total: filteredTransactions.length,
      sum: filteredTransactions.reduce((sum, t) => sum + t.price, 0),
    };
  }, [filteredTransactions]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tổng quan</h1>
          <p className="text-gray-500">
            Lịch sử giao dịch [{format(dateRange.from, 'dd/MM/yyyy')} - {format(dateRange.to, 'dd/MM/yyyy')}]
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowFilters(!showFilters)}
            variant="outline"
            className="gap-2"
          >
            <Filter className="h-4 w-4" />
            Bộ lọc
            {(selectedStation || selectedType || searchQuery) && (
              <Badge variant="secondary" className="ml-1">
                {[selectedStation, selectedType, searchQuery].filter(Boolean).length}
              </Badge>
            )}
          </Button>
          <Button onClick={handleExport} className="gap-2 bg-blue-600 hover:bg-blue-700">
            <FileSpreadsheet className="h-4 w-4" />
            Xuất Excel
          </Button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card className="border-blue-200 bg-blue-50/30">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Date Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Từ ngày
                </label>
                <input
                  type="date"
                  value={format(dateRange.from, 'yyyy-MM-dd')}
                  onChange={(e) => setDateRange({ ...dateRange, from: new Date(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Đến ngày
                </label>
                <input
                  type="date"
                  value={format(dateRange.to, 'yyyy-MM-dd')}
                  onChange={(e) => setDateRange({ ...dateRange, to: new Date(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Station Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Trạm
                </label>
                <select
                  value={selectedStation}
                  onChange={(e) => setSelectedStation(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Tất cả trạm</option>
                  {uniqueStations.map(station => (
                    <option key={station} value={station}>{station}</option>
                  ))}
                </select>
              </div>

              {/* Type Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Loại vé
                </label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Tất cả loại vé</option>
                  {uniqueTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Clear Filters Button */}
            <div className="mt-4 flex justify-end">
              <Button
                onClick={clearFilters}
                variant="ghost"
                size="sm"
                className="gap-2 text-gray-600 hover:text-gray-800"
              >
                <X className="h-4 w-4" />
                Xóa bộ lọc
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Số dư tài khoản
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {balance !== null ? formatCurrency(balance.balance) : '---'}
            </div>
            {balance && (
              <p className="text-xs text-gray-500 mt-1">{balance.accountNumber}</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Tổng giao dịch
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-gray-500 mt-1">
              {allTransactions.length !== stats.total
                ? `Hiển thị ${stats.total} / ${allTransactions.length} giao dịch`
                : `${allTransactions.length} giao dịch`}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Tổng số tiền
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {formatCurrency(stats.sum)}
            </div>
            <p className="text-xs text-gray-500 mt-1">Tổng giao dịch đã lọc</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Trạng thái
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="success" className="text-sm">
              Hoạt động
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ArrowUpDown className="h-5 w-5 text-blue-600" />
            Lịch sử giao dịch
            <Badge variant="secondary" className="text-xs">
              {stats.total} giao dịch
            </Badge>
          </CardTitle>
          <div className="mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm kiếm theo trạm, loại vé, thời gian, số tiền..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loading size="lg" />
            </div>
          ) : isAuthError ? (
            <div className="text-center py-12 px-4">
              <AlertCircle className="mx-auto h-12 w-12 text-amber-500 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Phiên làm việc đã hết hạn</h3>
              <p className="text-gray-500 mb-6 max-w-md mx-auto">{error}</p>
              <div className="flex justify-center gap-3">
                <Button onClick={() => router.push('/login')} className="bg-blue-600 hover:bg-blue-700">
                  Đăng nhập lại
                </Button>
                <Button onClick={() => window.location.reload()} variant="outline">
                  Thử lại
                </Button>
              </div>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-500">{error}</p>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">
                {searchQuery || selectedStation || selectedType
                  ? 'Không tìm thấy giao dịch nào phù hợp với bộ lọc'
                  : 'Không có giao dịch nào trong khoảng thời gian này'}
              </p>
              {(searchQuery || selectedStation || selectedType) && (
                <Button onClick={clearFilters} variant="outline" size="sm">
                  Xóa bộ lọc
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Thời gian</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Trạm</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Loại vé</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Phí</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((transaction, index) => (
                    <tr
                      key={transaction.id}
                      className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${index === filteredTransactions.length - 1 ? 'last:border-0' : ''}`}
                    >
                      <td className="py-4 px-4 text-sm text-gray-900">{formatDateTime(transaction.timestampIn)}</td>
                      <td className="py-4 px-4 text-sm text-gray-700">{transaction.stationInName}</td>
                      <td className="py-4 px-4 text-sm">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {transaction.ticketTypeName}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-sm text-right font-semibold text-gray-900">
                        {formatCurrency(transaction.price)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
