-- ================================
-- 1. CORE TRANSACTION TABLES
-- ================================

CREATE TABLE ussd_sessions (
    session_id VARCHAR(50) PRIMARY KEY,
    msisdn VARCHAR(15) NOT NULL, -- Format: 260XXXXXXXXX
    network_provider VARCHAR(20) CHECK (network_provider IN ('MTN', 'Airtel', 'Zamtel')),
    province VARCHAR(50),
    district VARCHAR(50),
    service_code VARCHAR(10) NOT NULL, -- e.g., *123#
    session_start TIMESTAMP NOT NULL,
    session_end TIMESTAMP,
    session_duration INTEGER, -- in seconds
    session_status VARCHAR(20) CHECK (session_status IN ('completed', 'timeout', 'cancelled')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ussd_transactions (
    transaction_id VARCHAR(50) PRIMARY KEY,
    session_id VARCHAR(50) REFERENCES ussd_sessions(session_id),
    ussd_string TEXT NOT NULL, -- Full USSD string (*123*1*1*100#)
    menu_level INTEGER, -- Current menu depth
    selected_option VARCHAR(10), -- User selection
    input_value VARCHAR(100), -- Amount, account number, etc.
    transaction_type VARCHAR(50) CHECK (transaction_type IN (
        'balance_check',
        'airtime_purchase',
        'electricity_token',
        'water_bill_payment',
        'money_transfer',
        'bill_payment',
        'account_registration'
    )),
    transaction_amount DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'ZMW',
    transaction_status VARCHAR(20) CHECK (transaction_status IN (
        'success', 
        'failed', 
        'pending', 
        'cancelled'
    )),
    failure_reason VARCHAR(100),
    transaction_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================================
-- 2. ZAMBIA-SPECIFIC REFERENCE TABLES
-- ================================

CREATE TABLE zambian_provinces (
    province_id SERIAL PRIMARY KEY,
    province_name VARCHAR(50) UNIQUE NOT NULL,
    population_estimate INTEGER,
    urban_ratio DECIMAL(5,2)
);

INSERT INTO zambian_provinces (province_name, population_estimate, urban_ratio) VALUES
('Central', 1900000, 0.35),
('Copperbelt', 2800000, 0.85),
('Eastern', 1900000, 0.25),
('Luapula', 1200000, 0.20),
('Lusaka', 3100000, 0.95),
('Muchinga', 900000, 0.15),
('Northern', 1500000, 0.20),
('North-Western', 900000, 0.25),
('Southern', 1800000, 0.30),
('Western', 1100000, 0.20);

CREATE TABLE zambian_districts (
    district_id SERIAL PRIMARY KEY,
    district_name VARCHAR(100) NOT NULL,
    province_id INTEGER REFERENCES zambian_provinces(province_id),
    is_urban BOOLEAN DEFAULT FALSE
);

CREATE TABLE mobile_networks (
    network_id SERIAL PRIMARY KEY,
    network_name VARCHAR(50) NOT NULL,
    mnc VARCHAR(10), -- Mobile Network Code
    market_share DECIMAL(5,2) -- Estimated %
);

INSERT INTO mobile_networks (network_name, mnc, market_share) VALUES
('MTN Zambia', '64501', 45.5),
('Airtel Zambia', '64503', 42.0),
('Zamtel', '64504', 12.5);

-- ================================
-- 3. USSD SERVICE CATALOG (For Utility Companies)
-- ================================

CREATE TABLE ussd_services (
    service_id SERIAL PRIMARY KEY,
    service_code VARCHAR(10) UNIQUE NOT NULL, -- e.g., *123#
    service_name VARCHAR(100) NOT NULL,
    service_provider VARCHAR(100), -- e.g., "NWK Energy", "Nkana Water"
    service_type VARCHAR(50) CHECK (service_type IN (
        'electricity',
        'water',
        'mobile_money',
        'banking',
        'government',
        'health',
        'education'
    )),
    launch_date DATE,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE ussd_menu_structure (
    menu_id SERIAL PRIMARY KEY,
    service_id INTEGER REFERENCES ussd_services(service_id),
    menu_level INTEGER NOT NULL,
    menu_text TEXT NOT NULL, -- Text shown to user
    expected_input_type VARCHAR(20) CHECK (expected_input_type IN (
        'numeric',
        'alphabetic',
        'alphanumeric',
        'amount',
        'account_number',
        'meter_number'
    )),
    parent_menu_id INTEGER REFERENCES ussd_menu_structure(menu_id),
    next_menu_id INTEGER,
    is_terminal BOOLEAN DEFAULT FALSE -- End of flow
);

-- ================================
-- 4. ANALYTICS & REPORTING TABLES
-- ================================

CREATE TABLE daily_summary (
    summary_date DATE PRIMARY KEY,
    total_sessions INTEGER DEFAULT 0,
    successful_transactions INTEGER DEFAULT 0,
    failed_transactions INTEGER DEFAULT 0,
    total_amount DECIMAL(15,2) DEFAULT 0,
    avg_session_duration INTEGER,
    unique_users INTEGER,
    peak_hour INTEGER, -- Hour (0-23) with max transactions
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE hourly_metrics (
    metric_id SERIAL PRIMARY KEY,
    metric_date DATE NOT NULL,
    metric_hour INTEGER CHECK (metric_hour BETWEEN 0 AND 23),
    service_code VARCHAR(10),
    transaction_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    total_amount DECIMAL(15,2) DEFAULT 0
);

-- ================================
-- 5. INDEXES FOR PERFORMANCE
-- ================================

CREATE INDEX idx_sessions_msisdn ON ussd_sessions(msisdn);
CREATE INDEX idx_sessions_timestamp ON ussd_sessions(session_start);
CREATE INDEX idx_transactions_type ON ussd_transactions(transaction_type);
CREATE INDEX idx_transactions_status ON ussd_transactions(transaction_status);
CREATE INDEX idx_transactions_amount ON ussd_transactions(transaction_amount);
CREATE INDEX idx_sessions_province ON ussd_sessions(province);
CREATE INDEX idx_sessions_network ON ussd_sessions(network_provider);