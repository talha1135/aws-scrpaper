const puppeteer = require('puppeteer');
const logger = require('../utils/logger');
const config = require('../config/puppeteer.config');
const axios = require('axios');
const cheerio = require('cheerio');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

async function scrapeASINs(dataList) {
  const browser = await puppeteer.launch({ headless: config.headless });
  const excelData = [];

  try {
    for (let i = 0; i < dataList.length; i++) {
      const { ASIN: asin } = dataList[i];

      if (!asin) {
        logger.error(`ASIN is missing for item ${i}. Skipping...`);
        continue;
      }

      try {
        logger.info(`Processing ASIN: ${asin}`);

        const url = 'https://www.amazon.de/acp/buffet-mobile-card/buffet-mobile-card-3e67eb5a-92a5-4eae-9a4d-c1d3082690fb-1734571386882/getRspManufacturerContent?page-type=DetailAW&stamp=1734623286402';

        const headers = {
          'accept': 'text/html, application/json',
          'accept-language': 'en-GB,en;q=0.9,be;q=0.8,ur;q=0.7',
          'content-type': 'application/json',
          'device-memory': '8',
          'downlink': '4.25',
          'dpr': '2',
          'ect': '4g',
          'priority': 'u=1, i',
          'rtt': '250',
          'sec-ch-device-memory': '8',
          'sec-ch-dpr': '2',
          'sec-ch-ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
          'sec-ch-ua-mobile': '?1',
          'sec-ch-ua-platform': '"Android"',
          'sec-ch-ua-platform-version': '"6.0"',
          'sec-ch-viewport-width': '1145',
          'sec-fetch-dest': 'empty',
          'sec-fetch-mode': 'cors',
          'sec-fetch-site': 'same-origin',
          'viewport-width': '1145',
          'x-amz-acp-params': 'tok=FBsk2BFo33RUH3sujiaU_dkdakUcEBnthvUxK3jaTj4;ts=1734623286395;rid=YPAQAPMK7HS057YPN4AD;d1=711;d2=0',
          'x-amz-amabot-click-attributes': 'disable',
          'x-requested-with': 'XMLHttpRequest',
          'cookie': 'session-id=261-5758951-0539711; session-id-time=2082787201l; i18n-prefs=EUR; lc-acbde=en_GB; sp-cdn="L5Z9:PK"; ubid-acbde=261-5393323-8128104; session-token=RVuGuCOz7rQrxfHb0cosNpD+u0bC7roD/2RaAnDtCXh9SGiSIzUEOGPNsdMo2/H607FyEYsyMy+zh8u/i3tXuhqUwki7bkMx1KYf8OFrr2SJsalca8qxe10aZmm1dq7UEZS1hA2CdN9EWE2sQGmHnBWb84YWuoPtFhBCv5BZGpWM42S8PYSiGlorZaav0JYEgUqVWCpJZpB13sq6Guy8C9wIrEjHGn2EtYaCj8PQiyZpQTF7qHQub3QSq517SaSOk+j8adBQPOeCOakcSgveJjTU/9y6sOi00KHadgZG4/x7rs5jm+ItnQBK1JoS81IGX2nsX4gCLycCjInxx9FUXE17K9oU4wil',
          'Referer': 'https://www.amazon.de/dp/B0BJ1Q3HWZ?th=1',
          'Referrer-Policy': 'strict-origin-when-cross-origin'
        };

        const requestBody = { asin };

        // Await the axios response
        const response = await axios.post(url, requestBody, { headers });
        // Parse the response with Cheerio
        const $ = cheerio.load(response.data);
  
        // Extract EU responsible person info
        const euResponsiblePerson = {
          name: $('#buffet-sidesheet-mobile-rsp-content .a-box .a-box-inner .a-size-base.a-text-bold').first().text().trim(),
          address: [
            $('#buffet-sidesheet-mobile-rsp-content .a-box .a-box-inner .a-list-item').eq(1).text().trim(),
            $('#buffet-sidesheet-mobile-rsp-content .a-box .a-box-inner .a-list-item').eq(2).text().trim(),
            $('#buffet-sidesheet-mobile-rsp-content .a-box .a-box-inner .a-list-item').eq(3).text().trim(),
        ].join(', '),
          email: $('#buffet-sidesheet-mobile-rsp-content .a-box .a-box-inner .a-spacing-top-small .a-list-item').text().trim(),
        };

        // Extract manufacturer info
        const manufacturerInfo = {
          name: $('#buffet-sidesheet-mobile-manufacturer-content .a-box .a-box-inner .a-size-base.a-text-bold').first().text().trim(),
          address: [
            $('#buffet-sidesheet-mobile-manufacturer-content .a-box .a-box-inner .a-list-item').eq(1).text().trim(),
            $('#buffet-sidesheet-mobile-manufacturer-content .a-box .a-box-inner .a-list-item').eq(2).text().trim(),
            $('#buffet-sidesheet-mobile-manufacturer-content .a-box .a-box-inner .a-list-item').eq(3).text().trim(),
          ].join(', '),
          email: $('#buffet-sidesheet-mobile-manufacturer-content .a-box .a-box-inner .a-spacing-top-small .a-list-item').text().trim(),
        };

        // Add to Excel data
        excelData.push({
          ASIN: asin,
          'Manufacturer Information.name': manufacturerInfo.name,
          'Manufacturer Information.address': manufacturerInfo.address,
          'Manufacturer Information.email': manufacturerInfo.email,
          'EU Responsible Person.name': euResponsiblePerson.name,
          'EU Responsible Person.address': euResponsiblePerson.address,
          'EU Responsible Person.email': euResponsiblePerson.email,
        });

        logger.info(`Data retrieved for ASIN: ${asin}`);
      } catch (error) {
        logger.error(`Error processing ASIN: ${asin} - ${error.message}`);
      }
    }
    const timestamp = Date.now();
    const fileName=timestamp+'.xlsx'
    // Define the output path for the Excel file
    const outputPath = path.join(__dirname, '../../files', fileName);

    // Create the Excel workbook and write data to it
    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(excelData);
    xlsx.utils.book_append_sheet(wb, ws, 'ASIN Data');
    xlsx.writeFile(wb, outputPath);
    const filePath=fileName;
    logger.info(`Excel file created at ${filePath}`);

    // Return the URL/path for the Excel file
    return filePath;
  } catch (error) {
    logger.error(`An unexpected error occurred: ${error.message}`);
  } finally {
    await browser.close();
  }
}

module.exports = scrapeASINs;
