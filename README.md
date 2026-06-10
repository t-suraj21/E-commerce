# 🛒 Tarun Kirana Store (TKS)

## Overview

Tarun Kirana Store (TKS) is a modern grocery shopping application developed for a single local grocery shop.

The purpose of this application is to help customers order groceries directly from Tarun Kirana Store using their mobile phones while allowing the shop owner to manage products, inventory, and customer orders efficiently.

This is a **Single Store E-Commerce Application**, meaning there is only one shop in the entire system and all orders are fulfilled by Tarun Kirana Store.

---

# 🎯 Business Model

```text
Customer
    │
    ▼
Tarun Kirana Store App
    │
    ▼
Shop Owner (Admin)
    │
    ▼
Order Processing
    │
    ▼
Delivery to Customer
```

Unlike Amazon or Flipkart:

❌ No Multiple Sellers

❌ No Vendor Registration

❌ No Marketplace System

❌ No Commission Management

Only:

✅ Customers

✅ Shop Owner

✅ Grocery Products

---

# 🌟 Main Features

## Customer Features

* User Registration
* Secure Login
* Google Login
* Browse Products
* Search Products
* Add to Cart
* Manage Addresses
* Online Payments
* Cash On Delivery
* Order Tracking
* Order History
* WhatsApp Notifications
* Push Notifications

---

## Admin Features

* Product Management
* Inventory Management
* Order Management
* Customer Management
* Sales Reports
* Stock Monitoring
* Offer Management
* Delivery Status Updates

---

# 🏗 System Architecture

```text
┌─────────────────────────────┐
│      React Native App       │
│         (Customer)          │
└──────────────┬──────────────┘
               │
               │ API Requests
               ▼
┌─────────────────────────────┐
│       Node.js Backend       │
│         REST APIs           │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│         MySQL DB            │
│ Users, Products, Orders     │
└──────────────┬──────────────┘
               │
               ├────────► Google OAuth
               │
               ├────────► Firebase
               │
               └────────► WhatsApp API
```

---

# 📱 Customer Journey

```text
Open App
    │
    ▼
Register / Login
    │
    ▼
Browse Products
    │
    ▼
Add Items To Cart
    │
    ▼
Checkout
    │
    ▼
Select Address
    │
    ▼
Payment
    │
    ▼
Order Placed
    │
    ▼
Order Tracking
    │
    ▼
Delivered
```

---

# 🔐 Authentication Flow

```text
Customer
    │
    ▼
Google Login Button
    │
    ▼
Google Authentication
    │
    ▼
Returns ID Token
    │
    ▼
Backend Verifies Token
    │
    ▼
Create/Login User
    │
    ▼
Generate JWT Token
    │
    ▼
Access Application
```

---

# 📦 Order Workflow

```text
Customer Places Order
          │
          ▼
Order Stored In Database
          │
          ▼
Admin Receives Order
          │
          ▼
Admin Accepts Order
          │
          ▼
Order Packed
          │
          ▼
Out For Delivery
          │
          ▼
Delivered
```

---

# 🔔 Notification System

Whenever an order status changes:

```text
Order Placed
      │
      ├──► Push Notification
      │
      └──► WhatsApp Message

Order Accepted
      │
      ├──► Push Notification
      │
      └──► WhatsApp Message

Out For Delivery
      │
      ├──► Push Notification
      │
      └──► WhatsApp Message

Delivered
      │
      ├──► Push Notification
      │
      └──► WhatsApp Message
```

---

# 📦 Inventory Management

```text
Admin Updates Stock
         │
         ▼
Database Updated
         │
         ▼
Stock Available?
      ┌──┴──┐
      │     │
     Yes    No
      │     │
      ▼     ▼
 Available  Out Of Stock
```

Low Stock Alerts are automatically generated when stock falls below a defined threshold.

---

# 🗄 Database Structure

## Users

```text
id
name
email
phone
password
role
```

## Categories

```text
id
name
image
```

## Products

```text
id
category_id
name
price
stock
description
image
```

## Orders

```text
id
user_id
status
total_amount
payment_method
```

## Order Items

```text
id
order_id
product_id
quantity
price
```

---

# 🚀 Technology Stack

## Frontend (Mobile App for Play Store)
The customer-facing application is a cross-platform mobile app built using the React Native framework and Expo toolchain. It is designed to be highly responsive and performant for its live deployment on the Google Play Store.

* **Framework:** React Native (`react-native` v0.74) for building native Android and iOS experiences using React.
* **Toolchain:** Expo (`expo` v51) for streamlined development, building, and Play Store deployment (`expo run:android`).
* **Navigation:** React Navigation (`@react-navigation/native` & `@react-navigation/bottom-tabs`) for seamless screen transitions, tab routing, and native stack management.
* **Network & API:** Axios for making secure HTTP requests to the backend REST APIs.
* **Local Storage:** Async Storage (`@react-native-async-storage/async-storage`) for persisting user sessions, shopping carts, and preferences locally on the device.
* **UI Components:** React Native Safe Area Context for handling device notches, and React Native SVG for scalable graphics.
* **Authentication UI:** Expo Auth Session for Google login integration.
* **Push Notifications:** Expo Notifications integrated with Firebase Cloud Messaging for real-time order updates.

## Backend (Node.js API Server)
The backend architecture is built on a scalable Node.js environment, serving RESTful APIs for the mobile app and managing all admin operations securely.

* **Runtime & Framework:** Node.js with Express.js (`express` v4.19) for robust and fast API routing.
* **Database:** MySQL database connected via Sequelize ORM (`sequelize` v6) for structured data modeling, relationships, and secure database queries.
* **Authentication:** JWT (JSON Web Tokens) for stateless, secure API authentication and `bcryptjs` for password hashing.
* **Security:** Helmet (`helmet`) for setting secure HTTP headers, CORS (`cors`) for cross-origin resource sharing protection, and Express Rate Limit (`express-rate-limit`) to prevent DDoS attacks.
* **Integrations:** 
  * Firebase Admin SDK (`firebase-admin`) for triggering push notifications to the mobile app.
  * Google Auth Library (`google-auth-library`) for backend verification of Google OAuth tokens.
* **File Uploads:** Multer (`multer`) for handling multi-part form data (e.g., product images, category icons).

## External Services & Integrations

* **Google OAuth:** Secure authentication system using Google accounts.
* **Firebase Cloud Messaging (FCM):** Push notifications to alert customers and admin about order statuses.
* **WhatsApp Cloud API:** Automated WhatsApp messages for order confirmations and tracking updates.
* **Razorpay Payment Gateway:** Secure online payment processing (Credit/Debit, UPI, NetBanking).

---

# 🎯 Future Enhancements

* Voice Search
* AI Product Recommendations
* Multi-language Support
* Dark Mode
* Loyalty Points
* Referral Program
* Delivery Partner App

---

# ❤️ Project Goal

The goal of Tarun Kirana Store is to digitize a local grocery shop by providing customers with a simple mobile application to order groceries while enabling the shop owner to efficiently manage inventory, orders, payments, and customer communication from a centralized dashboard.
