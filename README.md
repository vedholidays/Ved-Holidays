# Ved Holidays — Premium Travel Website

## Latest release
This version includes:
- Premium navy + gold responsive design
- Interactive world map with country hover/click
- Thailand destination and package catalogue
- Package modal with day-wise itinerary + accommodation details
- Online booking request with unique Booking ID (VH00001 style)
- Booking tracking by Booking ID + mobile number
- Custom trip enquiry form
- Payment section with bank transfer + PhonePe UPI QR/UPI ID
- Verified customer review system (admin-managed; no fake reviews shown by default)
- Admin panel for packages, prices, countries, bookings, enquiries and reviews
- PostgreSQL support through DATABASE_URL, with JSON fallback for local testing

## Local run
1. `npm install`
2. Copy `.env.example` to `.env` and set admin credentials/secret as needed.
3. `npm start`
4. Open `http://localhost:3000`

## Important
- Do not make payment until a booking is confirmed by Ved Holidays.
- Production PostgreSQL data is not overwritten by the local `data/db.json` after the database has been initialized.
- Add production secrets only in the hosting provider's environment variables.


## Customer reviews
Customers can submit a review with an optional trip photo. Reviews are pending until approved in Admin. Trip photos are stored with the review as image data and displayed only for approved/published reviews.
