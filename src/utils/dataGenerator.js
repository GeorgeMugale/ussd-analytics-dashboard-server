/**
 * Zambian USSD Data Generator for PostgreSQL
 * Generates: seed_zambia_ussd.sql
 * * Run with: node generate_ussd_data.js
 */
import fs from 'fs';
import path from 'path';

// ==========================================
// 🚨 CONFIGURATION
// ==========================================
const CONFIG = {
    TOTAL_SESSIONS: 500,        // How many sessions to generate
    START_DATE: new Date('2025-10-01'),
    END_DATE: new Date('2025-12-31'),
    OUTPUT_FILE: 'seed_zambia_ussd.sql'
};

// ==========================================
// 🇿🇲 ZAMBIAN CONTEXT DATA
// ==========================================

const ZM_NETWORKS = [
    { name: 'MTN', prefixes: ['96', '76'], share: 0.45 },
    { name: 'Airtel', prefixes: ['97', '77'], share: 0.43 },
    { name: 'Zamtel', prefixes: ['95'], share: 0.12 }
];

const ZM_LOCATIONS = [
    { province: 'Lusaka', districts: ['Lusaka', 'Chongwe', 'Kafue'], weight: 0.35 },
    { province: 'Copperbelt', districts: ['Kitwe', 'Ndola', 'Chingola'], weight: 0.25 },
    { province: 'Southern', districts: ['Livingstone', 'Choma', 'Mazabuka'], weight: 0.10 },
    { province: 'Central', districts: ['Kabwe', 'Kapiri Mposhi', 'Mkushi'], weight: 0.08 },
    { province: 'Eastern', districts: ['Chipata', 'Petauke', 'Katete'], weight: 0.05 },
    { province: 'Northern', districts: ['Kasama', 'Mbala'], weight: 0.04 },
    { province: 'Western', districts: ['Mongu', 'Kaoma'], weight: 0.04 },
    { province: 'Luapula', districts: ['Mansa', 'Samfya'], weight: 0.03 },
    { province: 'North-Western', districts: ['Solwezi', 'Mwinilunga'], weight: 0.03 },
    { province: 'Muchinga', districts: ['Chinsali', 'Mpika'], weight: 0.03 }
];

const SERVICE_TYPES = [
    { code: '*111#', type: 'balance_check', menu: 'Check Balance' },
    { code: '*303#', type: 'electricity_token', menu: 'ZESCO Pre-paid' },
    { code: '*115#', type: 'money_transfer', menu: 'Send Money' }, 
    { code: '*777#', type: 'water_bill_payment', menu: 'Lusaka Water' },
    { code: '*117#', type: 'airtime_purchase', menu: 'Top Up' }
];

// ==========================================
// 🛠️ HELPER FUNCTIONS
// ==========================================

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomElement(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function getWeightedElement(arr) {
    let random = Math.random();
    for (let item of arr) {
        if (random < item.weight || random < item.share) { // Handles both location weights and network shares
            return item;
        }
        random -= (item.weight || item.share);
    }
    return arr[0];
}

function generateMSISDN(network) {
    const prefix = getRandomElement(network.prefixes);
    const suffix = getRandomInt(1000000, 9999999);
    return `260${prefix}${suffix}`;
}

function generateTimestamp(start, end) {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function formatDateToSQL(date) {
    return date.toISOString().replace('T', ' ').slice(0, 19);
}

function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// ==========================================
// 🏭 MAIN GENERATOR LOGIC
// ==========================================

const stream = fs.createWriteStream(CONFIG.OUTPUT_FILE);

console.log(`🚀 Starting generation of ${CONFIG.TOTAL_SESSIONS} sessions...`);

// 1. WRITE HEADERS
stream.write(`-- Zambian USSD Analytics Seed Data\n`);
stream.write(`-- Generated: ${new Date().toISOString()}\n\n`);
stream.write(`BEGIN;\n\n`);

// 2. GENERATE SESSIONS & TRANSACTIONS
for (let i = 0; i < CONFIG.TOTAL_SESSIONS; i++) {
    
    // -- Context Selection --
    const network = getWeightedElement(ZM_NETWORKS);
    const location = getWeightedElement(ZM_LOCATIONS);
    const district = getRandomElement(location.districts);
    const service = getRandomElement(SERVICE_TYPES);
    const startTime = generateTimestamp(CONFIG.START_DATE, CONFIG.END_DATE);
    
    // Session Duration (random between 10s and 120s)
    const duration = getRandomInt(10, 120);
    const endTime = new Date(startTime.getTime() + duration * 1000);
    
    // Status Logic (10% failure/timeout rate)
    const sessionStatus = Math.random() > 0.9 ? 'timeout' : 'completed';
    
    const session = {
        id: uuidv4(),
        msisdn: generateMSISDN(network),
        network: network.name,
        province: location.province,
        district: district,
        service_code: service.code,
        start: formatDateToSQL(startTime),
        end: formatDateToSQL(endTime),
        duration: duration,
        status: sessionStatus
    };

    // -- Write Session INSERT --
    stream.write(`INSERT INTO ussd_sessions (session_id, msisdn, network_provider, province, district, service_code, session_start, session_end, session_duration, session_status) VALUES `);
    stream.write(`('${session.id}', '${session.msisdn}', '${session.network}', '${session.province}', '${session.district}', '${session.service_code}', '${session.start}', '${session.end}', ${session.duration}, '${session.status}');\n`);

    // -- Generate Linked Transaction (only if session completed) --
    if (sessionStatus === 'completed') {
        const isSuccess = Math.random() > 0.15; // 85% success rate
        const amount = service.type === 'balance_check' ? 0 : getRandomInt(10, 500);
        
        const transaction = {
            id: uuidv4(),
            ussd_string: `${service.code}*1*${amount}#`,
            type: service.type,
            amount: amount,
            status: isSuccess ? 'success' : 'failed',
            fail_reason: isSuccess ? 'NULL' : "'Insufficient Funds'",
            input: amount.toString()
        };

        stream.write(`INSERT INTO ussd_transactions (transaction_id, session_id, ussd_string, menu_level, selected_option, input_value, transaction_type, transaction_amount, transaction_status, failure_reason, transaction_timestamp) VALUES `);
        stream.write(`('${transaction.id}', '${session.id}', '${transaction.ussd_string}', 2, '1', '${transaction.input}', '${transaction.type}', ${transaction.amount}, '${transaction.status}', ${transaction.fail_reason}, '${session.end}');\n`);
    }
}

// 3. GENERATE AGGREGATED DAILY SUMMARIES
stream.write(`\n-- Refreshing Daily Summary --\n`);
stream.write(`
INSERT INTO daily_summary (summary_date, total_sessions, successful_transactions, total_amount, avg_session_duration, peak_hour)
SELECT 
    DATE(session_start) as summary_date,
    COUNT(s.session_id) as total_sessions,
    COUNT(t.transaction_id) FILTER (WHERE t.transaction_status = 'success') as successful_transactions,
    COALESCE(SUM(t.transaction_amount), 0) as total_amount,
    AVG(s.session_duration)::INT as avg_session_duration,
    -- FIX: Use AVG instead of raw EXTRACT to satisfy GROUP BY rules
    ROUND(AVG(EXTRACT(HOUR FROM s.session_start)))::INT as peak_hour
FROM ussd_sessions s
LEFT JOIN ussd_transactions t ON s.session_id = t.session_id
GROUP BY DATE(session_start)
ON CONFLICT (summary_date) DO NOTHING;
\n`);

stream.write(`COMMIT;\n`);
stream.end();

console.log(`✅ Done! File saved to: ${path.resolve(CONFIG.OUTPUT_FILE)}`);
console.log(`👉 Import with: psql -h <host> -U <user> -d ussd_analytics -f ${CONFIG.OUTPUT_FILE}`);