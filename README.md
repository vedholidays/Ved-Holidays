# Ved Holidays

Full-stack Node/Express website for Ved Holidays.

## Local
Node 20+: `npm install` then `npm start`
Open `http://localhost:3000`
Admin: `http://localhost:3000/admin`

Default demo admin:
- username: `admin`
- password: `ChangeMe123!`

Before production set:
- `ADMIN_USER`
- `ADMIN_PASSWORD`
- `JWT_SECRET`

## Included
- Animated destination globe
- Thailand destination page
- Package listing
- Custom package enquiry
- Booking/enquiry APIs
- Admin package/price management
- Country management API
- Booking/enquiry dashboard
- Ved Holidays logo and contact details

## Production
Point your domain to a Node.js host (Railway, Render, VPS, etc.). This version stores data in `data/db.json`; use persistent storage. Add Razorpay credentials before accepting real online payments.
