# USSD Analytics API - Backend

Node.js/Express API backend for USSD transaction analytics. Provides RESTful endpoints for the dashboard frontend with simulated Zambian USSD data.

## 🚀 Features
- **RESTful API** with JWT authentication
- **Simulated Zambian USSD data** generator
- **PostgreSQL database** integration
- **CORS enabled** for frontend integration
- **Request logging** with Morgan
- **Error handling middleware**

## 🏗️ Tech Stack
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **PostgreSQL** - Database (with pg library)
- **CORS** - Cross-origin resource sharing
- **dotenv** - Environment configuration

## 🗄️ Database Schema

### PostgreSQL Tables
```sql
-- USSD Sessions
CREATE TABLE ussd_sessions (
    session_id VARCHAR(50) PRIMARY KEY,
    msisdn VARCHAR(15) NOT NULL,
    network_provider VARCHAR(20),
    province VARCHAR(50),
    service_code VARCHAR(10),
    session_start TIMESTAMP,
    session_duration INTEGER,
    transaction_status VARCHAR(20)
);

-- Transactions
CREATE TABLE ussd_transactions (
    transaction_id VARCHAR(50) PRIMARY KEY,
    session_id VARCHAR(50),
    ussd_string TEXT,
    transaction_type VARCHAR(50),
    transaction_amount DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'ZMW',
    transaction_status VARCHAR(20)
);

-- Zambian Provinces Reference
CREATE TABLE zambian_provinces (
    province_id SERIAL PRIMARY KEY,
    province_name VARCHAR(50),
    population_estimate INTEGER
);
```

## 🛠️ Installation & Setup

### Prerequisites
- Node.js 16+
- PostgreSQL 13+
- npm or yarn

### 1. Clone the repository
```bash
git clone https://github.com/GeorgeMugale/ussd-analytics-dashboard-server
cd ussd-analytics-backend
```

### 2. Install dependencies
```bash
npm install
# or
yarn install
```

### 3. Database Setup
```bash
# Create PostgreSQL database
createdb ussd_analytics

# Run initialization script
psql -d ussd_analytics -f src/scripts/init-db.sql

# Seed with Zambian data
npm run seed
```

### 4. Configure environment
Create `.env` file:
```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ussd_analytics
DB_USER=postgres
DB_PASSWORD=your_password

# API Configuration
API_VERSION=v1
CORS_ORIGIN=http://localhost:3000

# Zambia Specific
DEFAULT_CURRENCY=ZMW
DEFAULT_COUNTRY_CODE=260
```

### 5. Start the server
```bash
# Development mode with nodemon
npm run serve

# Production mode
npm start
```

## 🚪 API Endpoints

```
GET    /api/analytics/summary          # Dashboard summary
GET    /api/analytics/revenue-trends   # Revenue trends (30 days)
GET    /api/analytics/peak-hours       # Peak hours heatmap data
GET    /api/analytics/demographics     # User demographics
GET    /api/analytics/success-rate     # Success rate metrics
GET    /api/analytics/network-stats    # Network performance
```

## 📊 Sample API Responses

### Success Rate Endpoint
```json
{
  "successRate": 94.2,
  "totalTransactions": 24892,
  "successful": 23451,
  "failed": 1441,
  "byNetwork": [
    { "network": "MTN", "rate": 95.1 },
    { "network": "Airtel", "rate": 93.8 },
    { "network": "Zamtel", "rate": 91.5 }
  ]
}
```

### Revenue Trends Endpoint
```json
{
  "period": "last_30_days",
  "totalRevenue": 1248560,
  "currency": "ZMW",
  "trends": [
    {
      "date": "2024-01-15",
      "total": 72450,
      "breakdown": {
        "electricity": 32603,
        "mobileMoney": 21735,
        "airtime": 10868,
        "water": 7245
      }
    }
  ]
}
```

## 🐳 Docker Deployment

### Dockerfile
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["node", "src/app.js"]
```

### Docker Compose
```yaml
version: '3.8'
services:
  api:
    build: .
    ports:
      - "5000:5000"
    environment:
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_NAME=ussd_analytics
    depends_on:
      - postgres
  
  postgres:
    image: postgres:13
    environment:
      - POSTGRES_DB=ussd_analytics
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

## 🔒 Security Features

2. **CORS** - Configurable origin restrictions
6. **SQL Parameterization** - Prevents SQL injection

## 📈 Performance Optimization

1. **Database Indexing** - Optimized query performance
5. **Query Optimization** - Efficient data aggregation

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run integration tests
npm run test:integration
```

## 📝 Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| PORT | No | 5000 | Server port |
| NODE_ENV | No | development | Environment |
| DB_HOST | Yes | - | Database host |
| DB_PORT | No | 5432 | Database port |
| DB_NAME | Yes | - | Database name |
| DB_USER | Yes | - | Database user |
| DB_PASSWORD | Yes | - | Database password |
| CORS_ORIGIN | No | * | Allowed origins |

## 🤝 Integration with Frontend

1. **Set CORS_ORIGIN** to your frontend URL
2. **Update frontend API_BASE_URL** to backend URL
3. **Test endpoints** with Postman/curl

## 🚨 Error Handling

All errors follow this format:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input parameters",
    "details": ["msisdn must be 12 characters"]
  },
  "timestamp": "2024-01-15T14:30:00Z"
}
```
---
**Zambian USSD Analytics Solution**
```
