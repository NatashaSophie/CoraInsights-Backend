"use strict";
const puppeteer = require("puppeteer");
const url = require("url");

/**
 * `pdf-generator` service.
 */

module.exports = {
  generateCertificatePdf: async ({ code, name, startDate, finishDate }) => {
    const certificateUrl = new url.URL(
      `${process.env.APP_FRONT_URL}/certificado`
    );

    certificateUrl.searchParams.append("id", code);
    certificateUrl.searchParams.append("name", name);
    certificateUrl.searchParams.append("startDate", startDate);
    certificateUrl.searchParams.append("finishDate", finishDate);

    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();
    await page.goto(certificateUrl.toString());
    const pdf = await page.pdf({ format: "A4", landscape: true });

    return Buffer.from(pdf).toString("base64");
  },
};
