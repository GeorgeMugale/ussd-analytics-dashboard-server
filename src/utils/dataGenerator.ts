// Generate realistic Zambian USSD data
const zambianProvinces = [
    'Lusaka', 'Copperbelt', 'Central', 'Southern', 
    'Eastern', 'Northern', 'Luapula', 'North-Western',
    'Western', 'Muchinga'
];

const districtsByProvince: Record<string, string[]> = {
    'Lusaka': ['Lusaka City', 'Chongwe', 'Kafue', 'Luangwa'],
    'Copperbelt': ['Kitwe', 'Ndola', 'Chingola', 'Mufulira', 'Luanshya'],
    'Central': ['Kabwe', 'Kapiri Mposhi', 'Mkushi', 'Serenje']
};

const networkProviders = [
    {name: 'MTN', probability: 0.45},
    {name: 'Airtel', probability: 0.42},
    {name: 'Zamtel', probability: 0.13}
];

function generateZambianMSISDN(): string {
    const prefixes = ['95', '96', '97']; // MTN:95/96, Airtel:97, Zamtel:96
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
    return `260${prefix}${suffix}`;
}

function generateZambianUSSDTransaction() {
    const province = zambianProvinces[Math.floor(Math.random() * zambianProvinces.length)];
    const districts = districtsByProvince[province] || [province];
    const district = districts[Math.floor(Math.random() * districts.length)];
    
    // More transactions during business hours (8 AM - 6 PM)
    const hour = new Date().getHours();
    const isPeakHour = hour >= 8 && hour <= 18;
    const transactionMultiplier = isPeakHour ? 3 : 1;
    
    return {
        msisdn: generateZambianMSISDN(),
       //ask network_provider: weightedRandom(networkProviders),
        province: province,
        district: district,
        service_code: '*123#', // Example: Electricity token service
        //ask ussd_string: generateElectricityTokenString(),
        transaction_amount: Math.floor(Math.random() * 500) + 20, // 20-520 ZMW
        currency: 'ZMW',
        session_duration: Math.floor(Math.random() * 180) + 30, // 30-210 seconds
        is_urban: Math.random() > 0.6 // Higher probability in Lusaka/Copperbelt
    };
}