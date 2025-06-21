require('dotenv').config();
const http = require('http');
const querystring = require('querystring');

const HOST = 'localhost';
const PORT = process.env.PORT || 3000;

async function testEndpoint(method, path, token = null, body = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: HOST,
            port: PORT,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
            }
        };

        if (token) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }

        if (body) {
            body = JSON.stringify(body);
            options.headers['Content-Length'] = Buffer.byteLength(body);
        }

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                let parsedData;
                try {
                    parsedData = JSON.parse(data);
                } catch (e) {
                    parsedData = data;
                }
                resolve({
                    statusCode: res.statusCode,
                    data: parsedData,
                    headers: res.headers
                });
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        if (body) {
            req.write(body);
        }
        req.end();
    });
}


async function runTests() {
    try {
        console.log('🧪 Începere testare API...');

        console.log('\n🔍 Testare endpoint public...');
        const indexResult = await testEndpoint('GET', '/');
        console.log(`GET / - Status: ${indexResult.statusCode}`);

        console.log('\n🔍 Testare API produse...');
        const productsResult = await testEndpoint('GET', '/api/products');
        console.log(`GET /api/products - Status: ${productsResult.statusCode}`);

        console.log('\n🔍 Testare API știri...');
        const newsResult = await testEndpoint('GET', '/api/news');
        console.log(`GET /api/news - Status: ${newsResult.statusCode}`);
        console.log(`Total știri: ${newsResult.data?.total || 'N/A'}`);

        console.log('\n🔍 Testare endpoint știri recente...');
        const latestNewsResult = await testEndpoint('GET', '/api/news/latest/5');
        console.log(`GET /api/news/latest/5 - Status: ${latestNewsResult.statusCode}`);
        console.log(`Știri obținute: ${latestNewsResult.data?.news?.length || 'N/A'}`);

        console.log('\n🔍 Testare autentificare...');
        const loginResult = await testEndpoint('POST', '/api/login', null, {
            username: 'admin',
            password: 'admin123SecureP@ss'
        });
        console.log(`POST /api/login - Status: ${loginResult.statusCode}`);

        const token = loginResult.data?.token;
        if (token) {
            console.log('✅ Autentificare reușită - Token primit');

            console.log('\n🔍 Testare endpoint protejat...');
            const protectedResult = await testEndpoint('GET', '/api/sources', token);
            console.log(`GET /api/sources - Status: ${protectedResult.statusCode}`);

            console.log('\n🔍 Testare procesare RSS...');
            const rssResult = await testEndpoint('POST', '/api/rss/process', token, {
                processBatch: true
            });
            console.log(`POST /api/rss/process - Status: ${rssResult.statusCode}`);
        } else {
            console.log('❌ Autentificare eșuată');
        }

        console.log('\n✅ Testare finalizată!');
    } catch (error) {
        console.error('❌ Eroare la testare:', error);
    }
}

runTests();
