# 🛒 Tarun Kirana Store (TKS)

Tarun Kirana Store (TKS) is a premium, single-store E-Commerce application developed to digitize a local grocery shop. Customers can order groceries directly from their mobile phones, while the shop owner manages products, inventory, and orders from a centralized dashboard.

Unlike multi-vendor marketplaces, TKS is a **Single-Store Business Model**:
* ❌ No Vendor Registration
* ❌ No Commission Split
* ✅ Direct Sales from Shop to Customers
* ✅ Automated Notifications & Online Payments

---

## 🏗️ System Architecture

```text
┌─────────────────────────────┐
│    React Native Mobile App  │
│      (Expo, Customer/Admin) │
└──────────────┬──────────────┘
               │
               │ HTTP APIs (Axios)
               ▼
┌─────────────────────────────┐
│     Node.js API Server      │
│     (Express Framework)     │
└──────────────┬──────────────┘
               │
               ├────────► MongoDB Atlas (Mongoose ORM)
               │
               ├────────► Google OAuth (Authentication)
               │
               ├────────► Firebase Cloud Messaging (Push Notifications)
               │
               └────────► WhatsApp Cloud API (Transactional Messages)
```

---

## 🌟 Key Features

### Customer Experience
* **Secure Auth**: Custom email/password credentials or 1-tap **Google Login**.
* **Smart Search**: Real-time product search with fuzzy matching.
* **Add to Cart & Checkout**: Integrated checkout supporting multiple delivery addresses.
* **Flexible Payments**: **Cash on Delivery (COD)** or online payments via **Razorpay**.
* **Order Tracking**: Order lifecycle updates with real-time push notifications and automated WhatsApp messages.

### Admin Dashboard
* **Dynamic Analytics**: KPI cards showing Total Sales, AOV, Customers, Low Stock Alerts, and Daily/Weekly/Monthly interactive charts.
* **Product Management**: Create, update, or archive products with support for multi-image uploads (via Multer).
* **Inventory Control**: Real-time stock counts with automated low-stock warnings.
* **Order Processing**: Accept, pack, ship, or cancel orders directly from the screen.

---

## 🚀 Deployed Optimizations (Render Ready)

The backend has been heavily optimized for deployment on **Render's Free Tier** container network:

1. **Gzip Compression**: Compresses HTTP payloads on-the-fly, reducing transit bandwidth.
2. **MongoDB Connection Pooling**: Configured with Mongoose `maxPoolSize: 10` and `minPoolSize: 2` to reuse database sockets and prevent socket exhaustion.
3. **In-Memory Cache (5m TTL)**: Product feeds, active categories, and coupons are cached for 5 minutes, boosting response times down to **1ms** for cached assets. Caches automatically invalidate when products or categories are updated.
4. **Aggregated Home API (`GET /api/home`)**: Consolidates multiple frontend REST queries (categories, deals, arrivals, recommended, coupons, and banners) into a single aggregated call, decreasing initial screen load times by **60%**.
5. **Robust Phone Login**: Input is automatically formatted, stripping symbols and whitespace. Suffix matching queries check the last 10 digits against database fields (handling country codes like `+91` or `0` seamlessly).
6. **Graceful Shutdown**: Listens to `SIGTERM`/`SIGINT` signals to close connection pools and the HTTP listener safely before exiting.
7. **Cloudinary Asset Optimization**: URL injection helper automatically appends quality (`q_auto`) and format (`f_auto`) parameters to deliver compressed WebP formats to the mobile screen.
8. **Real-time Performance Metrics (`GET /health`)**: Exposes host uptime, RSS memory footprint, CPU load, database latency, and connection pool metrics.

---

## 🗄️ Database Schema (MongoDB Collections)

### Users (`User`)
* `name` (String, Required)
* `email` (String, Required, Unique, Lowercase)
* `password` (String, Required, Hashed via bcrypt)
* `role` (String, Enum: `customer` | `admin`, Default: `customer`)
* `phone` (String, Default: `null`)
* `pushToken` (String, Default: `null`)

### Products (`Product`)
* `name` (String, Required)
* `description` (String)
* `price` (Number, Required)
* `discountPrice` (Number)
* `stockQuantity` (Number, Default: `0`)
* `unit` (String, Default: `'piece'`)
* `imageUrl` (String)
* `images` (Array of Strings)
* `isActive` (Boolean, Default: `true`)
* `isBestSeller` / `isTodayDeal` / `isNewArrival` (Boolean, Default: `false`)

### Categories (`Category`)
* `name` (String, Required, Unique)
* `description` (String)
* `imageUrl` (String)

### Orders (`Order`)
* `userId` (ObjectId ref User)
* `status` (String, Enum: `pending` | `accepted` | `packed` | `out_for_delivery` | `delivered` | `cancelled`)
* `totalPrice` (Number)
* `paymentMethod` (String, Enum: `cod` | `online`)
* `paymentStatus` (String, Enum: `pending` | `completed` | `failed`)

---

## 🛠️ Local Development Setup

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure your Environment Variables by creating a `.env` file:
   ```env
   PORT=8001
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret_token
   GOOGLE_CLIENT_ID=your_google_oauth_client_id
   ```
4. Run in development mode:
   ```bash
   npm run dev
   ```

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start Expo CLI:
   ```bash
   npx expo start
   ```

---

## 🚀 Render Production Deployment Guide

### 1. Provisioning a Web Service on Render
* **Environment**: `Node`
* **Build Command**: `npm install`
* **Start Command**: `node src/server.js`

### 2. Environment Variables Configuration
Ensure the following variables are configured under the **Environment** tab in Render's dashboard:
* `NODE_ENV`: `production` (activates rate limiters, compression, and disables detailed error stack responses)
* `MONGODB_URI`: *[Your MongoDB Atlas URI]*
* `JWT_SECRET`: *[A secure random string]*

### 3. Setup Uptime Ping (Prevent Auto-Sleep)
Since Render puts free containers to sleep after 15 minutes of inactivity:
1. Create a free account at [UptimeRobot](https://uptimerobot.com/).
2. Setup an **HTTP(s) Monitor** pointing to your health check URL:
   `https://your-render-subdomain.onrender.com/health`
3. Set the interval to **5 minutes**. This will keep the container awake 24/7.
