# 🏗️ Tarun Kirana Store (TKS) - System Architecture Specification

This document details the complete, end-to-end technical system architecture, query pipeline execution, security gateways, caching mechanisms, and external integration points of the Tarun Kirana Store platform.

---

## 🗺️ Complete Architecture Topology

The application is built on a standard **Three-Tier Architecture** consisting of a client application tier, an optimized REST API server tier, and a persistent database storage tier, bridged by external SaaS integrations.

```mermaid
graph TD
    %% Frontend Clients
    subgraph Client_Layer ["📱 Client Tier (React Native & Expo)"]
        app["React Native Application"]
        metro["Metro Bundler / Expo Go"]
        storage["AsyncStorage (JWT, Cart, Prefs)"]
        app === storage
    end

    %% Network & Protection Gateway
    subgraph Network_Gateway ["🔒 Network & Security Gateway (Express Engine)"]
        cors["CORS Filter"]
        helmet["Helmet Headers"]
        limiter["Rate Limiting (general & auth)"]
        comp["Gzip Compression"]
        sec_xss["Input Sanitizer (XSS Filter)"]
        
        cors --> helmet --> limiter --> comp --> sec_xss
    end

    %% API Server Routing & Controllers
    subgraph Server_Pipeline ["⚙️ REST API Controller Pipeline"]
        route["API Router (/api/*)"]
        auth_mid["protect (JWT Validator)"]
        role_mid["authorizeRoles ('admin')"]
        
        route --> auth_mid
        auth_mid --> role_mid
        
        subgraph Controllers ["Controllers"]
            auth_ctrl["AuthController"]
            prod_ctrl["ProductController"]
            cat_ctrl["CategoryController"]
            order_ctrl["OrderController"]
            dash_ctrl["DashboardController"]
            home_ctrl["HomeController (Aggregated API)"]
        end
        
        auth_mid --> auth_ctrl
        auth_mid --> order_ctrl
        role_mid --> dash_ctrl
        route --> home_ctrl
        route --> prod_ctrl
        route --> cat_ctrl
    end

    %% Caching & Database
    subgraph Storage_Tier ["🗄️ Caching & Database Tier"]
        cache["In-Memory Cache (TTL: 5m)"]
        db_pool["MongoDB Atlas (Mongoose Connection Pool: max 10)"]
        
        home_ctrl -.-> cache
        prod_ctrl -.-> cache
        cat_ctrl -.-> cache
        
        auth_ctrl --> db_pool
        prod_ctrl --> db_pool
        cat_ctrl --> db_pool
        order_ctrl --> db_pool
        dash_ctrl --> db_pool
    end

    %% Third-party APIs
    subgraph Third_Party_APIs ["☁️ Third-Party Services (SaaS)"]
        google_oauth["Google OAuth API"]
        firebase_fcm["Firebase Cloud Messaging (FCM)"]
        whatsapp_api["Meta WhatsApp Cloud API"]
        razorpay["Razorpay Gateway"]
    end

    %% Communications Flow
    app -- "HTTPS (Axios + 60s Timeout)" --> cors
    sec_xss --> route
    
    auth_ctrl === google_oauth
    order_ctrl === razorpay
    order_ctrl === whatsapp_api
    order_ctrl === firebase_fcm
```

---

## 🔄 Sequential Query Execution Pipeline

Every API request follows a deterministic 8-step lifecycle, from client trigger to persistent database query and gzip response delivery:

```mermaid
sequenceDiagram
    autonumber
    actor User as Mobile Client
    participant Net as Express Gateway
    participant Mid as Middleware Stack
    participant Cache as Memory Cache
    participant Ctrl as Route Controller
    participant DB as MongoDB Atlas

    User->>Net: GET /api/home (Headers: Accept-Encoding: gzip, Auth: Bearer JWT)
    
    Net->>Mid: Process Helmet, CORS, Rate Limiters
    Note over Mid: Rate Limit checking & <br/>XSS input sanitization
    
    Mid->>Cache: Check "home:data" Cache Key
    
    alt Cache Hit (Response Time: ~1ms)
        Cache-->>User: Return Cached Home Feed (Gzipped payload)
    else Cache Miss (Response Time: ~150ms)
        Cache->>Ctrl: Forward request execution
        
        Ctrl->>DB: Query collections with select projections (minimized footprint)
        DB-->>Ctrl: Return Mongo Documents
        
        Note over Ctrl: Inject optimized Cloudinary transformations<br/>(q_auto, f_auto, w_600)
        
        Ctrl->>Cache: Store aggregated response (TTL: 300s)
        Ctrl->>Net: Send aggregated JSON payload
        
        Net->>User: Compress response & send HTTP 200 (Content-Encoding: gzip)
    end
```

---

## 🛠️ Step-by-Step Architecture Specifications

### 1. Client Tier (React Native)
* **API Client**: Axios configured in [client.js](file:///Users/surajkumar/Developer/MAIN_PROJECT/E-commerce/frontend/src/api/client.js) with a **60,000ms (60s) timeout** to prevent failures during Render cold starts.
* **Persistent Session Storage**: Store JWT tokens locally in device `AsyncStorage`.
* **State Management**: Context providers ([AuthContext.js](file:///Users/surajkumar/Developer/MAIN_PROJECT/E-commerce/frontend/src/context/AuthContext.js), `CartContext.js`) manage user credentials and basket items across layouts.

### 2. Security & Routing Tier (Express.js)
* **Helmet**: Hardens HTTP headers to block Clickjacking, MIME-sniffing, and cross-site scripting vulnerabilities.
* **CORS Protection**: Allow Cross-Origin resource requests from mobile wrappers.
* **Rate Limiter**: Configures rate ceilings (`max: 100` / 15m for API; `max: 20` / 15m for Auth) to block brute-force and DDoS attacks.
* **XSS Request Sanitizer**: Custom regex filter intercepts `req.body`, `req.query`, and `req.params` to scrub potential script injections and HTML tags.

### 3. Caching & Query Optimization Tier
* **Dynamic Projection**: Avoids generic queries. Uses `.select('id name price discountPrice stockQuantity unit imageUrl')` to extract only required fields, reducing RAM overhead on Mongoose models.
* **Mongoose Pool Manager**: Handled inside [db.js](file:///Users/surajkumar/Developer/MAIN_PROJECT/E-commerce/backend/src/config/db.js):
  * `maxPoolSize: 10`: Reuses DB connections to prevent database socket starvation.
  * `minPoolSize: 2`: Retains persistent active sockets to avoid connection delays.
* **Memory Cache**: [cacheService.js](file:///Users/surajkumar/Developer/MAIN_PROJECT/E-commerce/backend/src/services/cacheService.js) stores key-value objects in memory. It uses pattern invalidation (e.g. `clearPattern('products:')`) to empty outdated product feeds whenever an administrator triggers write commands (`POST`/`PUT`/`DELETE`).

### 4. Integration Tier (SaaS Engine)
* **Razorpay Webhooks**: Verifies signatures of incoming payment callbacks before editing order states from `pending` to `completed`.
* **Firebase Admin Admin SDK**: Dispatches real-time transactional push notifications via Firebase Cloud Messaging (FCM) using stored user `pushToken` keys.
* **Meta WhatsApp Cloud API**: Sends automated notifications (order status confirmations, tracking numbers) using WhatsApp transactional message templates.
