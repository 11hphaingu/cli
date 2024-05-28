// import puppeteer from "puppeteer";
// import fs from "fs/promises";
// import path from "path";
// import { program } from "commander";

// (async () => {
//   try {
//     const browser = await puppeteer.launch();
//     const page = await browser.newPage();

//     // Login to Substack
//     await page.goto("https://substack.com/login");
//     await page.type('input[name="email"]', username);
//     await page.type('input[name="password"]', password);
//     await Promise.all([
//       page.waitForNavigation(),
//       page.click('button[type="submit"]'),
//     ]);

//     // Navigate to your paid articles page
//     await page.goto("https://substack.com/account/paid");
//     await page.waitForSelector(".sc-dVhcbM");

//     // Get paid articles links
//     const articleLinks = await page.evaluate(() => {
//       const links = [];
//       const articles = document.querySelectorAll(".sc-dVhcbM");
//       articles.forEach((article) => {
//         const link = article.querySelector("a").href;
//         links.push(link);
//       });
//       return links;
//     });

//     // Create output folder if it doesn't exist
//     await fs.mkdir(outputFolder, { recursive: true });

//     // Generate PDFs for each article
//     for (const link of articleLinks) {
//       const articlePage = await browser.newPage();
//       await articlePage.goto(link);
//       const title = await articlePage.title();
//       const pdfPath = path.join(outputFolder, `${title}.pdf`);
//       await articlePage.pdf({ path: pdfPath, format: "A4" });
//       console.log(`PDF generated for article: ${title}`);
//       await articlePage.close();
//     }

//     console.log("All PDFs generated successfully.");
//     await browser.close();
//   } catch (error) {
//     console.error("An error occurred:", error);
//   }
// })();
