const express = require('express');
const cors = require('cors');
const fs = require('fs');
const bodyParser = require('body-parser');
const puppeteer = require('puppeteer');
const cheerio = require('cheerio');

const C = require('./constants');
const USERNAME_SELECTOR = '#session_key';
const PASSWORD_SELECTOR = '#session_password';
const CTA_SELECTOR = '.sign-in-form__submit-button';

const LOADMORE = '.comments-comments-list__load-more-comments-button';

const REACTIONS = '.social-details-social-counts__reactions-count';
const scrollable_section = '.social-details-reactors-modal__content';

async function startBrowser() {
  const browser = await puppeteer.launch({
    // headless: false,
    // slowMo: 10,
    // devtools: false,
  });
  const page = await browser.newPage();
  return { browser, page };
}

async function closeBrowser(browser) {
  return browser.close();
}

async function login(url, page) {
  await page.goto(url);
  await page.click(USERNAME_SELECTOR);
  await page.keyboard.type(C.username);
  await page.click(PASSWORD_SELECTOR);
  await page.keyboard.type(C.password);
  await page.click(CTA_SELECTOR);
  await page.waitForNavigation();
}

async function exportComments(page, URL) {
  // getting comments count
  await page.goto(URL);

  // let cmnt_count = parseInt(await page.waitForSelector('.social-details-social-counts__comments',{ visible: true })
  // 	.then(async () => {
  // 		let el = '.social-details-social-counts__comments';
  // 		const text = await page.$eval(el, element => element.textContent)
  // 		return text.match(/\d+/)[0];
  // 	}));

  // console.log(cmnt_count);
  //scrapping comments
  for (let i = 0; i < 100000; i++) {
    try {
      await page.waitForSelector(LOADMORE, { visible: true, timeout: 3000 });
      await page.click(LOADMORE);
      console.log('2');
    } catch (error) {
      console.error(error);
      break;
    }
  }

  const pageData = await page.evaluate(() => {
    return {
      html: document.documentElement.innerHTML,
    };
  });

  const comments = [];
  const $ = cheerio.load(pageData.html);

  let comnt,
    link = '';
  $('.comments-post-meta__name-text').each(function (index, element) {
    comnt = $(this).text();
    link = 'linkedin.com' + $(this).parent().parent().parent().attr('href');

    comments.push({ name: comnt.trim(), profile: link });
  });

  console.log(comments);

  const objectToCsv = function (data) {
    const csvRows = [];
    csvRows.push('comments');
    /* Get headers as every csv data format 
        has header (head means column name)
        so objects key is nothing but column name 
        for csv data using Object.key() function.
        We fetch key of object as column name for 
        csv */
    const headers = Object.keys(data[0]);

    /* Using push() method we push fetched 
           data into csvRows[] array */
    csvRows.push(headers.join(','));

    // Loop to get value of each objects key
    for (const row of data) {
      const values = headers.map((header) => {
        const val = row[header];
        return `"${val}"`;
      });
      csvRows.push(values.join(','));
    }
    return csvRows.join('\n');
  };

  try {
    const csvData = objectToCsv(comments);
    fs.writeFileSync('FILE.CSV', csvData);
  } catch (e) {
    console.log(e);
  }
}

async function exportReactions(page, URL) {
  await page.goto(URL);

  try {
    await page.waitForSelector(REACTIONS, { visible: true, timeout: 20000 });
    await page.click(REACTIONS);
    console.log('2');
  } catch (error) {
    console.error(error);
  }

  let pageData2 = await page.evaluate(() => {
    return {
      html: document.documentElement.innerHTML,
    };
  });
  let $ = cheerio.load(pageData2.html);
  let reactn_count;
  $('.social-details-reactors-tab__reaction-tab').each(function (
    index,
    element
  ) {
    reactn_count = parseInt($(this).children().last().text().trim());
  });
  console.log(reactn_count);

  //SCROLLING SECTION DOWN

  page.on('console', async (msg) => {
    const msgArgs = msg.args();
    for (let i = 0; i < msgArgs.length; ++i) {
      console.log(await msgArgs[i].jsonValue());
    }
  });

  let height = 476;
  let reps = Math.ceil(reactn_count / 10);
  for (let i = 0; i < reps * 2; i++) {
    await page
      .waitForSelector(scrollable_section, { visible: true, timeout: 10000 })
      .then(async () => {
        console.log('found it');
      });
    try {
      await page.evaluate(
        (selector, height) => {
          const scrollableSection = document.querySelector(selector);
          // console.log(scrollableSection.offsetHeight);
          scrollableSection.scrollTop = height;
          console.log('scrolled');
        },
        scrollable_section,
        height
      );
      height += 476;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (e) {
      console.log(e);
    }
  }

  const pageData = await page.evaluate(() => {
    return {
      html: document.documentElement.innerHTML,
    };
  });

  const reactions = [];
  $ = cheerio.load(pageData.html);

  let like = '';
  $('.artdeco-entity-lockup__title').each(function (index, element) {
    like = $(this).children().first().text();
    // link = 'linkedin.com' + $(this).parent().parent().parent().attr('href');

    reactions.push({
      name: like.trim(),
      //   'profile': link,
    });
  });

  console.log(reactions);
  console.log(reactions.length);
}

const app = express();
const port = 8080;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());

let links = [{ url: 'linkedin.com' }];

app.get('/comments', (req, res) => {
  res.status(200).json(links);
});

app.put('/comments', (req, res) => {
  links[0] = req.body;
  (async () => {
    console.log('message received');
    const { browser, page } = await startBrowser();

    await login('https://www.linkedin.com/', page);
    page.setViewport({ width: 1366, height: 768 });
    for (let i = 0; i < links[0].url.length; i++) {
      await exportComments(page, links[0].url[i]);
      await exportReactions(page, links[0].url[i]);
    }
    //   process.exit(1);
  })();
  res.status(200).send();
});

app.listen(port, () => {
  console.log('Server st');
});
