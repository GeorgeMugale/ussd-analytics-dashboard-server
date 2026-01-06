export const TRANSACTION_VOLUME_QUERY = `SELECT
    -- 1. TIME BUCKETING
    -- If range is '24h', truncate to hour. Else truncate to day.
    DATE_TRUNC(CASE WHEN $1 = '24h' THEN 'hour' ELSE 'day' END, t.transaction_timestamp) as time_bucket,

    -- 2. TOTALS
    COUNT(*) as total,
    
    -- 3. SERVICE BREAKDOWNS (Pivot Logic)
    -- Mapping your schema types to frontend keys
    COUNT(CASE WHEN t.transaction_type = 'electricity_token' THEN 1 END) as electricity,
    COUNT(CASE WHEN t.transaction_type = 'water_bill_payment' THEN 1 END) as water,
    COUNT(CASE WHEN t.transaction_type = 'airtime_purchase' THEN 1 END) as airtime,
    -- Grouping Money transfers and bill payments under "Mobile Money"
    COUNT(CASE WHEN t.transaction_type IN ('money_transfer', 'bill_payment') THEN 1 END) as mobileMoney,
    -- Grouping Balance checks and Reg under "Banking"
    COUNT(CASE WHEN t.transaction_type IN ('balance_check', 'account_registration') THEN 1 END) as banking,

    -- 4. METRICS
    -- Average session duration (needs join with sessions table)
    COALESCE(AVG(s.session_duration), 0) as avgSessionTime,
    
    -- Success Rate Calculation
    (COUNT(CASE WHEN t.transaction_status = 'success' THEN 1 END)::FLOAT / NULLIF(COUNT(*), 0)) * 100 as successRate,
    
    -- Revenue (Sum of amounts)
    COALESCE(SUM(t.transaction_amount), 0) as revenue,
    
    -- Failures
    COUNT(CASE WHEN t.transaction_status IN ('failed', 'timeout', 'cancelled') THEN 1 END) as failedTransactions,
    
    -- Peak Users (Approximation using unique MSISDNs in this bucket)
    COUNT(DISTINCT t.session_id) as peakConcurrentUsers

FROM ussd_transactions t
LEFT JOIN ussd_sessions s ON t.session_id = s.session_id
WHERE 
    -- Dynamic Time Filtering
    t.transaction_timestamp >= NOW() - CASE 
        WHEN $1 = '24h' THEN INTERVAL '24 hours'
        WHEN $1 = '7d'  THEN INTERVAL '7 days'
        WHEN $1 = '30d' THEN INTERVAL '30 days'
        ELSE INTERVAL '90 days'
    END
GROUP BY time_bucket
ORDER BY time_bucket ASC;`;