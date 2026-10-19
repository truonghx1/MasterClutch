# CLUTCH — Tập lái số sàn

## Khoang lái và điện thoại

Mặc định là góc nhìn người ngồi trong khoang xe, có hai tay trên vô-lăng, gương, cần số và đồng hồ chạy theo trạng thái xe. Nút **Góc nhìn** chuyển về hình xe nhìn từ bên ngoài. Không cần đánh lái.

Điện thoại hỗ trợ màn hình dọc và ngang. Giữ bàn đạp bằng nhiều ngón đồng thời; giữ Côn đến 100% rồi dùng ngón khác chọn số. Khi thả côn, mô phỏng tự nhả dần. Xoay ngang để bố trí khoang lái bên trái và bàn đạp bên phải. Không yêu cầu cài ứng dụng.

## Deploy lên Vercel từ GitHub

1. Push thư mục dự án này lên repository GitHub của bạn, bao gồm `dist/` và `vercel.json`.
2. Trong Vercel chọn **Add New → Project**, import repository đó vào tài khoản Hobby.
3. Giữ **Root Directory** ở thư mục gốc. **Framework Preset: Other**.
4. Cấu hình trong `vercel.json` đặt **Output Directory: dist**, bỏ qua install và build vì đây là website tĩnh. Không cần chạy `npm start` trên Vercel, không cần biến môi trường.
5. Chọn **Deploy**. Các lần push sau vào nhánh production sẽ cập nhật website nếu bật tích hợp Git tự động.

Vercel Hobby dành cho sử dụng cá nhân, phi thương mại: https://vercel.com/docs/limits/fair-use-guidelines . Hướng dẫn build tĩnh: https://vercel.com/docs/builds/configure-a-build . Dự án không cần backend hoặc cơ sở dữ liệu.

Ứng dụng HTML/CSS/JavaScript, không cần cài thư viện.

## Chạy

Yêu cầu Node.js 20 trở lên. Trong thư mục dự án:

```sh
npm start
```

Mở http://127.0.0.1:5173. Kiểm thử mô hình xe: `npm test`.

## Điều khiển

- Giữ A: đạp côn; thả A: côn tự nhả dần trong khoảng 1,5 giây.
- Giữ J: phanh; giữ L: ga.
- 1–5: số tiến; 6: số lùi; N: số mo.
- Enter: khởi động lại; Space: tạm dừng.
- Các bàn đạp hỗ trợ chạm giữ đồng thời trên màn hình cảm ứng.

Ba bài tập có các đoạn đường bằng, lên và xuống dốc dài khác nhau. Nhật ký giải thích lỗi gài số, vượt vòng tua, tắt máy, trôi lùi, động cơ ì và thả trôi xuống dốc. Dừng mô phỏng khi mất tiêu điểm để tránh kẹt phím.

Mô hình vật lý được đơn giản hóa để luyện phối hợp bàn phím; không mô phỏng đầy đủ cảm giác bàn đạp hoặc thay thế thực hành trên xe. Phông Google Fonts có phông hệ thống dự phòng. Không lưu dữ liệu người dùng.
