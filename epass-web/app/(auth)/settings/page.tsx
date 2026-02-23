'use client';

import { useEffect, useState } from 'react';
import { Link2, Unlink, User, Bell, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/ui/loading';
import { useAuthStore } from '@/lib/store';
import { Badge } from '@/components/ui/badge';

export default function SettingsPage() {
  const { user, token } = useAuthStore();
  const [telegramLinked, setTelegramLinked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLinking, setIsLinking] = useState(false);
  const [botInfo, setBotInfo] = useState<{ username: string } | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      if (!token) return;

      setIsLoading(true);

      try {
        const botResponse = await fetch('/api/telegram/bot-info', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (botResponse.ok) {
          const botData = await botResponse.json();
          setBotInfo(botData.data);
        }

        setTelegramLinked(!!user?.telegramChatId);
      } catch (err) {
        console.error('Failed to fetch settings:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, [token, user]);

  const handleLinkTelegram = async () => {
    if (!botInfo) return;

    setIsLinking(true);

    try {
      const telegramUrl = `https://t.me/${botInfo.username}`;
      window.open(telegramUrl, '_blank');

      const chatId = prompt(
        'Sau khi nhấn /start với bot, hãy nhập Chat ID được bot trả về:'
      );

      if (chatId) {
        const response = await fetch('/api/telegram/link', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ chatId }),
        });

        if (response.ok) {
          setTelegramLinked(true);
          alert('Đã liên kết Telegram thành công!');
        } else {
          throw new Error('Failed to link');
        }
      }
    } catch (err) {
      alert('Không thể liên kết Telegram. Vui lòng thử lại.');
    } finally {
      setIsLinking(false);
    }
  };

  const handleUnlinkTelegram = async () => {
    if (!confirm('Bạn có chắc muốn hủy liên kết Telegram?')) return;

    try {
      const response = await fetch('/api/telegram/unlink', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setTelegramLinked(false);
        if (user) {
          useAuthStore.getState().setAuth({ ...user, telegramChatId: undefined }, token!);
        }
      }
    } catch (err) {
      alert('Không thể hủy liên kết. Vui lòng thử lại.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Cài đặt</h1>
        <p className="text-muted-foreground">Quản lý tài khoản và thông báo</p>
      </div>

      {/* Account Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Thông tin tài khoản
          </CardTitle>
          <CardDescription>Thông tin đăng nhập của bạn</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Số điện thoại</p>
              <p className="text-lg font-medium">{user?.phoneNumber}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Trạng thái</p>
              <Badge variant="success">Hoạt động</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Telegram Integration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Thông báo Telegram
          </CardTitle>
          <CardDescription>
            Nhận thông báo khi có giao dịch trạm thu phí mới
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loading size="sm" />
              Đang kiểm tra...
            </div>
          ) : telegramLinked ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="success" className="gap-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  Đã liên kết
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Bạn sẽ nhận thông báo khi có giao dịch mới.
              </p>
              <Button
                variant="outline"
                onClick={handleUnlinkTelegram}
                className="gap-2"
              >
                <Unlink className="h-4 w-4" />
                Hủy liên kết
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Liên kết tài khoản Telegram để nhận thông báo giao dịch.
              </p>
              <div className="space-y-3">
                <Button
                  onClick={handleLinkTelegram}
                  disabled={isLinking || !botInfo}
                  className="gap-2"
                >
                  {isLinking ? (
                    <>
                      <Loading size="sm" />
                      Đang xử lý...
                    </>
                  ) : (
                    <>
                      <Link2 className="h-4 w-4" />
                      Liên kết Telegram
                    </>
                  )}
                </Button>
                {botInfo && (
                  <p className="text-xs text-muted-foreground">
                    Bot: @{botInfo.username}
                  </p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Bảo mật
          </CardTitle>
          <CardDescription>Thông tin về bảo mật tài khoản</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>• Mã OTP được gửi qua Telegram bot đã liên kết</p>
            <p>• Phiên đăng nhập được lưu trữ an toàn trên thiết bị</p>
            <p>• Tự động đăng xuất sau 1 năm không hoạt động</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
