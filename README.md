# ePass Toll Manager

Ứng dụng web quản lý trạm thu phí ePass - Xem lịch sử giao dịch, số dư tài khoản và nhận thông báo qua Telegram.

## Tính năng

- 🔐 Đăng nhập bằng số điện thoại + OTP
- 📊 Xem lịch sử giao dịch trạm thu phí
- 💰 Xem số dư tài khoản ePass
- 📥 Xuất dữ liệu ra file Excel
- 🔔 Nhận thông báo qua Telegram khi có giao dịch mới
- 📱 Giao diện responsive, hoạt động tốt trên PC và mobile

## Cài đặt

### 1. Cài đặt dependencies

```bash
npm install
```

### 2. Cấu hình biến môi trường

Sao chép `.env.example` thành `.env.local` và cập nhật các giá trị:

```bash
cp .env.example .env.local
```

Các biến cần cấu hình:
- `EPASS_TOKEN`: Token API ePass của bạn
- `JWT_SECRET`: Khóa bí mật cho JWT (tự tạo một chuỗi ngẫu nhiên)
- `TELEGRAM_BOT_TOKEN`: Token bot Telegram (tạo qua @BotFather)

### 3. Thêm số điện thoại được phép đăng nhập

Mở file `data/settings.json` và thêm số điện thoại vào mảng `whitelistedPhones`:

```json
{
  "whitelistedPhones": [
    "+84912345678",
    "+84987654321"
  ],
  "lastCheckedTimestamp": null
}
```

## Chạy ứng dụng

### Chạy local

```bash
npm run dev
```

Mở trình duyệt truy cập `http://localhost:3000`

### Build cho production

```bash
npm run build
npm start
```

## Triển khai

### Vercel (Được khuyến nghị)

1. Fork hoặc push code lên GitHub
2. Import project vào [Vercel](https://vercel.com)
3. Cấu hình Environment Variables trong Vercel dashboard
4. Deploy

### Tích hợp Cron Jobs cho Telegram notification

Sử dụng Vercel Cron Jobs để tự động kiểm tra giao dịch mới:

Tạo file `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/check-transactions",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

Hoặc sử dụng GitHub Actions với workflow schedule.

## Cấu trúc project

```
epass-web/
├── app/                    # Next.js app directory
│   ├── (auth)/            # Auth routes group
│   │   └── login/         # Login page
│   ├── dashboard/         # Dashboard pages
│   │   ├── page.tsx       # Main dashboard
│   │   ├── history/       # Transaction history
│   │   └── balance/       # Balance view
│   ├── api/               # API routes
│   │   ├── auth/          # Authentication endpoints
│   │   ├── transactions/  # Transactions API
│   │   ├── balance/       # Balance API
│   │   ├── export/        # Excel export
│   │   └── telegram/      # Telegram integration
│   └── settings/          # Settings page
├── components/            # React components
│   └── ui/               # UI components
├── lib/                  # Utilities
│   ├── epass-api.ts      # ePass API wrapper
│   ├── jwt.ts            # JWT utilities
│   ├── telegram.ts       # Telegram bot API
│   ├── db.ts             # Database (file-based)
│   └── store.ts          # Zustand store
└── jobs/                 # Background jobs
    └── check-transactions.ts
```

## Lưu ý bảo mật

- Không bao giờ commit file `.env.local` vào git
- JWT_SECRET nên là một chuỗi ngẫu nhiên dài và phức tạp
- EPASS_TOKEN là thông tin nhạy cảm, cần bảo mật
- Telegram bot token cần được bảo mật

## Hỗ trợ

Nếu gặp vấn đề hoặc có câu hỏi, vui lòng tạo issue trên GitHub.
